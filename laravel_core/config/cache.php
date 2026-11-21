<?php

declare(strict_types=1);

$installedLockExists = file_exists(dirname(__DIR__) . '/storage/installed.lock');

// Before first-time installation completes (when no .env or MySQL 'cache' table exists yet),
// use the local file cache driver so rate-limited pre-install routes (POST /api/v1/install/run)
// never fail with PDOException trying to query an unconfigured database.
$defaultCacheStore = $installedLockExists ? env('CACHE_STORE', 'database') : 'file';

return [
    'default' => $defaultCacheStore,

    'stores' => [
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],

        'database' => [
            'driver' => 'database',
            'connection' => env('DB_CACHE_CONNECTION'),
            'table' => env('DB_CACHE_TABLE', 'cache'),
            'lock_connection' => env('DB_CACHE_LOCK_CONNECTION'),
            'lock_table' => env('DB_CACHE_LOCK_TABLE', 'cache_locks'),
        ],

        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],
    ],

    'prefix' => env('CACHE_PREFIX', 'wl_coach_cache_'),
];
