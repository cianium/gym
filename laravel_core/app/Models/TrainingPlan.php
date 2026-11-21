<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TrainingPlan extends Model
{
    protected $fillable = ['athlete_id', 'coach_id', 'title', 'description', 'sessions', 'starts_on', 'ends_on', 'status'];
    protected function casts(): array { return ['sessions' => 'array', 'starts_on' => 'date:Y-m-d', 'ends_on' => 'date:Y-m-d']; }
}
