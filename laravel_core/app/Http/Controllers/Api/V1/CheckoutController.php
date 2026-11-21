<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;
use Illuminate\Database\QueryException;

class CheckoutController
{
    /**
     * Authoritative Server-Side Checkout & Physical Stock Reservation:
     * - Calculates all prices from DB using `Product::authoritativeUnitPrice()`
     * - Rejects Draft, Archived, and Out-of-Stock products
     * - Enforces Atomic Checkout Idempotency (`Idempotency-Key` header or `idempotencyKey` body field)
     *   using a database unique `idempotency_key` with row locking (cache-independent)
     * - Automatically expires abandoned pending orders (> 30 min) and releases reserved stock
     * - Strict Two-Pass Transaction:
     *   - Pass 1 (Read & Lock Only): Validates all products, shipping address, and discount code
     *     (active, expiration, usage quota, minimum order amount, max discount cap) BEFORE any DB write.
     *     Guarantees zero orphaned `reserved_stock` or `used_count` if any validation fails.
     *   - Pass 2 (Write): Atomically reserves physical stock, increments discount usage, and creates the order.
     * - Wraps gateway initiation and transaction creation in a rollback-safe block that releases
     *   all reserved inventory if gateway communication or transaction recording fails.
     * - Issues an `HttpOnly`, `SameSite=Lax` ownership cookie (`wl_order_token_<orderId>`) on the checkout response.
     */
    /** Secure checkout for the authenticated, OTP-verified athlete portal. */
    public function verifiedStore(Request $request, PaymentService $paymentService): JsonResponse
    {
        if (! $this->matchesVerifiedAthletePhone($request)) {
            return response()->json([
                'error' => 'پیش از خرید، وارد حساب ورزشکار با شماره تأییدشده شوید.',
                'code' => 'VERIFIED_CHECKOUT_REQUIRED',
            ], 403);
        }
        return $this->store($request, $paymentService);
    }

    private function canonicalMobile(string $phone): string
    {
        $phone = strtr($phone, [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
        ]);
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (str_starts_with($phone, '0098')) return '0' . substr($phone, 4);
        if (str_starts_with($phone, '98')) return '0' . substr($phone, 2);
        return $phone;
    }

    private function matchesVerifiedAthletePhone(Request $request): bool
    {
        $user = $request->user();
        if (! $user || $user->role !== 'athlete' || ! $user->phone_verified_at) return false;
        $userPhone = $this->canonicalMobile((string) $user->phone);
        $customerPhone = $this->canonicalMobile((string) $request->input('customer.phone', ''));
        return (bool) preg_match('/^09[0-9]{9}$/D', $userPhone) && hash_equals($userPhone, $customerPhone);
    }

    public function store(Request $request, PaymentService $paymentService): JsonResponse
    {
        // Fail closed on every checkout alias, including direct controller calls.
        if (! $this->matchesVerifiedAthletePhone($request)) {
            return response()->json([
                'error' => 'برای خرید، ابتدا شماره موبایل حساب خود را تأیید کنید.',
                'code' => 'VERIFIED_CHECKOUT_REQUIRED',
            ], 403);
        }

        $validated = $request->validate([
            'gateway' => ['required', 'string', 'in:zarinpal,sep'],
            'idempotencyKey' => ['nullable', 'string', 'max:128'],
            'discountCode' => ['nullable', 'string', 'max:64'],
            'customer' => ['required', 'array'],
            'customer.name' => ['required', 'string', 'min:2', 'max:160'],
            'customer.phone' => ['required', 'string', 'min:10', 'max:20'],
            'customer.email' => ['nullable', 'email', 'max:190'],
            'customer.city' => ['nullable', 'string', 'max:120'],
            'customer.address' => ['nullable', 'string', 'max:1000'],
            'customer.postalCode' => ['nullable', 'string', 'max:24'],
            'customer.notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.productId' => ['required', 'string', 'max:64'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:20'],
        ]);

        // Both headers and bodies are accepted for compatibility, but must agree.
        $headerKey = trim((string) $request->header('Idempotency-Key', ''));
        $bodyKey = trim((string) ($validated['idempotencyKey'] ?? ''));
        if ($headerKey !== '' && $bodyKey !== '' && ! hash_equals($headerKey, $bodyKey)) {
            return response()->json(['error' => 'کلید سفارش در هدر و بدنه یکسان نیست.',
                'code' => 'IDEMPOTENCY_KEY_MISMATCH'], 422);
        }
        $rawIdempotencyKey = $headerKey !== '' ? $headerKey : $bodyKey;
        // Checkout requires a stable client-generated key, independent of the config file.
        if ($rawIdempotencyKey === '') {
            return response()->json(['error' => 'شناسه یکتای درخواست خرید الزامی است.',
                'code' => 'IDEMPOTENCY_KEY_REQUIRED'], 422);
        }
        if (strlen($rawIdempotencyKey) < 20 || strlen($rawIdempotencyKey) > 128) {
            return response()->json(['error' => 'شناسه یکتای درخواست باید بین ۲۰ تا ۱۲۸ نویسه باشد.',
                'code' => 'WEAK_IDEMPOTENCY_KEY'], 422);
        }
        // A verified phone is always canonical, regardless of user-supplied formatting.
        $gateway = (string) $validated['gateway'];
        $customerPhone = $this->canonicalMobile((string) $request->user()->phone);
        $idempotencyHash = hash('sha256', $request->user()->id . '|' . $gateway . '|' . $rawIdempotencyKey);

        // Validate everything before expiring stock or modifying any DB state.
        $paymentService->expireStalePendingOrders(30);

        // Merge duplicate productIds in request payload in deterministic order
        $requestedQuantities = [];
        foreach ($validated['items'] as $item) {
            $pid = (string) $item['productId'];
            $requestedQuantities[$pid] = ($requestedQuantities[$pid] ?? 0) + (int) $item['qty'];
        }
        ksort($requestedQuantities);

        try {
            $checkoutResult = DB::transaction(function () use (
                $requestedQuantities,
                $validated,
                $gateway,
                $customerPhone,
                $idempotencyHash,
                $request
            ): array {
                // Atomic DB-level Idempotency Check inside transaction
                if ($idempotencyHash !== '') {
                    /** @var Order|null $existingOrder */
                    $existingOrder = Order::where('idempotency_key', $idempotencyHash)
                        ->lockForUpdate()
                        ->first();

                    if ($existingOrder) {
                        if (! $this->matchesCheckoutRequest($existingOrder, $validated)) {
                            return [
                                'error' => 'کلید تکرارناپذیری با محتوای سفارش قبلی مطابقت ندارد.',
                                'code' => 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                                'status' => 409,
                            ];
                        }
                        if ($existingOrder->payment_status === 'failed') {
                            return [
                                'error' => 'تلاش قبلی پرداخت ناموفق بود؛ برای تلاش جدید از کلید تازه استفاده کنید.',
                                'code' => 'IDEMPOTENT_CHECKOUT_FAILED',
                                'status' => 409,
                            ];
                        }
                        /** @var PaymentTransaction|null $existingTx */
                        $existingTx = PaymentTransaction::where('order_id', $existingOrder->id)
                            ->latest('id')
                            ->first();

                        if (! $existingTx) {
                            return [
                                'error' => 'ایجاد تراکنش بانکی برای سفارش قبلی هنوز نهایی نشده است؛ مجدداً تلاش کنید.',
                                'code' => 'PAYMENT_INITIATION_IN_PROGRESS',
                                'status' => 409,
                            ];
                        }
                        if (! in_array($existingOrder->payment_status, ['pending', 'processing', 'verification_pending', 'paid'], true)) {
                            return ['error' => 'این سفارش دیگر قابل پرداخت نیست؛ سفارش جدید ثبت کنید.',
                                'code' => 'ORDER_NOT_REPAYABLE', 'status' => 409];
                        }
                        return ['status' => 201, 'idempotentReplay' => true,
                            'order' => $existingOrder, 'transaction' => $existingTx];
                    }
                }

                // =========================================================================
                // PASS 1: Lock rows and validate ALL items, address, and discount rules
                // ZERO database writes occur in Pass 1 so early return never leaves
                // orphaned reserved_stock or discount usage!
                // =========================================================================
                $products = Product::whereIn('id', array_keys($requestedQuantities))
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                $subtotalToman = 0;
                $hasPhysical = false;
                $resolvedLines = [];

                foreach ($requestedQuantities as $productId => $qty) {
                    /** @var Product|null $product */
                    $product = $products->get($productId);

                    if (! $product) {
                        return [
                            'error' => "محصول انتخاب‌شده ({$productId}) یافت نشد.",
                            'code' => 'PRODUCT_NOT_FOUND',
                            'status' => 404,
                        ];
                    }

                    if ((bool) $product->is_archived || (string) $product->status !== 'published') {
                        return [
                            'error' => "محصول «{$product->title}» در حال حاضر غیرفعال یا آرشیو شده و قابل خرید نیست.",
                            'code' => 'PRODUCT_NOT_AVAILABLE',
                            'status' => 400,
                        ];
                    }

                    if (! $product->hasEnoughStock($qty)) {
                        return [
                            'error' => "موجودی انبار برای محصول «{$product->title}» کافی نیست.",
                            'code' => 'OUT_OF_STOCK',
                            'status' => 409,
                        ];
                    }

                    $unitPrice = $product->authoritativeUnitPrice();
                    $lineTotal = $unitPrice * $qty;
                    $subtotalToman += $lineTotal;

                    if ($product->type === 'physical') {
                        $hasPhysical = true;
                    }

                    $resolvedLines[] = [
                        'product' => $product,
                        'qty' => $qty,
                        'unit_price_toman' => $unitPrice,
                    ];
                }

                if ($hasPhysical && empty(trim((string) ($validated['customer']['address'] ?? '')))) {
                    return [
                        'error' => 'برای سفارش‌های حاوی محصولات فیزیکی، وارد کردن آدرس پستی الزامی است.',
                        'code' => 'SHIPPING_ADDRESS_REQUIRED',
                        'status' => 422,
                    ];
                }

                // Atomic Discount Code Verification (SELECT ... FOR UPDATE)
                $discountAmountToman = 0;
                $appliedDiscountCode = null;
                /** @var DiscountCode|null $lockedDiscount */
                $lockedDiscount = null;
                $rawDiscount = strtoupper(trim((string) ($validated['discountCode'] ?? '')));

                if ($rawDiscount !== '') {
                    $lockedDiscount = DiscountCode::where('code', $rawDiscount)->lockForUpdate()->first();
                    if (! $lockedDiscount || ! $lockedDiscount->active) {
                        return [
                            'error' => 'کد تخفیف واردشده معتبر یا فعال نیست.',
                            'code' => 'INVALID_DISCOUNT_CODE',
                            'status' => 422,
                        ];
                    }

                    if ($lockedDiscount->expires_at !== null && $lockedDiscount->expires_at->isPast()) {
                        return [
                            'error' => 'مهلت استفاده از این کد تخفیف به پایان رسیده است.',
                            'code' => 'DISCOUNT_CODE_EXPIRED',
                            'status' => 422,
                        ];
                    }

                    if ((int) $lockedDiscount->used_count >= (int) $lockedDiscount->max_uses) {
                        return [
                            'error' => 'سقف مجاز استفاده از این کد تخفیف تکمیل شده است.',
                            'code' => 'DISCOUNT_LIMIT_EXCEEDED',
                            'status' => 409,
                        ];
                    }

                    $minOrderAmount = (int) ($lockedDiscount->min_order_amount_toman ?? 0);
                    if ($minOrderAmount > 0 && $subtotalToman < $minOrderAmount) {
                        return [
                            'error' => 'جمع سبد خرید برای استفاده از این کد تخفیف کمتر از حداقل مجاز است.',
                            'code' => 'DISCOUNT_MIN_AMOUNT_NOT_MET',
                            'status' => 422,
                        ];
                    }

                    $percent = max(1, min(100, (int) $lockedDiscount->percent_off));
                    $discountAmountToman = (int) round(($subtotalToman * $percent) / 100);
                    $maxDiscountCap = $lockedDiscount->max_discount_amount_toman !== null
                        ? (int) $lockedDiscount->max_discount_amount_toman
                        : 0;
                    if ($maxDiscountCap > 0 && $discountAmountToman > $maxDiscountCap) {
                        $discountAmountToman = $maxDiscountCap;
                    }
                    $discountAmountToman = min($subtotalToman, $discountAmountToman);
                    $appliedDiscountCode = $lockedDiscount->code;
                }

                // =========================================================================
                // PASS 2: All validations succeeded — Atomically reserve stock, reserve
                // discount usage, and create the Order and OrderItems
                // =========================================================================
                foreach ($resolvedLines as $line) {
                    /** @var Product $prod */
                    $prod = $line['product'];
                    if ($prod->type === 'physical') {
                        $prod->increment('reserved_stock', (int) $line['qty']);
                    }
                }

                if ($lockedDiscount !== null) {
                    $lockedDiscount->increment('used_count');
                }

                $brand = BrandSetting::first();
                $shippingFlatRate = (int) ($brand?->shipping_flat_rate_toman ?? 85000);
                $freeShippingThreshold = (int) ($brand?->free_shipping_threshold_toman ?? 3000000);

                $afterDiscountToman = max(0, $subtotalToman - $discountAmountToman);
                $shippingCostToman = ($hasPhysical && $afterDiscountToman < $freeShippingThreshold)
                    ? $shippingFlatRate
                    : 0;
                $totalAmountToman = $afterDiscountToman + $shippingCostToman;

                $orderId = 'ord-' . now()->format('YmdHis') . '-' . bin2hex(random_bytes(4));
                $orderNumber = 'WL-' . now()->format('ym') . '-' . strtoupper(bin2hex(random_bytes(3)));
                $trackingCode = (string) random_int(100000000, 999999999);
                $accessToken = bin2hex(random_bytes(24));

                $order = Order::create([
                    'id' => $orderId,
                    'order_number' => $orderNumber,
                    'tracking_code' => $trackingCode,
                    'access_token' => $accessToken,
                    'idempotency_key' => $idempotencyHash,
                    'payment_status' => 'pending',
                    'fulfillment_status' => 'pending',
                    'stock_reserved' => $hasPhysical,
                    'discount_reserved' => ($appliedDiscountCode !== null),
                    'gateway' => $gateway,
                    'customer_name' => trim((string) $validated['customer']['name']),
                    'customer_phone' => $customerPhone,
                    'customer_email' => $validated['customer']['email'] ?? null,
                    'customer_city' => $validated['customer']['city'] ?? null,
                    'customer_address' => $validated['customer']['address'] ?? null,
                    'customer_postal_code' => $validated['customer']['postalCode'] ?? null,
                    'customer_notes' => $validated['customer']['notes'] ?? null,
                    'subtotal_toman' => $subtotalToman,
                    'discount_amount_toman' => $discountAmountToman,
                    'discount_code' => $appliedDiscountCode,
                    'shipping_cost_toman' => $shippingCostToman,
                    'total_amount_toman' => $totalAmountToman,
                ]);

                foreach ($resolvedLines as $line) {
                    /** @var Product $prod */
                    $prod = $line['product'];
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $prod->id,
                        'title' => (string) $prod->title,
                        'type' => (string) $prod->type,
                        'qty' => (int) $line['qty'],
                        'unit_price_toman' => (int) $line['unit_price_toman'],
                        'visual_preset' => (string) ($prod->visual_preset ?? 'digital-hypertrophy'),
                        'custom_image_url' => $prod->custom_image_url,
                        'download_token' => null,
                    ]);
                }

                AuditLog::create([
                    'action' => 'CHECKOUT_ORDER_CREATED',
                    'actor' => $customerPhone,
                    'ip_address' => (string) $request->ip(),
                    'details' => "ثبت سفارش {$order->order_number} ({$order->id}) به مبلغ {$totalAmountToman} تومان در درگاه {$gateway}",
                    'created_at' => now(),
                ]);

                return [
                    'status' => 201,
                    'idempotentReplay' => false,
                    'order' => $order,
                ];
            }, 3); // Retries MySQL deadlocks before any external gateway initiation.
        } catch (Throwable $e) {
            // Concurrent requests may both read the missing idempotency row.
            // The unique DB index is authoritative. A collision is retriable,
            // not a generic 500 and never a second successful order.
            if ($e instanceof QueryException && in_array((string) $e->getCode(), ['23000', '23505', '19'], true)
                && Order::where('idempotency_key', $idempotencyHash)->exists()) {
                return response()->json(['error' => 'درخواست قبلی در حال تکمیل است؛ همان کلید را دوباره ارسال کنید.',
                    'code' => 'CHECKOUT_IN_PROGRESS_RETRY'], 409);
            }
            Log::error('Checkout transaction failed', [
                'gateway' => $gateway,
                'phone' => $customerPhone,
                'exception' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'خطا در ثبت سفارش و رزرو موجودی. لطفاً مجدداً تلاش کنید.',
                'code' => 'CHECKOUT_TRANSACTION_FAILED',
            ], 500);
        }

        if ($checkoutResult['status'] !== 201) {
            return response()->json([
                'error' => $checkoutResult['error'],
                'code' => $checkoutResult['code'],
            ], $checkoutResult['status']);
        }

        /** @var Order $order */
        $order = $checkoutResult['order'];

        if (! empty($checkoutResult['idempotentReplay'])) {
            return $this->buildCheckoutResponse(
                $this->buildIdempotentResponse($order, $checkoutResult['transaction']), $request);
        }

        $callbackUrl = url("/api/v1/payments/callback/{$gateway}?orderId=" . urlencode($order->id));

        try {
            $driver = $paymentService->driver($gateway);
            $gatewayInit = $driver->initiatePayment(
                $order->id,
                (int) $order->total_amount_toman,
                $callbackUrl,
                (string) $order->customer_phone
            );

            $authority = (string) ($gatewayInit['authority'] ?? ('AUTH-' . bin2hex(random_bytes(8))));
            $paymentUrl = (string) ($gatewayInit['url'] ?? ("/payment/result?orderId=" . urlencode($order->id)));
            $redirectMethod = (string) ($gatewayInit['method'] ?? ($gateway === 'sep' ? 'POST' : 'GET'));
            $redirectFields = isset($gatewayInit['fields']) && is_array($gatewayInit['fields'])
                ? $gatewayInit['fields']
                : [];

            $transaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'gateway' => $gateway,
                'authority_or_token' => $authority,
                'amount_toman' => (int) $order->total_amount_toman,
                'currency' => 'IRT',
                'status' => 'initiated',
                'verification_attempts' => 0,
                'raw_callback_payload' => null,
            ]);

            $paymentService->recordPaymentEvent(
                $order,
                $transaction,
                'PAYMENT_INITIATED',
                null,
                'initiated',
                $authority,
                (string) $request->ip(),
                "ایجاد تراکنش اولیه درگاه {$gateway} به مبلغ {$order->total_amount_toman} تومان."
            );
        } catch (Throwable $e) {
            // Release reserved stock and discount usage if gateway initiation or transaction creation fails
            $paymentService->releaseReservedInventory($order);
            $order->update(['payment_status' => 'failed']);

            $paymentService->recordPaymentEvent(
                $order,
                null,
                'PAYMENT_INITIATION_FAILED',
                'pending',
                'failed',
                null,
                (string) $request->ip(),
                'خطا در ایجاد تراکنش درگاه پرداخت'
            );

            Log::error('Payment gateway initiation failed', [
                'order_id' => $order->id,
                'gateway' => $gateway,
                'exception' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'خطا در برقراری ارتباط با درگاه بانکی. موجودی رزروشده آزاد گردید؛ لطفاً مجدداً تلاش کنید.',
                'code' => 'GATEWAY_INITIATION_FAILED',
            ], 502);
        }

        $redirectInstruction = [
            'method' => $redirectMethod === 'POST' ? 'POST' : 'GET',
            'url' => $paymentUrl,
        ];
        if (! empty($redirectFields)) {
            $redirectInstruction['fields'] = $redirectFields;
        }

        $responsePayload = [
            'ok' => true,
            'orderId' => $order->id,
            'orderNumber' => $order->order_number,
            'trackingCode' => $order->tracking_code,
            'accessToken' => $order->access_token,
            'gateway' => $gateway,
            'authority' => $authority,
            'paymentUrl' => $paymentUrl,
            'redirect' => $redirectInstruction,
            'subtotalToman' => (int) $order->subtotal_toman,
            'discountAmountToman' => (int) $order->discount_amount_toman,
            'shippingCostToman' => (int) $order->shipping_cost_toman,
            'totalAmountToman' => (int) $order->total_amount_toman,
        ];

        return $this->buildCheckoutResponse($responsePayload, $request);
    }

    /** Rebuild the original bank redirect on DB replay, including SEP POST fields. */
    private function buildIdempotentResponse(Order $order, PaymentTransaction $tx): array
    {
        $gateway = (string) $order->gateway;
        $authority = (string) $tx->authority_or_token;
        if ($order->payment_status !== 'pending') {
            $redirect = ['method' => 'GET',
                'url' => '/payment/result?orderId=' . rawurlencode($order->id)];
        } elseif ($gateway === 'zarinpal' && str_starts_with($authority, 'SANDBOX_')) {
            $redirect = ['method' => 'GET',
                'url' => '/payment/result?orderId=' . rawurlencode($order->id)];
        } elseif ($gateway === 'zarinpal') {
            $redirect = ['method' => 'GET',
                'url' => 'https://payment.zarinpal.com/pg/StartPay/' . rawurlencode($authority)];
        } elseif ($gateway === 'sep' && str_starts_with($authority, 'SEP_SANDBOX_')) {
            $redirect = ['method' => 'POST',
                'url' => '/payment/result?orderId=' . rawurlencode($order->id),
                'fields' => ['OrderId' => $order->id, 'Gateway' => 'sep']];
        } else {
            $redirect = ['method' => 'POST', 'url' => 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
                'fields' => ['Token' => $authority, 'GetMethod' => 'false']];
        }
        return [
            'ok' => true, 'idempotentReplay' => true, 'orderId' => $order->id,
            'orderNumber' => $order->order_number, 'trackingCode' => $order->tracking_code,
            'accessToken' => $order->access_token, 'gateway' => $gateway,
            'authority' => $authority, 'paymentUrl' => $redirect['url'],
            'redirect' => $redirect,
            'subtotalToman' => (int) $order->subtotal_toman,
            'discountAmountToman' => (int) $order->discount_amount_toman,
            'shippingCostToman' => (int) $order->shipping_cost_toman,
            'totalAmountToman' => (int) $order->total_amount_toman,
        ];
    }

    /**
     * Never reveal an existing order's access token when the same idempotency key
     * is presented with a different cart or customer payload. Works even if the
     * transient cache was cleared, without introducing a schema migration.
     */
    private function matchesCheckoutRequest(Order $order, array $validated): bool
    {
        $requested = [];
        foreach ($validated['items'] as $item) {
            $id = (string) $item['productId'];
            $requested[$id] = ($requested[$id] ?? 0) + (int) $item['qty'];
        }
        ksort($requested);

        $existing = [];
        foreach ($order->items as $item) {
            $id = (string) $item->product_id;
            $existing[$id] = ($existing[$id] ?? 0) + (int) $item->qty;
        }
        ksort($existing);

        $customer = $validated['customer'];
        $sameValue = static fn (mixed $a, mixed $b): bool => trim((string) ($a ?? '')) === trim((string) ($b ?? ''));

        return $existing === $requested
            && $order->gateway === (string) $validated['gateway']
            && $sameValue($order->customer_name, $customer['name'] ?? '')
            && $this->canonicalMobile((string) $order->customer_phone)
                === $this->canonicalMobile((string) ($customer['phone'] ?? ''))
            && $sameValue($order->customer_email, $customer['email'] ?? '')
            && $sameValue($order->customer_city, $customer['city'] ?? '')
            && $sameValue($order->customer_address, $customer['address'] ?? '')
            && $sameValue($order->customer_postal_code, $customer['postalCode'] ?? '')
            && $sameValue($order->customer_notes, $customer['notes'] ?? '')
            && strtoupper(trim((string) $order->discount_code))
                === strtoupper(trim((string) ($validated['discountCode'] ?? '')));
    }

    private function buildCheckoutResponse(array $payload, Request $request): JsonResponse
    {
        $orderId = (string) ($payload['orderId'] ?? '');
        $accessToken = (string) ($payload['accessToken'] ?? '');
        $response = response()->json($payload, 201);

        if ($orderId !== '' && $accessToken !== '') {
            $response->cookie(
                'wl_order_token_' . $orderId,
                $accessToken,
                120,
                '/',
                null,
                $request->isSecure(),
                true,
                false,
                'lax'
            );
        }

        return $response;
    }
}
