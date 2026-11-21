<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CoachAppointmentSlot extends Model
{
    protected $fillable = ['starts_at', 'ends_at', 'created_by', 'is_active'];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'is_active' => 'boolean'];
    }

    public function activeBooking(): HasOne
    {
        return $this->hasOne(CoachConsultationBooking::class, 'active_slot_id');
    }
}
