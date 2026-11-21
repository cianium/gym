<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\TrainingPlan;
use App\Models\TrainingProgress;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TrainingPlanAdminController
{
    public function athletes(): JsonResponse
    {
        return response()->json(['athletes' => User::where('role', 'athlete')->orderBy('id')->get(['id', 'name', 'email', 'phone'])]);
    }

    public function createAthlete(Request $request): JsonResponse
    {
        // Normalize at the trust boundary, not after the unique validation.
        $phone = strtr(trim((string) $request->input('phone', '')), ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
        if (str_starts_with($phone, '+98')) $phone = '0'.substr($phone, 3);
        if (str_starts_with($phone, '0098')) $phone = '0'.substr($phone, 4);
        $request->merge([
            'phone' => $phone,
            'email' => strtolower(trim((string) $request->input('email', ''))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'phone' => ['required', 'string', 'regex:/^09[0-9]{9}$/D', 'unique:users,phone'],
            'password' => ['required', 'string', 'min:12', 'max:255'],
        ]);
        $data['email'] = strtolower(trim($data['email']));
        $data['role'] = 'athlete';
        $user = User::create($data);
        return response()->json(['athlete' => $user->only(['id', 'name', 'email', 'phone'])], 201);
    }

    public function athleteProgress(User $athlete): JsonResponse
    {
        if ($athlete->role !== 'athlete') return response()->json(['error' => 'ورزشکار یافت نشد.'], 404);
        return response()->json(['progress' => TrainingProgress::where('athlete_id', $athlete->id)
            ->orderByDesc('performed_on')->limit(100)->get()]);
    }

    public function index(): JsonResponse
    {
        return response()->json(['plans' => TrainingPlan::orderByDesc('id')->paginate(30)]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $athlete = User::where('role', 'athlete')->find($data['athlete_id']);
        if (! $athlete) return response()->json(['error' => 'ورزشکار معتبر نیست.'], 422);
        $data['coach_id'] = $request->user()->id;
        $plan = TrainingPlan::create($data);
        return response()->json(['plan' => $plan], 201);
    }

    public function update(Request $request, TrainingPlan $plan): JsonResponse
    {
        $data = $this->validated($request);
        if (! User::where('role', 'athlete')->whereKey($data['athlete_id'])->exists()) {
            return response()->json(['error' => 'ورزشکار معتبر نیست.'], 422);
        }
        $plan->update($data);
        return response()->json(['plan' => $plan->refresh()]);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'athlete_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:10000'],
            'sessions' => ['required', 'array', 'min:1', 'max:30'],
            'sessions.*.day' => ['required', 'string', 'max:80'],
            'sessions.*.exercises' => ['required', 'array', 'min:1', 'max:40'],
            'sessions.*.exercises.*.name' => ['required', 'string', 'max:180'],
            'sessions.*.exercises.*.sets' => ['nullable', 'integer', 'min:1', 'max:30'],
            'sessions.*.exercises.*.reps' => ['nullable', 'string', 'max:60'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
        ]);
    }
}
