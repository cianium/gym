<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\MediaFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class MediaController
{
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    public function index(): JsonResponse
    {
        $files = MediaFile::orderByDesc('created_at')->limit(200)->get()->map(fn (MediaFile $m) => [
            'id' => $m->id,
            'url' => $m->public_url,
            'filename' => $m->filename,
            'originalName' => $m->original_name,
            'mimeType' => $m->mime_type,
            'sizeBytes' => (int) $m->size_bytes,
            'createdAt' => $m->created_at?->toIso8601String(),
        ]);

        return response()->json([
            'ok' => true,
            'media' => $files,
        ]);
    }

    /**
     * Public HTTP GET handler for /media/{filename}.
     * Serves public brand/product images from storage/app/public/media (and never private_downloads).
     */
    public function serve(string $filename): BinaryFileResponse|StreamedResponse|JsonResponse
    {
        $cleanName = basename($filename);
        if (! preg_match('/^media_[a-f0-9\-]{36}\.(jpg|png|webp)$/i', $cleanName)) {
            return response()->json([
                'error' => 'نام فایل رسانه معتبر نیست.',
                'code' => 'INVALID_MEDIA_FILENAME',
            ], 404);
        }

        $relativePath = 'media/' . $cleanName;
        if (! Storage::disk('public')->exists($relativePath)) {
            $publicMirror = public_path('media/' . $cleanName);
            if (is_file($publicMirror) && is_readable($publicMirror)) {
                $ext = strtolower(pathinfo($cleanName, PATHINFO_EXTENSION));
                $mime = match ($ext) {
                    'png' => 'image/png',
                    'webp' => 'image/webp',
                    default => 'image/jpeg',
                };
                return response()->file($publicMirror, [
                    'Content-Type' => $mime,
                    'Cache-Control' => 'public, max-age=31536000, immutable',
                    'X-Content-Type-Options' => 'nosniff',
                    'Content-Security-Policy' => "default-src 'none'",
                ]);
            }

            return response()->json([
                'error' => 'فایل تصویر یافت نشد.',
                'code' => 'MEDIA_NOT_FOUND',
            ], 404);
        }

        $mediaRecord = MediaFile::where('filename', $cleanName)->first();
        $ext = strtolower(pathinfo($cleanName, PATHINFO_EXTENSION));
        $mimeType = $mediaRecord?->mime_type ?: match ($ext) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        $fullPath = Storage::disk('public')->path($relativePath);

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'",
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->hasFile('file')) {
            return response()->json([
                'error' => 'هیچ فایل تصویری برای بارگذاری ارسال نشده است.',
                'code' => 'MEDIA_FILE_REQUIRED',
            ], 422);
        }

        $uploaded = $request->file('file');
        if (! $uploaded || ! $uploaded->isValid()) {
            return response()->json([
                'error' => 'فایل ارسال‌شده معتبر نیست یا ناقص بارگذاری شده است.',
                'code' => 'INVALID_MEDIA_UPLOAD',
            ], 422);
        }

        $sizeBytes = (int) $uploaded->getSize();
        if ($sizeBytes <= 0 || $sizeBytes > self::MAX_SIZE_BYTES) {
            return response()->json([
                'error' => 'حجم تصویر نباید بیشتر از ۵ مگابایت باشد.',
                'code' => 'MEDIA_FILE_TOO_LARGE',
            ], 422);
        }

        $realPath = $uploaded->getRealPath();
        $detectedMime = $realPath ? (string) @mime_content_type($realPath) : (string) $uploaded->getMimeType();
        if (! isset(self::ALLOWED_MIMES[$detectedMime])) {
            return response()->json([
                'error' => 'فرمت فایل مجاز نیست. فقط تصاویر استاندارد JPG, PNG و WebP پذیرفته می‌شوند.',
                'code' => 'UNSUPPORTED_MEDIA_MIME',
            ], 422);
        }

        // Verify actual image header / dimensions to prevent disguised script uploads
        $imageInfo = $realPath ? @getimagesize($realPath) : false;
        if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
            return response()->json([
                'error' => 'ساختار باینری تصویر معتبر نیست (فایل مخرب یا غیرتصویری مسدود شد).',
                'code' => 'INVALID_IMAGE_BINARY',
            ], 422);
        }

        $ext = self::ALLOWED_MIMES[$detectedMime];
        $randomFilename = 'media_' . Str::uuid()->toString() . '.' . $ext;
        $directory = 'media';
        $relativePath = $directory . '/' . $randomFilename;

        try {
            $storedPath = Storage::disk('public')->putFileAs($directory, $uploaded, $randomFilename);
            if (! $storedPath || ! Storage::disk('public')->exists($relativePath)) {
                return response()->json([
                    'error' => 'ذخیره‌سازی فایل تصویر در دیسک سرور با خطا مواجه شد.',
                    'code' => 'MEDIA_STORAGE_WRITE_FAILED',
                ], 500);
            }

            // Optional mirror into public_html/media for direct static web server delivery on shared hosting
            $publicMediaDir = public_path('media');
            if (is_dir($publicMediaDir) || @mkdir($publicMediaDir, 0755, true)) {
                if (is_writable($publicMediaDir) && $realPath) {
                    @copy(Storage::disk('public')->path($relativePath), $publicMediaDir . DIRECTORY_SEPARATOR . $randomFilename);
                }
            }
        } catch (Throwable) {
            return response()->json([
                'error' => 'خطای سیستمی هنگام نوشتن فایل تصویر در فضای ذخیره‌سازی هاست.',
                'code' => 'MEDIA_STORAGE_EXCEPTION',
            ], 500);
        }

        $publicUrl = '/media/' . $randomFilename;
        $media = MediaFile::create([
            'disk' => 'public',
            'directory' => $directory,
            'filename' => $randomFilename,
            'original_name' => substr((string) $uploaded->getClientOriginalName(), 0, 250),
            'mime_type' => $detectedMime,
            'size_bytes' => $sizeBytes,
            'public_url' => $publicUrl,
            'uploaded_by' => (string) ($request->user()?->email ?? 'admin'),
        ]);

        AuditLog::create([
            'action' => 'ADMIN_MEDIA_UPLOADED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "بارگذاری فایل رسانه {$randomFilename} ({$detectedMime}, {$sizeBytes} bytes)",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'media' => [
                'id' => $media->id,
                'url' => $media->public_url,
                'filename' => $media->filename,
                'mimeType' => $media->mime_type,
                'sizeBytes' => (int) $media->size_bytes,
            ],
        ], 201);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $media = MediaFile::find($id);
        if (! $media) {
            return response()->json([
                'error' => 'فایل رسانه یافت نشد.',
                'code' => 'MEDIA_NOT_FOUND',
            ], 404);
        }

        $relativePath = trim($media->directory . '/' . $media->filename, '/');
        try {
            if (Storage::disk($media->disk)->exists($relativePath)) {
                $deleted = Storage::disk($media->disk)->delete($relativePath);
                if (! $deleted && Storage::disk($media->disk)->exists($relativePath)) {
                    return response()->json([
                        'error' => 'حذف فیزیکی فایل از فضای ذخیره‌سازی سرور انجام نشد.',
                        'code' => 'MEDIA_STORAGE_DELETE_FAILED',
                    ], 500);
                }
            }

            $publicMirror = public_path('media/' . basename($media->filename));
            if (is_file($publicMirror)) {
                @unlink($publicMirror);
            }
        } catch (Throwable) {
            return response()->json([
                'error' => 'خطا در حذف فایل از فضای ذخیره‌سازی هاست.',
                'code' => 'MEDIA_STORAGE_DELETE_EXCEPTION',
            ], 500);
        }

        $filename = $media->filename;
        $media->delete();

        AuditLog::create([
            'action' => 'ADMIN_MEDIA_DELETED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "حذف فایل رسانه {$filename} از فضای ذخیره‌سازی هاست",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'deletedId' => $id,
        ]);
    }
}
