<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Services\Notifications\MeliPayamakReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Database\QueryException;

class AthleteRegistrationController
{
    private function normalizePhone(string $phone): string
    {
        $phone = strtr(trim($phone), ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
        if (str_starts_with($phone, '+98')) $phone = '0'.substr($phone, 3);
        if (str_starts_with($phone, '0098')) $phone = '0'.substr($phone, 4);
        return $phone;
    }

    public function requestCode(Request $request): JsonResponse
    {
        $data = $request->validate(['phone'=>['required','string','max:25']]);
        $phone = $this->normalizePhone($data['phone']);
        if (!preg_match('/^09[0-9]{9}$/D', $phone)) return response()->json(['error'=>'شماره موبایل معتبر نیست.'], 422);
        // Do not reveal registered numbers to anonymous callers. A signed-in
        // athlete is allowed to verify their OWN coach-created account.
        $phoneVariants = [$phone, '+98' . substr($phone, 1), '0098' . substr($phone, 1)];
        $existingOwner = User::whereIn('phone', $phoneVariants)->first();
        $sameUnverifiedAthlete = $existingOwner && $request->user()
            && $existingOwner->id === $request->user()->id
            && $existingOwner->role === 'athlete'
            && ! $existingOwner->phone_verified_at;
        if ($existingOwner && ! $sameUnverifiedAthlete) {
            return response()->json(['ok' => true, 'expires_in_seconds' => 300]);
        }
        $token = config('services.athlete_sms.token');
        $bodyId = config('services.athlete_sms.body_id');
        if (! $token || ! $bodyId) return response()->json(['error' => 'سرویس پیامک فعال نیست.'], 503);

        $code = (string) random_int(100000, 999999);
        $codeHash = hash_hmac('sha256', $code, (string) config('app.key'));
        // Reserve the OTP BEFORE contacting the SMS provider. Concurrent callers
        // cannot overwrite a code that may already have been sent to the user.
        try {
            $reserved = DB::transaction(function () use ($phone, $codeHash): bool {
                $entry = DB::table('athlete_phone_verifications')
                    ->where('phone', $phone)->lockForUpdate()->first();
                if ($entry && $entry->updated_at &&
                    \Illuminate\Support\Carbon::parse($entry->updated_at)->greaterThan(now()->subSeconds(120))) {
                    return false;
                }
                $fields = [
                    'code_hash' => $codeHash, 'attempts' => 0,
                    'expires_at' => now()->addMinutes(5), 'verified_at' => null,
                    'updated_at' => now(),
                ];
                if ($entry) {
                    DB::table('athlete_phone_verifications')->where('id', $entry->id)->update($fields);
                } else {
                    DB::table('athlete_phone_verifications')->insert(array_merge(
                        ['phone' => $phone, 'created_at' => now()], $fields
                    ));
                }
                return true;
            }, 3);
        } catch (QueryException $e) {
            // Unique(phone) also handles two simultaneous first requests.
            if (in_array((string) $e->getCode(), ['23000', '23505', '19'], true)) {
                return response()->json(['error' => 'لطفاً دو دقیقه بعد دوباره تلاش کنید.'], 429);
            }
            throw $e;
        }
        if (! $reserved) return response()->json(['error' => 'لطفاً دو دقیقه بعد دوباره تلاش کنید.'], 429);

        try {
            $response = Http::timeout(8)->acceptJson()->post('https://console.melipayamak.com/api/send/shared/'.rawurlencode($token), [
                'bodyId'=>(int)$bodyId, 'to'=>$phone, 'args'=>[$code],
            ]);
            $result = MeliPayamakReceipt::classify($response);
            if ($result['state'] !== 'accepted') {
                // Do not remove the reserved code on an ambiguous provider response:
                // the SMS may have been delivered, and re-sending would be unsafe.
                Log::warning('Athlete OTP provider did not confirm acceptance', [
                    'http_status' => $response->status(),
                    'outcome' => $result['state'],
                ]);
                return response()->json([
                    'error' => $result['state'] === 'unknown'
                        ? 'وضعیت ارسال پیامک مشخص نیست؛ در صورت دریافت کد از همان کد استفاده کنید.'
                        : 'سرویس پیامک درخواست را نپذیرفت. لطفاً بعداً تلاش کنید.',
                    'code' => $result['state'] === 'unknown' ? 'OTP_PROVIDER_UNKNOWN' : 'OTP_PROVIDER_REJECTED',
                ], 503);
            }
        } catch (\Throwable $e) {
            Log::warning('Athlete OTP provider request failed', ['type'=>get_class($e)]);
            return response()->json(['error'=>'وضعیت ارسال پیامک مشخص نیست؛ اگر کد رسید از همان استفاده کنید.', 'code' => 'OTP_PROVIDER_UNKNOWN'], 503);
        }
        return response()->json(['ok'=>true,'expires_in_seconds'=>300]);
    }

    public function requestLoggedInCode(Request $request): JsonResponse
    {
        $athlete = $request->user();
        if (! $athlete || $athlete->role !== 'athlete') {
            return response()->json(['error' => 'نشست ورزشکار معتبر نیست.'], 401);
        }
        if ($athlete->phone_verified_at) return response()->json(['ok' => true, 'already_verified' => true]);
        $request->merge(['phone' => $athlete->phone]);
        return $this->requestCode($request);
    }

    public function verifyLoggedInCode(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $athleteId = $request->user()->id;
        return DB::transaction(function () use ($data, $athleteId): JsonResponse {
            $athlete = User::whereKey($athleteId)->lockForUpdate()->first();
            if (! $athlete || $athlete->role !== 'athlete') {
                return response()->json(['error' => 'نشست معتبر نیست.'], 401);
            }
            if ($athlete->phone_verified_at) return response()->json(['ok' => true, 'already_verified' => true]);
            $entry = DB::table('athlete_phone_verifications')->where('phone', $this->normalizePhone((string) $athlete->phone))
                ->lockForUpdate()->first();
            if (! $entry || $entry->verified_at || now()->greaterThan($entry->expires_at) || $entry->attempts >= 5) {
                return response()->json(['error' => 'کد منقضی یا نامعتبر است.'], 422);
            }
            DB::table('athlete_phone_verifications')->where('id', $entry->id)->increment('attempts');
            if (! hash_equals((string) $entry->code_hash,
                hash_hmac('sha256', $data['code'], (string) config('app.key')))) {
                return response()->json(['error' => 'کد منقضی یا نامعتبر است.'], 422);
            }
            $athlete->forceFill(['phone_verified_at' => now()])->save();
            DB::table('athlete_phone_verifications')->where('id', $entry->id)->delete();
            return response()->json(['ok' => true, 'phone_verified' => true]);
        }, 3);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'=>['required','string','max:120'], 'phone'=>['required','string','max:25'],
            'code'=>['required','digits:6'], 'password'=>['required','string','min:10','max:128','confirmed'],
        ]);
        $phone = $this->normalizePhone($data['phone']);
        if (!preg_match('/^09[0-9]{9}$/D', $phone)) return response()->json(['error'=>'شماره موبایل معتبر نیست.'],422);
        return DB::transaction(function () use ($data,$phone,$request) {
            $entry = DB::table('athlete_phone_verifications')->where('phone',$phone)->lockForUpdate()->first();
            if (!$entry || $entry->verified_at || now()->greaterThan($entry->expires_at) || $entry->attempts >= 5) {
                return response()->json(['error'=>'کد منقضی یا نامعتبر است.'],422);
            }
            DB::table('athlete_phone_verifications')->where('id',$entry->id)->increment('attempts');
            if (!hash_equals($entry->code_hash,hash_hmac('sha256',$data['code'],config('app.key')))) {
                return response()->json(['error'=>'کد منقضی یا نامعتبر است.'],422);
            }
            if (User::whereIn('phone', [$phone, '+98'.substr($phone,1), '0098'.substr($phone,1)])->exists()) {
                return response()->json(['error'=>'شماره قبلاً ثبت شده است.'],409);
            }
            $user = User::create(['name'=>$data['name'],'phone'=>$phone,'role'=>'athlete','password'=>Hash::make($data['password'])]);
            $user->forceFill(['phone_verified_at'=>now()])->save();
            DB::table('athlete_phone_verifications')->where('id',$entry->id)->delete();
            Auth::login($user);
            $request->session()->regenerate();
            return response()->json(['registered'=>true, 'authenticated'=>true,
                'csrfToken'=>$request->session()->token()],201);
        });
    }
}
