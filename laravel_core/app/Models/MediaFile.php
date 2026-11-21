<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MediaFile extends Model
{
    use HasUuids;

    protected $table = 'media_files';

    protected $fillable = [
        'id',
        'disk',
        'directory',
        'filename',
        'original_name',
        'mime_type',
        'size_bytes',
        'public_url',
        'uploaded_by',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }
}
