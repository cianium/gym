<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\ConsultationRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Admin-only follow-up inbox for existing public coaching consultation form. */
class CoachLeadController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'leads' => ConsultationRequest::orderByDesc('created_at')->limit(150)
                ->get(['id', 'sender_name', 'sender_phone', 'goal_topic', 'message', 'status', 'coach_notes', 'created_at']),
        ]);
    }

    public function update(Request $request, ConsultationRequest $lead): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['new', 'contacted', 'closed'])],
            'coach_notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $lead->update([
            'status' => $data['status'],
            'coach_notes' => $data['coach_notes'] ?? $lead->coach_notes,
        ]);
        return response()->json(['lead' => $lead->only(['id', 'status', 'coach_notes'])]);
    }
}
