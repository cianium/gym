<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\PageRevision;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RevisionController
{
    public function publish(Request $request): JsonResponse
    {
        $request->validate([
            'label' => ['nullable', 'string', 'max:190'],
            'sectionConfigs' => ['required', 'array'],
            'themeColors' => ['required', 'array'],
        ]);

        $nextVersion = ((int) PageRevision::max('version_number')) + 1;

        $revision = PageRevision::create([
            'version_number' => $nextVersion,
            'label' => $request->input('label') ?: "نسخه منتشرشده v{$nextVersion}",
            'created_by' => (string) ($request->user()?->email ?? 'admin'),
            'status' => 'published',
            'sections_snapshot' => $request->input('sectionConfigs'),
            'theme_snapshot' => $request->input('themeColors'),
            'created_at' => now(),
        ]);

        AuditLog::create([
            'action' => 'PAGE_REVISION_PUBLISHED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "انتشار نسخه چیدمان v{$nextVersion}",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'revision' => $revision,
            'revisions' => PageRevision::orderByDesc('version_number')->limit(30)->get(),
        ], 201);
    }

    public function restore(Request $request, string $id): JsonResponse
    {
        $revision = PageRevision::findOrFail($id);

        AuditLog::create([
            'action' => 'PAGE_REVISION_RESTORED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "بازگردانی نسخه چیدمان v{$revision->version_number}",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'sectionConfigs' => $revision->sections_snapshot,
            'themeColors' => $revision->theme_snapshot,
        ]);
    }
}
