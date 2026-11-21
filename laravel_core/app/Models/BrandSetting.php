<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BrandSetting extends Model
{
    protected $table = 'brand_settings';

    protected $fillable = [
        'brand_name',
        'brand_subtitle',
        'logo_url',
        'favicon_url',
        'share_image_url',
        'seo_title',
        'seo_description',
        'canonical_domain',
        'footer_copyright',
        'shipping_flat_rate_toman',
        'free_shipping_threshold_toman',
        'theme_tokens',
        'site_modules',
    ];

    protected function casts(): array
    {
        return [
            'shipping_flat_rate_toman' => 'integer',
            'free_shipping_threshold_toman' => 'integer',
            'theme_tokens' => 'array',
            'site_modules' => 'array',
        ];
    }
}
