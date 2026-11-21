<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Models\AuditLog;
use App\Models\DigitalEntitlement;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\PaymentEvent;
use App\Models\PaymentTransaction;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class PaymentService
{
    public function __construct(
        private readonly ZarinpalGateway $zarinpal,
        private readonly SepGateway $sep
    ) {
    }

    public function driver(string $gateway): PaymentProviderInterface
    {
        return match ($gateway) {
            'zarinpal' => $this->zarinpal,
            'sep' => $this->sep,
            default => throw new InvalidArgumentException("درگاه پرداخت نامعتبر است: {$gateway}"),
        };
    }

    /**
     * Records an immutable payment transition event in `payment_events`.
     */
    public function recordPaymentEvent(
        Order $order,
        ?PaymentTransaction $transaction,
        string $eventType,
        ?string $previousStatus,
        string $nextStatus,
        ?string $authorityOrRef = null,
        ?string $ipAddress = null,
        ?string $details = null
    ): PaymentEvent {
        return PaymentEvent::create([
            'order_id' => $order->id,
            'transaction_id' => $transaction?->id,
            'gateway' => (string) $order->gateway,
            'event_type' => $eventType,
            'previous_status' => $previousStatus,
            'next_status' => $nextStatus,
            'authority_or_ref' => $authorityOrRef,
            'amount_toman' => (int) $order->total_amount_toman,
            'ip_address' => $ipAddress ?: request()?->ip(),
            'details' => $details,
            'created_at' => now(),
        ]);
    }

    /**
     * Releases physical inventory and discount code usage that were reserved during checkout
     * when a payment is explicitly cancelled, fails verification, or expires.
     *
     * CRITICAL ACCOUNTING INVARIANT:
     * In Laravel, `Product::$stock` is total warehouse stock and `Product::$reserved_stock`
     * is the portion currently reserved by pending checkouts (`availableStock = stock - reserved_stock`).
     * Therefore, releasing a reservation MUST ONLY decrement `reserved_stock` and NEVER increment `stock`.
     */
    public function releaseReservedInventory(Order $order): void
    {
        DB::transaction(function () use ($order) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::with('items')->where('id', $order->id)->lockForUpdate()->firstOrFail();

            if (! $lockedOrder->stock_reserved && ! $lockedOrder->discount_reserved) {
                return;
            }

            if ($lockedOrder->stock_reserved) {
                foreach ($lockedOrder->items as $item) {
                    if ($item->type === 'physical') {
                        /** @var Product|null $product */
                        $product = Product::where('id', $item->product_id)->lockForUpdate()->first();
                        if ($product && $product->stock !== null) {
                            $product->reserved_stock = max(0, (int) $product->reserved_stock - (int) $item->qty);
                            $product->save();
                        }
                    }
                }
            }

            if ($lockedOrder->discount_code && ($lockedOrder->discount_reserved || $lockedOrder->stock_reserved)) {
                /** @var DiscountCode|null $discount */
                $discount = DiscountCode::where('code', strtoupper($lockedOrder->discount_code))
                    ->lockForUpdate()
                    ->first();
                if ($discount && (int) $discount->used_count > 0) {
                    $discount->used_count = max(0, (int) $discount->used_count - 1);
                    $discount->save();
                }
            }

            $lockedOrder->stock_reserved = false;
            $lockedOrder->discount_reserved = false;
            $lockedOrder->save();
        });
    }

    /**
     * Automatically expires abandoned unpaid pending orders older than `$ttlMinutes`
     * and releases their reserved physical stock and discount usage.
     */
    public function expireStalePendingOrders(int $ttlMinutes = 30): int
    {
        $cutoff = now()->subMinutes(max(1, $ttlMinutes));

        $staleOrders = Order::where('payment_status', 'pending')
            ->where('created_at', '<=', $cutoff)
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        $expiredCount = 0;

        foreach ($staleOrders as $staleOrder) {
            DB::transaction(function () use ($staleOrder, &$expiredCount) {
                /** @var Order|null $locked */
                $locked = Order::where('id', $staleOrder->id)->lockForUpdate()->first();
                if (! $locked || $locked->payment_status !== 'pending') {
                    return;
                }

                if ($locked->stock_reserved || $locked->discount_reserved) {
                    $this->releaseReservedInventory($locked);
                    $locked->refresh();
                }

                $locked->payment_status = 'cancelled';
                $locked->save();

                /** @var PaymentTransaction|null $tx */
                $tx = PaymentTransaction::where('order_id', $locked->id)
                    ->where('status', 'initiated')
                    ->latest('id')
                    ->first();

                if ($tx) {
                    $tx->status = 'cancelled';
                    $tx->last_error = 'EXPIRED_ABANDONED_CHECKOUT';
                    $tx->save();
                }

                $this->recordPaymentEvent(
                    $locked,
                    $tx,
                    'PAYMENT_EXPIRED_STOCK_RELEASED',
                    'pending',
                    'cancelled',
                    $tx?->authority_or_token,
                    '127.0.0.1',
                    'انقضای خودکار سفارش پرداخت‌نشده و آزادسازی موجودی رزروشده.'
                );

                $expiredCount++;
            });
        }

        return $expiredCount;
    }

    /**
     * Atomically finalizes a bank-verified order inside a database transaction with row-level locks (`SELECT ... FOR UPDATE`).
     * - Prevents replay & duplicate fulfillment
     * - CRITICAL ACCOUNTING RULE (v2.2.0): A bank-verified payment must NEVER be marked as 'failed' if a post-verification
     *   inventory anomaly occurs (e.g., late payment after reservation expiry when another customer bought the last unit).
     *   Instead, `payment_status` becomes `'paid'` and `fulfillment_status` becomes `'reconciliation_required'`,
     *   preserving full audit and financial integrity without stealing another customer's reserved stock.
     * - When `stock_reserved` is true, decrements both `stock` (total physical stock) and `reserved_stock` by `$qty`.
     * - When `stock_reserved` is false (late payment recovery), verifies `hasEnoughStock($qty)` (`stock - reserved_stock >= qty`)
     *   and decrements `stock` by `$qty`.
     * - Issues 72h / 5-download digital entitlements (`dl_<48-hex>`).
     */
    public function finalizeVerifiedOrder(
        Order $order,
        string $refId,
        ?string $ipAddress = null,
        bool $isBankVerified = true
    ): Order {
        return DB::transaction(function () use ($order, $refId, $ipAddress, $isBankVerified): Order {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::with('items')
                ->where('id', $order->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Idempotency / Replay guard: already finalized
            if ($lockedOrder->payment_status === 'paid') {
                return $lockedOrder;
            }

            $stockAnomalyReason = null;

            // Pass 1: Lock and verify all physical product stock in deterministic ID order
            $physicalProductIds = $lockedOrder->items
                ->where('type', 'physical')
                ->pluck('product_id')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $lockedProducts = ! empty($physicalProductIds)
                ? Product::whereIn('id', $physicalProductIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id')
                : collect();

            foreach ($lockedOrder->items as $item) {
                if ($item->type === 'physical') {
                    /** @var Product|null $product */
                    $product = $lockedProducts->get($item->product_id);

                    if (! $product) {
                        $stockAnomalyReason = "PRODUCT_NOT_FOUND: محصول فیزیکی «{$item->title}» یافت نشد.";
                        break;
                    }

                    if ($lockedOrder->stock_reserved) {
                        if (
                            (int) $product->reserved_stock < (int) $item->qty ||
                            ($product->stock !== null && (int) $product->stock < (int) $item->qty)
                        ) {
                            $stockAnomalyReason = "INSUFFICIENT_RESERVED_STOCK: رزرو موجودی برای محصول «{$product->title}» کافی نیست.";
                            break;
                        }
                    } elseif (! $product->hasEnoughStock((int) $item->qty)) {
                        $stockAnomalyReason = "INSUFFICIENT_STOCK: موجودی آزاد انبار برای محصول «{$product->title}» در لحظه نهایی‌سازی (پرداخت دیرهنگام) کافی نیست.";
                        break;
                    }
                }
            }

            if ($stockAnomalyReason !== null && ! $isBankVerified) {
                throw new RuntimeException($stockAnomalyReason);
            }

            // Pass 2: Deduct physical stock or record reconciliation_required, and issue digital entitlements
            foreach ($lockedOrder->items as $item) {
                if ($item->type === 'physical' && $stockAnomalyReason === null) {
                    /** @var Product $product */
                    $product = $lockedProducts->get($item->product_id);

                    if ($lockedOrder->stock_reserved) {
                        $product->stock = max(0, (int) $product->stock - (int) $item->qty);
                        $product->reserved_stock = max(0, (int) $product->reserved_stock - (int) $item->qty);
                    } else {
                        $product->stock = max(0, (int) $product->stock - (int) $item->qty);
                    }
                    $product->save();
                }

                if ($item->type === 'digital' && empty($item->download_token)) {
                    $token = 'dl_' . bin2hex(random_bytes(24));

                    DigitalEntitlement::create([
                        'token' => $token,
                        'order_id' => $lockedOrder->id,
                        'product_id' => $item->product_id,
                        'customer_phone' => $lockedOrder->customer_phone,
                        'downloads_used' => 0,
                        'max_downloads' => 5,
                        'expires_at' => now()->addHours(72),
                    ]);

                    $item->download_token = $token;
                    $item->save();
                }
            }

            // If discount usage was not currently reserved (`!discount_reserved && !stock_reserved`), increment once
            if ($lockedOrder->discount_code && ! $lockedOrder->discount_reserved && ! $lockedOrder->stock_reserved) {
                /** @var DiscountCode|null $discount */
                $discount = DiscountCode::where('code', strtoupper($lockedOrder->discount_code))
                    ->lockForUpdate()
                    ->first();

                if ($discount && $discount->active && (int) $discount->used_count < (int) $discount->max_uses) {
                    $discount->increment('used_count');
                }
            }

            $hasPhysical = $lockedOrder->items->contains(fn ($i) => $i->type === 'physical');
            if ($stockAnomalyReason !== null) {
                $resolvedFulfillment = 'reconciliation_required';
                // If stock was somehow marked reserved but failed anomaly check, release any partial reservation safely
                if ($lockedOrder->stock_reserved) {
                    foreach ($lockedOrder->items as $item) {
                        if ($item->type === 'physical') {
                            /** @var Product|null $product */
                            $product = $lockedProducts->get($item->product_id);
                            if ($product && $product->stock !== null) {
                                $product->reserved_stock = max(0, (int) $product->reserved_stock - (int) $item->qty);
                                $product->save();
                            }
                        }
                    }
                }
            } else {
                $resolvedFulfillment = $hasPhysical ? 'pending' : 'delivered';
            }

            $lockedOrder->stock_reserved = false;
            $lockedOrder->discount_reserved = false;
            $lockedOrder->payment_status = 'paid';
            $lockedOrder->fulfillment_status = $resolvedFulfillment;
            $lockedOrder->ref_id = $refId;
            $lockedOrder->tracking_code = $refId;
            $lockedOrder->paid_at = $lockedOrder->paid_at ?? now();
            $lockedOrder->save();

            AuditLog::create([
                'action' => $stockAnomalyReason !== null ? 'PAYMENT_RECONCILIATION_REQUIRED' : 'PAYMENT_VERIFIED_PAID',
                'actor' => $lockedOrder->customer_phone,
                'ip_address' => $ipAddress,
                'details' => $stockAnomalyReason !== null
                    ? "تراکنش بانکی سفارش {$lockedOrder->order_number} با کد رهگیری {$refId} تأیید شد اما کسری موجودی فیزیکی رخ داد ({$stockAnomalyReason}). سفارش با وضعیت paid و fulfillment=reconciliation_required ثبت گردید."
                    : "تراکنش سفارش {$lockedOrder->order_number} با کد رهگیری بانکی {$refId} به صورت اتمیک تأیید و نهایی شد.",
                'created_at' => now(),
            ]);

            return $lockedOrder->fresh(['items', 'entitlements']);
        });
    }
}
