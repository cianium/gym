<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 0. Laravel Core Sessions Table (for stateful HttpOnly admin authentication)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 0b. Laravel Core Cache Tables (for rate limiting / throttling)
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });

        // 1. Users (Coach Admin & Athletes — Single-Tenant Independent DB)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username')->nullable()->unique();
            $table->string('phone', 20)->unique();
            $table->string('email')->nullable()->unique();
            $table->string('password')->nullable();
            $table->string('role', 20)->default('athlete'); // admin | athlete
            $table->boolean('must_change_password')->default(false);
            $table->string('level')->default('ورزشکار سطح پایه');
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Brand Settings & Theme Tokens (Single-Row Configuration)
        Schema::create('brand_settings', function (Blueprint $table) {
            $table->id();
            $table->string('brand_name')->default('پلتفرم White-Label مربی');
            $table->string('brand_subtitle')->nullable();
            $table->string('logo_url', 500)->nullable();
            $table->string('favicon_url', 500)->nullable();
            $table->string('share_image_url', 500)->nullable();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->string('canonical_domain')->nullable();
            $table->string('footer_copyright')->nullable();
            $table->string('primary_cta_text')->default('دریافت برنامه تمرینی');
            $table->string('primary_cta_route', 40)->default('shop');
            $table->string('support_hours')->nullable();
            $table->unsignedBigInteger('shipping_flat_rate_toman')->default(85000);
            $table->unsignedBigInteger('free_shipping_threshold_toman')->default(3000000);
            $table->json('theme_tokens')->nullable();
            $table->json('site_modules')->nullable();
            $table->timestamps();
        });

        // 3. Coach Profile
        Schema::create('coach_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('english_name')->nullable();
            $table->string('title');
            $table->string('tagline')->nullable();
            $table->text('bio');
            $table->json('specialties')->nullable();
            $table->unsignedSmallInteger('experience_years')->default(10);
            $table->unsignedInteger('active_athletes')->default(0);
            $table->unsignedInteger('programs_delivered')->default(0);
            $table->string('location')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('instagram_handle')->nullable();
            $table->string('telegram_handle')->nullable();
            $table->string('youtube_handle')->nullable();
            $table->string('nfc_serial_code')->nullable();
            $table->string('visual_preset')->default('coach-portrait');
            $table->text('custom_avatar_url')->nullable();
            $table->json('certifications')->nullable();
            $table->timestamps();
        });

        // 4. Visual Builder Sections
        Schema::create('page_sections', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('page_target', 30)->default('home')->index();
            $table->string('block_type', 40)->default('hero');
            $table->string('label');
            $table->string('kicker')->nullable();
            $table->string('title')->nullable();
            $table->text('subtitle')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_route', 40)->nullable();
            $table->boolean('enabled')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->string('bg_type', 20)->default('gradient');
            $table->string('solid_color', 20)->default('#1D1D1D');
            $table->string('gradient_preset', 40)->default('obsidian-gold');
            $table->string('image_preset', 50)->default('hero-barbell');
            $table->text('custom_image_url')->nullable();
            $table->string('image_display_mode', 20)->default('cover');
            $table->unsignedTinyInteger('overlay_opacity')->default(55);
            $table->string('height_mode', 20)->default('normal');
            $table->boolean('is_custom_block')->default(false);
            $table->timestamps();
        });

        // 5. Page Revisions (Draft/Publish & Version Rollback History)
        Schema::create('page_revisions', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->unsignedInteger('version_number')->index();
            $table->string('label');
            $table->string('created_by')->default('Coach Admin');
            $table->string('status', 20)->default('published');
            $table->json('sections_snapshot');
            $table->json('theme_snapshot');
            $table->timestamps();
        });

        // 6. Products (Digital Training Programs & Physical Gear)
        Schema::create('products', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('type', 20)->index(); // digital | physical
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->unsignedBigInteger('price_toman');
            $table->unsignedBigInteger('discount_price_toman')->nullable();
            $table->text('description')->default('');
            $table->json('features')->nullable();
            $table->string('visual_preset', 50)->default('digital-hypertrophy');
            $table->string('custom_image_url', 500)->nullable();
            $table->string('status', 20)->default('published')->index(); // published | draft | archived
            $table->boolean('is_archived')->default(false)->index();
            $table->string('level')->nullable();
            $table->string('duration')->nullable();
            $table->string('file_format')->nullable();
            $table->string('file_size')->nullable();
            $table->string('private_file_path')->nullable();
            $table->unsignedInteger('file_version')->default(1);
            $table->json('modules')->nullable();
            $table->integer('stock')->nullable();
            $table->unsignedInteger('reserved_stock')->default(0);
            $table->string('sku', 60)->nullable();
            $table->string('material')->nullable();
            $table->string('shipping_estimate')->nullable();
            $table->timestamps();
        });

        // 6b. Uploaded Media Files (Public Product, Avatar & Section Images)
        Schema::create('media_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('disk', 30)->default('public');
            $table->string('directory', 120)->default('media');
            $table->string('filename', 190)->unique();
            $table->string('original_name', 255)->nullable();
            $table->string('mime_type', 60);
            $table->unsignedBigInteger('size_bytes');
            $table->string('public_url', 500);
            $table->string('uploaded_by', 190)->nullable();
            $table->timestamps();
        });

        // 7. Explore Reels & Educational Posts
        Schema::create('explore_posts', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('media_type', 20)->default('video');
            $table->string('title');
            $table->text('caption');
            $table->json('tags')->nullable();
            $table->string('visual_preset', 50)->default('reel-deadlift');
            $table->text('custom_media_url')->nullable();
            $table->json('slides')->nullable();
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->unsignedSmallInteger('duration_sec')->nullable();
            $table->unsignedSmallInteger('bpm_tempo')->nullable();
            $table->string('linked_product_id', 80)->nullable();
            $table->timestamps();
        });

        // 8. Post Comments & Moderation
        Schema::create('post_comments', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('post_id', 80)->index();
            $table->string('author_name');
            $table->string('author_role')->nullable();
            $table->text('text');
            $table->boolean('is_coach_reply')->default(false);
            $table->boolean('approved')->default(false)->index();
            $table->timestamps();

            $table->foreign('post_id')->references('id')->on('explore_posts')->cascadeOnDelete();
        });

        // 9. Discount Codes
        Schema::create('discount_codes', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('code', 40)->unique();
            $table->unsignedTinyInteger('percent_off');
            $table->unsignedInteger('max_uses')->default(100);
            $table->unsignedInteger('used_count')->default(0);
            $table->unsignedBigInteger('min_order_amount_toman')->default(0);
            $table->unsignedBigInteger('max_discount_amount_toman')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 10. Orders
        Schema::create('orders', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('order_number', 40)->unique();
            $table->string('tracking_code', 60)->index();
            $table->string('ref_id', 100)->nullable()->index();
            $table->string('access_token', 96)->unique();
            $table->string('idempotency_key', 128)->nullable()->unique();
            $table->string('gateway', 20)->default('zarinpal');
            $table->string('payment_status', 30)->default('pending')->index(); // pending | processing | verification_pending | paid | failed | cancelled | refunded
            $table->string('fulfillment_status', 30)->default('pending'); // pending | packed | shipped | delivered | reconciliation_required | refund_required
            $table->boolean('stock_reserved')->default(false);
            $table->boolean('discount_reserved')->default(false);
            $table->string('customer_name');
            $table->string('customer_phone', 25)->index();
            $table->string('customer_email')->nullable();
            $table->string('customer_city')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_postal_code', 25)->nullable();
            $table->text('customer_notes')->nullable();
            $table->unsignedBigInteger('subtotal_toman');
            $table->unsignedBigInteger('discount_amount_toman')->default(0);
            $table->string('discount_code', 40)->nullable();
            $table->unsignedBigInteger('shipping_cost_toman')->default(0);
            $table->unsignedBigInteger('total_amount_toman');
            $table->timestamp('paid_at')->nullable();
            $table->string('refund_type', 30)->nullable();
            $table->string('refund_reference', 120)->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
        });

        // 11. Order Items
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 80)->index();
            $table->string('product_id', 80)->nullable();
            $table->string('title');
            $table->string('type', 20);
            $table->unsignedBigInteger('unit_price_toman');
            $table->unsignedSmallInteger('qty')->default(1);
            $table->string('visual_preset', 50)->nullable();
            $table->text('custom_image_url')->nullable();
            $table->string('download_token', 96)->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // 12. Payment Transactions (Idempotent Shaparak Verification State Machine)
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 80)->index();
            $table->string('gateway', 20);
            $table->string('authority_or_token', 140)->nullable()->index();
            $table->string('ref_id', 100)->nullable()->unique();
            $table->unsignedBigInteger('amount_toman');
            $table->string('currency', 10)->default('IRT');
            $table->string('status', 30)->default('initiated')->index(); // initiated | processing | verified | verification_pending | reconciliation_required | failed | cancelled | refunded
            $table->unsignedSmallInteger('verification_attempts')->default(0);
            $table->string('last_error', 255)->nullable();
            $table->json('raw_callback_payload')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // 12b. Immutable Payment Events Ledger (Append-Only Financial Audit Trail)
        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 80)->index();
            $table->unsignedBigInteger('transaction_id')->nullable()->index();
            $table->string('gateway', 20);
            $table->string('event_type', 60)->index();
            $table->string('previous_status', 30)->nullable();
            $table->string('next_status', 30);
            $table->string('authority_or_ref', 140)->nullable();
            $table->unsignedBigInteger('amount_toman')->default(0);
            $table->string('ip_address', 45)->nullable();
            $table->text('details')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // 13. Digital Download Entitlements (Time-Limited & Quota-Bound & Revocable)
        Schema::create('digital_entitlements', function (Blueprint $table) {
            $table->string('token', 96)->primary();
            $table->string('order_id', 80)->index();
            $table->string('product_id', 80)->index();
            $table->string('customer_phone', 25);
            $table->unsignedSmallInteger('downloads_used')->default(0);
            $table->unsignedSmallInteger('max_downloads')->default(5);
            $table->boolean('is_revoked')->default(false)->index();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason', 255)->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
        });

        // 14. Consultation Requests (VIP Coaching Leads)
        Schema::create('consultation_requests', function (Blueprint $table) {
            $table->string('id', 80)->primary();
            $table->string('sender_name');
            $table->string('sender_phone', 25);
            $table->string('goal_topic');
            $table->text('message')->nullable();
            $table->string('status', 20)->default('new')->index();
            $table->text('coach_notes')->nullable();
            $table->timestamps();
        });

        // 15. Security Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action', 80)->index();
            $table->string('actor', 80)->default('system');
            $table->string('ip_address', 45)->nullable();
            $table->text('details');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('consultation_requests');
        Schema::dropIfExists('digital_entitlements');
        Schema::dropIfExists('payment_events');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('discount_codes');
        Schema::dropIfExists('post_comments');
        Schema::dropIfExists('explore_posts');
        Schema::dropIfExists('media_files');
        Schema::dropIfExists('products');
        Schema::dropIfExists('page_revisions');
        Schema::dropIfExists('page_sections');
        Schema::dropIfExists('coach_profiles');
        Schema::dropIfExists('brand_settings');
        Schema::dropIfExists('users');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
    }
};
