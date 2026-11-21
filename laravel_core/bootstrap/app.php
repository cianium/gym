<?php

declare(strict_types=1);

use App\Http\Middleware\ApplySecurityHeaders;
use App\Http\Middleware\EnsureAthleteAuthenticated;
use App\Http\Middleware\EnsureAdminAuthenticated;
use App\Http\Middleware\EnsureSystemInstalled;
use App\Http\Middleware\VerifyAdminCsrfToken;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->statefulApi();
        $middleware->append(ApplySecurityHeaders::class);
        // Admin authentication and CSRF protection are session-backed even for
        // non-browser API clients (tests, cURL and same-origin mobile shells).
        $middleware->api(prepend: [StartSession::class]);
        $middleware->alias([
            'admin.auth' => EnsureAdminAuthenticated::class,
            'athlete.auth' => EnsureAthleteAuthenticated::class,
            'admin.csrf' => VerifyAdminCsrfToken::class,
            'system.installed' => EnsureSystemInstalled::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(function (Request $request) {
            return $request->is('api/*') || $request->expectsJson();
        });

        // Never leak raw stack traces, SQL queries, filesystem paths, or env secrets to unauthenticated visitors
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($e instanceof ValidationException) {
                return null;
            }

            if ($request->is('api/*') || $request->expectsJson()) {
                $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;
                if ($status >= 500 && ! config('app.debug')) {
                    return response()->json([
                        'error' => 'خطای داخلی سرور رخ داده است. لطفاً دقایقی دیگر مجدداً تلاش کنید.',
                        'code' => 'INTERNAL_SERVER_ERROR',
                    ], 500);
                }
            }

            return null;
        });
    })->create();
