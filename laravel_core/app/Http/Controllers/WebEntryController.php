<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\ExplorePost;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

class WebEntryController
{
    /**
     * Server-Side Dynamic White-Label SEO Renderer for Laravel 13.
     * Renders brand-specific and route-specific <title>, meta description, canonical URL,
     * OpenGraph tags, Twitter cards, brand logo, favicon, and Schema.org JSON-LD without requiring JS execution.
     */
    public function show(Request $request): Response
    {
        $brandName = 'پلتفرم جامع مربیگری و برنامه‌های تمرینی (White-Label Fitness)';
        $brandSubtitle = 'سیستم مستقل مدیریت شاگردان، فروش برنامه‌های تمرینی و تجهیزات ورزشی';
        $seoTitle = $brandName;
        $seoDesc = $brandSubtitle;
        $ogTitle = $seoTitle;
        $ogDesc = $seoDesc;
        $ogSiteName = $brandName;
        $ogType = 'website';
        $twitterCard = 'summary_large_image';
        $canonicalBase = rtrim((string) $request->getSchemeAndHttpHost(), '/');
        $coachName = '';
        $coachTitle = 'مربی تخصصی بدنسازی و عملکرد ورزشی';
        $ogImage = $canonicalBase . '/media/default-og-cover.jpg';
        $logoUrl = $canonicalBase . '/favicon.svg';
        $faviconUrl = $canonicalBase . '/favicon.svg';
        $primaryColor = '#C8A66A';

        $routePath = '/' . ltrim($request->path(), '/');
        $productSchema = null;

        if (file_exists(storage_path('installed.lock'))) {
            try {
                /** @var BrandSetting|null $brand */
                $brand = BrandSetting::first();
                /** @var CoachProfile|null $coach */
                $coach = CoachProfile::first();

                if ($brand) {
                    $brandName = trim((string) ($brand->brand_name ?: $brandName));
                    $brandSubtitle = trim((string) ($brand->brand_subtitle ?: $brandSubtitle));
                    $seoTitle = trim((string) ($brand->seo_title ?: ($brandName . ' | ' . $brandSubtitle)));
                    $seoDesc = trim((string) ($brand->seo_description ?: $brandSubtitle));
                    $ogTitle = $seoTitle;
                    $ogDesc = $seoDesc;
                    $ogSiteName = $brandName;
                    if (! empty($brand->canonical_domain)) {
                        $canonicalBase = rtrim(trim((string) $brand->canonical_domain), '/');
                    }
                    $tokens = is_array($brand->theme_tokens) ? $brand->theme_tokens : [];
                    if (! empty($tokens['primaryColor'])) {
                        $primaryColor = (string) $tokens['primaryColor'];
                    }
                    if (! empty($tokens['faviconUrl'])) {
                        $faviconUrl = (string) $tokens['faviconUrl'];
                    }
                    if (! empty($tokens['logoUrl'])) {
                        $logoUrl = (string) $tokens['logoUrl'];
                    }
                    if (! empty($brand->share_image_url)) {
                        $ogImage = (string) $brand->share_image_url;
                    } elseif (! empty($tokens['ogImageUrl'])) {
                        $ogImage = (string) $tokens['ogImageUrl'];
                    }
                    if (! empty($tokens['ogTitle'])) {
                        $ogTitle = trim((string) $tokens['ogTitle']);
                    }
                    if (! empty($tokens['ogDescription'])) {
                        $ogDesc = trim((string) $tokens['ogDescription']);
                    }
                    if (! empty($tokens['ogSiteName'])) {
                        $ogSiteName = trim((string) $tokens['ogSiteName']);
                    }
                    if (! empty($tokens['ogType'])) {
                        $ogType = trim((string) $tokens['ogType']);
                    }
                    if (! empty($tokens['twitterCard'])) {
                        $twitterCard = trim((string) $tokens['twitterCard']);
                    }
                }

                if ($coach) {
                    $coachName = trim((string) ($coach->name ?: ''));
                    $coachTitle = trim((string) ($coach->title ?: $coachTitle));
                    if (! empty($coach->custom_avatar_url)) {
                        $avatarFullUrl = str_starts_with((string) $coach->custom_avatar_url, 'http')
                            ? (string) $coach->custom_avatar_url
                            : $canonicalBase . '/' . ltrim((string) $coach->custom_avatar_url, '/');
                        if ($ogImage === $canonicalBase . '/media/default-og-cover.jpg') {
                            $ogImage = $avatarFullUrl;
                        }
                        if ($logoUrl === $canonicalBase . '/favicon.svg') {
                            $logoUrl = $avatarFullUrl;
                        }
                    }
                }

                // Route-aware SEO overrides for Product (/product/{id} or /products/{id}), Explore Posts, and Public Profile
                $productId = $request->route('id') ?? $request->query('product');
                if (
                    (str_starts_with($routePath, '/products/') || str_starts_with($routePath, '/product/') || $request->has('product'))
                    && is_string($productId)
                    && $productId !== ''
                ) {
                    /** @var Product|null $product */
                    $product = Product::where('id', $productId)->where('status', 'published')->first();
                    if ($product) {
                        $seoTitle = "{$product->title} | {$brandName}";
                        $seoDesc = trim((string) ($product->description ?: $product->subtitle ?: $seoDesc));
                        $ogTitle = $seoTitle;
                        $ogDesc = $seoDesc;
                        if (! empty($product->custom_image_url)) {
                            $ogImage = str_starts_with((string) $product->custom_image_url, 'http')
                                ? (string) $product->custom_image_url
                                : $canonicalBase . '/' . ltrim((string) $product->custom_image_url, '/');
                        }
                        $productSchema = [
                            '@context' => 'https://schema.org',
                            '@type' => 'Product',
                            'name' => $product->title,
                            'description' => $seoDesc,
                            'image' => $ogImage,
                            'brand' => [
                                '@type' => 'Brand',
                                'name' => $brandName,
                            ],
                            'offers' => [
                                '@type' => 'Offer',
                                'priceCurrency' => 'IRT',
                                'price' => (int) ($product->discount_price_toman ?? $product->price_toman),
                                'availability' => ($product->type === 'physical' && $product->stock !== null && $product->stock <= 0)
                                    ? 'https://schema.org/OutOfStock'
                                    : 'https://schema.org/InStock',
                            ],
                        ];
                    }
                } elseif (str_starts_with($routePath, '/posts/')) {
                    $postId = (string) $request->route('id', '');
                    /** @var ExplorePost|null $post */
                    $post = $postId !== '' ? ExplorePost::find($postId) : null;
                    if ($post) {
                        $seoTitle = "{$post->title} | {$brandName}";
                        $seoDesc = mb_substr(trim((string) $post->caption), 0, 165);
                        $ogTitle = $seoTitle;
                        $ogDesc = $seoDesc;
                    }
                } elseif (in_array($routePath, ['/profile', '/coach', '/card'], true) && $coachName !== '') {
                    $seoTitle = "{$coachName} — {$coachTitle} | {$brandName}";
                    $seoDesc = trim((string) ($coach?->bio ?: $seoDesc));
                    $ogTitle = $seoTitle;
                    $ogDesc = $seoDesc;
                } elseif ($routePath === '/shop') {
                    $seoTitle = "فروشگاه برنامه‌های تمرینی و تجهیزات | {$brandName}";
                    $ogTitle = $seoTitle;
                } elseif ($routePath === '/explore') {
                    $seoTitle = "ویدیوهای آموزشی و ریلز تمرینی | {$brandName}";
                    $ogTitle = $seoTitle;
                } elseif ($routePath === '/contact') {
                    $seoTitle = "مشاوره و ارتباط با مربی | {$brandName}";
                    $ogTitle = $seoTitle;
                }
            } catch (Throwable) {
                // Fail-safe fallback when DB is not yet migrated
            }
        }

        $canonicalUrl = $canonicalBase . ($routePath === '/' ? '/' : $routePath);

        $escTitle = htmlspecialchars($seoTitle, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escDesc = htmlspecialchars($seoDesc, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escOgTitle = htmlspecialchars($ogTitle, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escOgDesc = htmlspecialchars($ogDesc, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escOgSiteName = htmlspecialchars($ogSiteName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escOgType = htmlspecialchars($ogType, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escTwitterCard = htmlspecialchars($twitterCard, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escCanonical = htmlspecialchars($canonicalUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escOgImage = htmlspecialchars($ogImage, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escLogo = htmlspecialchars($logoUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escFavicon = htmlspecialchars($faviconUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $escThemeColor = htmlspecialchars($primaryColor, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $schemaGraph = [
            [
                '@context' => 'https://schema.org',
                '@type' => 'ProfessionalService',
                'name' => $brandName,
                'description' => $seoDesc,
                'url' => $canonicalUrl,
                'logo' => $logoUrl,
                'image' => $ogImage,
                'founder' => $coachName !== '' ? [
                    '@type' => 'Person',
                    'name' => $coachName,
                    'jobTitle' => $coachTitle,
                ] : null,
            ],
        ];
        if ($productSchema !== null) {
            $schemaGraph[] = $productSchema;
        }

        $schemaJson = json_encode(
            count($schemaGraph) === 1 ? $schemaGraph[0] : ['@context' => 'https://schema.org', '@graph' => $schemaGraph],
            JSON_UNESCAPED_UNICODE
                | JSON_UNESCAPED_SLASHES
                | JSON_HEX_TAG
                | JSON_HEX_AMP
                | JSON_HEX_APOS
                | JSON_HEX_QUOT
        );

        if (! is_string($schemaJson)) {
            $schemaJson = '{}';
        }

        $html = $this->loadSpaShellTemplate();

        $html = preg_replace('/<title>[\s\S]*?<\/title>/i', "<title>{$escTitle}</title>", $html) ?? $html;
        $html = preg_replace(
            '/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i',
            '<meta name="description" content="' . $escDesc . '" />',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i',
            '<meta property="og:title" content="' . $escOgTitle . '" />',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i',
            '<meta property="og:description" content="' . $escOgDesc . '" />',
            $html
        ) ?? $html;
        $html = preg_replace(
            '/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i',
            '<meta property="og:type" content="' . $escOgType . '" />',
            $html
        ) ?? $html;

        $injectedHeadTags = implode("\n    ", [
            '<link rel="canonical" href="' . $escCanonical . '" />',
            '<link rel="icon" href="' . $escFavicon . '" />',
            '<meta name="theme-color" content="' . $escThemeColor . '" />',
            '<meta property="og:site_name" content="' . $escOgSiteName . '" />',
            '<meta property="og:url" content="' . $escCanonical . '" />',
            '<meta property="og:image" content="' . $escOgImage . '" />',
            '<meta property="og:logo" content="' . $escLogo . '" />',
            '<meta name="twitter:card" content="' . $escTwitterCard . '" />',
            '<meta name="twitter:title" content="' . $escOgTitle . '" />',
            '<meta name="twitter:description" content="' . $escOgDesc . '" />',
            '<meta name="twitter:image" content="' . $escOgImage . '" />',
            '<script id="wl-brand-schema-jsonld" type="application/ld+json">' . $schemaJson . '</script>',
        ]);

        if (str_contains($html, '</head>')) {
            $html = str_replace('</head>', "    {$injectedHeadTags}\n  </head>", $html);
        }

        return response($html, 200, [
            'Content-Type' => 'text/html; charset=utf-8',
            'X-Frame-Options' => 'SAMEORIGIN',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=(), payment=()',
        ]);
    }

    /**
     * Dynamically generates brand-aware /sitemap.xml from the installation's database.
     */
    public function sitemap(Request $request): Response
    {
        $canonicalBase = rtrim((string) $request->getSchemeAndHttpHost(), '/');
        $urls = ['/', '/shop', '/explore', '/profile', '/contact'];

        if (file_exists(storage_path('installed.lock'))) {
            try {
                $brand = BrandSetting::first();
                if ($brand && ! empty($brand->canonical_domain)) {
                    $canonicalBase = rtrim(trim((string) $brand->canonical_domain), '/');
                }

                $products = Product::where('status', 'published')->where('is_archived', false)->pluck('id');
                foreach ($products as $prodId) {
                    $urls[] = '/products/' . rawurlencode((string) $prodId);
                }

                $posts = ExplorePost::pluck('id');
                foreach ($posts as $postId) {
                    $urls[] = '/posts/' . rawurlencode((string) $postId);
                }
            } catch (Throwable) {
                // Fallback to core routes if DB is not yet migrated
            }
        }

        $lastmod = now()->toAtomString();
        $xmlItems = [];
        foreach ($urls as $path) {
            $loc = htmlspecialchars($canonicalBase . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $priority = $path === '/' ? '1.0' : (str_starts_with($path, '/products/') ? '0.9' : '0.8');
            $xmlItems[] = "  <url>\n    <loc>{$loc}</loc>\n    <lastmod>{$lastmod}</lastmod>\n    < priority>{$priority}</priority>\n  </url>";
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
            . "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n"
            . str_replace('< priority>', '<priority>', implode("\n", $xmlItems)) . "\n"
            . "</urlset>\n";

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Dynamically generates brand-aware /robots.txt protecting admin, installer, and download routes.
     */
    public function robots(Request $request): Response
    {
        $canonicalBase = rtrim((string) $request->getSchemeAndHttpHost(), '/');
        if (file_exists(storage_path('installed.lock'))) {
            try {
                $brand = BrandSetting::first();
                if ($brand && ! empty($brand->canonical_domain)) {
                    $canonicalBase = rtrim(trim((string) $brand->canonical_domain), '/');
                }
            } catch (Throwable) {
            }
        }

        $lines = [
            'User-agent: *',
            'Allow: /',
            'Disallow: /admin',
            'Disallow: /install',
            'Disallow: /payment/',
            'Disallow: /api/v1/admin/',
            'Disallow: /api/v1/downloads/',
            'Disallow: /api/v1/install/',
            '',
            'Sitemap: ' . $canonicalBase . '/sitemap.xml',
            '',
        ];

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function loadSpaShellTemplate(): string
    {
        $candidates = [
            base_path('resources/views/spa.html'),
            public_path('spa-shell.html'),
            public_path('index.html'),
        ];

        foreach ($candidates as $file) {
            if (is_file($file) && is_readable($file)) {
                $content = @file_get_contents($file);
                if (is_string($content) && trim($content) !== '') {
                    return $content;
                }
            }
        }

        return <<<'HTML'
<!doctype html>
<html lang="fa" dir="rtl" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
    <title>پلتفرم جامع مربیگری و برنامه‌های تمرینی (White-Label Fitness)</title>
    <meta name="description" content="سیستم مستقل مدیریت شاگردان، فروش برنامه‌های تمرینی و تجهیزات ورزشی" />
    <meta property="og:title" content="پلتفرم جامع مربیگری و برنامه‌های تمرینی (White-Label Fitness)" />
    <meta property="og:description" content="سیستم مستقل مدیریت شاگردان، فروش برنامه‌های تمرینی و تجهیزات ورزشی" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="fa_IR" />
  </head>
  <body class="bg-[#101010] text-[#F5F2EC] antialiased selection:bg-[#C8A66A] selection:text-[#101010]">
    <div id="root"></div>
  </body>
</html>
HTML;
    }
}
