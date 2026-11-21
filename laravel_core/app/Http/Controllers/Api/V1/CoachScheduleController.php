<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\CoachAppointmentSlot;
use App\Models\CoachSmsOutbox;
use App\Models\CoachConsultationBooking;
use App\Models\User;
use App\Services\Notifications\BookingSmsOutbox;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * One coach, one appointment per slot. Times stored in APP_TIMEZONE (local business time) and emitted ISO8601.
 * The unique active_slot_id constraint is the final concurrency guard.
 */
class CoachScheduleController
{
    public function available(): JsonResponse
    {
        $slots = CoachAppointmentSlot::query()
            ->where('is_active', true)->where('starts_at', '>', now()->addHours(2))
            ->whereDoesntHave('activeBooking')->orderBy('starts_at')->limit(100)
            ->get(['id', 'starts_at', 'ends_at']);

        return response()->json(['slots' => $slots]);
    }

    public function book(Request $request): JsonResponse
    {
        $data = $request->validate([
            'slot_id' => ['required', 'integer', 'exists:coach_appointment_slots,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);
        $athlete = $request->user();
        if (! $athlete || $athlete->role !== 'athlete' || ! $athlete->phone_verified_at) {
            return response()->json([
                'error' => 'رزرو جلسه تنها با شماره موبایل تأییدشده امکان‌پذیر است.',
                'code' => 'VERIFIED_PHONE_REQUIRED',
            ], 403);
        }

        try {
            return DB::transaction(function () use ($data, $athlete): JsonResponse {
                $slot = CoachAppointmentSlot::query()->lockForUpdate()->find($data['slot_id']);
                if (! $slot || ! $slot->is_active || $slot->starts_at->lessThanOrEqualTo(now()->addHours(2))) {
                    return response()->json(['error' => 'این زمان دیگر قابل رزرو نیست.'], 409);
                }
                if (CoachConsultationBooking::where('active_slot_id', $slot->id)->exists()) {
                    return response()->json(['error' => 'این زمان قبلاً رزرو شده است.'], 409);
                }
                $booking = CoachConsultationBooking::create([
                    'slot_id' => $slot->id,
                    'active_slot_id' => $slot->id,
                    'athlete_id' => $athlete->id,
                    'status' => 'requested',
                    'athlete_note' => $data['note'] ?? null,
                ]);
                return response()->json(['booking' => $this->athleteBooking($booking->load('slot'))], 201);
            }, 3);
        } catch (QueryException $e) {
            // Database UNIQUE(active_slot_id) also prevents double bookings across workers.
            if (in_array((string) $e->getCode(), ['23000', '23505', '19'], true)) {
                return response()->json(['error' => 'این زمان قبلاً رزرو شده است.', 'code' => 'SLOT_CONFLICT'], 409);
            }
            throw $e;
        }
    }

    public function mine(Request $request): JsonResponse
    {
        $bookings = CoachConsultationBooking::with('slot:id,starts_at,ends_at')
            ->where('athlete_id', $request->user()->id)->orderByDesc('id')->limit(100)->get();

        return response()->json(['bookings' => $bookings->map(fn ($b) => $this->athleteBooking($b))]);
    }

    public function cancelMine(Request $request, CoachConsultationBooking $booking): JsonResponse
    {
        if ($booking->athlete_id !== $request->user()->id) {
            return response()->json(['error' => 'رزرو یافت نشد.'], 404);
        }
        return $this->cancel($booking, false);
    }

    public function slots(): JsonResponse
    {
        $slots = CoachAppointmentSlot::with(['activeBooking' => fn ($q) => $q->with('athlete:id,name,phone')])
            ->orderByDesc('starts_at')->limit(150)->get();
        return response()->json(['slots' => $slots]);
    }

    public function createSlot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);
        $starts = Carbon::parse($data['starts_at'], config('app.timezone'))->timezone(config('app.timezone'));
        $ends = Carbon::parse($data['ends_at'], config('app.timezone'))->timezone(config('app.timezone'));
        $minutes = $starts->diffInMinutes($ends);
        if ($starts->lessThan(now()->addHour()) || $starts->greaterThan(now()->addDays(120))
            || $minutes < 15 || $minutes > 180) {
            return response()->json(['error' => 'زمان جلسه باید در آینده و به مدت ۱۵ تا ۱۸۰ دقیقه باشد.'], 422);
        }

        return DB::transaction(function () use ($request, $starts, $ends): JsonResponse {
            // Lock the FIRST admin row, common across every manager session,
            // to serialize overlapping-slot creation by multiple admins.
            User::where('role', 'admin')->orderBy('id')->lockForUpdate()->firstOrFail();
            $overlap = CoachAppointmentSlot::where('is_active', true)
                ->where('starts_at', '<', $ends)->where('ends_at', '>', $starts)->exists();
            if ($overlap || CoachAppointmentSlot::where('starts_at', $starts)->exists()) {
                return response()->json(['error' => 'این بازه یا زمان شروع قبلاً ثبت شده است.'], 409);
            }
            $slot = CoachAppointmentSlot::create([
                'starts_at' => $starts, 'ends_at' => $ends,
                'created_by' => $request->user()->id, 'is_active' => true,
            ]);
            return response()->json(['slot' => $slot], 201);
        }, 3);
    }

    public function disableSlot(CoachAppointmentSlot $slot): JsonResponse
    {
        return DB::transaction(function () use ($slot): JsonResponse {
            $locked = CoachAppointmentSlot::whereKey($slot->id)->lockForUpdate()->firstOrFail();
            if (CoachConsultationBooking::where('active_slot_id', $locked->id)->exists()) {
                return response()->json(['error' => 'ابتدا رزرو فعال این زمان را لغو کنید.'], 409);
            }
            $locked->update(['is_active' => false]);
            return response()->json(['ok' => true]);
        }, 3);
    }

    public function smsStatus(): JsonResponse
    {
        // No phone, token or SMS body is ever returned to dashboard clients.
        $recent = CoachSmsOutbox::query()->orderByDesc('id')->limit(50)
            ->get(['id', 'booking_id', 'recipient_kind', 'state', 'attempt_count', 'last_error_code', 'created_at']);
        return response()->json([
            'recent' => $recent,
            'unknown_count' => CoachSmsOutbox::where('state', 'unknown')->count(),
        ]);
    }

    public function bookings(): JsonResponse
    {
        $bookings = CoachConsultationBooking::with(['slot:id,starts_at,ends_at', 'athlete:id,name,phone'])
            ->orderByDesc('id')->limit(150)->get();
        return response()->json(['bookings' => $bookings]);
    }

    public function updateBooking(Request $request, CoachConsultationBooking $booking): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'completed', 'cancelled'])],
            'coach_note' => ['nullable', 'string', 'max:500'],
        ]);
        if ($data['status'] === 'cancelled') {
            return $this->cancel($booking, true);
        }
        return DB::transaction(function () use ($booking, $data): JsonResponse {
            $locked = CoachConsultationBooking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            $allowed = $data['status'] === 'confirmed'
                ? $locked->status === 'requested'
                : $locked->status === 'confirmed';
            if (! $allowed || ! $locked->active_slot_id) {
                return response()->json(['error' => 'تغییر وضعیت رزرو مجاز نیست.'], 409);
            }
            $locked->update(['status' => $data['status'], 'coach_note' => $data['coach_note'] ?? $locked->coach_note]);
            // Queue only on transition requested -> confirmed; never send on mere request.
            if ($data['status'] === 'confirmed') {
                app(BookingSmsOutbox::class)->queueConfirmation($locked->load(['slot', 'athlete']));
            }
            return response()->json(['booking' => $locked->refresh()]);
        }, 3);
    }

    private function cancel(CoachConsultationBooking $booking, bool $admin): JsonResponse
    {
        return DB::transaction(function () use ($booking, $admin): JsonResponse {
            $locked = CoachConsultationBooking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            if (! in_array($locked->status, ['requested', 'confirmed'], true)) {
                return response()->json(['error' => 'این رزرو قابل لغو نیست.'], 409);
            }
            if (! $admin && $locked->slot()->first()?->starts_at->lessThanOrEqualTo(now()->addHours(2))) {
                return response()->json(['error' => 'لغو آنلاین کمتر از دو ساعت مانده به جلسه مجاز نیست.'], 409);
            }
            $locked->update(['status' => 'cancelled', 'active_slot_id' => null, 'cancelled_at' => now()]);
            return response()->json(['ok' => true]);
        }, 3);
    }

    private function athleteBooking(CoachConsultationBooking $booking): array
    {
        return [
            'id' => $booking->id,
            'status' => $booking->status,
            'starts_at' => $booking->slot?->starts_at?->toIso8601String(),
            'ends_at' => $booking->slot?->ends_at?->toIso8601String(),
            'athlete_note' => $booking->athlete_note,
            'coach_note' => $booking->coach_note,
        ];
    }
}
