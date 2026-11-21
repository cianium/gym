<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $table = 'order_items';
    public $timestamps = true;

    protected $fillable = [
        'order_id',
        'product_id',
        'title',
        'type',
        'qty',
        'unit_price_toman',
        'visual_preset',
        'custom_image_url',
        'download_token',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
            'unit_price_toman' => 'integer',
        ];
    }
}
