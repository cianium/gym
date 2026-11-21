<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $table = 'products';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'type',
        'title',
        'subtitle',
        'price_toman',
        'discount_price_toman',
        'description',
        'features',
        'visual_preset',
        'custom_image_url',
        'status',
        'is_archived',
        'level',
        'duration',
        'file_format',
        'file_size',
        'private_file_path',
        'file_version',
        'modules',
        'stock',
        'reserved_stock',
        'sku',
        'material',
        'shipping_estimate',
    ];

    protected function casts(): array
    {
        return [
            'price_toman' => 'integer',
            'discount_price_toman' => 'integer',
            'features' => 'array',
            'modules' => 'array',
            'stock' => 'integer',
            'reserved_stock' => 'integer',
            'file_version' => 'integer',
            'is_archived' => 'boolean',
        ];
    }

    /**
     * Available physical stock after subtracting reserved_stock.
     */
    public function availableStock(): int
    {
        if ($this->type !== 'physical') {
            return 999999;
        }
        $total = max(0, (int) ($this->stock ?? 0));
        $reserved = max(0, (int) ($this->reserved_stock ?? 0));
        return max(0, $total - $reserved);
    }

    /**
     * Checks if physical inventory can satisfy the requested quantity.
     */
    public function hasEnoughStock(int $qty): bool
    {
        if ($this->type !== 'physical') {
            return true;
        }
        if ($this->stock === null || (int) $this->stock <= 0) {
            return false;
        }
        return $this->availableStock() >= max(1, $qty);
    }

    /**
     * Authoritative server-side unit price in Toman.
     * Uses discount_price_toman only when it is positive and strictly less than price_toman.
     */
    public function authoritativeUnitPrice(): int
    {
        $basePrice = max(0, (int) $this->price_toman);
        $discountPrice = $this->discount_price_toman !== null ? (int) $this->discount_price_toman : null;

        if ($discountPrice !== null && $discountPrice > 0 && $discountPrice < $basePrice) {
            return $discountPrice;
        }

        return $basePrice;
    }

    /**
     * Checks whether the product is published, not archived, and has sufficient stock.
     */
    public function isPurchasable(int $qty = 1): bool
    {
        if ((bool) $this->is_archived || (string) $this->status !== 'published') {
            return false;
        }

        return $this->hasEnoughStock($qty);
    }
}
