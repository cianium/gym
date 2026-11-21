<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoachMessage extends Model
{
    protected $fillable = ['athlete_id', 'sender_id', 'body', 'read_by_athlete_at', 'read_by_coach_at'];

    protected function casts(): array
    {
        return ['read_by_athlete_at' => 'datetime', 'read_by_coach_at' => 'datetime'];
    }
}
