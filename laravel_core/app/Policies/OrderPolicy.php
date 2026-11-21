<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;

class OrderPolicy
{
    /**
     * Determines whether the requester can view an order.
     * Allowed if:
     * 1. Authenticated user has 'admin' role, OR
     * 2. Verified athlete owns the normalized phone number on the order, OR
     * 3. Request provides a cryptographically matching order access_token (header/cookie only).
     */
    public function view(?User $user, Order $order, ?string $providedToken = null): bool
    {
        if ($user && $user->role === 'admin') {
            return true;
        }

        // A proven (OTP-verified) athlete mobile number is an ownership
        // credential. A self-declared / coach-created phone is NOT sufficient.
        if ($user && $user->role === 'athlete' && $user->phone_verified_at) {
            $normalize = static function (string $phone): string {
                $digits = preg_replace('/[^0-9]/', '', $phone);
                if (str_starts_with($digits, '0098')) return '0' . substr($digits, 4);
                if (str_starts_with($digits, '98')) return '0' . substr($digits, 2);
                return $digits;
            };
            $phone = $normalize((string) $user->phone);
            if (preg_match('/^09[0-9]{9}$/D', $phone)
                && hash_equals($phone, $normalize((string) $order->customer_phone))) {
                return true;
            }
        }

        if ($providedToken && $order->access_token) {
            return hash_equals((string) $order->access_token, (string) $providedToken);
        }

        return false;
    }
}
