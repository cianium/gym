<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\ApplySecurityHeaders;
use App\Http\Middleware\VerifyAdminCsrfToken;
use App\Http\Resources\BootstrapResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AdminRotationAndPermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_forced_rotation_blocks_admin_operations_and_private_bootstrap_until_rotated(): void
    {
        $this->withoutMiddleware(VerifyAdminCsrfToken::class);
        $admin = User::create([
            'name' => 'QA admin', 'email' => 'qa-admin@example.test', 'phone' => '09120000991',
            'role' => 'admin', 'password' => 'OldTestPassword123!', 'must_change_password' => true,
        ]);
        $this->actingAs($admin)->getJson('/api/v1/admin/products')
            ->assertForbidden()->assertJsonPath('code', 'PASSWORD_CHANGE_REQUIRED');
        $this->getJson('/api/v1/auth/session')->assertOk()->assertJsonPath('mustChangePassword', true);
        $resource = new BootstrapResource([
            'brandConfig' => [], 'siteModules' => [], 'themeColors' => [], 'orders' => [],
        ]);
        $request = Request::create('/api/v1/bootstrap');
        $request->setUserResolver(fn () => $admin);
        $this->assertArrayNotHasKey('orders', $resource->resolve($request));
        $this->postJson('/api/v1/auth/admin/password', [
            'currentPassword' => 'OldTestPassword123!',
            'newPassword' => 'NewTestPassword123!',
        ])->assertOk();
        $this->assertFalse($admin->fresh()->must_change_password);
        $this->actingAs($admin->fresh())->getJson('/api/v1/admin/products')->assertOk();
    }

    public function test_public_qr_camera_is_same_origin_only_and_protected_surfaces_deny_it(): void
    {
        $middleware = new ApplySecurityHeaders;
        foreach (['/', '/shop', '/profile', '/explore', '/product/example'] as $path) {
            $response = $middleware->handle(Request::create($path), fn () => response('ok'));
            $this->assertSame('camera=(self), microphone=(), geolocation=()', $response->headers->get('Permissions-Policy'));
        }
        foreach (['/api/v1/bootstrap', '/api/v1/admin/products', '/athlete', '/coach/athletes', '/install'] as $path) {
            $response = $middleware->handle(Request::create($path), fn () => response('ok'));
            $this->assertSame('camera=(), microphone=(), geolocation=()', $response->headers->get('Permissions-Policy'));
        }
        $response = $middleware->handle(Request::create('/api/v1/bootstrap'), fn () => response('ok'));
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }
}
