<?php

declare(strict_types=1);

// Database-free regression checks. Run with: php tests/static_runtime_regressions.php
// For full feature tests, install pdo_mysql or pdo_sqlite and PHPUnit.

use App\Http\Controllers\Api\V1\CheckoutController;
use App\Models\Order;
use App\Models\User;
use App\Policies\OrderPolicy;
use App\Services\Notifications\BookingSmsOutbox;
use App\Services\Notifications\MeliPayamakReceipt;
use App\Services\Maintenance\BackupVault;
use App\Services\Installer\InstallerService;
use Illuminate\Http\Request;
use App\Models\OrderItem;
use App\Services\Payments\ZarinpalGateway;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;

putenv('APP_ENV=testing');
putenv('APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
putenv('CACHE_STORE=array');
putenv('SESSION_DRIVER=array');

require dirname(__DIR__) . '/vendor/autoload.php';
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$passed = 0;
$check = static function (bool $condition, string $label) use (&$passed): void {
    if (! $condition) {
        throw new RuntimeException("FAIL: {$label}");
    }
    echo "PASS: {$label}\n";
    $passed++;
};

Http::fake(['payment.zarinpal.com/*' => Http::response(['data' => ['code' => 100]], 200)]);
$driver = new ZarinpalGateway(str_repeat('a', 36));
$result = $driver->verifyCallback(100000, ['Status' => 'OK', 'Authority' => 'TEST']);
$check($result['verified'] === false && $result['state'] === 'verification_pending', 'no forged/empty bank receipt');

$order = new Order([
    'gateway' => 'zarinpal',
    'customer_name' => 'Buyer',
    'customer_phone' => '09121111111',
    'customer_email' => 'buyer@example.test',
    'discount_code' => null,
]);
$order->setRelation('items', collect([
    new OrderItem(['product_id' => 'fitness-digital', 'qty' => 2]),
]));

$method = new ReflectionMethod(CheckoutController::class, 'matchesCheckoutRequest');
$payload = [
    'gateway' => 'zarinpal',
    'customer' => [
        'name' => 'Buyer',
        'phone' => '09121111111',
        'email' => 'buyer@example.test',
    ],
    'items' => [['productId' => 'fitness-digital', 'qty' => 2]],
];
$controller = new CheckoutController();
$check($method->invoke($controller, $order, $payload) === true, 'same checkout payload replay accepted');
$payload['items'][0]['qty'] = 3;
$check($method->invoke($controller, $order, $payload) === false, 'different cart replay denied');
$payload['items'][0]['qty'] = 2;
$payload['customer']['email'] = 'attacker@example.test';
$check($method->invoke($controller, $order, $payload) === false, 'different customer replay denied');

$check(BookingSmsOutbox::normalizePhone('+989121234567') === '09121234567', 'sms international phone normalization');
$check(BookingSmsOutbox::normalizePhone('۰۹۱۲۱۲۳۴۵۶۷') === '09121234567', 'sms Persian numeral normalization');
$check(BookingSmsOutbox::normalizePhone('1111') === null, 'sms invalid recipient rejected');
$check((new BookingSmsOutbox())->dispatch()['disabled'] === true, 'sms outbox disabled without credentials');

$verifiedAthlete = new User(['role' => 'athlete', 'phone' => '09121111111', 'name' => 'Owner']);
$verifiedAthlete->forceFill(['phone_verified_at' => now()]);
$unverifiedAthlete = new User(['role' => 'athlete', 'phone' => '09121111111', 'name' => 'Unverified']);
$otherAthlete = new User(['role' => 'athlete', 'phone' => '09121111112', 'name' => 'Other']);
$otherAthlete->forceFill(['phone_verified_at' => now()]);
$policy = new OrderPolicy();
$check($policy->view($unverifiedAthlete, $order) === false, 'unverified athlete cannot claim order by phone');
$check($policy->view($otherAthlete, $order) === false, 'verified but different phone cannot claim order');
$check($policy->view($verifiedAthlete, $order) === true, 'verified phone proves own order ownership');
$verifiedCheckout = new ReflectionMethod(CheckoutController::class, 'matchesVerifiedAthletePhone');
$checkoutRequest = Request::create('/api/v1/athlete/checkout', 'POST', ['customer' => ['phone' => '+989121111111']]);
$checkoutRequest->setUserResolver(fn () => $verifiedAthlete);
$check($verifiedCheckout->invoke($controller, $checkoutRequest) === true, 'verified checkout owns billing phone');
$checkoutRequest->merge(['customer' => ['phone' => '09128888888']]);
$check($verifiedCheckout->invoke($controller, $checkoutRequest) === false, 'verified checkout rejects different billing phone');

// MeliPayamak template API returns a numeric recId on acceptance.
$providerResponse = static fn(int $status, array $payload): \Illuminate\Http\Client\Response =>
    new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(
        $status, ['Content-Type' => 'application/json'], json_encode($payload)
    ));
$check(MeliPayamakReceipt::classify($providerResponse(200, ['recId' => 9283712]))['state'] === 'accepted', 'provider numeric receipt accepted');
$check(MeliPayamakReceipt::classify($providerResponse(200, ['recId' => '0']))['state'] === 'unknown', 'zero receipt not accepted');
$check(MeliPayamakReceipt::classify($providerResponse(200, ['status' => 'success']))['state'] === 'unknown', 'HTTP 200 without receipt ambiguous');
$check(MeliPayamakReceipt::classify($providerResponse(503, []))['state'] === 'unknown', 'provider server error ambiguous');
$check(MeliPayamakReceipt::classify($providerResponse(422, ['status' => 'invalid']))['state'] === 'rejected', 'provider client error rejected');

// Encryption must be authenticated, and require a separate 32-byte secret.
config()->set('services.fitness.backup_encryption_key', 'base64:' . base64_encode(str_repeat('K', 32)));
$vault = new BackupVault();
$plaintext = ['data' => ['email' => 'private@example.test', 'orders' => [1, 2, 3]]];
$encrypted = $vault->encryptBundle($plaintext);
$check($vault->decryptBundle($encrypted) === $plaintext, 'backup vault encryption round-trip');
$check(!str_contains(json_encode($encrypted), 'private@example.test'), 'backup vault does not leak data in file');
$tampered = $encrypted;
$tampered['ciphertext'] = base64_encode('X' . substr((string) base64_decode($encrypted['ciphertext']), 1));
$invalidRejected = false;
try { $vault->decryptBundle($tampered); } catch (\RuntimeException $e) { $invalidRejected = true; }
$check($invalidRejected, 'backup vault detects tampering');
$tempVaultDir = sys_get_temp_dir() . '/arash-backup-' . bin2hex(random_bytes(6));
try {
    $vault->writeSnapshot($tempVaultDir, 'test.vault', $plaintext);
    $onDisk = (string) file_get_contents($tempVaultDir . '/test.vault');
    $check(!str_contains($onDisk, 'private@example.test')
        && (fileperms($tempVaultDir . '/test.vault') & 0777) === 0600,
        'encrypted backup on disk with restrictive permissions');
    $check($vault->decryptBundle(json_decode($onDisk, true)) === $plaintext,
        'encrypted snapshot file can be recovered');
} finally {
    @unlink($tempVaultDir . '/test.vault');
    @rmdir($tempVaultDir);
}
config()->set('services.fitness.backup_encryption_key', '');
$missingKeyRejected = false;
try { $vault->encryptBundle($plaintext); } catch (\RuntimeException $e) { $missingKeyRejected = true; }
$check($missingKeyRejected, 'backup vault fails closed without secret');

// Installer must preserve custom SMTP/SMS keys and APP_KEY on interrupted install.
$originalBase = $app->basePath();
$temporaryBase = sys_get_temp_dir() . '/arash-env-test-' . bin2hex(random_bytes(6));
mkdir($temporaryBase . '/storage/app', 0700, true);
$fixedKey = 'base64:' . base64_encode(str_repeat('Q', 32));
file_put_contents($temporaryBase . '/.env', "APP_KEY={$fixedKey}\nMAIL_PASSWORD=\"a-secret\"\nATHLETE_MELIPAYAMAK_TOKEN=1234\nAPP_DEBUG=true\n# keep this comment\n");
try {
    $app->setBasePath($temporaryBase);
    $method = new ReflectionMethod(InstallerService::class, 'persistEnvironmentFile');
    $method->invoke(new InstallerService(), [
        'writeEnvInTests' => true,
        'canonicalDomain' => 'https://staging.example.test',
        'dbName' => 'staging_db',
        'dbUser' => 'db_account',
        'dbPass' => 'db-password',
    ], $fixedKey, 'Arash');
    $updated = file_get_contents($temporaryBase . '/.env');
    $check(str_contains($updated, 'MAIL_PASSWORD="a-secret"')
        && str_contains($updated, 'ATHLETE_MELIPAYAMAK_TOKEN=1234')
        && str_contains($updated, '# keep this comment'), 'installer preserves existing custom settings');
    $check(str_contains($updated, "APP_KEY={$fixedKey}")
        && str_contains($updated, 'APP_DEBUG=false')
        && str_contains($updated, 'DB_DATABASE="staging_db"'), 'installer updates owned settings without key rotation');
    $check(preg_match('/^BACKUP_ENCRYPTION_KEY=base64:/m', $updated) === 1
        && count(glob($temporaryBase . '/storage/app/installer_env_backups/*.bak')) === 1,
        'installer generates vault secret and retains a private .env rollback');
    $check((fileperms($temporaryBase . '/.env') & 0777) === 0600,
        'installer env file is owner-readable only');
} finally {
    $app->setBasePath($originalBase);
    foreach (glob($temporaryBase . '/storage/app/installer_env_backups/*.bak') ?: [] as $path) unlink($path);
    @rmdir($temporaryBase . '/storage/app/installer_env_backups');
    @rmdir($temporaryBase . '/storage/app');
    @rmdir($temporaryBase . '/storage');
    @unlink($temporaryBase . '/.env');
    @rmdir($temporaryBase);
}

// Mandatory account verification is enforced before any database access.
$anonymousCheckout = Request::create('/api/v1/checkout', 'POST', [
    'gateway' => 'zarinpal',
    'customer' => ['name' => 'Safe Customer', 'phone' => '09121111111'],
    'items' => [['productId' => 'dummy-product', 'qty' => 1]],
]);
$denied = $controller->store($anonymousCheckout, app(\App\Services\Payments\PaymentService::class));
$check($denied->getStatusCode() === 403 && $denied->getData(true)['code'] === 'VERIFIED_CHECKOUT_REQUIRED',
    'anonymous checkout is forbidden independent of feature flag');

$checkoutWithoutKey = Request::create('/api/v1/checkout', 'POST', [
    'gateway' => 'zarinpal',
    'customer' => ['name' => 'Safe Customer', 'phone' => '09121111111'],
    'items' => [['productId' => 'dummy-product', 'qty' => 1]],
]);
$checkoutWithoutKey->setUserResolver(fn() => $verifiedAthlete);
$idempotencyResponse = $controller->store($checkoutWithoutKey, app(\App\Services\Payments\PaymentService::class));
$check($idempotencyResponse->getStatusCode() === 422
    && ($idempotencyResponse->getData(true)['code'] ?? null) === 'IDEMPOTENCY_KEY_REQUIRED',
    'verified checkout requires idempotency key');

$checkoutWithoutKey->headers->set('Idempotency-Key', str_repeat('x', 24));
$checkoutWithoutKey->merge(['idempotencyKey' => str_repeat('y', 24)]);
$mismatch = $controller->store($checkoutWithoutKey, app(\App\Services\Payments\PaymentService::class));
$check($mismatch->getStatusCode() === 422
    && ($mismatch->getData(true)['code'] ?? null) === 'IDEMPOTENCY_KEY_MISMATCH',
    'header/body idempotency key mismatch denied');

$checkoutWithoutKey->merge(['idempotencyKey' => str_repeat('x', 24)]);
$checkoutWithoutKey->headers->set('Idempotency-Key', 'weak');
$weak = $controller->store($checkoutWithoutKey, app(\App\Services\Payments\PaymentService::class));
$check($weak->getStatusCode() === 422 && $weak->getData(true)['code'] === 'IDEMPOTENCY_KEY_MISMATCH',
    'a mismatching weak header is rejected');

$tx = new \App\Models\PaymentTransaction(['gateway' => 'sep', 'authority_or_token' => 'A_VALID_GATEWAY_TOKEN']);
$order->gateway = 'sep';
$order->payment_status = 'pending';
$replay = (new ReflectionMethod(CheckoutController::class, 'buildIdempotentResponse'))
    ->invoke($controller, $order, $tx);
$check($replay['redirect']['method'] === 'POST'
    && $replay['redirect']['fields']['Token'] === 'A_VALID_GATEWAY_TOKEN'
    && str_starts_with($replay['redirect']['url'], 'https://sep.shaparak.ir/'),
    'SEP repeat checkout keeps original bank POST destination and token');
$order->gateway = 'zarinpal';
$tx->authority_or_token = 'A_VALID_ZARINPAL_AUTHORITY';
$replay = (new ReflectionMethod(CheckoutController::class, 'buildIdempotentResponse'))
    ->invoke($controller, $order, $tx);
$check($replay['redirect']['method'] === 'GET'
    && str_contains($replay['redirect']['url'], 'pg/StartPay/A_VALID_ZARINPAL_AUTHORITY'),
    'Zarinpal repeated checkout keeps original bank GET URL');

$routes = file_get_contents(dirname(__DIR__) . '/routes/api.php');
$check(substr_count($routes, "[CheckoutController::class, 'verifiedStore']") === 3,
    'both legacy checkout aliases point to verified controller');
$check(str_contains($routes, "Route::post('/v1/checkout', [CheckoutController::class, 'verifiedStore'])->middleware(['athlete.auth', 'admin.csrf'")
    && str_contains($routes, "Route::post('/checkout', [CheckoutController::class, 'verifiedStore'])->middleware(['athlete.auth', 'admin.csrf'"),
    'legacy checkout routes require athlete authentication and CSRF');

$compiledShop = file_get_contents(dirname(__DIR__, 2) . '/public_html/assets/index-e0f6d038bb.js');
$check(str_contains($compiledShop, '/api/v1/athlete/checkout')
    && str_contains($compiledShop, 'FitnessCheckoutAuth.requireVerified')
    && str_contains($compiledShop, '"X-CSRF-Token":a.csrfToken'),
    'compiled storefront posts to protected athlete checkout with CSRF');

// All assertions above run offline; they are not a substitute for live MySQL concurrency tests.
echo "OK: {$passed} database-free regression checks passed\n";
