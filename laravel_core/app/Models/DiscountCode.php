<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DiscountCode extends Model
{
    use HasUuids;

    protected $table = 'discount_codes';

    protected $fillable = [
        'id',
        'code',
        'percent_off',
        'max_uses',
        'used_count',
        'min_order_amount_toman',
        'max_discount_amount_toman',
        'active',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'percent_off' => 'integer',
            'max_uses' => 'integer',
            'used_count' => 'integer',
            'min_order_amount_toman' => 'integer',
            'max_discount_amount_toman' => 'integer',
            'active' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }
}
