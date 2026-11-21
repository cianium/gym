<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    protected $table = 'payment_transactions';

    protected $fillable = [
        'order_id',
        'gateway',
        'authority_or_token',
        'ref_id',
        'amount_toman',
        'currency',
        'status',
        'verification_attempts',
        'last_error',
        'verified_at',
        'raw_callback_payload',
    ];

    protected function casts(): array
    {
        return [
            'amount_toman' => 'integer',
            'verification_attempts' => 'integer',
            'verified_at' => 'datetime',
            'raw_callback_payload' => 'array',
        ];
    }
}
