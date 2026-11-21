<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Enforce PHP 8.3+ runtime requirement (Fail-Closed on incompatible shared hosting PHP versions)
if (PHP_VERSION_ID < 80300) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode([
        'error' => 'نسخه PHP سرور (' . PHP_VERSION . ') پشتیبانی نمی‌شود. این پلتفرم نیازمند PHP 8.3 یا بالاتر است.',
        'code' => 'UNSUPPORTED_PHP_VERSION',
        'requiredPhpVersion' => '>=8.3.0',
    ], JSON_UNESCAPED_UNICODE));
}

// Shared Hosting Path Isolation: Core Laravel directory resides outside public_html
$laravelRoot = is_dir(__DIR__ . '/../laravel_core')
    ? __DIR__ . '/../laravel_core'
    : dirname(__DIR__);

// Ensure runtime storage subdirectories exist before booting pre-install file sessions/cache
foreach ([
    '/storage/app/private_downloads',
    '/storage/app/public/media',
    '/storage/app/backups',
    '/storage/framework/cache/data',
    '/storage/framework/sessions',
    '/storage/framework/views',
    '/storage/logs',
    '/bootstrap/cache',
] as $relDir) {
    $fullDir = $laravelRoot . $relDir;
    if (! is_dir($fullDir)) {
        @mkdir($fullDir, 0750, true);
    }
}

if (file_exists($maintenance = $laravelRoot . '/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravelRoot . '/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());

