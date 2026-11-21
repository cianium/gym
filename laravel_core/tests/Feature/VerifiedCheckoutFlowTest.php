<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\VerifyAdminCsrfToken;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Run against a disposable MySQL database with dev PHPUnit installed:
 *   DB_CONNECTION=mysql DB_DATABASE=arash_test php vendor/bin/phpunit --filter VerifiedCheckoutFlowTest
 * This file is part of the deliverable, NOT proof of a test run in the
 * inspection environment (where PDO drivers and phpunit are unavailable).
 */
class VerifiedCheckoutFlowTest extends TestCase
{
    use RefreshDatabase;

    private function athlete(string $phone, bool $verified): User
    {
        $user = User::create([
            'name' => 'Test athlete', 'phone' => $phone, 'role' => 'athlete',
            'password' => 'StrongTestPassword!123',
        ]);
        if ($verified) $user->forceFill(['phone_verified_at' => now()])->save();
        return $user;
    }

    private function product(string $id = 'secure-digital-program'): Product
    {
        return Product::create([
            'id' => $id, 'type' => 'digital', 'title' => 'Secure test program',
            'price_toman' => 120000, 'description' => '', 'status' => 'published',
        ]);
    }

    private function payload(string $phone, string $productId = 'secure-digital-program', ?string $key = null): array
    {
        return [
            'gateway' => 'zarinpal',
            'idempotencyKey' => $key ?? (string) Str::uuid(),
            'customer' => ['name' => 'Test Athlete', 'phone' => $phone],
            'items' => [['productId' => $productId, 'qty' => 1]],
        ];
    }

    private function fakeZarinpal(): void
    {
        config()->set('services.zarinpal.merchant_id', str_repeat('A', 36));
        config()->set('services.zarinpal.sandbox', false);
        Http::fake([
            'https://payment.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'BANK_AUTH_1234567890'],
            ], 200),
            'https://payment.zarinpal.com/pg/v4/payment/verify.json' => Http::response([
                'data' => ['code' => 100, 'ref_id' => 'BANK_RECEIPT_1234567890'],
            ], 200),
        ]);
    }

    public function test_all_checkout_aliases_reject_guest_without_access_to_db_write(): void
    {
        foreach (['/api/checkout', '/api/v1/checkout', '/api/v1/athlete/checkout'] as $uri) {
            $this->postJson($uri, $this->payload('09120000001'))
                ->assertUnauthorized()->assertJsonPath('code', 'ATHLETE_AUTH_REQUIRED');
        }
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_only_verified_user_can_purchase_for_own_number_and_needs_key(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $verified = $this->athlete('09120000001', true);
        $unverified = $this->athlete('09120000002', false);

        $this->actingAs($unverified)->postJson('/api/v1/checkout', $this->payload($unverified->phone))
            ->assertForbidden()->assertJsonPath('code', 'VERIFIED_CHECKOUT_REQUIRED');
        $this->actingAs($verified)->postJson('/api/v1/checkout', $this->payload('09120009999'))
            ->assertForbidden()->assertJsonPath('code', 'VERIFIED_CHECKOUT_REQUIRED');
        $noKey = $this->payload($verified->phone);
        unset($noKey['idempotencyKey']);
        $this->actingAs($verified)->postJson('/api/v1/checkout', $noKey)
            ->assertStatus(422)->assertJsonPath('code', 'IDEMPOTENCY_KEY_REQUIRED');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_verified_checkout_requires_csrf_before_any_order_is_created(): void
    {
        $athlete = $this->athlete('09120000001', true);
        $this->product();
        $this->actingAs($athlete)->postJson('/api/v1/athlete/checkout', $this->payload($athlete->phone))
            ->assertForbidden()->assertJsonPath('code', 'CSRF_TOKEN_MISMATCH');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_same_key_replays_same_order_and_real_bank_redirect_without_new_charge_request(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $athlete = $this->athlete('09120000001', true);
        $this->product();
        $this->fakeZarinpal();
        $key = (string) Str::uuid();
        $body = $this->payload($athlete->phone, 'secure-digital-program', $key);

        $first = $this->actingAs($athlete)->postJson('/api/v1/athlete/checkout', $body)
            ->assertCreated()->json();
        $this->assertSame('https://payment.zarinpal.com/pg/StartPay/BANK_AUTH_1234567890', $first['redirect']['url']);
        $again = $this->actingAs($athlete)->postJson('/api/v1/checkout', $body)
            ->assertCreated()->assertJsonPath('idempotentReplay', true)->json();
        $this->assertSame($first['orderId'], $again['orderId']);
        $this->assertSame($first['redirect'], $again['redirect']);
        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('payment_transactions', 1);
        Http::assertSentCount(1);
    }

    public function test_same_idempotency_key_with_different_product_is_rejected(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $athlete = $this->athlete('09120000001', true);
        $this->product();
        $this->product('different-digital-program');
        $this->fakeZarinpal();
        $key = (string) Str::uuid();
        $this->actingAs($athlete)->postJson('/api/v1/athlete/checkout',
            $this->payload($athlete->phone, 'secure-digital-program', $key))->assertCreated();
        $this->actingAs($athlete)->postJson('/api/v1/athlete/checkout',
            $this->payload($athlete->phone, 'different-digital-program', $key))
            ->assertStatus(409)->assertJsonPath('code', 'IDEMPOTENCY_PAYLOAD_MISMATCH');
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_register_using_valid_otp_starts_athlete_session(): void
    {
        $phone = '09120000009';
        $code = '123456';
        DB::table('athlete_phone_verifications')->insert([
            'phone' => $phone,
            'code_hash' => hash_hmac('sha256', $code, (string) config('app.key')),
            'attempts' => 0, 'expires_at' => now()->addMinutes(5),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->postJson('/api/v1/athlete/register', [
            'phone' => $phone, 'name' => 'New athlete', 'code' => $code,
            'password' => 'StrongPassword!123', 'password_confirmation' => 'StrongPassword!123',
        ])->assertCreated()->assertJsonPath('authenticated', true);
        $this->getJson('/api/v1/athlete/me')->assertOk()
            ->assertJsonPath('athlete.phone', $phone)
            ->assertJsonPath('athlete.phone_verified', true);
    }

    public function test_duplicate_verified_callback_does_not_grant_second_fulfillment(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $athlete = $this->athlete('09120000001', true);
        $this->product();
        $this->fakeZarinpal();
        $body = $this->payload($athlete->phone);
        $orderId = $this->actingAs($athlete)->postJson('/api/v1/athlete/checkout', $body)
            ->assertCreated()->json('orderId');
        $callback = '/api/v1/payments/callback/zarinpal?orderId=' . rawurlencode($orderId)
            . '&Authority=BANK_AUTH_1234567890&Status=OK';
        $this->get($callback)->assertRedirect();
        $this->assertSame('paid', Order::findOrFail($orderId)->payment_status);
        $this->get($callback)->assertStatus(409)->assertJsonPath('code', 'TRANSACTION_REPLAY_BLOCKED');
        $this->assertDatabaseCount('payment_transactions', 1);
        $this->assertSame(1, PaymentTransaction::where('order_id', $orderId)->where('status', 'verified')->count());
    }
}
