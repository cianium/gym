<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $table = 'orders';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'order_number',
        'tracking_code',
        'ref_id',
        'access_token',
        'idempotency_key',
        'gateway',
        'payment_status',
        'fulfillment_status',
        'stock_reserved',
        'discount_reserved',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_city',
        'customer_address',
        'customer_postal_code',
        'customer_notes',
        'subtotal_toman',
        'discount_amount_toman',
        'discount_code',
        'shipping_cost_toman',
        'total_amount_toman',
        'paid_at',
        'refund_type',
        'refund_reference',
        'refunded_at',
    ];

    protected $hidden = [
        'access_token',
    ];

    protected function casts(): array
    {
        return [
            'stock_reserved' => 'boolean',
            'discount_reserved' => 'boolean',
            'subtotal_toman' => 'integer',
            'discount_amount_toman' => 'integer',
            'shipping_cost_toman' => 'integer',
            'total_amount_toman' => 'integer',
            'paid_at' => 'datetime',
            'refunded_at' => 'datetime',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id', 'id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'order_id', 'id');
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(DigitalEntitlement::class, 'order_id', 'id');
    }
}
