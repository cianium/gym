<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\AdminStateController;
use App\Http\Controllers\Api\V1\PostInteractionController;
use App\Http\Controllers\Api\V1\SystemMaintenanceController;
use App\Http\Requests\InstallSystemRequest;
use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\ExplorePost;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PaymentTransaction;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentCallbackController;
use App\Http\Controllers\Api\V1\ConsultationController;
use App\Services\Payments\PaymentService;
use App\Services\Payments\ZarinpalGateway;
use Illuminate\Support\Facades\Http;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class SecurityAndRecoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.fitness.backup_encryption_key', 'base64:' . base64_encode(str_repeat('K', 32)));
    }

    public function test_unauthenticated_negative_sep_callback_cannot_cancel_pending_order(): void
    {
        $order = Order::create([
            'id' => 'order-pending-neg',
            'order_number' => 'ORD-PENDING-NEG',
            'tracking_code' => 'TRACK-PENDING-NEG',
            'access_token' => bin2hex(random_bytes(24)),
            'gateway' => 'sep',
            'payment_status' => 'pending',
            'fulfillment_status' => 'pending',
            'stock_reserved' => true,
            'customer_name' => 'Customer',
            'customer_phone' => '09121111111',
            'subtotal_toman' => 100000,
            'total_amount_toman' => 100000,
        ]);
        PaymentTransaction::create([
            'order_id' => $order->id,
            'gateway' => 'sep',
            'authority_or_token' => 'sep-gateway-token',
            'amount_toman' => 100000,
            'currency' => 'IRT',
            'status' => 'initiated',
        ]);

        // On the negative path the SEP Token was optional; a third party knowing
        // only the order ID could formerly cancel the order and free reservations.
        $request = Request::create('/api/v1/payments/callback/sep', 'POST', [
            'ResNum' => $order->id,
            'State' => 'NOK',
        ]);
        $response = app(PaymentCallbackController::class)->handleBankCallback(
            $request, 'sep', app(PaymentService::class)
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertSame('pending', $order->fresh()->payment_status);
        $this->assertTrue((bool) $order->fresh()->stock_reserved);
        $this->assertSame('initiated', PaymentTransaction::where('order_id', $order->id)->value('status'));
    }

    public function test_expiry_skips_pending_orders_with_non_terminal_payment_transactions(): void
    {
        $unresolvedStatuses = ['processing', 'verification_pending', 'reconciliation_required', 'verified'];
        $unresolved = [];

        foreach ($unresolvedStatuses as $status) {
            $suffix = str_replace('_', '-', $status);
            $productId = 'expiry-' . $suffix;
            $product = Product::create([
                'id' => $productId,
                'type' => 'physical',
                'title' => 'Expiry guard ' . $status,
                'price_toman' => 100000,
                'status' => 'published',
                'stock' => 10,
                'reserved_stock' => 1,
            ]);
            $order = Order::create([
                'id' => 'expiry-order-' . $suffix,
                'order_number' => 'EXP-' . strtoupper($suffix),
                'tracking_code' => 'EXP-TRACK-' . strtoupper($suffix),
                'access_token' => bin2hex(random_bytes(24)),
                'gateway' => 'zarinpal',
                'payment_status' => 'pending',
                'fulfillment_status' => 'pending',
                'stock_reserved' => true,
                'customer_name' => 'Test Customer',
                'customer_phone' => '09121111111',
                'subtotal_toman' => 100000,
                'total_amount_toman' => 100000,
            ]);
            $order->forceFill(['created_at' => now()->subHours(2)])->save();
            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'title' => $product->title,
                'type' => 'physical',
                'qty' => 1,
                'unit_price_toman' => 100000,
            ]);
            PaymentTransaction::create([
                'order_id' => $order->id,
                'gateway' => 'zarinpal',
                'authority_or_token' => 'expiry-token-' . $suffix,
                'amount_toman' => 100000,
                'currency' => 'IRT',
                'status' => $status,
            ]);
            $unresolved[] = [$order, $product];
        }

        $expired = app(PaymentService::class)->expireStalePendingOrders(30);

        $this->assertSame(0, $expired);
        foreach ($unresolved as [$order, $product]) {
            $this->assertSame('pending', $order->fresh()->payment_status);
            $this->assertTrue((bool) $order->fresh()->stock_reserved);
            $this->assertSame(1, (int) $product->fresh()->reserved_stock);
        }
    }

    public function test_admin_cannot_refund_or_fulfill_an_unpaid_order(): void
    {
        $order = Order::create([
            'id' => 'unpaid-for-reconcile',
            'order_number' => 'ORD-UNPAID',
            'tracking_code' => 'TRACK-UNPAID',
            'access_token' => bin2hex(random_bytes(24)),
            'gateway' => 'zarinpal',
            'payment_status' => 'pending',
            'fulfillment_status' => 'pending',
            'customer_name' => 'Customer',
            'customer_phone' => '09121111111',
            'subtotal_toman' => 100000,
            'total_amount_toman' => 100000,
        ]);
        $controller = app(OrderController::class);
        $service = app(PaymentService::class);

        $refund = $controller->reconcile(Request::create('/reconcile', 'POST', [
            'action' => 'manual_refund',
            'refundReference' => 'BANK-123',
        ]), $order->id, $service);
        $this->assertSame(409, $refund->getStatusCode());
        $this->assertSame('PAID_ORDER_REQUIRED', $refund->getData(true)['code']);

        $fulfill = $controller->reconcile(Request::create('/reconcile', 'POST', [
            'action' => 'fulfill',
        ]), $order->id, $service);
        $this->assertSame(409, $fulfill->getStatusCode());
        $this->assertSame('pending', $order->fresh()->fulfillment_status);
    }

    public function test_manual_refund_requires_real_bank_reference(): void
    {
        $order = Order::create([
            'id' => 'paid-no-ref',
            'order_number' => 'ORD-PAID-NO-REF',
            'tracking_code' => 'TRACK-PAID-NO-REF',
            'access_token' => bin2hex(random_bytes(24)),
            'gateway' => 'zarinpal',
            'payment_status' => 'paid',
            'fulfillment_status' => 'pending',
            'customer_name' => 'Customer',
            'customer_phone' => '09121111111',
            'subtotal_toman' => 100000,
            'total_amount_toman' => 100000,
        ]);
        $response = app(OrderController::class)->reconcile(
            Request::create('/reconcile', 'POST', ['action' => 'manual_refund']),
            $order->id,
            app(PaymentService::class)
        );
        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('REFUND_REFERENCE_REQUIRED', $response->getData(true)['code']);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }

    public function test_gateway_success_without_bank_receipt_requires_reconciliation(): void
    {
        Http::fake(['payment.zarinpal.com/*' => Http::response([
            'data' => ['code' => 100],
        ], 200)]);

        $driver = new ZarinpalGateway(str_repeat('a', 36));
        $verification = $driver->verifyCallback(100000, [
            'Status' => 'OK',
            'Authority' => 'VALID_AUTHORITY',
        ]);
        $this->assertFalse($verification['verified']);
        $this->assertSame('verification_pending', $verification['state']);
    }

    public function test_consultation_ids_are_unique_across_rapid_requests(): void
    {
        $controller = app(ConsultationController::class);
        $data = [
            'senderName' => 'Customer',
            'senderPhone' => '09121111111',
            'goalTopic' => 'Training',
        ];
        $first = $controller->store(Request::create('/consult', 'POST', $data));
        $second = $controller->store(Request::create('/consult', 'POST', $data));
        $this->assertSame(201, $first->getStatusCode());
        $this->assertSame(201, $second->getStatusCode());
        $this->assertNotSame($first->getData(true)['consultation']['id'], $second->getData(true)['consultation']['id']);
    }

    public function test_json_ld_cannot_break_out_of_its_script_element(): void
    {
        file_put_contents(storage_path('installed.lock'), "test\n");

        BrandSetting::create([
            'brand_name' => '</script><script>globalThis.pwned=true</script>',
            'brand_subtitle' => 'Regression test',
            'canonical_domain' => 'https://example.test',
            'theme_tokens' => [],
            'site_modules' => [],
        ]);

        try {
            $response = $this->get('/');
            $response->assertOk();
            $response->assertDontSee('</script><script>globalThis.pwned', false);
            $response->assertSee('\\u003C/script\\u003E', false);
        } finally {
            @unlink(storage_path('installed.lock'));
        }
    }

    public function test_backup_restore_rejects_a_missing_top_level_checksum(): void
    {
        $request = Request::create('/api/v1/admin/backup/restore', 'POST', [
            'format' => SystemMaintenanceController::BACKUP_FORMAT,
            'releaseVersion' => SystemMaintenanceController::RELEASE_VERSION,
            'data' => [],
            'files' => [],
        ]);

        $response = app(SystemMaintenanceController::class)->restoreBackup($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('BACKUP_CHECKSUM_REQUIRED', $response->getData(true)['code'] ?? null);
    }

    public function test_backup_restore_rejects_unsigned_content_even_with_a_valid_checksum(): void
    {
        $content = ['data' => [], 'files' => []];
        $request = Request::create('/api/v1/admin/backup/restore', 'POST', [
            'format' => SystemMaintenanceController::BACKUP_FORMAT,
            'releaseVersion' => SystemMaintenanceController::RELEASE_VERSION,
            ...$content,
            'sha256' => hash('sha256', json_encode($content, JSON_UNESCAPED_UNICODE)),
        ]);

        $response = app(SystemMaintenanceController::class)->restoreBackup($request);

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('BACKUP_SIGNATURE_REQUIRED', $response->getData(true)['code'] ?? null);
    }

    public function test_server_signed_backup_can_be_restored(): void
    {
        BrandSetting::create([
            'brand_name' => 'Signed backup',
            'theme_tokens' => [],
            'site_modules' => [],
        ]);
        $controller = app(SystemMaintenanceController::class);
        $bundle = $controller->exportBackup(Request::create('/backup', 'GET'))->getData(true);
        $response = $controller->restoreBackup(Request::create('/restore', 'POST', $bundle));

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue($response->getData(true)['ok'] ?? false);
    }

    public function test_encrypted_backup_can_be_restored_but_tampered_ciphertext_is_rejected(): void
    {
        BrandSetting::create([
            'brand_name' => 'Encrypted backup',
            'theme_tokens' => [],
            'site_modules' => [],
        ]);
        $controller = app(SystemMaintenanceController::class);
        $encrypted = $controller->exportBackup(Request::create('/backup', 'GET', [
            'encrypted' => '1',
        ]))->getData(true);
        $this->assertSame(\App\Services\Maintenance\BackupVault::FORMAT, $encrypted['format'] ?? null);
        $this->assertArrayNotHasKey('data', $encrypted);
        $this->assertSame(200, $controller->restoreBackup(Request::create('/restore', 'POST', $encrypted))->getStatusCode());

        $encrypted['ciphertext'] = base64_encode('X' . substr((string) base64_decode($encrypted['ciphertext']), 1));
        $response = $controller->restoreBackup(Request::create('/restore', 'POST', $encrypted));
        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('BACKUP_VAULT_INVALID', $response->getData(true)['code']);
    }

    public function test_repeated_like_from_the_same_browser_is_idempotent(): void
    {
        $post = ExplorePost::create([
            'id' => 'post-regression',
            'title' => 'Regression',
            'caption' => 'Regression',
            'likes_count' => 0,
        ]);
        $controller = app(PostInteractionController::class);

        $controller->toggleLike(
            Request::create('/api/v1/posts/post-regression/like', 'POST', ['direction' => 'like']),
            $post->id
        );

        $cookieName = 'wl_post_like_' . substr(hash('sha256', $post->id), 0, 24);
        $controller->toggleLike(
            Request::create('/api/v1/posts/post-regression/like', 'POST', ['direction' => 'like'], [$cookieName => '1']),
            $post->id
        );

        $this->assertSame(1, (int) $post->fresh()->likes_count);
    }

    public function test_installer_rejects_environment_line_injection(): void
    {
        $validator = Validator::make([
            'brandName' => 'Brand',
            'coachName' => 'Coach',
            'adminUsername' => 'owner',
            'adminEmail' => 'owner@example.test',
            'adminPassword' => 'StrongPassword!123',
            'dbHost' => "localhost\nAPP_DEBUG=true",
        ], (new InstallSystemRequest())->rules());

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('dbHost'));
    }

    public function test_content_reset_preserves_commerce_and_archives_purchased_products(): void
    {
        $admin = User::create([
            'name' => 'Admin',
            'username' => 'owner',
            'phone' => '09120000000',
            'email' => 'owner@example.test',
            'password' => 'StrongPassword!123',
            'role' => 'admin',
        ]);
        Product::create([
            'id' => 'purchased-product',
            'type' => 'digital',
            'title' => 'Purchased',
            'price_toman' => 100000,
            'description' => '',
            'status' => 'published',
        ]);
        Product::create([
            'id' => 'disposable-product',
            'type' => 'digital',
            'title' => 'Disposable',
            'price_toman' => 100000,
            'description' => '',
            'status' => 'published',
        ]);
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

        $request = Request::create('/api/v1/admin/reset', 'POST');
        $request->setUserResolver(fn () => $admin);
        $response = app(AdminStateController::class)->reset($request);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertTrue(Order::whereKey('order-1')->exists());
        $this->assertFalse(Product::whereKey('disposable-product')->exists());
        $this->assertTrue((bool) Product::whereKey('purchased-product')->value('is_archived'));
        $this->assertTrue(Product::whereKey('prod-digital-hypertrophy')->exists());
        $this->assertTrue(BrandSetting::exists());
        $this->assertTrue(AuditLog::where('action', 'ADMIN_CONTENT_RESET')->exists());
    }
}
