<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\DigitalEntitlement;
use App\Models\Order;
use App\Models\Product;
use App\Policies\OrderPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadController
{
    /**
     * Hardened Digital Download Authorization Model (Section 3):
     * 1. Rejects any private order token passed in URL query string (?orderToken= or ?token=) -> 400 ORDER_TOKEN_IN_URL_FORBIDDEN
     *    to prevent token exposure in server access logs, browser history, analytics, or third-party Referer headers.
     * 2. Validates token format (^dl_[a-f0-9]{16,96}$) and existence -> 403 INVALID_DOWNLOAD_TOKEN.
     * 3. Validates that the entitlement has not been revoked -> 403 DOWNLOAD_ACCESS_REVOKED.
     * 4. Validates that the linked order exists and is strictly 'paid' -> 403 ORDER_NOT_PAID.
     * 5. Enforces strict cryptographic ownership verification (phone number + order ID alone is NEVER sufficient!):
     *    - If X-Order-Id / ?orderId mismatches entitlement->order_id -> 403 WRONG_ORDER_ENTITLEMENT.
     *    - If X-Customer-Phone / ?phone mismatches entitlement->customer_phone -> 403 WRONG_CUSTOMER_ENTITLEMENT.
     *    - Requires either:
     *      (a) Authenticated Admin session, OR
     *      (b) Authenticated Customer session owning the order, OR
     *      (c) High-entropy cryptographic Order Access Token via X-Order-Token header, Authorization: Bearer header,
     *          or HttpOnly cookie (wl_order_token_<orderId>).
     *    - If no cryptographic credential or authenticated session is provided (even if phone + orderId match!)
     *      -> 401 DOWNLOAD_AUTHORIZATION_REQUIRED.
     *    - If an invalid cryptographic token is provided -> 403 DOWNLOAD_OWNERSHIP_MISMATCH.
     * 6. Inside an atomic DB transaction with row lock (lockForUpdate()):
     *    - Checks expiration (410 DOWNLOAD_LINK_EXPIRED) before touching quota.
     *    - Checks quota (429 DOWNLOAD_QUOTA_EXCEEDED) before touching quota.
     *    - Checks physical file existence on private_downloads disk (404 PRIVATE_FILE_NOT_FOUND) BEFORE incrementing downloads_used.
     *    - Atomically increments downloads_used and streams the protected file with Referrer-Policy: no-referrer.
     */
    public function download(Request $request, string $token, OrderPolicy $orderPolicy): StreamedResponse|JsonResponse
    {
        // 1. Never allow private order tokens in URL query parameters
        if ($request->query->has('orderToken') || $request->query->has('token')) {
            return response()->json([
                'error' => 'ارسال توکن خصوصی سفارش در آدرس URL مجاز نیست. از هدر X-Order-Token یا کوکی HttpOnly استفاده کنید.',
                'code' => 'ORDER_TOKEN_IN_URL_FORBIDDEN',
            ], 400);
        }

        // 2. Reject malformed or non-existent entitlement tokens
        $cleanToken = trim($token);
        if (! preg_match('/^dl_[a-f0-9]{16,96}$/i', $cleanToken)) {
            return response()->json([
                'error' => 'فرمت لینک دانلود معتبر نیست یا دسترسی غیرمجاز است.',
                'code' => 'INVALID_DOWNLOAD_TOKEN',
            ], 403);
        }

        $entitlement = DigitalEntitlement::find($cleanToken);

        if (! $entitlement) {
            return response()->json([
                'error' => 'لینک دانلود معتبر نیست یا دسترسی غیرمجاز است.',
                'code' => 'INVALID_DOWNLOAD_TOKEN',
            ], 403);
        }

        // 3. Check if access has been revoked (e.g. refunded order)
        if ($entitlement->is_revoked) {
            return response()->json([
                'error' => 'دسترسی دانلود این فایل لغو شده است.',
                'code' => 'DOWNLOAD_ACCESS_REVOKED',
            ], 403);
        }

        // 4. Verify that the linked order exists and has genuinely succeeded ('paid')
        $order = Order::find($entitlement->order_id);
        if (! $order || $order->payment_status !== 'paid') {
            return response()->json([
                'error' => 'سفارش مرتبط با این فایل پرداخت و نهایی نشده است.',
                'code' => 'ORDER_NOT_PAID',
            ], 403);
        }

        // 5. Strict Cryptographic Ownership Verification (Phone number + Order ID alone is NEVER sufficient!)
        $user = $request->user();
        $isAdmin = $user !== null && $user->role === 'admin';
        // No customer OTP/verified-phone login exists in this release. A plain
        // athlete account's self-declared phone number must never grant access
        // to another customer's paid training files. Keep order tokens mandatory
        // until a verified-phone customer identity flow is implemented.
        $isAuthenticatedCustomerOwner = $user !== null
            && $user->role === 'athlete'
            && ! empty($user->phone_verified_at)
            && ! empty($user->phone)
            && hash_equals((string) $entitlement->customer_phone, (string) $user->phone);

        $providedOrderId = trim((string) ($request->header('X-Order-Id') ?? $request->query('orderId', '')));
        $providedPhone = trim((string) ($request->header('X-Customer-Phone') ?? $request->query('phone', '')));

        $bearerToken = trim((string) $request->bearerToken());
        $headerToken = trim((string) ($request->header('X-Order-Token') ?? $bearerToken));
        $cookieToken = trim((string) $request->cookie('wl_order_token_' . $order->id, ''));
        $providedOrderToken = $headerToken !== '' ? $headerToken : $cookieToken;

        // Reject a bad cryptographic credential before evaluating optional
        // ownership hints, so stale phone/order headers cannot mask the real error.
        if (! $isAdmin && ! $isAuthenticatedCustomerOwner && $providedOrderToken !== ''
            && ! $orderPolicy->view($user, $order, $providedOrderToken)) {
            return response()->json([
                'error' => 'عدم دسترسی: توکن مالکیت سفارش با این فایل همخوانی ندارد.',
                'code' => 'DOWNLOAD_OWNERSHIP_MISMATCH',
            ], 403);
        }

        if ($providedPhone !== '' && ! hash_equals((string) $entitlement->customer_phone, $providedPhone)) {
            return response()->json([
                'error' => 'شماره تماس مشتری با مالک این مجوز دانلود همخوانی ندارد.',
                'code' => 'WRONG_CUSTOMER_ENTITLEMENT',
            ], 403);
        }

        if ($providedOrderId !== '' && ! hash_equals((string) $entitlement->order_id, $providedOrderId)) {
            return response()->json([
                'error' => 'شناسه سفارش ارسال‌شده با این مجوز دانلود همخوانی ندارد.',
                'code' => 'WRONG_ORDER_ENTITLEMENT',
            ], 403);
        }

        if (! $isAdmin && ! $isAuthenticatedCustomerOwner) {
            if ($providedOrderToken === '') {
                return response()->json([
                    'error' => 'احراز مالکیت رمزنگاری‌شده سفارش الزامی است (ارسال شماره سفارش و تلفن به تنهایی کافی نیست؛ هدر X-Order-Token یا نشست معتبر الزامی است).',
                    'code' => 'DOWNLOAD_AUTHORIZATION_REQUIRED',
                ], 401);
            }

            // Non-empty invalid tokens were rejected before optional metadata checks.
        }

        // 6. Atomic lockForUpdate() check for expiration, quota, and file existence BEFORE incrementing downloads_used
        $txResult = DB::transaction(function () use ($cleanToken, $order, $request): array {
            /** @var DigitalEntitlement|null $locked */
            $locked = DigitalEntitlement::where('token', $cleanToken)->lockForUpdate()->first();
            if (! $locked || $locked->is_revoked) {
                return ['status' => 403, 'code' => 'DOWNLOAD_ACCESS_REVOKED', 'error' => 'دسترسی دانلود معتبر نیست.'];
            }

            if ($locked->expires_at->isPast()) {
                return [
                    'status' => 410,
                    'code' => 'DOWNLOAD_LINK_EXPIRED',
                    'error' => 'مهلت زمانی لینک دانلود به پایان رسیده است.',
                ];
            }

            if ($locked->downloads_used >= $locked->max_downloads) {
                return [
                    'status' => 429,
                    'code' => 'DOWNLOAD_QUOTA_EXCEEDED',
                    'error' => 'سقف مجاز تعداد دانلود این فایل تکمیل شده است.',
                ];
            }

            $product = Product::find($locked->product_id);
            $filePath = $product?->private_file_path ?: "{$locked->product_id}.pdf";

            if (! Storage::disk('private_downloads')->exists($filePath)) {
                return [
                    'status' => 404,
                    'code' => 'PRIVATE_FILE_NOT_FOUND',
                    'error' => 'فایل برنامه تمرینی در فضای خصوصی سرور یافت نشد (سهمیه دانلود شما کسر نشد).',
                ];
            }

            $locked->downloads_used = $locked->downloads_used + 1;
            $locked->save();

            $redactedToken = substr($cleanToken, 0, 10) . '...[REDACTED]';

            AuditLog::create([
                'action' => 'DIGITAL_ASSET_DOWNLOADED',
                'actor' => $locked->customer_phone,
                'ip_address' => (string) $request->ip(),
                'details' => "دانلود مجاز محصول {$locked->product_id} از سفارش {$order->id} با توکن {$redactedToken} ({$locked->downloads_used}/{$locked->max_downloads})",
                'created_at' => now(),
            ]);

            return [
                'status' => 200,
                'filePath' => $filePath,
                'productId' => $locked->product_id,
            ];
        });

        if ($txResult['status'] !== 200) {
            return response()->json([
                'error' => $txResult['error'],
                'code' => $txResult['code'],
            ], $txResult['status']);
        }

        return Storage::disk('private_downloads')->download(
            $txResult['filePath'],
            "training-program-{$txResult['productId']}.pdf",
            [
                'Content-Type' => 'application/pdf',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
                'Referrer-Policy' => 'no-referrer',
                'X-Robots-Tag' => 'noindex, nofollow, noarchive',
            ]
        );
    }
}
