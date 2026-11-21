<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AdminStateController;
use App\Http\Controllers\Api\V1\PostInteractionController;
use App\Http\Controllers\Api\V1\SystemMaintenanceController;
use App\Http\Requests\InstallSystemRequest;
use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\ExplorePost;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;

$basePath = dirname(__DIR__);
$databasePath = $basePath . '/storage/database/smoke-' . bin2hex(random_bytes(6)) . '.sqlite';
$lockPath = $basePath . '/storage/installed.lock';
$hadLock = file_exists($lockPath);
$previousLock = $hadLock ? file_get_contents($lockPath) : null;

$setEnvironment = static function (string $key, string $value): void {
    putenv($key . '=' . $value);
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
};

foreach ([
    'APP_ENV' => 'testing',
    'APP_DEBUG' => 'false',
    'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => $databasePath,
    'SESSION_DRIVER' => 'array',
    'CACHE_STORE' => 'array',
    'QUEUE_CONNECTION' => 'sync',
] as $key => $value) {
    $setEnvironment($key, $value);
}

touch($databasePath);
require $basePath . '/vendor/autoload.php';
$app = require $basePath . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$pass = static fn (string $name) => fwrite(STDOUT, "PASS {$name}\n");
$assert = static function (bool $condition, string $name): void {
    if (! $condition) {
        throw new RuntimeException("FAIL {$name}");
    }
};

try {
    Artisan::call('migrate:fresh', ['--force' => true]);
    file_put_contents($lockPath, "smoke-test\n", LOCK_EX);

    BrandSetting::create([
        'brand_name' => '</script><script>globalThis.pwned=true</script>',
        'brand_subtitle' => 'Regression test',
        'canonical_domain' => 'https://example.test',
        'theme_tokens' => [],
        'site_modules' => [],
    ]);
    $response = $app->make(Kernel::class)->handle(Request::create('/', 'GET'));
    $html = (string) $response->getContent();
    $assert($response->getStatusCode() === 200 && ! str_contains($html, '</script><script>globalThis.pwned'), 'json-ld-xss');
    $pass('json-ld-xss');

    $backupResponse = app(SystemMaintenanceController::class)->restoreBackup(Request::create(
        '/api/v1/admin/backup/restore',
        'POST',
        [
            'format' => SystemMaintenanceController::BACKUP_FORMAT,
            'releaseVersion' => SystemMaintenanceController::RELEASE_VERSION,
            'data' => [],
            'files' => [],
        ]
    ));
    $backupPayload = $backupResponse->getData(true);
    $assert($backupResponse->getStatusCode() === 422 && ($backupPayload['code'] ?? '') === 'BACKUP_CHECKSUM_REQUIRED', 'backup-checksum-required');
    $pass('backup-checksum-required');

    $unsignedContent = ['data' => [], 'files' => []];
    $unsignedResponse = app(SystemMaintenanceController::class)->restoreBackup(Request::create(
        '/api/v1/admin/backup/restore',
        'POST',
        [
            'format' => SystemMaintenanceController::BACKUP_FORMAT,
            'releaseVersion' => SystemMaintenanceController::RELEASE_VERSION,
            ...$unsignedContent,
            'sha256' => hash('sha256', json_encode($unsignedContent, JSON_UNESCAPED_UNICODE)),
        ]
    ));
    $assert(
        $unsignedResponse->getStatusCode() === 422
        && ($unsignedResponse->getData(true)['code'] ?? '') === 'BACKUP_SIGNATURE_REQUIRED',
        'backup-signature-required'
    );
    $pass('backup-signature-required');

    $maintenanceController = app(SystemMaintenanceController::class);
    $signedBundle = $maintenanceController->exportBackup(Request::create('/backup', 'GET'))->getData(true);
    $signedRestore = $maintenanceController->restoreBackup(Request::create('/restore', 'POST', $signedBundle));
    $assert($signedRestore->getStatusCode() === 200 && ($signedRestore->getData(true)['ok'] ?? false), 'signed-backup-roundtrip');
    $pass('signed-backup-roundtrip');

    $post = ExplorePost::create([
        'id' => 'post-regression',
        'title' => 'Regression',
        'caption' => 'Regression',
        'likes_count' => 0,
    ]);
    $likeController = app(PostInteractionController::class);
    $likeController->toggleLike(Request::create('/like', 'POST', ['direction' => 'like']), $post->id);
    $cookieName = 'wl_post_like_' . substr(hash('sha256', $post->id), 0, 24);
    $likeController->toggleLike(Request::create('/like', 'POST', ['direction' => 'like'], [$cookieName => '1']), $post->id);
    $assert((int) $post->fresh()->likes_count === 1, 'idempotent-like');
    $pass('idempotent-like');

    $validator = Validator::make([
        'brandName' => 'Brand',
        'coachName' => 'Coach',
        'adminUsername' => 'owner',
        'adminEmail' => 'owner@example.test',
        'adminPassword' => 'StrongPassword!123',
        'dbHost' => "localhost\nAPP_DEBUG=true",
    ], (new InstallSystemRequest())->rules());
    $assert($validator->fails() && $validator->errors()->has('dbHost'), 'installer-env-injection');
    $pass('installer-env-injection');

    $admin = User::create([
        'name' => 'Admin',
        'username' => 'owner',
        'phone' => '09120000000',
        'email' => 'owner@example.test',
        'password' => 'StrongPassword!123',
        'role' => 'admin',
    ]);
    foreach (['purchased-product', 'disposable-product'] as $productId) {
        Product::create([
            'id' => $productId,
            'type' => 'digital',
            'title' => $productId,
            'price_toman' => 100000,
            'description' => '',
            'status' => 'published',
        ]);
    }
    $order = Order::create([
        'id' => 'order-1',
        'order_number' => 'ORD-1',
        'tracking_code' => 'TRACK-1',
        'access_token' => str_repeat('a', 96),
        'gateway' => 'zarinpal',
        'payment_status' => 'paid',
        'fulfillment_status' => 'pending',
        'customer_name' => 'Customer',
        'customer_phone' => '09121111111',
        'subtotal_toman' => 100000,
        'total_amount_toman' => 100000,
    ]);
    OrderItem::create([
        'order_id' => $order->id,
        'product_id' => 'purchased-product',
        'title' => 'Purchased',
        'type' => 'digital',
        'unit_price_toman' => 100000,
        'qty' => 1,
    ]);
    $resetRequest = Request::create('/api/v1/admin/reset', 'POST');
    $resetRequest->setUserResolver(fn () => $admin);
    app(AdminStateController::class)->reset($resetRequest);
    $assert(
        Order::whereKey('order-1')->exists()
        && ! Product::whereKey('disposable-product')->exists()
        && (bool) Product::whereKey('purchased-product')->value('is_archived')
        && Product::whereKey('prod-digital-hypertrophy')->exists()
        && BrandSetting::exists()
        && AuditLog::where('action', 'ADMIN_CONTENT_RESET')->exists(),
        'safe-content-reset'
    );
    $pass('safe-content-reset');

    fwrite(STDOUT, "OK 7 smoke tests passed\n");
} catch (Throwable $exception) {
    fwrite(STDERR, $exception->getMessage() . "\n");
    exit(1);
} finally {
    @unlink($databasePath);
    if ($hadLock && is_string($previousLock)) {
        file_put_contents($lockPath, $previousLock, LOCK_EX);
    } else {
        @unlink($lockPath);
    }
}
