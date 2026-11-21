<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyAdminCsrfToken
{
    public function handle(Request $request, Closure $next): Response
    {
        if (in_array(strtoupper($request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $headerToken = (string) $request->header('X-CSRF-Token', '');
            $sessionToken = (string) $request->session()->token();

            if ($headerToken === '' || $sessionToken === '' || ! hash_equals($sessionToken, $headerToken)) {
                return response()->json([
                    'error' => 'توکن امنیتی CSRF نامعتبر یا ارسال نشده است (X-CSRF-Token).',
                    'code' => 'CSRF_TOKEN_MISMATCH',
                ], 403);
            }
        }

        return $next($request);
    }
}
