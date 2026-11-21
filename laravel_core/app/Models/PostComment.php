<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PostComment extends Model
{
    protected $table = 'post_comments';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'post_id',
        'author_name',
        'author_role',
        'text',
        'is_coach_reply',
        'approved',
    ];

    protected function casts(): array
    {
        return [
            'is_coach_reply' => 'boolean',
            'approved' => 'boolean',
        ];
    }
}
