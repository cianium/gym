<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Browser-level protections for public pages and API responses. */
final class ApplySecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('X-Frame-Options', 'DENY');
        // QR scanning belongs to the public SPA. Allow camera permission only
        // for same-origin public documents, never for API or dedicated portals.
        $publicDocument = $request->is('/', 'profile', 'shop', 'explore', 'contact', 'product/*', 'products/*', 'posts/*');
        $response->headers->set('Permissions-Policy', $publicDocument
            ? 'camera=(self), microphone=(), geolocation=()'
            : 'camera=(), microphone=(), geolocation=()');
        // The bootstrap endpoint can contain private admin data depending on the
        // session. Never let shared proxies or browsers retain a personalized copy.
        // Apply the same policy to order, authentication and installer APIs.
        if ($request->is('api/v1/bootstrap')
            || $request->is('api/v1/admin/*')
            || $request->is('api/v1/auth/*')
            || $request->is('api/v1/athlete/*')
            || $request->is('api/v1/athlete')
            || $request->is('api/v1/customer/*')
            || $request->is('api/v1/downloads/*')
            || $request->is('api/v1/install/*')
            || $request->is('api/v1/payments/*')
            || $request->is('api/v1/orders/*')
            || $request->is('api/orders/*')
            || $request->is('api/checkout')
            || $request->is('api/v1/checkout')) {
            $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }
        // Do not introduce an untested CSP that could break the compiled SPA.
        // HSTS must only be enabled by the TLS terminator for HTTPS deployments.
        return $response;
    }
}
