<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSystemInstalled
{
    public function handle(Request $request, Closure $next): Response
    {
        $lockFile = storage_path('installed.lock');

        if (! file_exists($lockFile)) {
            return response()->json([
                'error' => 'پلتفرم هنوز نصب نشده است. لطفاً ابتدا جادوگر نصب را اجرا کنید.',
                'setupRequired' => true,
            ], 503);
        }

        return $next($request);
    }
}
