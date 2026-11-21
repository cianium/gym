<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DigitalEntitlement extends Model
{
    protected $table = 'digital_entitlements';
    protected $primaryKey = 'token';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'token',
        'order_id',
        'product_id',
        'customer_phone',
        'downloads_used',
        'max_downloads',
        'is_revoked',
        'revoked_at',
        'revoked_reason',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'downloads_used' => 'integer',
            'max_downloads' => 'integer',
            'is_revoked' => 'boolean',
            'revoked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
