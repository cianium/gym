<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\DigitalEntitlement;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class PrivateAssetController
{
    private const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

    /**
     * Admin-only endpoint to check private digital file availability and metadata for a product.
     */
    public function status(string $id): JsonResponse
    {
        $product = Product::find($id);
        if (! $product) {
            return response()->json([
                'error' => 'محصول موردنظر یافت نشد.',
                'code' => 'PRODUCT_NOT_FOUND',
            ], 404);
        }

        $filePath = $product->private_file_path ?: "{$product->id}.pdf";
        $exists = Storage::disk('private_downloads')->exists($filePath);
        $sizeBytes = $exists ? (int) Storage::disk('private_downloads')->size($filePath) : 0;
        $activeEntitlements = DigitalEntitlement::where('product_id', $product->id)
            ->where('is_revoked', false)
            ->count();

        return response()->json([
            'ok' => true,
            'productId' => $product->id,
            'privateFilePath' => $filePath,
            'fileExists' => $exists,
            'sizeBytes' => $sizeBytes,
            'fileVersion' => (int) ($product->file_version ?? 1),
            'activeEntitlements' => $activeEntitlements,
        ]);
    }

    /**
     * Admin-only endpoint to upload or update a private digital PDF training asset for a product.
     * Files are stored strictly on the 'private_downloads' disk outside public_html.
     */
    public function upload(Request $request, string $id): JsonResponse
    {
        $product = Product::find($id);
        if (! $product) {
            return response()->json([
                'error' => 'محصول موردنظر یافت نشد.',
                'code' => 'PRODUCT_NOT_FOUND',
            ], 404);
        }

        if ($product->type !== 'digital') {
            return response()->json([
                'error' => 'فقط محصولات از نوع دیجیتال می‌توانند فایل تمرینی خصوصی داشته باشند.',
                'code' => 'NOT_A_DIGITAL_PRODUCT',
            ], 422);
        }

        if (! $request->hasFile('file')) {
            return response()->json([
                'error' => 'هیچ فایل PDF برای بارگذاری ارسال نشده است.',
                'code' => 'PRIVATE_FILE_REQUIRED',
            ], 422);
        }

        $uploaded = $request->file('file');
        if (! $uploaded || ! $uploaded->isValid()) {
            return response()->json([
                'error' => 'فایل ارسال‌شده معتبر نیست.',
                'code' => 'INVALID_PRIVATE_UPLOAD',
            ], 422);
        }

        $sizeBytes = (int) $uploaded->getSize();
        if ($sizeBytes <= 0 || $sizeBytes > self::MAX_PDF_SIZE_BYTES) {
            return response()->json([
                'error' => 'حجم فایل برنامه تمرینی نباید بیشتر از ۵۰ مگابایت باشد.',
                'code' => 'PRIVATE_FILE_TOO_LARGE',
            ], 422);
        }

        $realPath = $uploaded->getRealPath();
        $headerBytes = $realPath ? (string) @file_get_contents($realPath, false, null, 0, 5) : '';
        if ($headerBytes !== '%PDF-') {
            return response()->json([
                'error' => 'فقط فایل‌های استاندارد PDF با ساختار معتبر (%PDF-) مجاز هستند.',
                'code' => 'INVALID_PDF_SIGNATURE',
            ], 422);
        }

        $nextVersion = ((int) ($product->file_version ?? 0)) + 1;
        $safeId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $product->id) ?: 'program';
        $filename = "program_{$safeId}_v{$nextVersion}_" . Str::uuid()->toString() . '.pdf';

        try {
            $stored = Storage::disk('private_downloads')->putFileAs('', $uploaded, $filename);
            if (! $stored || ! Storage::disk('private_downloads')->exists($filename)) {
                return response()->json([
                    'error' => 'ذخیره‌سازی فایل خصوصی در دیسک سرور انجام نشد.',
                    'code' => 'PRIVATE_STORAGE_WRITE_FAILED',
                ], 500);
            }
        } catch (Throwable) {
            return response()->json([
                'error' => 'خطا در ذخیره‌سازی امن فایل دیجیتال در فضای خصوصی سرور.',
                'code' => 'PRIVATE_STORAGE_EXCEPTION',
            ], 500);
        }

        $previousFile = $product->private_file_path;
        $humanSize = round($sizeBytes / 1024 / 1024, 2) . ' MB';

        DB::transaction(function () use ($product, $filename, $nextVersion, $humanSize, $request) {
            $product->private_file_path = $filename;
            $product->file_version = $nextVersion;
            $product->file_size = $humanSize;
            $product->save();

            AuditLog::create([
                'action' => 'ADMIN_PRIVATE_ASSET_UPLOADED',
                'actor' => (string) ($request->user()?->email ?? 'admin'),
                'ip_address' => (string) $request->ip(),
                'details' => "بارگذاری نسخه v{$nextVersion} فایل خصوصی محصول {$product->id} ({$filename})",
                'created_at' => now(),
            ]);
        });

        // Remove older versioned private file if it was replaced
        if ($previousFile && $previousFile !== $filename && $previousFile !== "{$product->id}.pdf") {
            if (Storage::disk('private_downloads')->exists($previousFile)) {
                @Storage::disk('private_downloads')->delete($previousFile);
            }
        }

        return response()->json([
            'ok' => true,
            'productId' => $product->id,
            'privateFilePath' => $filename,
            'fileVersion' => $nextVersion,
            'fileSize' => $humanSize,
            'sizeBytes' => $sizeBytes,
        ], 201);
    }

    /**
     * Admin-only endpoint to revoke a digital download entitlement (e.g. after order refund or chargeback).
     */
    public function revokeEntitlement(Request $request, string $token): JsonResponse
    {
        $entitlement = DigitalEntitlement::find($token);
        if (! $entitlement) {
            return response()->json([
                'error' => 'مجوز دانلود موردنظر یافت نشد.',
                'code' => 'ENTITLEMENT_NOT_FOUND',
            ], 404);
        }

        $reason = trim((string) $request->input('reason', 'لغو دسترسی توسط مدیر (استرداد وجه / فسخ سفارش)'));

        $entitlement->is_revoked = true;
        $entitlement->revoked_at = now();
        $entitlement->revoked_reason = substr($reason, 0, 250);
        $entitlement->save();

        AuditLog::create([
            'action' => 'ADMIN_ENTITLEMENT_REVOKED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "لغو مجوز دانلود {$token} برای سفارش {$entitlement->order_id}: {$reason}",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'token' => $entitlement->token,
            'isRevoked' => true,
            'revokedAt' => $entitlement->revoked_at?->toIso8601String(),
        ]);
    }
}
