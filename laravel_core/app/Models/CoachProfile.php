<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoachProfile extends Model
{
    protected $table = 'coach_profiles';

    protected $fillable = [
        'name',
        'english_name',
        'title',
        'tagline',
        'bio',
        'specialties',
        'experience_years',
        'active_athletes',
        'programs_delivered',
        'location',
        'phone',
        'email',
        'instagram_handle',
        'telegram_handle',
        'youtube_handle',
        'nfc_serial_code',
        'visual_preset',
        'custom_avatar_url',
        'certifications',
    ];

    protected function casts(): array
    {
        return [
            'specialties' => 'array',
            'certifications' => 'array',
            'experience_years' => 'integer',
            'active_athletes' => 'integer',
            'programs_delivered' => 'integer',
        ];
    }
}
