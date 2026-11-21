<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExplorePost extends Model
{
    protected $table = 'explore_posts';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'media_type',
        'title',
        'caption',
        'tags',
        'visual_preset',
        'custom_media_url',
        'slides',
        'likes_count',
        'views_count',
        'duration_sec',
        'bpm_tempo',
        'linked_product_id',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'slides' => 'array',
            'likes_count' => 'integer',
            'views_count' => 'integer',
            'duration_sec' => 'integer',
            'bpm_tempo' => 'integer',
        ];
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PostComment::class, 'post_id', 'id');
    }
}
