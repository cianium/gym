<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentEvent extends Model
{
    protected $table = 'payment_events';
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'transaction_id',
        'gateway',
        'event_type',
        'previous_status',
        'next_status',
        'authority_or_ref',
        'amount_toman',
        'ip_address',
        'details',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'transaction_id' => 'integer',
            'amount_toman' => 'integer',
            'created_at' => 'datetime',
        ];
    }
}
