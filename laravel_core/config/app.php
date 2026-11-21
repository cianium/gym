<?php

declare(strict_types=1);

$installedLockExists = file_exists(dirname(__DIR__) . '/storage/installed.lock');
$configuredAppKey = env('APP_KEY');

// Clean Hosting Pre-Installation Support (Item 8):
// When no .env or APP_KEY exists yet and the system has not been installed, provide an ephemeral
// pre-install encryption key so Laravel can boot the installer route cleanly without throwing
// MissingAppKeyException. Once storage/installed.lock is created, the persisted APP_KEY is strictly required.
if (empty($configuredAppKey) && ! $installedLockExists) {
    $configuredAppKey = 'base64:' . base64_encode(hash('sha256', __DIR__ . '|wl-preinstall-bootstrap-key', true));
}

return [
    'name' => env('APP_NAME', 'White-Label Fitness Platform'),
    'env' => env('APP_ENV', 'production'),
    'debug' => (bool) env('APP_DEBUG', false),
    'url' => env('APP_URL', 'http://localhost'),
    'timezone' => env('APP_TIMEZONE', 'Asia/Tehran'),
    'locale' => env('APP_LOCALE', 'fa'),
    'fallback_locale' => env('APP_FALLBACK_LOCALE', 'en'),
    'faker_locale' => 'fa_IR',
    'cipher' => 'AES-256-CBC',
    'key' => $configuredAppKey,
    'installer_setup_token' => env('INSTALLER_SETUP_TOKEN', ''),
    'previous_keys' => [
        ...array_filter(
            explode(',', (string) env('APP_PREVIOUS_KEYS', ''))
        ),
    ],
    'maintenance' => [
        'driver' => 'file',
    ],
];
