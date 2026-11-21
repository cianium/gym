<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationRequest extends Model
{
    protected $table = 'consultation_requests';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'sender_name',
        'sender_phone',
        'goal_topic',
        'message',
        'status',
        'coach_notes',
    ];
}
