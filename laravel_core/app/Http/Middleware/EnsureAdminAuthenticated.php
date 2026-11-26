<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->role !== 'admin') {
            return response()->json([
                'error' => 'احراز هویت مدیریت الزامی است. لطفاً ابتدا وارد حساب مدیریت شوید.',
                'code' => 'UNAUTHENTICATED',
            ], 401);
        }

        // A forced password rotation is a server-side gate, not a UI hint.
        if ($user->must_change_password && ! $request->is('api/v1/auth/admin/password', 'api/v1/auth/admin/logout')) {
            return response()->json([
                'error' => 'ابتدا رمز عبور مدیریت را تغییر دهید.',
                'code' => 'PASSWORD_CHANGE_REQUIRED',
            ], 403);
        }

        return $next($request);
    }
}
