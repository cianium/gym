<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\BootstrapResource;
use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\ConsultationRequest;
use App\Models\DiscountCode;
use App\Models\ExplorePost;
use App\Models\Order;
use App\Models\PageRevision;
use App\Models\PageSection;
use App\Models\Product;
use App\Services\Installer\InstallerService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class BootstrapController
{
    public function index(
        Request $request,
        InstallerService $installer,
        PaymentService $payments
    ): JsonResponse {
        $isInstalled = $installer->isInstalled();
        $isAdmin = false;
        $brand = null;
        $coach = null;
        $sections = collect();
        $products = collect();
        $posts = collect();

        if ($isInstalled) {
            try {
                $user = $request->user();
                $isAdmin = $user !== null && $user->role === 'admin' && ! $user->must_change_password;

                $brand = BrandSetting::first();
                $coach = CoachProfile::first();
                $sections = PageSection::orderBy('sort_order')->get();
                $products = $isAdmin
                    ? Product::orderByDesc('created_at')->get()
                    : Product::where('status', 'published')->where('is_archived', false)->get();

                // CRITICAL PRIVACY FIX (Item 5):
                // Public endpoints must return approved comments ONLY.
                // Pending/unapproved comments are loaded ONLY when authenticated as admin.
                $posts = ExplorePost::with(['comments' => function ($query) use ($isAdmin) {
                    if (! $isAdmin) {
                        $query->where('approved', true);
                    }
                    $query->orderBy('created_at');
                }])->latest()->get();
            } catch (Throwable) {
                // Safe fallback if database is not yet migrated
            }
        }

        $tokens = is_array($brand?->theme_tokens) ? $brand->theme_tokens : [];

        $payload = [
            'installedAt' => $brand?->created_at?->toIso8601String(),
            'installed' => $isInstalled,
            'brandConfig' => [
                'brandName' => $brand?->brand_name ?? 'پلتفرم White-Label مربی',
                'brandSubtitle' => $brand?->brand_subtitle ?? '',
                'seoTitle' => $brand?->seo_title ?? '',
                'seoDescription' => $brand?->seo_description ?? '',
                'ogTitle' => $tokens['ogTitle'] ?? $brand?->seo_title ?? '',
                'ogDescription' => $tokens['ogDescription'] ?? $brand?->seo_description ?? '',
                'ogImage' => $brand?->share_image_url ?? $tokens['ogImageUrl'] ?? '',
                'ogType' => $tokens['ogType'] ?? 'website',
                'ogSiteName' => $tokens['ogSiteName'] ?? $brand?->brand_name ?? '',
                'twitterCard' => $tokens['twitterCard'] ?? 'summary_large_image',
                'canonicalDomain' => $brand?->canonical_domain ?? '',
                'footerCopyright' => $brand?->footer_copyright ?? '',
                'shippingFlatRateToman' => $brand?->shipping_flat_rate_toman ?? 85000,
                'freeShippingThresholdToman' => $brand?->free_shipping_threshold_toman ?? 3000000,
            ],
            'siteModules' => $brand?->site_modules ?? [],
            'themeColors' => $brand?->theme_tokens ?? [
                'primaryColor' => '#C8A66A',
                'secondaryColor' => '#D6B77D',
            ],
            'coach' => $coach,
            'sectionConfigs' => $sections,
            'products' => $products,
            'posts' => $posts,
            'gateways' => [
                [
                    'id' => 'zarinpal',
                    'title' => 'درگاه پرداخت اینترنتی زرین‌پال (Zarinpal)',
                    'enabled' => $payments->driver('zarinpal')->isConfigured() || ! app()->environment('production'),
                    'merchantConfigured' => $payments->driver('zarinpal')->isConfigured(),
                    'callbackUrl' => url('/api/v1/payments/callback/zarinpal'),
                ],
                [
                    'id' => 'sep',
                    'title' => 'درگاه پرداخت الکترونیک سامان (SEP)',
                    'enabled' => $payments->driver('sep')->isConfigured() || ! app()->environment('production'),
                    'merchantConfigured' => $payments->driver('sep')->isConfigured(),
                    'callbackUrl' => url('/api/v1/payments/callback/sep'),
                ],
            ],
        ];

        if ($isAdmin && $isInstalled) {
            try {
                $payload['orders'] = Order::with('items')->latest()->get();
                $payload['revisions'] = PageRevision::orderByDesc('version_number')->limit(30)->get();
                $payload['consultations'] = ConsultationRequest::latest()->get();
                $payload['discounts'] = DiscountCode::latest()->get();
                $payload['auditLogs'] = AuditLog::orderByDesc('created_at')->limit(100)->get();
            } catch (Throwable) {
                // Ignore if tables are unavailable
            }
        }

        return response()->json((new BootstrapResource($payload))->resolve($request));
    }
}
