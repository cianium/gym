<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CoachSmsOutbox extends Model
{
    protected $table = 'coach_sms_outbox';
    protected $fillable = [
        'event_key', 'booking_id', 'recipient_kind', 'recipient_phone', 'template_args',
        'state', 'attempt_count', 'lease_until', 'provider_receipt', 'last_error_code',
    ];

    protected function casts(): array
    {
        return ['template_args' => 'array', 'lease_until' => 'datetime'];
    }
}
