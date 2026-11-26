<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\TrainingPlan;
use App\Models\Order;
use App\Models\TrainingProgress;
use Illuminate\Validation\Rule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AthletePortalController
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['identifier' => ['required', 'string', 'max:255'], 'password' => ['required', 'string', 'max:255']]);
        $identifier = trim($data['identifier']);
        $phone = strtr($identifier, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
        if (str_starts_with($phone, '+98')) $phone = '0'.substr($phone, 3);
        if (str_starts_with($phone, '0098')) $phone = '0'.substr($phone, 4);
        $isPhone = (bool) preg_match('/^09[0-9]{9}$/D', $phone);
        if (! $isPhone && ! filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
            return response()->json(['error' => 'اطلاعات ورود نامعتبر است.'], 401);
        }
        $user = User::where('role', 'athlete')
            ->where($isPhone ? 'phone' : 'email', $isPhone ? $phone : strtolower($identifier))->first();
        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['error' => 'اطلاعات ورود نامعتبر است.'], 401);
        }
        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        return response()->json(['authenticated' => true, 'csrfToken' => $request->session()->token(), 'athlete' => ['id' => $user->id, 'name' => $user->name]]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json(['athlete' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone, 'phone_verified' => (bool) $user->phone_verified_at], 'csrfToken' => $request->session()->token()]);
    }

    public function orders(Request $request): JsonResponse
    {
        $athlete = $request->user();
        if (! $athlete->phone_verified_at) {
            return response()->json([
                'error' => 'برای مشاهده سوابق خرید، تأیید مالکیت شماره موبایل الزامی است.',
                'code' => 'VERIFIED_PHONE_REQUIRED',
            ], 403);
        }
        $phone = (string) $athlete->phone;
        if (! preg_match('/^09[0-9]{9}$/D', $phone)) {
            return response()->json(['error' => 'شماره تلفن معتبر نیست.'], 422);
        }
        $knownVariants = [$phone, '+98' . substr($phone, 1), '0098' . substr($phone, 1)];
        $orders = Order::with('items:id,order_id,title,qty')
            ->whereIn('customer_phone', $knownVariants)->orderByDesc('created_at')->limit(50)
            ->get();
        // Intentionally omit access tokens, postal addresses and financial secrets.
        return response()->json(['orders' => $orders->map(static fn (Order $order): array => [
            'id' => $order->id,
            'number' => $order->order_number,
            'payment_status' => $order->payment_status,
            'fulfillment_status' => $order->fulfillment_status,
            'amount_toman' => (int) $order->total_amount_toman,
            'created_at' => $order->created_at?->toIso8601String(),
            'items' => $order->items->map(static fn ($item): array => [
                'title' => $item->title, 'qty' => (int) $item->qty,
            ])->all(),
        ])]);
    }

    public function plans(Request $request): JsonResponse
    {
        return response()->json(['plans' => TrainingPlan::query()->where('athlete_id', $request->user()->id)->where('status', 'published')->orderByDesc('created_at')->get()]);
    }

    public function progress(Request $request): JsonResponse
    {
        return response()->json(['progress' => TrainingProgress::where('athlete_id', $request->user()->id)
            ->orderByDesc('performed_on')->limit(100)->get()]);
    }

    public function saveProgress(Request $request): JsonResponse
    {
        $data = $request->validate([
            'training_plan_id' => ['required', 'integer'],
            'performed_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'session_day' => ['required', 'string', 'max:80'],
            'effort' => ['nullable', 'integer', 'between:1,10'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        return DB::transaction(function () use ($request, $data): JsonResponse {
            $plan = TrainingPlan::where('athlete_id', $request->user()->id)
                ->where('status', 'published')->lockForUpdate()->find($data['training_plan_id']);
            if (! $plan) return response()->json(['error' => 'برنامه معتبر نیست.'], 404);
            $days = collect($plan->sessions ?? [])->pluck('day')->all();
            if (! in_array($data['session_day'], $days, true)) {
                return response()->json(['error' => 'روز تمرینی در برنامه وجود ندارد.'], 422);
            }
            $date = $data['performed_on'];
            if (($plan->starts_on && $date < $plan->starts_on->format('Y-m-d'))
                || ($plan->ends_on && $date > $plan->ends_on->format('Y-m-d'))) {
                return response()->json(['error' => 'تاریخ گزارش خارج از بازه برنامه است.'], 422);
            }
            $entry = TrainingProgress::updateOrCreate([
                'athlete_id' => $request->user()->id,
                'training_plan_id' => $plan->id,
                'performed_on' => $date,
                'session_day' => $data['session_day'],
            ], ['effort' => $data['effort'] ?? null, 'notes' => $data['notes'] ?? null]);
            return response()->json(['progress' => $entry]);
        }, 3);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok' => true]);
    }
}
