<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAthleteAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() || $request->user()->role !== 'athlete') {
            return response()->json(['error' => 'ورود به حساب ورزشکار الزامی است.', 'code' => 'ATHLETE_AUTH_REQUIRED'], 401);
        }
        return $next($request);
    }
}
