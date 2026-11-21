<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\OrderResource;
use App\Models\AuditLog;
use App\Models\DigitalEntitlement;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Policies\OrderPolicy;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class OrderController
{
    public function show(Request $request, string $orderId, OrderPolicy $policy): JsonResponse
    {
        if ($request->query->has('token')) {
            return response()->json([
                'error' => 'ارسال توکن مالکیت سفارش در آدرس URL مجاز نیست. از هدر X-Order-Token یا کوکی HttpOnly استفاده کنید.',
                'code' => 'ORDER_TOKEN_IN_URL_FORBIDDEN',
            ], 400);
        }

        $order = Order::with(['items', 'entitlements'])->find($orderId);

        if (! $order) {
            return response()->json([
                'error' => 'سفارش مورد نظر یافت نشد.',
            ], 404);
        }

        $cookieToken = (string) $request->cookie('wl_order_token_' . $orderId, '');
        $providedToken = (string) ($request->header('X-Order-Token') ?: $cookieToken);

        if (! $policy->view($request->user(), $order, $providedToken)) {
            return response()->json([
                'error' => 'عدم دسترسی: شما مالک این سفارش نیستید یا توکن مالکیت سفارش معتبر نیست.',
                'code' => 'ORDER_OWNERSHIP_REQUIRED',
            ], 403);
        }

        return response()->json((new OrderResource($order))->resolve($request));
    }

    /**
     * Customer Order & Purchase Verification Lookup (`POST /api/v1/customer/orders/lookup`).
     *
     * SECURITY RULE (Section 7 & Section 8):
     * Customers can view owned orders and legitimate digital purchases ONLY when presenting
     * the high-entropy cryptographic order access token (`accessToken`, `X-Order-Token`, or
     * `wl_order_token_<orderId>` HttpOnly cookie). Guessing another customer's order ID or
     * phone number without the cryptographic token is rejected with 401/403.
     */
    public function customerLookup(Request $request, OrderPolicy $policy): JsonResponse
    {
        $orderIdOrNumber = trim((string) $request->input('orderId', $request->input('orderNumber', '')));
        if ($orderIdOrNumber === '') {
            return response()->json([
                'error' => 'شناسه سفارش یا شماره پیگیری الزامی است.',
                'code' => 'ORDER_ID_REQUIRED',
            ], 422);
        }

        // A lookup must not reveal whether an order number exists to callers
        // who have not proved possession of an order access credential.
        // Unlike a public tracking number, the access token is a secret.
        $providedHeaderToken = trim((string) ($request->input('accessToken') ?: $request->header('X-Order-Token', '')));
        if ($providedHeaderToken === '' && $request->user() === null) {
            // The cookie is order-ID scoped; order-number lookups require the
            // header/body token rather than guessing the internal identifier.
            $providedHeaderToken = trim((string) $request->cookie('wl_order_token_' . $orderIdOrNumber, ''));
        }
        if ($providedHeaderToken === '' && $request->user() === null) {
            return response()->json([
                'error' => 'توکن امنیتی مالکیت سفارش الزامی است.',
                'code' => 'CUSTOMER_ORDER_TOKEN_REQUIRED',
            ], 401);
        }

        $order = Order::with(['items', 'entitlements'])
            ->where(function ($query) use ($orderIdOrNumber): void {
                $query->where('id', $orderIdOrNumber)
                    ->orWhere('order_number', $orderIdOrNumber);
            })->first();

        // Keep unknown and unauthorized orders indistinguishable to prevent
        // enumeration of customer purchases and order numbers.
        if (! $order) {
            return response()->json([
                'error' => 'سفارش یافت نشد یا دسترسی به آن مجاز نیست.',
                'code' => 'ORDER_NOT_FOUND_OR_UNAUTHORIZED',
            ], 404);
        }

        $cookieToken = (string) $request->cookie('wl_order_token_' . $order->id, '');
        $providedToken = $providedHeaderToken !== '' ? $providedHeaderToken : $cookieToken;
        if (! $policy->view($request->user(), $order, $providedToken)) {
            return response()->json([
                'error' => 'سفارش یافت نشد یا دسترسی به آن مجاز نیست.',
                'code' => 'ORDER_NOT_FOUND_OR_UNAUTHORIZED',
            ], 404);
        }

        $providedPhone = preg_replace('/\D+/', '', (string) $request->input('phone', ''));
        $orderPhone = preg_replace('/\D+/', '', (string) $order->customer_phone);
        if ($providedPhone !== '' && $orderPhone !== '' && ! hash_equals($orderPhone, $providedPhone)) {
            return response()->json([
                'error' => 'شماره تماس واردشده با سفارش مطابقت ندارد.',
                'code' => 'ORDER_OWNERSHIP_REQUIRED',
            ], 403);
        }

        $resolvedOrder = (new OrderResource($order))->resolve($request);

        return response()
            ->json([
                'ok' => true,
                'order' => array_merge($resolvedOrder, [
                    'status' => $order->payment_status === 'paid' ? 'completed' : 'processing',
                ]),
                'paymentOrder' => $resolvedOrder,
            ])
            ->cookie(
                'wl_order_token_' . $order->id,
                (string) $order->access_token,
                120,
                '/',
                null,
                $request->isSecure(),
                true,
                false,
                'lax'
            );
    }

    /**
     * Admin-only endpoint to reconcile, retry bank verification, or record a manual refund on an order.
     *
     * CRITICAL DISTINCTION:
     * - `gateway_refund`: Explicitly rejected with `501 GATEWAY_REFUND_NOT_SUPPORTED` because standard
     *   Iranian merchant gateways (Zarinpal / Saman SEP) do not execute instant automated card-to-card/Sheba
     *   refunds without separate banking settlement contracts.
     * - `manual_refund` (or `refunded`): Records an administrative offline/manual refund (`refund_type = 'manual'`,
     *   `refund_reference`, `refunded_at`), revokes digital download entitlements, and logs `MANUAL_REFUND_RECORDED`.
     */
    public function reconcile(Request $request, string $orderId, PaymentService $paymentService): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'string', 'in:retry_verify,fulfill,refund_required,refunded,manual_refund,gateway_refund'],
            'notes' => ['nullable', 'string', 'max:500'],
            'refundReference' => ['nullable', 'string', 'max:120'],
        ]);

        $order = Order::with(['items', 'entitlements'])->find($orderId);
        if (! $order) {
            return response()->json([
                'error' => 'سفارش موردنظر یافت نشد.',
                'code' => 'ORDER_NOT_FOUND',
            ], 404);
        }

        $action = (string) $request->input('action');
        $notes = trim((string) $request->input('notes', ''));
        $refundReference = trim((string) $request->input('refundReference', ''));
        $clientIp = (string) $request->ip();

        if ($action === 'gateway_refund') {
            return response()->json([
                'error' => 'بازگشت وجه خودکار از طریق API درگاه بانکی فعال نیست. لطفاً مبلغ را از طریق پنل درگاه بانکی یا پایا/شبا به حساب مشتری عودت داده و سپس گزینه «ثبت استرداد دستی (Manual Refund)» را به همراه کد پیگیری بانکی ثبت نمایید.',
                'code' => 'GATEWAY_REFUND_NOT_SUPPORTED',
            ], 501);
        }

        /** @var PaymentTransaction|null $transaction */
        $transaction = PaymentTransaction::where('order_id', $order->id)->latest('id')->first();

        if ($action === 'retry_verify') {
            if ($order->payment_status === 'refunded') {
                return response()->json([
                    'error' => 'سفارش دارای استرداد ثبت‌شده نباید دوباره به وضعیت پرداخت‌شده بازگردد.',
                    'code' => 'REFUNDED_ORDER_IMMUTABLE',
                ], 409);
            }
            if ($order->payment_status === 'paid') {
                return response()->json([
                    'ok' => true,
                    'reconcileOutcome' => 'already_paid',
                    'order' => (new OrderResource($order))->resolve($request),
                ]);
            }

            if (! $transaction) {
                return response()->json([
                    'error' => 'تراکنش بانکی مرتبط با این سفارش جهت استعلام مجدد یافت نشد.',
                    'code' => 'TRANSACTION_NOT_FOUND',
                ], 400);
            }

            $prevPaymentStatus = (string) $order->payment_status;

            // A successful bank verification might have been persisted immediately
            // before a PHP crash. The receipt is already verified in our ledger;
            // allow the operator to recover fulfillment without manufacturing a new payment.
            if ($transaction->status === 'verified' && trim((string) $transaction->ref_id) !== '') {
                $order = $paymentService->finalizeVerifiedOrder($order, (string) $transaction->ref_id, $clientIp);
                return response()->json([
                    'ok' => true,
                    'reconcileOutcome' => 'verified_payment_finalized',
                    'order' => (new OrderResource($order))->resolve($request),
                ]);
            }
            if ($transaction->status === 'processing') {
                return response()->json([
                    'error' => 'تراکنش اکنون در حال استعلام است؛ از ارسال همزمان استعلام مجدد خودداری کنید.',
                    'code' => 'VERIFICATION_ALREADY_PROCESSING',
                ], 409);
            }

            try {
                $driver = $paymentService->driver((string) $order->gateway);
                $payload = is_array($transaction->raw_callback_payload) && ! empty($transaction->raw_callback_payload)
                    ? array_merge($transaction->raw_callback_payload, ['Status' => 'OK', 'State' => 'OK'])
                    : [
                        'Status' => 'OK',
                        'Authority' => (string) $transaction->authority_or_token,
                        'State' => 'OK',
                        'RefNum' => (string) ($transaction->ref_id ?: $transaction->authority_or_token),
                    ];
                $verification = $driver->verifyCallback((int) $transaction->amount_toman, $payload);
            } catch (Throwable $e) {
                Log::warning('Admin retry_verify exception', [
                    'order_id' => $order->id,
                    'exception' => $e->getMessage(),
                ]);
                $verification = [
                    'verified' => false,
                    'state' => 'verification_pending',
                    'message' => 'خطای ارتباط با درگاه در استعلام مجدد',
                ];
            }

            if ($verification['verified'] ?? false) {
                $refId = (string) ($verification['refId'] ?? $order->tracking_code);
                $transaction->update([
                    'status' => 'verified',
                    'ref_id' => $refId,
                    'last_error' => null,
                    'verified_at' => now(),
                ]);
                $order = $paymentService->finalizeVerifiedOrder($order, $refId, $clientIp);
                $paymentService->recordPaymentEvent(
                    $order,
                    $transaction,
                    'ADMIN_RETRY_VERIFICATION_SUCCEEDED',
                    $prevPaymentStatus,
                    'paid',
                    $refId,
                    $clientIp,
                    'تایید موفق پرداخت در استعلام مجدد مدیریت.'
                );
            } elseif (($verification['state'] ?? '') === 'verification_pending') {
                $attempts = (int) $transaction->verification_attempts + 1;
                $transaction->update([
                    'status' => $attempts >= 3 ? 'reconciliation_required' : 'verification_pending',
                    'verification_attempts' => $attempts,
                    'last_error' => (string) ($verification['message'] ?? 'عدم پاسخگویی مجدد بانک'),
                ]);
                $order->update([
                    'payment_status' => 'verification_pending',
                    'fulfillment_status' => $attempts >= 3 ? 'reconciliation_required' : $order->fulfillment_status,
                ]);
                $paymentService->recordPaymentEvent(
                    $order,
                    $transaction,
                    'ADMIN_RETRY_VERIFICATION_PENDING',
                    $prevPaymentStatus,
                    $transaction->status,
                    (string) $transaction->authority_or_token,
                    $clientIp,
                    'خطای مجدد شبکه در استعلام بانکی؛ رزرو انبار حفظ شد.'
                );
            } else {
                $transaction->update([
                    'status' => 'failed',
                    'last_error' => (string) ($verification['message'] ?? 'رد تراکنش توسط بانک'),
                ]);
                $order->update(['payment_status' => 'failed']);
                $paymentService->releaseReservedInventory($order);
                $paymentService->recordPaymentEvent(
                    $order,
                    $transaction,
                    'ADMIN_RETRY_VERIFICATION_FAILED',
                    $prevPaymentStatus,
                    'failed',
                    (string) $transaction->authority_or_token,
                    $clientIp,
                    'بانک در استعلام مجدد، عدم موفقیت تراکنش را اعلام کرد.'
                );
            }

            return response()->json([
                'ok' => true,
                'order' => (new OrderResource($order->fresh(['items', 'entitlements'])))->resolve($request),
            ]);
        }

        $isManualRefund = in_array($action, ['manual_refund', 'refunded'], true);

        // A manual refund is an accounting record, not an automated transfer.
        // Require a real reference rather than silently manufacturing 'MANUAL-ADMIN'.
        if ($isManualRefund && $refundReference === '') {
            return response()->json([
                'error' => 'برای ثبت استرداد دستی، شناسه پیگیری بانکی الزامی است.',
                'code' => 'REFUND_REFERENCE_REQUIRED',
            ], 422);
        }

        $transitionError = DB::transaction(function () use (
            $order,
            $transaction,
            $action,
            $isManualRefund,
            $notes,
            $refundReference,
            $request,
            $paymentService,
            $clientIp
        ) {
            // Recheck the latest state with a database row lock: a concurrent callback
            // must not race an administrator's refund or fulfillment operation.
            $order = Order::with(['items', 'entitlements'])
                ->where('id', $order->id)->lockForUpdate()->firstOrFail();
            if ($order->payment_status !== 'paid') {
                return [
                    'status' => 409,
                    'code' => 'PAID_ORDER_REQUIRED',
                    'error' => 'تحویل یا ثبت بازگشت وجه فقط برای سفارش پرداخت‌شده مجاز است.',
                ];
            }

            $prevStatus = (string) $order->payment_status;
            if ($action === 'fulfill') {
                $order->fulfillment_status = 'delivered';
            } elseif ($action === 'refund_required') {
                $order->fulfillment_status = 'refund_required';
            } elseif ($isManualRefund) {
                if ($order->stock_reserved || $order->discount_reserved) {
                    $paymentService->releaseReservedInventory($order);
                    $order->refresh();
                }
                $order->payment_status = 'refunded';
                $order->fulfillment_status = 'refund_required';
                $order->refund_type = 'manual';
                $order->refund_reference = $refundReference;
                $order->refunded_at = now();

                if ($transaction) {
                    $transaction->update(['status' => 'refunded']);
                }
                // Revoke any digital entitlements tied to this refunded order
                DigitalEntitlement::where('order_id', $order->id)->update([
                    'is_revoked' => true,
                    'revoked_at' => now(),
                    'revoked_reason' => $notes !== '' ? $notes : 'ثبت استرداد وجه دستی توسط مدیر',
                ]);
            }

            if ($notes !== '') {
                $order->customer_notes = trim(($order->customer_notes ? $order->customer_notes . ' | ' : '') . '[Reconciliation]: ' . $notes);
            }
            $order->save();

            $paymentService->recordPaymentEvent(
                $order,
                $transaction,
                $isManualRefund ? 'MANUAL_REFUND_RECORDED' : 'ADMIN_ORDER_RECONCILED',
                $prevStatus,
                (string) $order->payment_status,
                (string) ($refundReference !== '' ? $refundReference : ($transaction?->ref_id ?: $order->tracking_code)),
                $clientIp,
                $isManualRefund
                    ? "ثبت استرداد وجه دستی (آفلاین/شبا) توسط مدیر" . ($refundReference !== '' ? " با شناسه پیگیری {$refundReference}" : '') . ($notes !== '' ? " ({$notes})" : '')
                    : "تعیین وضعیت سفارش توسط مدیر: {$action}" . ($notes !== '' ? " ({$notes})" : '')
            );

            AuditLog::create([
                'action' => $isManualRefund ? 'MANUAL_REFUND_RECORDED' : 'ADMIN_ORDER_RECONCILED',
                'actor' => (string) ($request->user()?->email ?? 'admin'),
                'ip_address' => $clientIp,
                'details' => $isManualRefund
                    ? "ثبت استرداد وجه دستی سفارش {$order->id}" . ($refundReference !== '' ? " (شناسه استرداد: {$refundReference})" : '') . ($notes !== '' ? " ({$notes})" : '')
                    : "تعیین وضعیت حسابداری/تحویل سفارش {$order->id} به «{$action}»" . ($notes !== '' ? " ({$notes})" : ''),
                'created_at' => now(),
            ]);

            return null;
        });

        if ($transitionError !== null) {
            return response()->json([
                'error' => $transitionError['error'],
                'code' => $transitionError['code'],
            ], $transitionError['status']);
        }

        return response()->json([
            'ok' => true,
            'refundType' => $isManualRefund ? 'manual' : null,
            'order' => (new OrderResource($order->fresh(['items', 'entitlements'])))->resolve($request),
        ]);
    }
}
