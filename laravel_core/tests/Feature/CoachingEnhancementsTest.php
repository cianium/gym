<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\VerifyAdminCsrfToken;
use App\Models\CoachAppointmentSlot;
use App\Models\CoachConsultationBooking;
use App\Models\CoachSmsOutbox;
use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;
use App\Services\Notifications\BookingSmsOutbox;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CoachingEnhancementsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, string $phone, bool $verified = false): User
    {
        $user = User::create([
            'name' => 'Test ' . $role,
            'phone' => $phone,
            'email' => $phone . '@example.test',
            'role' => $role,
            'password' => 'ThisIsASafeTestPassword123!',
        ]);
        if ($verified) $user->forceFill(['phone_verified_at' => now()])->save();
        return $user;
    }

    private function slot(User $admin, int $hours = 24): CoachAppointmentSlot
    {
        return CoachAppointmentSlot::create([
            'created_by' => $admin->id,
            'starts_at' => now()->addHours($hours)->startOfMinute(),
            'ends_at' => now()->addHours($hours + 1)->startOfMinute(),
            'is_active' => true,
        ]);
    }

    public function test_only_verified_athlete_can_book_and_others_cannot_read_or_cancel(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $admin = $this->user('admin', '09120000000');
        $athlete = $this->user('athlete', '09120000001', true);
        $unverified = $this->user('athlete', '09120000002');
        $other = $this->user('athlete', '09120000003', true);
        $slot = $this->slot($admin);

        $this->actingAs($unverified)->postJson('/api/v1/athlete/consultations/bookings', ['slot_id' => $slot->id])
            ->assertStatus(403)->assertJsonPath('code', 'VERIFIED_PHONE_REQUIRED');

        $bookingId = $this->actingAs($athlete)
            ->postJson('/api/v1/athlete/consultations/bookings', ['slot_id' => $slot->id])
            ->assertCreated()->json('booking.id');
        $this->actingAs($other)->postJson('/api/v1/athlete/consultations/bookings', ['slot_id' => $slot->id])
            ->assertStatus(409);
        $this->actingAs($other)->getJson('/api/v1/athlete/consultations/bookings')
            ->assertOk()->assertJsonCount(0, 'bookings');
        $this->actingAs($other)->postJson('/api/v1/athlete/consultations/bookings/'.$bookingId.'/cancel')
            ->assertNotFound();

        $this->actingAs($athlete)->postJson('/api/v1/athlete/consultations/bookings/'.$bookingId.'/cancel')
            ->assertOk();
        $this->assertNull(CoachConsultationBooking::findOrFail($bookingId)->active_slot_id);
        $this->actingAs($other)->postJson('/api/v1/athlete/consultations/bookings', ['slot_id' => $slot->id])
            ->assertCreated();
    }

    public function test_slots_cannot_overlap_and_confirmation_creates_only_once_sms_events(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $admin = $this->user('admin', '09120000000');
        $athlete = $this->user('athlete', '09120000001', true);
        $start = now()->addDays(3)->startOfHour();
        $this->actingAs($admin)->postJson('/api/v1/admin/consultation-slots', [
            'starts_at' => $start->toIso8601String(),
            'ends_at' => $start->copy()->addHour()->toIso8601String(),
        ])->assertCreated();
        $this->actingAs($admin)->postJson('/api/v1/admin/consultation-slots', [
            'starts_at' => $start->copy()->addMinutes(30)->toIso8601String(),
            'ends_at' => $start->copy()->addMinutes(90)->toIso8601String(),
        ])->assertStatus(409);

        $slotId = CoachAppointmentSlot::firstOrFail()->id;
        $bookingId = $this->actingAs($athlete)
            ->postJson('/api/v1/athlete/consultations/bookings', ['slot_id' => $slotId])
            ->assertCreated()->json('booking.id');
        config()->set('services.booking_sms.coach_phone', '09120000000');
        $this->actingAs($admin)->postJson('/api/v1/admin/consultation-bookings/'.$bookingId.'/status', [
            'status' => 'confirmed',
        ])->assertOk();
        $this->assertSame(2, CoachSmsOutbox::count());
        $this->actingAs($admin)->postJson('/api/v1/admin/consultation-bookings/'.$bookingId.'/status', [
            'status' => 'confirmed',
        ])->assertStatus(409);
        $this->assertSame(2, CoachSmsOutbox::count());
        $this->assertSame(true, (new BookingSmsOutbox())->dispatch()['disabled']);
    }

    public function test_private_messages_are_isolated_between_athletes(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $admin = $this->user('admin', '09120000000');
        $a = $this->user('athlete', '09120000001', true);
        $b = $this->user('athlete', '09120000002', true);

        $this->actingAs($a)->postJson('/api/v1/athlete/messages', ['body' => 'Private coaching question'])
            ->assertCreated();
        $this->actingAs($b)->getJson('/api/v1/athlete/messages')
            ->assertOk()->assertJsonCount(0, 'messages');
        $this->actingAs($b)->getJson('/api/v1/admin/athletes/'.$a->id.'/messages')
            ->assertUnauthorized();
        $this->actingAs($admin)->getJson('/api/v1/admin/athletes/'.$a->id.'/messages')
            ->assertOk()->assertJsonCount(1, 'messages');
    }

    public function test_csrf_middleware_blocks_unsafe_athlete_writes_without_token(): void
    {
        $athlete = $this->user('athlete', '09120000001', true);
        $this->actingAs($athlete)->postJson('/api/v1/athlete/messages', ['body' => 'test'])
            ->assertStatus(403)->assertJsonPath('code', 'CSRF_TOKEN_MISMATCH');
    }

    public function test_only_otp_verified_phone_can_access_existing_phone_matched_order(): void
    {
        $athlete = $this->user('athlete', '09120000001');
        $order = Order::create([
            'id' => 'private-order-1', 'order_number' => 'PRIVATE-001',
            'tracking_code' => 'T-001', 'access_token' => bin2hex(random_bytes(32)),
            'gateway' => 'zarinpal', 'payment_status' => 'paid',
            'fulfillment_status' => 'pending', 'customer_name' => 'Private',
            'customer_phone' => '+989120000001', 'subtotal_toman' => 50000,
            'total_amount_toman' => 50000,
        ]);
        $this->assertFalse((new OrderPolicy())->view($athlete, $order));
        $athlete->forceFill(['phone_verified_at' => now()])->save();
        $this->assertTrue((new OrderPolicy())->view($athlete->fresh(), $order));
        $this->actingAs($athlete->fresh())->getJson('/api/v1/athlete/orders')
            ->assertOk()->assertJsonCount(1, 'orders');
    }

    public function test_coach_created_athlete_can_request_own_phone_verification(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $athlete = $this->user('athlete', '09120000999');
        config()->set('services.athlete_sms.token', 'test-token');
        config()->set('services.athlete_sms.body_id', '123');
        Http::fake(['console.melipayamak.com/*' => Http::response(['recId' => '123456789'], 200)]);
        // Anonymous caller must not trigger SMS to an existing customer's phone.
        $this->postJson('/api/v1/athlete/otp/request', ['phone' => $athlete->phone])->assertOk();
        Http::assertNothingSent();
        // Signed-in owner may request a code and finish verification.
        $this->actingAs($athlete)->postJson('/api/v1/athlete/phone/otp/request')->assertOk();
        $this->assertDatabaseHas('athlete_phone_verifications', ['phone' => $athlete->phone]);
        Http::assertSentCount(1);
        $this->actingAs($athlete)->postJson('/api/v1/athlete/phone/verify', ['code' => '000000'])
            ->assertStatus(422);
        $this->assertDatabaseHas('athlete_phone_verifications', ['phone' => $athlete->phone, 'attempts' => 1]);
    }

    public function test_otp_is_reserved_before_sms_and_repeat_request_is_throttled(): void
    {
        $this->withoutMiddleware(); // unit of the controller and DB behavior; route limiter tested separately
        config()->set('services.athlete_sms.token', 'test-token');
        config()->set('services.athlete_sms.body_id', '123');
        Http::fake(['console.melipayamak.com/*' => Http::response(['recId' => '123456789'], 200)]);
        $this->postJson('/api/v1/athlete/otp/request', ['phone' => '09120000123'])->assertOk();
        $this->assertDatabaseHas('athlete_phone_verifications', ['phone' => '09120000123', 'attempts' => 0]);
        $this->postJson('/api/v1/athlete/otp/request', ['phone' => '09120000123'])->assertStatus(429);
        Http::assertSentCount(1);
    }
}
