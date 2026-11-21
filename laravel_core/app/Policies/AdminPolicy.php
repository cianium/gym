<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class AdminPolicy
{
    public function managePlatform(User $user): bool
    {
        return $user->role === 'admin';
    }
}
