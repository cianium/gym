<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\CoachMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CoachMessageController
{
    private function messages(int $athleteId): JsonResponse
    {
        $items = CoachMessage::where('athlete_id', $athleteId)->orderByDesc('id')
            ->limit(100)->get(['id', 'athlete_id', 'sender_id', 'body', 'created_at', 'read_by_athlete_at', 'read_by_coach_at']);
        return response()->json(['messages' => $items->reverse()->values()]);
    }

    public function athleteIndex(Request $request): JsonResponse
    {
        return $this->messages($request->user()->id);
    }

    public function athleteSend(Request $request): JsonResponse
    {
        $data = $request->validate(['body' => ['required', 'string', 'min:1', 'max:2000']]);
        $body = trim($data['body']);
        if ($body === '') return response()->json(['error' => 'متن پیام نمی‌تواند خالی باشد.'], 422);
        $user = $request->user();
        $message = CoachMessage::create([
            'athlete_id' => $user->id, 'sender_id' => $user->id, 'body' => $body,
            'read_by_athlete_at' => now(),
        ]);
        return response()->json(['message' => $message->only(['id', 'body', 'created_at'])], 201);
    }

    public function athleteRead(Request $request): JsonResponse
    {
        CoachMessage::where('athlete_id', $request->user()->id)
            ->where('sender_id', '!=', $request->user()->id)->whereNull('read_by_athlete_at')
            ->update(['read_by_athlete_at' => now()]);
        return response()->json(['ok' => true]);
    }

    private function verifiedAthlete(User $athlete): bool
    {
        return $athlete->role === 'athlete';
    }

    public function adminIndex(User $athlete): JsonResponse
    {
        if (! $this->verifiedAthlete($athlete)) return response()->json(['error' => 'ورزشکار یافت نشد.'], 404);
        return $this->messages($athlete->id);
    }

    public function adminSend(Request $request, User $athlete): JsonResponse
    {
        if (! $this->verifiedAthlete($athlete)) return response()->json(['error' => 'ورزشکار یافت نشد.'], 404);
        $data = $request->validate(['body' => ['required', 'string', 'min:1', 'max:2000']]);
        $body = trim($data['body']);
        if ($body === '') return response()->json(['error' => 'متن پیام نمی‌تواند خالی باشد.'], 422);
        $message = CoachMessage::create([
            'athlete_id' => $athlete->id, 'sender_id' => $request->user()->id,
            'body' => $body, 'read_by_coach_at' => now(),
        ]);
        return response()->json(['message' => $message->only(['id', 'body', 'created_at'])], 201);
    }

    public function adminRead(User $athlete): JsonResponse
    {
        if (! $this->verifiedAthlete($athlete)) return response()->json(['error' => 'ورزشکار یافت نشد.'], 404);
        CoachMessage::where('athlete_id', $athlete->id)->where('sender_id', $athlete->id)
            ->whereNull('read_by_coach_at')->update(['read_by_coach_at' => now()]);
        return response()->json(['ok' => true]);
    }
}
