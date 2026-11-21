<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\ConsultationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ConsultationController
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'senderName' => ['required', 'string', 'min:2', 'max:120'],
            'senderPhone' => ['required', 'string', 'min:10', 'max:24', 'regex:/^\+?[0-9\s()-]{10,24}$/'],
            'goalTopic' => ['nullable', 'string', 'max:160'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $consultation = ConsultationRequest::create([
            'id' => 'cons-' . Str::uuid()->toString(),
            'sender_name' => $validated['senderName'],
            'sender_phone' => $validated['senderPhone'],
            'goal_topic' => $validated['goalTopic'] ?? 'مشاوره برنامه تمرینی',
            'message' => $validated['message'] ?? '',
            'status' => 'new',
        ]);

        return response()->json([
            'ok' => true,
            // Public response is intentionally minimal: never echo personal
            // phone numbers or free-text coaching/health-related messages.
            'consultation' => [
                'id' => $consultation->id,
                'status' => $consultation->status,
            ],
        ], 201);
    }
}
