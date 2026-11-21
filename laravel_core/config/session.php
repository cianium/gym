<?php

declare(strict_types=1);

$installedLockExists = file_exists(dirname(__DIR__) . '/storage/installed.lock');

// Before first-time installation completes (empty MySQL database with no 'sessions' table yet),
// use the local file session driver so pre-install requests never fail with SQL table-not-found errors.
$defaultSessionDriver = $installedLockExists ? env('SESSION_DRIVER', 'database') : 'file';

return [
    'driver' => $defaultSessionDriver,
    'lifetime' => (int) env('SESSION_LIFETIME', 720),
    'expire_on_close' => false,
    'encrypt' => $installedLockExists ? (bool) env('SESSION_ENCRYPT', true) : false,
    'files' => storage_path('framework/sessions'),
    'connection' => env('SESSION_CONNECTION'),
    'table' => 'sessions',
    'store' => env('SESSION_STORE'),
    'lottery' => [2, 100],
    'cookie' => env('SESSION_COOKIE', 'wl_coach_sid'),
    'path' => env('SESSION_PATH', '/'),
    'domain' => env('SESSION_DOMAIN'),
    'secure' => (bool) env('SESSION_SECURE_COOKIE', true),
    'http_only' => true,
    'same_site' => 'lax',
    'partitioned' => false,
];
