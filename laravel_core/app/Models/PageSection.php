<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PageSection extends Model
{
    protected $table = 'page_sections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'page_target',
        'block_type',
        'label',
        'kicker',
        'title',
        'subtitle',
        'cta_text',
        'cta_route',
        'enabled',
        'sort_order',
        'bg_type',
        'solid_color',
        'gradient_preset',
        'image_preset',
        'custom_image_url',
        'image_display_mode',
        'overlay_opacity',
        'height_mode',
        'is_custom_block',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'sort_order' => 'integer',
            'overlay_opacity' => 'integer',
            'is_custom_block' => 'boolean',
        ];
    }
}
