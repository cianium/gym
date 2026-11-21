<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PageRevision extends Model
{
    use HasUuids;

    protected $table = 'page_revisions';
    public $timestamps = true;

    protected $fillable = [
        'id',
        'version_number',
        'label',
        'created_by',
        'status',
        'sections_snapshot',
        'theme_snapshot',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'version_number' => 'integer',
            'sections_snapshot' => 'array',
            'theme_snapshot' => 'array',
            'created_at' => 'datetime',
        ];
    }
}
