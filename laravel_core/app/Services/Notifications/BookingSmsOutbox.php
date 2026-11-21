<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use App\Models\CoachConsultationBooking;
use App\Models\CoachSmsOutbox;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * An idempotent transactional outbox inspired by the Barbershop SMS workflow.
 * A network timeout is AMBIGUOUS: mark unknown, never blindly resend.
 */
class BookingSmsOutbox
{
    public static function normalizePhone(string $phone): ?string
    {
        $phone = strtr(trim($phone), ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
        if (str_starts_with($phone, '+98')) $phone = '0' . substr($phone, 3);
        if (str_starts_with($phone, '0098')) $phone = '0' . substr($phone, 4);
        return preg_match('/^09[0-9]{9}$/D', $phone) ? $phone : null;
    }

    /** Call within the same transaction that confirms the booking. */
    public function queueConfirmation(CoachConsultationBooking $booking): void
    {
        $booking->loadMissing(['slot', 'athlete']);
        if ($booking->status !== 'confirmed' || ! $booking->active_slot_id || ! $booking->slot) return;

        // Template MUST be configured at MeliPayamak with args in exactly this order:
        // [booking reference, local appointment date, local appointment time].
        $args = [
            'AF-' . $booking->id,
            $booking->slot->starts_at->format('Y/m/d'),
            $booking->slot->starts_at->format('H:i'),
        ];
        $recipients = [
            'athlete' => $booking->athlete?->phone,
            'coach' => (string) config('services.booking_sms.coach_phone'),
        ];
        foreach ($recipients as $recipientKind => $phone) {
            $normalized = self::normalizePhone((string) $phone);
            if (! $normalized) continue;
            CoachSmsOutbox::firstOrCreate(
                ['event_key' => 'coaching_booking_confirmed:' . $booking->id . ':' . $recipientKind],
                [
                    'booking_id' => $booking->id, 'recipient_kind' => $recipientKind,
                    'recipient_phone' => $normalized, 'template_args' => $args,
                    'state' => 'queued',
                ]
            );
        }
    }

    public function dispatch(int $limit = 10): array
    {
        if (! config('services.booking_sms.token') || ! (int) config('services.booking_sms.body_id')) {
            return ['disabled' => true, 'sent' => 0, 'failed' => 0, 'unknown' => 0];
        }
        // A crash after an external send cannot be assumed to mean failure.
        // Do not retry expired leases automatically; this prevents duplicate SMS.
        CoachSmsOutbox::where('state', 'sending')->where('lease_until', '<', now())
            ->update(['state' => 'unknown', 'last_error_code' => 'lease_expired']);
        $summary = ['disabled' => false, 'sent' => 0, 'failed' => 0, 'unknown' => 0];
        $ids = CoachSmsOutbox::where('state', 'queued')->orderBy('id')->limit(max(1, min(30, $limit)))
            ->pluck('id');

        foreach ($ids as $id) {
            $job = DB::transaction(function () use ($id): ?CoachSmsOutbox {
                $row = CoachSmsOutbox::whereKey($id)->lockForUpdate()->first();
                if (! $row || $row->state !== 'queued') return null;
                $row->update([
                    'state' => 'sending', 'attempt_count' => $row->attempt_count + 1,
                    'lease_until' => now()->addMinutes(2),
                ]);
                return $row;
            }, 3);
            if (! $job) continue;
            try {
                $response = Http::timeout(8)->acceptJson()->post(
                    'https://console.melipayamak.com/api/send/shared/' . rawurlencode((string) config('services.booking_sms.token')),
                    [
                        'bodyId' => (int) config('services.booking_sms.body_id'),
                        'to' => $job->recipient_phone,
                        'args' => $job->template_args,
                    ]
                );
                $providerResult = MeliPayamakReceipt::classify($response);
                if ($providerResult['state'] === 'accepted') {
                    $job->update([
                        'state' => 'sent', 'provider_receipt' => $providerResult['receipt'], 'lease_until' => null,
                        'last_error_code' => null,
                    ]);
                    $summary['sent']++;
                    continue;
                }
                // A 5xx, 2xx without receipt, or malformed response might be
                // delivered despite our inability to prove it. Manual review.
                $ambiguous = $providerResult['state'] === 'unknown';
                $job->update([
                    'state' => $ambiguous ? 'unknown' : 'failed', 'lease_until' => null,
                    'last_error_code' => $ambiguous ? 'provider_ambiguous' : 'provider_rejected',
                ]);
                $summary[$ambiguous ? 'unknown' : 'failed']++;
            } catch (Throwable $e) {
                // Never log tokens, phone numbers, request bodies or template args.
                Log::warning('Booking SMS delivery outcome unknown', ['job_id' => $job->id, 'error_type' => get_class($e)]);
                $job->update(['state' => 'unknown', 'lease_until' => null, 'last_error_code' => 'transport_ambiguous']);
                $summary['unknown']++;
            }
        }

        return $summary;
    }
}
