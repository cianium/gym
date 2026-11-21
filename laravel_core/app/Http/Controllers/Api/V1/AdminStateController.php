<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\StateSyncRequest;
use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\ConsultationRequest;
use App\Models\DiscountCode;
use App\Models\DigitalEntitlement;
use App\Models\ExplorePost;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PageSection;
use App\Models\PostComment;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Database\Seeders\DatabaseSeeder;

class AdminStateController
{
    public function sync(StateSyncRequest $request): JsonResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request) {
            if (! empty($validated['brandConfig']) || ! empty($validated['siteModules']) || ! empty($validated['themeColors'])) {
                $brand = BrandSetting::first() ?? new BrandSetting();
                $tokens = is_array($brand->theme_tokens) ? $brand->theme_tokens : ['primaryColor' => '#C8A66A', 'secondaryColor' => '#D6B77D'];
                if (! empty($validated['themeColors']) && is_array($validated['themeColors'])) {
                    $tokens = array_merge($tokens, $validated['themeColors']);
                }
                if (! empty($validated['brandConfig'])) {
                    $bc = $validated['brandConfig'];
                    $brand->brand_name = $bc['brandName'] ?? $brand->brand_name ?? 'آکادمی مربی';
                    $brand->brand_subtitle = $bc['brandSubtitle'] ?? $brand->brand_subtitle;
                    $brand->seo_title = $bc['seoTitle'] ?? $brand->seo_title ?? ($brand->brand_name . ' | پلتفرم مربیگری');
                    $brand->seo_description = $bc['seoDescription'] ?? $brand->seo_description;
                    $brand->canonical_domain = $bc['canonicalDomain'] ?? $brand->canonical_domain;
                    $brand->footer_copyright = $bc['footerCopyright'] ?? $brand->footer_copyright;
                    $brand->shipping_flat_rate_toman = (int) ($bc['shippingFlatRateToman'] ?? 85000);
                    $brand->free_shipping_threshold_toman = (int) ($bc['freeShippingThresholdToman'] ?? 3000000);
                    if (isset($bc['ogImage']) || isset($bc['shareImageUrl'])) {
                        $brand->share_image_url = $bc['ogImage'] ?? $bc['shareImageUrl'];
                        $tokens['ogImageUrl'] = $brand->share_image_url;
                    }
                    if (isset($bc['ogTitle'])) {
                        $tokens['ogTitle'] = (string) $bc['ogTitle'];
                    }
                    if (isset($bc['ogDescription'])) {
                        $tokens['ogDescription'] = (string) $bc['ogDescription'];
                    }
                    if (isset($bc['ogType'])) {
                        $tokens['ogType'] = (string) $bc['ogType'];
                    }
                    if (isset($bc['ogSiteName'])) {
                        $tokens['ogSiteName'] = (string) $bc['ogSiteName'];
                    }
                    if (isset($bc['twitterCard'])) {
                        $tokens['twitterCard'] = (string) $bc['twitterCard'];
                    }
                }
                if (! empty($validated['siteModules'])) {
                    $brand->site_modules = $validated['siteModules'];
                } elseif (! $brand->site_modules) {
                    $brand->site_modules = [];
                }
                $brand->theme_tokens = $tokens;
                $brand->save();
            }

            if (! empty($validated['coach'])) {
                $c = $validated['coach'];
                CoachProfile::query()->updateOrCreate(
                    ['id' => 1],
                    [
                        'name' => $c['name'] ?? '',
                        'english_name' => $c['englishName'] ?? '',
                        'title' => $c['title'] ?? '',
                        'tagline' => $c['tagline'] ?? '',
                        'bio' => $c['bio'] ?? '',
                        'specialties' => $c['specialties'] ?? [],
                        'experience_years' => (int) ($c['experienceYears'] ?? 1),
                        'active_athletes' => (int) ($c['activeAthletes'] ?? 0),
                        'programs_delivered' => (int) ($c['programsDelivered'] ?? 0),
                        'location' => $c['location'] ?? '',
                        'phone' => $c['phone'] ?? '',
                        'email' => $c['email'] ?? '',
                        'instagram_handle' => $c['instagramHandle'] ?? '',
                        'telegram_handle' => $c['telegramHandle'] ?? '',
                        'youtube_handle' => $c['youtubeHandle'] ?? '',
                        'nfc_serial_code' => $c['nfcSerialCode'] ?? '',
                        'visual_preset' => $c['visualPreset'] ?? 'coach-portrait',
                        'custom_avatar_url' => $c['customAvatarUrl'] ?? null,
                        'certifications' => $c['certifications'] ?? [],
                    ]
                );
            }

            if (isset($validated['sectionConfigs']) && is_array($validated['sectionConfigs'])) {
                foreach ($validated['sectionConfigs'] as $idx => $sec) {
                    $secId = (string) $sec['id'];
                    PageSection::updateOrCreate(
                        ['id' => $secId],
                        [
                            'page_target' => $sec['pageTarget'] ?? 'home',
                            'block_type' => $sec['blockType'] ?? 'full-width-hero',
                            'label' => $sec['label'] ?? '',
                            'kicker' => $sec['kicker'] ?? null,
                            'title' => $sec['title'] ?? '',
                            'subtitle' => $sec['subtitle'] ?? null,
                            'cta_text' => $sec['ctaText'] ?? null,
                            'cta_route' => $sec['ctaRoute'] ?? null,
                            'enabled' => (bool) ($sec['enabled'] ?? true),
                            'sort_order' => (int) ($sec['order'] ?? ($idx + 1)),
                            'bg_type' => $sec['bgType'] ?? 'gradient',
                            'solid_color' => $sec['solidColor'] ?? '#1D1D1D',
                            'gradient_preset' => $sec['gradientPreset'] ?? 'obsidian-gold',
                            'image_preset' => $sec['imagePreset'] ?? 'coach-portrait',
                            'custom_image_url' => $sec['customImageUrl'] ?? null,
                            'image_display_mode' => $sec['imageDisplayMode'] ?? 'cover',
                            'overlay_opacity' => (int) ($sec['overlayOpacity'] ?? 70),
                            'height_mode' => $sec['heightMode'] ?? 'medium',
                            'is_custom_block' => (bool) ($sec['isCustomBlock'] ?? false),
                        ]
                    );
                }
            }

            if (! empty($validated['deletedSectionIds']) && is_array($validated['deletedSectionIds'])) {
                PageSection::whereIn('id', array_map('strval', $validated['deletedSectionIds']))
                    ->where('is_custom_block', true)
                    ->delete();
            }

            // Non-destructive Product Upsert (never wipes omitted products or breaks order_items)
            if (isset($validated['products']) && is_array($validated['products'])) {
                foreach ($validated['products'] as $prod) {
                    $prodId = (string) $prod['id'];
                    Product::updateOrCreate(
                        ['id' => $prodId],
                        [
                            'type' => $prod['type'],
                            'title' => $prod['title'],
                            'subtitle' => $prod['subtitle'] ?? null,
                            'price_toman' => (int) $prod['price'],
                            'discount_price_toman' => isset($prod['discountPrice']) ? (int) $prod['discountPrice'] : null,
                            'description' => $prod['description'] ?? '',
                            'features' => $prod['features'] ?? [],
                            'visual_preset' => $prod['visualPreset'] ?? 'digital-hypertrophy',
                            'custom_image_url' => $prod['customImageUrl'] ?? null,
                            'status' => $prod['status'] ?? 'published',
                            'is_archived' => ($prod['status'] ?? 'published') === 'archived',
                            'level' => $prod['level'] ?? null,
                            'duration' => $prod['duration'] ?? null,
                            'file_format' => $prod['fileFormat'] ?? null,
                            'file_size' => $prod['fileSize'] ?? null,
                            'modules' => $prod['modules'] ?? null,
                            'stock' => isset($prod['stock']) ? (int) $prod['stock'] : null,
                            'sku' => $prod['sku'] ?? null,
                            'material' => $prod['material'] ?? null,
                            'shipping_estimate' => $prod['shippingEstimate'] ?? null,
                        ]
                    );
                }
            }

            // Explicit Product Deletion / Safe Archival when referenced by historical order_items
            if (! empty($validated['deletedProductIds']) && is_array($validated['deletedProductIds'])) {
                foreach ($validated['deletedProductIds'] as $delProdId) {
                    $prodIdStr = (string) $delProdId;
                    $hasOrders = \App\Models\OrderItem::where('product_id', $prodIdStr)->exists();
                    if ($hasOrders) {
                        Product::where('id', $prodIdStr)->update([
                            'status' => 'archived',
                            'is_archived' => true,
                        ]);
                    } else {
                        Product::where('id', $prodIdStr)->delete();
                    }
                }
            }

            // Non-destructive Explore Posts & Comments Upsert
            // Preserves server-authoritative likes_count on existing posts and never deletes public comments not in client state
            if (isset($validated['posts']) && is_array($validated['posts'])) {
                foreach ($validated['posts'] as $postData) {
                    $postId = (string) $postData['id'];
                    $existingPost = ExplorePost::find($postId);

                    ExplorePost::updateOrCreate(
                        ['id' => $postId],
                        [
                            'media_type' => $postData['mediaType'] ?? 'video',
                            'title' => $postData['title'] ?? '',
                            'caption' => $postData['caption'] ?? '',
                            'tags' => $postData['tags'] ?? [],
                            'visual_preset' => $postData['visualPreset'] ?? 'reel-squat',
                            'custom_media_url' => $postData['customMediaUrl'] ?? null,
                            'slides' => $postData['slides'] ?? null,
                            'likes_count' => $existingPost ? (int) $existingPost->likes_count : (int) ($postData['likesCount'] ?? 0),
                            'views_count' => $existingPost ? max((int) $existingPost->views_count, (int) ($postData['viewsCount'] ?? 0)) : (int) ($postData['viewsCount'] ?? 0),
                            'duration_sec' => isset($postData['durationSec']) ? (int) $postData['durationSec'] : null,
                            'bpm_tempo' => isset($postData['bpmTempo']) ? (int) $postData['bpmTempo'] : null,
                            'linked_product_id' => $postData['linkedProductId'] ?? null,
                        ]
                    );

                    if (isset($postData['comments']) && is_array($postData['comments'])) {
                        foreach ($postData['comments'] as $commentData) {
                            $commentId = (string) ($commentData['id'] ?? '');
                            if ($commentId === '') {
                                continue;
                            }
                            $existingComment = PostComment::find($commentId);
                            if ($existingComment) {
                                // Only update moderation flag or coach reply text; never overwrite public author or delete unseen comments
                                if (array_key_exists('approved', $commentData)) {
                                    $existingComment->approved = (bool) $commentData['approved'];
                                }
                                if ((bool) $existingComment->is_coach_reply && isset($commentData['text'])) {
                                    $existingComment->text = (string) $commentData['text'];
                                }
                                $existingComment->save();
                            } elseif (! empty($commentData['isCoachReply'])) {
                                PostComment::create([
                                    'id' => $commentId,
                                    'post_id' => $postId,
                                    'author_name' => $commentData['authorName'] ?? 'مربی',
                                    'author_role' => $commentData['authorRole'] ?? 'مربی رسمی',
                                    'text' => $commentData['text'] ?? '',
                                    'is_coach_reply' => true,
                                    'approved' => true,
                                ]);
                            }
                        }
                    }
                }
            }

            if (! empty($validated['deletedPostIds']) && is_array($validated['deletedPostIds'])) {
                ExplorePost::whereIn('id', array_map('strval', $validated['deletedPostIds']))->delete();
            }

            // Non-destructive Discount Codes Upsert (preserve authoritative used_count on existing codes)
            $incomingDiscounts = $validated['discounts'] ?? $validated['discountCodes'] ?? null;
            if (is_array($incomingDiscounts)) {
                foreach ($incomingDiscounts as $discData) {
                    $code = strtoupper(trim((string) ($discData['code'] ?? '')));
                    if ($code === '') {
                        continue;
                    }
                    $existingDiscount = DiscountCode::where('code', $code)->first();
                    $expiresAtRaw = $discData['expiresAt'] ?? $discData['expires_at'] ?? null;
                    DiscountCode::updateOrCreate(
                        ['code' => $code],
                        [
                            'percent_off' => max(1, min(100, (int) ($discData['percentOff'] ?? $discData['percent'] ?? 10))),
                            'max_uses' => max(1, (int) ($discData['maxUses'] ?? 100)),
                            'used_count' => $existingDiscount
                                ? (int) $existingDiscount->used_count
                                : max(0, (int) ($discData['usedCount'] ?? 0)),
                            'min_order_amount_toman' => max(0, (int) ($discData['minOrderAmount'] ?? $discData['min_order_amount_toman'] ?? 0)),
                            'max_discount_amount_toman' => isset($discData['maxDiscountAmount']) && $discData['maxDiscountAmount'] !== null && $discData['maxDiscountAmount'] !== ''
                                ? max(0, (int) $discData['maxDiscountAmount'])
                                : ($existingDiscount?->max_discount_amount_toman),
                            'active' => (bool) ($discData['active'] ?? true),
                            'expires_at' => ! empty($expiresAtRaw) ? $expiresAtRaw : ($existingDiscount?->expires_at),
                        ]
                    );
                }
            }

            // Persist Consultation Requests (status & coach notes updates)
            if (isset($validated['consultations']) && is_array($validated['consultations'])) {
                foreach ($validated['consultations'] as $consData) {
                    if (empty($consData['id'])) {
                        continue;
                    }
                    ConsultationRequest::updateOrCreate(
                        ['id' => (string) $consData['id']],
                        [
                            'sender_name' => $consData['senderName'] ?? '',
                            'sender_phone' => $consData['senderPhone'] ?? '',
                            'goal_topic' => $consData['goalTopic'] ?? 'مشاوره تمرینی',
                            'message' => $consData['message'] ?? '',
                            'status' => in_array($consData['status'] ?? 'new', ['new', 'contacted', 'archived'], true)
                                ? $consData['status']
                                : 'new',
                            'coach_notes' => $consData['coachNotes'] ?? null,
                        ]
                    );
                }
            }

            // Persist Order Fulfillment Statuses (note: payment_status cannot be forged via state-sync)
            if (isset($validated['orders']) && is_array($validated['orders'])) {
                foreach ($validated['orders'] as $ordData) {
                    if (empty($ordData['id'])) {
                        continue;
                    }
                    $order = Order::find((string) $ordData['id']);
                    if ($order) {
                        if (isset($ordData['fulfillmentStatus']) && in_array($ordData['fulfillmentStatus'], ['pending', 'packed', 'shipped', 'delivered'], true)) {
                            $order->fulfillment_status = $ordData['fulfillmentStatus'];
                        }
                        if (isset($ordData['trackingCode'])) {
                            $order->tracking_code = (string) $ordData['trackingCode'];
                        }
                        $order->save();
                    }
                }
            }

            AuditLog::create([
                'action' => 'ADMIN_STATE_SYNC',
                'actor' => (string) ($request->user()?->email ?? 'admin'),
                'ip_address' => (string) $request->ip(),
                'details' => 'به‌روزرسانی داده‌های پلتفرم در دیتابیس MySQL (' . implode(', ', array_keys($validated)) . ')',
                'created_at' => now(),
            ]);
        });

        return response()->json([
            'ok' => true,
            'persistedKeys' => array_keys($validated),
            'updatedAt' => now()->toIso8601String(),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $actor = (string) ($request->user()?->email ?? 'admin');
        $ipAddress = (string) $request->ip();

        $result = DB::transaction(function () use ($actor, $ipAddress): array {
            // Products referenced by orders or active download entitlements must remain
            // addressable. Archive them instead of breaking purchase history/downloads.
            $protectedProductIds = OrderItem::query()
                ->whereNotNull('product_id')
                ->pluck('product_id')
                ->merge(DigitalEntitlement::query()->pluck('product_id'))
                ->filter()
                ->unique()
                ->values();

            $archivedProducts = 0;
            if ($protectedProductIds->isNotEmpty()) {
                $archivedProducts = Product::query()
                    ->whereIn('id', $protectedProductIds->all())
                    ->update(['status' => 'archived', 'is_archived' => true]);
            }

            $deletedProducts = Product::query()
                ->when(
                    $protectedProductIds->isNotEmpty(),
                    fn ($query) => $query->whereNotIn('id', $protectedProductIds->all())
                )
                ->delete();

            // Reset editable presentation/demo content. Customer, finance, admin,
            // audit, uploaded media and private files are deliberately preserved.
            PostComment::query()->delete();
            ExplorePost::query()->delete();
            PageSection::query()->delete();
            \App\Models\PageRevision::query()->delete();
            DiscountCode::query()->delete();
            CoachProfile::query()->delete();
            BrandSetting::query()->delete();

            (new DatabaseSeeder())->run();

            AuditLog::create([
                'action' => 'ADMIN_CONTENT_RESET',
                'actor' => $actor,
                'ip_address' => $ipAddress,
                'details' => sprintf(
                    'محتوای نمایشی بازنشانی شد؛ %d محصول حذف و %d محصول دارای سابقه خرید بایگانی شد. داده‌های مشتری و مالی حفظ شدند.',
                    $deletedProducts,
                    $archivedProducts
                ),
                'created_at' => now(),
            ]);

            return [
                'deletedProducts' => $deletedProducts,
                'archivedProducts' => $archivedProducts,
            ];
        });

        return response()->json([
            'ok' => true,
            'resetScope' => 'presentation-content',
            'preserved' => ['admins', 'customers', 'orders', 'payments', 'downloads', 'consultations', 'media', 'auditLogs'],
            ...$result,
        ]);
    }
}

