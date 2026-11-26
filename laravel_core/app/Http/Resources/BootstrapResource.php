<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BootstrapResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $isAdmin = $request->user() !== null && $request->user()->role === 'admin' && ! $request->user()->must_change_password;

        $coach = $this->resource['coach'] ?? null;
        $sections = collect($this->resource['sectionConfigs'] ?? []);
        $products = collect($this->resource['products'] ?? []);
        $posts = collect($this->resource['posts'] ?? []);

        $data = [
            'version' => \App\Http\Controllers\Api\V1\SystemMaintenanceController::RELEASE_VERSION,
            'installedAt' => $this->resource['installedAt'] ?? null,
            'installed' => (bool) ($this->resource['installed'] ?? false),
            'brandConfig' => $this->resource['brandConfig'],
            'siteModules' => $this->resource['siteModules'],
            'themeColors' => $this->resource['themeColors'],
            'coach' => $coach ? [
                'name' => $coach->name,
                'englishName' => $coach->english_name ?? '',
                'title' => $coach->title,
                'tagline' => $coach->tagline ?? '',
                'bio' => $coach->bio,
                'specialties' => $coach->specialties ?? [],
                'experienceYears' => (int) $coach->experience_years,
                'activeAthletes' => (int) $coach->active_athletes,
                'programsDelivered' => (int) $coach->programs_delivered,
                'location' => $coach->location ?? '',
                'phone' => $coach->phone ?? '',
                'email' => $coach->email ?? '',
                'instagramHandle' => $coach->instagram_handle ?? '',
                'telegramHandle' => $coach->telegram_handle ?? '',
                'youtubeHandle' => $coach->youtube_handle ?? '',
                'nfcSerialCode' => $coach->nfc_serial_code ?? '',
                'visualPreset' => $coach->visual_preset ?? 'coach-portrait',
                'customAvatarUrl' => $coach->custom_avatar_url,
                'certifications' => $coach->certifications ?? [],
            ] : null,
            'sectionConfigs' => $sections->map(fn ($sec) => [
                'id' => $sec->id,
                'pageTarget' => $sec->page_target,
                'blockType' => $sec->block_type,
                'label' => $sec->label,
                'kicker' => $sec->kicker,
                'title' => $sec->title,
                'subtitle' => $sec->subtitle,
                'ctaText' => $sec->cta_text,
                'ctaRoute' => $sec->cta_route,
                'enabled' => (bool) $sec->enabled,
                'order' => (int) $sec->sort_order,
                'bgType' => $sec->bg_type,
                'solidColor' => $sec->solid_color,
                'gradientPreset' => $sec->gradient_preset,
                'imagePreset' => $sec->image_preset,
                'customImageUrl' => $sec->custom_image_url,
                'imageDisplayMode' => $sec->image_display_mode,
                'overlayOpacity' => (int) $sec->overlay_opacity,
                'heightMode' => $sec->height_mode,
                'isCustomBlock' => (bool) $sec->is_custom_block,
            ])->values()->all(),
            'products' => $products->map(fn ($p) => [
                'id' => $p->id,
                'type' => $p->type,
                'title' => $p->title,
                'subtitle' => $p->subtitle ?? '',
                'price' => (int) $p->price_toman,
                'discountPrice' => $p->discount_price_toman !== null ? (int) $p->discount_price_toman : null,
                'description' => $p->description,
                'features' => $p->features ?? [],
                'visualPreset' => $p->visual_preset,
                'customImageUrl' => $p->custom_image_url,
                'status' => $p->status,
                'isArchived' => (bool) ($p->is_archived ?? false),
                'level' => $p->level,
                'duration' => $p->duration,
                'fileFormat' => $p->file_format,
                'fileSize' => $p->file_size,
                'fileVersion' => (int) ($p->file_version ?? 1),
                'modules' => $p->modules ?? [],
                'stock' => $p->stock !== null ? (int) $p->stock : null,
                'reservedStock' => (int) ($p->reserved_stock ?? 0),
                'sku' => $p->sku,
                'material' => $p->material,
                'shippingEstimate' => $p->shipping_estimate,
            ])->values()->all(),
            'posts' => $posts->map(fn ($post) => [
                'id' => $post->id,
                'mediaType' => $post->media_type,
                'title' => $post->title,
                'caption' => $post->caption,
                'tags' => $post->tags ?? [],
                'visualPreset' => $post->visual_preset,
                'customMediaUrl' => $post->custom_media_url,
                'slides' => $post->slides ?? [],
                'likesCount' => (int) $post->likes_count,
                'viewsCount' => (int) $post->views_count,
                'durationSec' => $post->duration_sec !== null ? (int) $post->duration_sec : null,
                'bpmTempo' => $post->bpm_tempo !== null ? (int) $post->bpm_tempo : null,
                'linkedProductId' => $post->linked_product_id,
                'comments' => collect($post->comments ?? [])
                    ->filter(fn ($c) => $isAdmin || (bool) $c->approved === true)
                    ->map(fn ($c) => [
                        'id' => $c->id,
                        'authorName' => $c->author_name,
                        'authorRole' => $c->author_role,
                        'text' => $c->text,
                        'isCoachReply' => (bool) $c->is_coach_reply,
                        'approved' => (bool) $c->approved,
                        'createdAt' => $c->created_at?->toIso8601String() ?? '',
                    ])->values()->all(),
            ])->values()->all(),
            'gateways' => $this->resource['gateways'] ?? [],
        ];

        // Strictly include private orders and admin collections ONLY when authenticated as admin
        if ($isAdmin) {
            $data['orders'] = collect($this->resource['orders'] ?? [])->map(fn ($o) => [
                'id' => $o->id,
                'orderNumber' => $o->order_number,
                'trackingCode' => $o->tracking_code,
                'refId' => $o->ref_id ?? $o->tracking_code,
                'gateway' => $o->gateway,
                'createdAt' => $o->created_at?->toIso8601String() ?? '',
                'paidAt' => $o->paid_at?->toIso8601String(),
                'refundType' => $o->refund_type,
                'refundReference' => $o->refund_reference,
                'refundedAt' => $o->refunded_at?->toIso8601String(),
                'customerName' => $o->customer_name,
                'customerPhone' => $o->customer_phone,
                'customerEmail' => $o->customer_email,
                'customerCity' => $o->customer_city,
                'customerAddress' => $o->customer_address,
                'customerPostalCode' => $o->customer_postal_code,
                'customerNotes' => $o->customer_notes,
                'subtotal' => (int) $o->subtotal_toman,
                'discountAmount' => (int) $o->discount_amount_toman,
                'discountCode' => $o->discount_code,
                'shippingCost' => (int) $o->shipping_cost_toman,
                'totalAmount' => (int) $o->total_amount_toman,
                'status' => $o->payment_status === 'paid' ? 'completed' : $o->payment_status,
                'fulfillmentStatus' => $o->fulfillment_status,
                'items' => collect($o->items ?? [])->map(fn ($item) => [
                    'productId' => $item->product_id,
                    'title' => $item->title,
                    'type' => $item->type,
                    'price' => (int) $item->unit_price_toman,
                    'quantity' => (int) $item->qty,
                    'visualPreset' => $item->visual_preset,
                    'customImageUrl' => $item->custom_image_url,
                    'downloadToken' => $o->payment_status === 'paid' ? $item->download_token : null,
                ])->values()->all(),
            ])->values()->all();

            $data['revisions'] = collect($this->resource['revisions'] ?? [])->map(fn ($r) => [
                'id' => $r->id,
                'versionNumber' => (int) $r->version_number,
                'label' => $r->label,
                'createdBy' => $r->created_by,
                'status' => $r->status,
                'sectionsSnapshot' => $r->sections_snapshot ?? [],
                'themeSnapshot' => $r->theme_snapshot ?? [],
                'createdAt' => $r->created_at?->toIso8601String() ?? '',
            ])->values()->all();

            $data['consultations'] = collect($this->resource['consultations'] ?? [])->map(fn ($c) => [
                'id' => $c->id,
                'senderName' => $c->sender_name,
                'senderPhone' => $c->sender_phone,
                'goalTopic' => $c->goal_topic,
                'message' => $c->message ?? '',
                'status' => $c->status,
                'coachNotes' => $c->coach_notes,
                'createdAt' => $c->created_at?->toIso8601String() ?? '',
            ])->values()->all();

            $data['discounts'] = collect($this->resource['discounts'] ?? [])->map(fn ($d) => [
                'id' => $d->id,
                'code' => $d->code,
                'percentOff' => (int) $d->percent_off,
                'maxUses' => (int) $d->max_uses,
                'usedCount' => (int) $d->used_count,
                'minOrderAmount' => (int) ($d->min_order_amount_toman ?? 0),
                'maxDiscountAmount' => $d->max_discount_amount_toman !== null ? (int) $d->max_discount_amount_toman : null,
                'active' => (bool) $d->active,
                'expiresAt' => $d->expires_at?->toIso8601String(),
            ])->values()->all();

            $data['auditLogs'] = collect($this->resource['auditLogs'] ?? [])->map(fn ($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'actor' => $a->actor,
                'ip' => $a->ip_address,
                'details' => $a->details,
                'createdAt' => $a->created_at?->toIso8601String() ?? '',
            ])->values()->all();
        }

        return $data;
    }
}
