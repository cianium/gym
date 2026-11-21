<?php

declare(strict_types=1);

// Run: php tests/route_security_smoke.php
// Exercises actual route middleware and controller dispatch without a database.
// No sessions, orders or payments are persisted.
putenv('APP_ENV=testing');
putenv('APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
putenv('SESSION_DRIVER=array');
putenv('CACHE_STORE=array');

require dirname(__DIR__) . '/vendor/autoload.php';
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Http\Kernel::class);
$tested = 0;
foreach (['/api/checkout', '/api/v1/checkout', '/api/v1/athlete/checkout'] as $path) {
    $request = \Illuminate\Http\Request::create(
        $path, 'POST', [
            'customer' => ['name' => 'Test Client', 'phone' => '09121111111'],
            'items' => [['productId' => 'TEST', 'qty' => 1]],
            'gateway' => 'zarinpal',
        ], [], [], ['HTTP_ACCEPT' => 'application/json']
    );
    $response = $kernel->handle($request);
    $payload = json_decode((string) $response->getContent(), true);
    if ($response->getStatusCode() !== 401 || ($payload['code'] ?? null) !== 'ATHLETE_AUTH_REQUIRED') {
        fwrite(STDERR, "FAIL: anonymous request to {$path} not rejected\n");
        exit(1);
    }
    $kernel->terminate($request, $response);
    $tested++;
    echo "PASS: {$path} denies guest checkout\n";
}
$webRequest = \Illuminate\Http\Request::create('/', 'GET');
$webResponse = $kernel->handle($webRequest);
if ($webResponse->getStatusCode() !== 200
    || ! str_contains((string) $webResponse->getContent(), '/assets/secure-checkout.js')
    || ! preg_match('#/assets/index-[a-f0-9]{10}\.js#', (string) $webResponse->getContent())) {
    fwrite(STDERR, "FAIL: dynamic public HTML did not load the verified purchase gate\n");
    exit(1);
}
$kernel->terminate($webRequest, $webResponse);
$tested++;
echo "PASS: dynamic SPA HTML injects secure checkout gate and cache-busted bundle\n";
echo "OK: {$tested} HTTP route/HTML checks validated without database\n";
