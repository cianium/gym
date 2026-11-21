<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoachConsultationBooking extends Model
{
    protected $fillable = ['slot_id', 'active_slot_id', 'athlete_id', 'status', 'athlete_note', 'coach_note', 'cancelled_at'];

    protected function casts(): array
    {
        return ['cancelled_at' => 'datetime'];
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(CoachAppointmentSlot::class, 'slot_id');
    }

    public function athlete(): BelongsTo
    {
        return $this->belongsTo(User::class, 'athlete_id');
    }
}
