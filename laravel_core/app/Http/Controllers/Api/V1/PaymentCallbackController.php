<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\OrderResource;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Policies\OrderPolicy;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PaymentCallbackController
{
    /**
     * Real Bank Callback (Zarinpal GET / Saman SEP POST)
     *
     * CRITICAL SECURITY & RELIABLE PAYMENT STATE MACHINE INVARIANTS:
     * 1. NEVER issue, attach, or expose private order-access secrets (`access_token`) in cookies,
     *    redirect URLs, headers, or response bodies on any public callback branch.
     * 2. Verify gateway, original transaction existence, amount_toman, currency ('IRT'), and
     *    gateway authority/token BEFORE any replay or state-transition logic.
     * 3. Prevent replay attacks and concurrent duplicate fulfillment using row locks (409 TRANSACTION_REPLAY_BLOCKED).
     * 4. Reliable State Machine & Late Payment Recovery:
     *    - Standard entry states: 'initiated' or 'verification_pending'.
     *    - Late Payment / Failed Recovery entry: if an order/transaction was previously marked 'cancelled'
     *      (e.g. by `expireStalePendingOrders`) or 'failed', and the bank delivers a positive payment
     *      callback (`Status=OK` for Zarinpal or `State=OK` + `RefNum` for SEP), transition to 'processing',
     *      verify with the bank server-to-server, and finalize (or mark `reconciliation_required` if stock was sold).
     *    - If the bank verification API times out, encounters a network error, or returns 5xx/429,
     *      transition to 'verification_pending' (or 'reconciliation_required' after 3 attempts) and
     *      NEVER release reserved physical inventory!
     *    - Preserve append-only immutable PaymentEvent records for every state transition.
     */
    public function handleBankCallback(
        Request $request,
        string $gateway,
        PaymentService $paymentService
    ): RedirectResponse|JsonResponse {
        if (! in_array($gateway, ['zarinpal', 'sep'], true)) {
            return response()->json([
                'error' => 'درگاه پرداخت نامعتبر است.',
                'code' => 'INVALID_GATEWAY',
            ], 400);
        }

        $orderId = (string) ($request->query('orderId') ?: $request->input('ResNum', ''));
        $order = Order::with('items')->find($orderId);

        if (! $order) {
            return response()->json([
                'error' => 'سفارش مرتبط با تراکنش بانکی یافت نشد.',
                'code' => 'ORDER_NOT_FOUND',
            ], 404);
        }

        // Clean redirect URL without any secret token in query string, headers, or cookies
        $returnUrl = '/payment/result?orderId=' . urlencode($order->id);
        $clientIp = (string) $request->ip();

        // 1. Bind callback to the order's expected gateway
        if ($order->gateway !== $gateway) {
            return response()->json([
                'error' => 'درگاه پرداخت ارسال‌شده با درگاه ثبت‌شده سفارش مطابقت ندارد.',
                'code' => 'PAYMENT_GATEWAY_MISMATCH',
            ], 400);
        }

        /** @var PaymentTransaction|null $transaction */
        $transaction = PaymentTransaction::where('order_id', $order->id)
            ->where('gateway', $gateway)
            ->latest('id')
            ->first();

        if (! $transaction) {
            return response()->json([
                'error' => 'تراکنش اولیه ثبت‌شده برای این سفارش یافت نشد.',
                'code' => 'TRANSACTION_NOT_FOUND',
            ], 400);
        }

        // 2. Bind Authority / Token & prevent cross-order authority/RefNum replay BEFORE checking order/tx status
        $authorityOrRef = '';
        $isPositiveGatewayCallback = false;

        if ($gateway === 'zarinpal') {
            $callbackAuthority = (string) ($request->query('Authority') ?: $request->input('Authority', ''));
            $callbackStatus = strtoupper(trim((string) ($request->query('Status') ?: $request->input('Status', ''))));
            $authorityOrRef = $callbackAuthority;
            $isPositiveGatewayCallback = ($callbackStatus === 'OK');

            if ($callbackAuthority === '' || ! hash_equals((string) $transaction->authority_or_token, $callbackAuthority)) {
                return response()->json([
                    'error' => 'شناسه Authority دریافتی با تراکنش اولیه سفارش مطابقت ندارد.',
                    'code' => 'AUTHORITY_MISMATCH',
                ], 400);
            }

            $authorityUsedElsewhere = PaymentTransaction::where('gateway', 'zarinpal')
                ->where('authority_or_token', $callbackAuthority)
                ->where('order_id', '!=', $order->id)
                ->exists();

            if ($authorityUsedElsewhere) {
                return response()->json([
                    'error' => 'شناسه Authority متعلق به سفارش دیگری است.',
                    'code' => 'AUTHORITY_REPLAY_DETECTED',
                ], 409);
            }
        } elseif ($gateway === 'sep') {
            $resNum = (string) $request->input('ResNum', $request->query('ResNum', $orderId));
            $callbackToken = (string) $request->input('Token', $request->query('Token', ''));
            $refNum = trim((string) $request->input('RefNum', $request->query('RefNum', '')));
            $stateParam = strtoupper(trim((string) $request->input('State', $request->query('State', ''))));
            $authorityOrRef = $refNum !== '' ? $refNum : $callbackToken;
            $isPositiveGatewayCallback = ($stateParam === 'OK' && $refNum !== '');

            if ($resNum !== $order->id) {
                return response()->json([
                    'error' => 'شناسه سفارش (ResNum) با تراکنش بانک سامان مطابقت ندارد.',
                    'code' => 'RESNUM_MISMATCH',
                ], 400);
            }

            if ($callbackToken !== '' && $transaction->authority_or_token && ! hash_equals((string) $transaction->authority_or_token, $callbackToken)) {
                return response()->json([
                    'error' => 'توکن تراکنش سامان با توکن صادرشده اولیه مطابقت ندارد.',
                    'code' => 'SEP_TOKEN_MISMATCH',
                ], 400);
            }

            if ($refNum !== '') {
                $refUsedElsewhere = PaymentTransaction::where('gateway', 'sep')
                    ->where('ref_id', $refNum)
                    ->where('order_id', '!=', $order->id)
                    ->exists();
                if ($refUsedElsewhere) {
                    return response()->json([
                        'error' => 'رسید دیجیتال (RefNum) قبلاً مصرف شده است (Replay Attack Blocked).',
                        'code' => 'REFNUM_REPLAY_DETECTED',
                    ], 409);
                }
            }
        }

        // A negative browser/gateway callback is not proof of non-payment. In particular,
        // SEP callbacks have no mandatory authenticated Token on the failure path. A forged
        // State=NOK could previously cancel an unrelated pending order and free its stock.
        // Only bank-verified positive callbacks may mutate payment state here. Abandoned
        // payments expire through the existing guarded expiry/reconciliation workflow.
        if (! $isPositiveGatewayCallback) {
            if ($request->expectsJson()) {
                return response()->json([
                    'ok' => false,
                    'code' => 'PAYMENT_UNCONFIRMED',
                    'message' => 'وضعیت پرداخت هنوز توسط بانک تأیید نشده است. سفارش تا زمان استعلام یا انقضا محفوظ می‌ماند.',
                ], 202);
            }

            return redirect($returnUrl);
        }

        // 3. Bind amount and currency ('IRT')
        if ((int) $transaction->amount_toman !== (int) $order->total_amount_toman || ($transaction->currency ?? 'IRT') !== 'IRT') {
            $prevStatus = (string) $order->payment_status;
            $transaction->update([
                'status' => 'failed',
                'last_error' => 'TRANSACTION_AMOUNT_CURRENCY_MISMATCH',
                'raw_callback_payload' => $request->all(),
            ]);
            $order->update(['payment_status' => 'failed']);
            $paymentService->releaseReservedInventory($order);
            $paymentService->recordPaymentEvent(
                $order,
                $transaction,
                'AMOUNT_CURRENCY_MISMATCH',
                $prevStatus,
                'failed',
                $authorityOrRef,
                $clientIp,
                'عدم تطابق مبلغ یا واحد پول تراکنش با سفارش اصلی.'
            );

            return response()->json([
                'error' => 'عدم تطابق مبلغ یا واحد پول تراکنش با سفارش اصلی.',
                'code' => 'TRANSACTION_AMOUNT_CURRENCY_MISMATCH',
            ], 400);
        }

        // 4. Atomic Lock & Transition to 'processing' (prevents concurrent callbacks and replay)
        // Standard entry states: 'initiated' or 'verification_pending'.
        // Late payment / recovery entry states: 'cancelled' or 'failed' ONLY when the bank callback is positive (Status=OK / State=OK).
        $entryLock = DB::transaction(function () use (
            $transaction,
            $order,
            $authorityOrRef,
            $clientIp,
            $isPositiveGatewayCallback,
            $paymentService
        ): array {
            /** @var PaymentTransaction|null $lockedTx */
            $lockedTx = PaymentTransaction::where('id', $transaction->id)->lockForUpdate()->first();
            /** @var Order|null $lockedOrder */
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->first();

            if (! $lockedTx || ! $lockedOrder) {
                return ['allowed' => false, 'code' => 'TRANSACTION_NOT_FOUND'];
            }

            $isStandardPending = in_array($lockedTx->status, ['initiated', 'verification_pending'], true);
            $isLatePaymentRecovery = $isPositiveGatewayCallback
                && in_array($lockedTx->status, ['cancelled', 'failed'], true)
                && ! in_array($lockedOrder->payment_status, ['paid', 'refunded'], true);

            if (
                $lockedOrder->payment_status === 'paid' ||
                $lockedOrder->payment_status === 'refunded' ||
                $lockedTx->status === 'verified' ||
                $lockedTx->status === 'processing' ||
                (! $isStandardPending && ! $isLatePaymentRecovery)
            ) {
                $paymentService->recordPaymentEvent(
                    $lockedOrder,
                    $lockedTx,
                    'REPLAY_BLOCKED',
                    (string) $lockedTx->status,
                    (string) $lockedTx->status,
                    $authorityOrRef,
                    $clientIp,
                    'تلاش برای ارسال مجدد یا همزمان Callback روی تراکنش تعیین‌وضعیت‌شده مسدود شد.'
                );
                return ['allowed' => false, 'code' => 'TRANSACTION_REPLAY_BLOCKED'];
            }

            $prevStatus = (string) $lockedTx->status;
            $lockedTx->status = 'processing';
            $lockedTx->verification_attempts = (int) $lockedTx->verification_attempts + 1;
            $lockedTx->save();

            $lockedOrder->payment_status = 'processing';
            $lockedOrder->save();

            $paymentService->recordPaymentEvent(
                $lockedOrder,
                $lockedTx,
                $isLatePaymentRecovery ? 'LATE_PAYMENT_RECOVERY_PROCESSING' : 'VERIFICATION_PROCESSING',
                $prevStatus,
                'processing',
                $authorityOrRef,
                $clientIp,
                $isLatePaymentRecovery
                    ? "دریافت Callback مثبت دیرهنگام/بازیابی برای سفارش {$lockedOrder->id} (وضعیت قبلی: {$prevStatus})؛ شروع استعلام شاپرک."
                    : "شروع استعلام شاپرک (تلاش شماره {$lockedTx->verification_attempts})."
            );

            return [
                'allowed' => true,
                'attempts' => (int) $lockedTx->verification_attempts,
                'previousStatus' => $prevStatus,
                'isLatePaymentRecovery' => $isLatePaymentRecovery,
            ];
        });

        if (! $entryLock['allowed']) {
            return response()->json([
                'error' => 'این تراکنش قبلاً تعیین وضعیت شده یا در حال پردازش همزمان است (Replay Blocked).',
                'code' => 'TRANSACTION_REPLAY_BLOCKED',
            ], 409);
        }

        // 5. Server-to-Server Bank Verification with Unknown/Network State Handling
        try {
            $driver = $paymentService->driver($gateway);
            $verification = $driver->verifyCallback((int) $transaction->amount_toman, $request->all());
        } catch (RuntimeException $e) {
            if (str_contains($e->getMessage(), 'NOT_CONFIGURED')) {
                $transaction->update(['status' => 'verification_pending', 'last_error' => 'GATEWAY_NOT_CONFIGURED']);
                $order->update(['payment_status' => 'verification_pending']);
                Log::error('Payment gateway not configured during callback verification', [
                    'order_id' => $order->id,
                    'gateway' => $gateway,
                ]);
                return response()->json([
                    'error' => 'درگاه پرداخت در حال حاضر پیکربندی نشده است؛ وضعیت تراکنش برای بررسی مجدد حفظ شد.',
                    'code' => 'GATEWAY_NOT_CONFIGURED',
                ], 503);
            }
            $verification = [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'خطای موقت در استعلام بانکی',
            ];
        } catch (Throwable $e) {
            Log::warning('Payment verification network error', [
                'order_id' => $order->id,
                'gateway' => $gateway,
                'exception' => $e->getMessage(),
            ]);
            $verification = [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'خطای شبکه در ارتباط با بانک',
            ];
        }

        $verificationState = (string) ($verification['state'] ?? (($verification['verified'] ?? false) ? 'paid' : 'failed'));

        // 6A. Temporary Network Error / Gateway Timeout -> verification_pending (NEVER release reserved stock!)
        if ($verificationState === 'verification_pending') {
            $attempts = (int) ($entryLock['attempts'] ?? 1);
            $needsReconciliation = $attempts >= 3;
            $nextTxStatus = $needsReconciliation ? 'reconciliation_required' : 'verification_pending';
            $nextOrderPaymentStatus = 'verification_pending';
            $errorMsg = mb_substr((string) ($verification['message'] ?? 'خطای موقت شبکه در استعلام شاپرک'), 0, 250);

            DB::transaction(function () use ($transaction, $order, $nextTxStatus, $nextOrderPaymentStatus, $needsReconciliation, $errorMsg, $request, $paymentService, $authorityOrRef, $clientIp) {
                $transaction->update([
                    'status' => $nextTxStatus,
                    'last_error' => $errorMsg,
                    'raw_callback_payload' => $request->all(),
                ]);

                $orderUpdates = ['payment_status' => $nextOrderPaymentStatus];
                if ($needsReconciliation) {
                    $orderUpdates['fulfillment_status'] = 'reconciliation_required';
                }
                $order->update($orderUpdates);

                $paymentService->recordPaymentEvent(
                    $order,
                    $transaction,
                    'VERIFICATION_NETWORK_UNKNOWN',
                    'processing',
                    $nextTxStatus,
                    $authorityOrRef,
                    $clientIp,
                    "وضعیت نامشخص بانک به دلیل خطای موقت شبکه؛ رزرو موجودی حفظ شد ({$errorMsg})."
                );

                AuditLog::create([
                    'action' => 'PAYMENT_VERIFICATION_PENDING',
                    'actor' => $order->customer_phone,
                    'ip_address' => $clientIp,
                    'details' => "استعلام بانکی سفارش {$order->id} به دلیل خطای موقت شبکه در وضعیت {$nextTxStatus} قرار گرفت (رزرو انبار حفظ شد).",
                    'created_at' => now(),
                ]);
            });

            return redirect($returnUrl);
        }

        // 6B. Explicit Bank Rejection or Customer Cancellation -> failed / cancelled (release reserved stock)
        if (! ($verification['verified'] ?? false)) {
            $statusParam = (string) ($request->input('Status') ?: $request->input('State', ''));
            $nextStatus = ($verificationState === 'cancelled' || in_array($statusParam, ['NOK', 'CanceledByUser'], true))
                ? 'cancelled'
                : 'failed';
            $errorMsg = mb_substr((string) ($verification['message'] ?? 'عدم تایید تراکنش توسط بانک'), 0, 250);

            DB::transaction(function () use ($transaction, $order, $nextStatus, $errorMsg, $request, $paymentService, $authorityOrRef, $clientIp) {
                $order->update(['payment_status' => $nextStatus]);
                $transaction->update([
                    'status' => $nextStatus,
                    'last_error' => $errorMsg,
                    'raw_callback_payload' => $request->all(),
                ]);
                $paymentService->releaseReservedInventory($order);
                $paymentService->recordPaymentEvent(
                    $order,
                    $transaction,
                    $nextStatus === 'cancelled' ? 'USER_CANCELLED' : 'VERIFICATION_FAILED',
                    'processing',
                    $nextStatus,
                    $authorityOrRef,
                    $clientIp,
                    $errorMsg
                );
            });

            return redirect($returnUrl);
        }

        // 6C. Bank Verification Succeeded -> Atomic Finalization
        $refId = trim((string) ($verification['refId'] ?? $verification['ref_id'] ?? ''));
        if ($refId === '') {
            $transaction->update(['status' => 'verification_pending', 'last_error' => 'BANK_REFERENCE_MISSING']);
            $order->update(['payment_status' => 'verification_pending']);

            return response()->json([
                'error' => 'پرداخت بدون شناسه مرجع معتبر بانکی نهایی نمی‌شود؛ نیازمند استعلام مجدد است.',
                'code' => 'BANK_REFERENCE_MISSING',
            ], 202);
        }

        $lockOutcome = DB::transaction(function () use ($transaction, $order, $refId, $request, $paymentService, $clientIp): array {
            /** @var PaymentTransaction|null $lockedTx */
            $lockedTx = PaymentTransaction::where('id', $transaction->id)->lockForUpdate()->first();
            if (! $lockedTx || $lockedTx->status !== 'processing') {
                return ['replayed' => true];
            }

            if ($refId !== '') {
                $refDuplicate = PaymentTransaction::where('ref_id', $refId)
                    ->where('id', '!=', $lockedTx->id)
                    ->exists();
                if ($refDuplicate) {
                    return ['replayed' => true];
                }
            }

            $lockedTx->update([
                'status' => 'verified',
                'ref_id' => $refId,
                'last_error' => null,
                'verified_at' => now(),
                'raw_callback_payload' => $request->all(),
            ]);

            $paymentService->recordPaymentEvent(
                $order,
                $lockedTx,
                'VERIFICATION_SUCCEEDED',
                'processing',
                'paid',
                $refId,
                $clientIp,
                "تراکنش سفارش {$order->id} با کد مرجع شاپرک {$refId} تأیید شد."
            );

            return ['replayed' => false];
        });

        if ($lockOutcome['replayed']) {
            return response()->json([
                'error' => 'این تراکنش قبلاً به صورت همزمان پردازش و تایید شده است (Concurrent Replay Blocked).',
                'code' => 'TRANSACTION_REPLAY_BLOCKED',
            ], 409);
        }

        try {
            $finalizedOrder = $paymentService->finalizeVerifiedOrder($order, $refId, $clientIp);
        } catch (Throwable $finalizeError) {
            Log::error('Order finalization exception after bank verification', [
                'order_id' => $order->id,
                'ref_id' => $refId,
                'exception' => $finalizeError->getMessage(),
            ]);
            // Bank verification already succeeded; never lose a verified customer payment if fulfillment encounters an exception.
            $order->update([
                'payment_status' => 'paid',
                'fulfillment_status' => 'reconciliation_required',
                'ref_id' => $refId,
                'tracking_code' => $refId,
                'paid_at' => $order->paid_at ?? now(),
            ]);
            $paymentService->recordPaymentEvent(
                $order,
                $transaction,
                'FINALIZATION_EXCEPTION_RECONCILIATION_REQUIRED',
                'processing',
                'reconciliation_required',
                $refId,
                $clientIp,
                'تأیید بانک موفق بود اما نهایی‌سازی سفارش نیازمند بررسی دستی مربی است.'
            );
            $finalizedOrder = $order->fresh();
        }

        AuditLog::create([
            'action' => ! empty($entryLock['isLatePaymentRecovery']) ? 'LATE_PAYMENT_VERIFIED_SHAPARAK' : 'PAYMENT_VERIFIED_SHAPARAK',
            'actor' => $order->customer_phone,
            'ip_address' => $clientIp,
            'details' => "تراکنش سفارش {$order->id} از طریق درگاه {$gateway} با کد مرجع {$refId} تأیید شد (وضعیت تحویل: {$finalizedOrder->fulfillment_status}).",
            'created_at' => now(),
        ]);

        if ($finalizedOrder->fulfillment_status === 'reconciliation_required' && $request->expectsJson()) {
            return response()->json([
                'error' => 'پرداخت بانکی شما با موفقیت تایید و ثبت شد، اما به دلیل اتمام موجودی انبار در لحظه نهایی‌سازی، سفارش در صف بازگشت وجه / تامین اولویت‌دار قرار گرفت.',
                'code' => 'PAYMENT_RECONCILIATION_REQUIRED',
                'orderId' => $finalizedOrder->id,
                'paymentStatus' => $finalizedOrder->payment_status,
                'fulfillmentStatus' => $finalizedOrder->fulfillment_status,
                'refId' => $refId,
            ], 409);
        }

        return redirect($returnUrl);
    }

    /**
     * Sandbox Simulator Callback — Strictly DISABLED in Production (Fail-Closed).
     * In development/testing, requires order ownership token or admin authentication.
     */
    public function handleSandboxCallback(
        Request $request,
        PaymentService $paymentService,
        OrderPolicy $policy
    ): JsonResponse {
        if (app()->environment('production')) {
            return response()->json([
                'error' => 'شبیه‌ساز درگاه پرداخت در محیط عملیاتی (Production) غیرفعال است (Fail-Closed).',
                'code' => 'MOCK_GATEWAY_DISABLED_IN_PRODUCTION',
            ], 403);
        }

        $orderId = (string) $request->input('orderId', '');
        $status = (string) $request->input('status', '');

        if ($orderId === '' || $orderId === '_default_') {
            return response()->json([
                'error' => 'تغییر وضعیت پیش‌فرض سراسری سفارش‌ها مجاز نیست.',
                'code' => 'GLOBAL_OUTCOME_MUTATION_FORBIDDEN',
            ], 403);
        }

        if (! in_array($status, ['paid', 'failed', 'cancelled', 'pending', 'verification_pending'], true)) {
            return response()->json(['error' => 'وضعیت پرداخت نامعتبر است.'], 400);
        }

        $order = Order::with('items')->find($orderId);
        if (! $order) {
            return response()->json(['error' => 'سفارش یافت نشد.'], 404);
        }

        $cookieToken = (string) $request->cookie('wl_order_token_' . $orderId, '');
        $providedToken = (string) ($request->input('token') ?: $request->header('X-Order-Token') ?: $cookieToken);

        if (! $policy->view($request->user(), $order, $providedToken)) {
            return response()->json([
                'error' => 'تأیید تراکنش شبیه‌ساز نیازمند توکن معتبر سفارش یا نشست مدیریت است.',
                'code' => 'MOCK_CALLBACK_UNAUTHORIZED',
            ], 403);
        }

        if ($order->payment_status === 'paid' && $status === 'paid') {
            return response()->json((new OrderResource($order))->resolve($request));
        }

        if ($status === 'paid') {
            PaymentTransaction::where('order_id', $order->id)
                ->whereIn('status', ['initiated', 'verification_pending', 'processing', 'cancelled', 'failed'])
                ->update(['status' => 'verified', 'verified_at' => now()]);
            $order = $paymentService->finalizeVerifiedOrder($order, (string) $order->tracking_code, (string) $request->ip());
        } elseif ($status === 'verification_pending') {
            $order->update(['payment_status' => 'verification_pending']);
            PaymentTransaction::where('order_id', $order->id)
                ->whereIn('status', ['initiated', 'processing'])
                ->update(['status' => 'verification_pending']);
        } else {
            if ($status === 'failed' || $status === 'cancelled') {
                $paymentService->releaseReservedInventory($order);
            }
            $order->update(['payment_status' => $status]);
            PaymentTransaction::where('order_id', $order->id)
                ->whereIn('status', ['initiated', 'verification_pending', 'processing'])
                ->update(['status' => $status === 'cancelled' ? 'cancelled' : 'failed']);
        }

        return response()->json((new OrderResource($order))->resolve($request));
    }
}
