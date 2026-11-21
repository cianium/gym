<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'name',
        'username',
        'phone',
        'email',
        'password',
        'role',
        'must_change_password',
        'totp_secret',
        'totp_enabled',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'totp_secret',
    ];

    protected function casts(): array
    {
        return [
            'must_change_password' => 'boolean',
            'totp_enabled' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
