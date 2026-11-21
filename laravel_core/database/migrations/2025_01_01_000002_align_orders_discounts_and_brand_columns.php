<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Non-destructive upgrade migration that adds any missing columns to existing
     * databases without dropping or overwriting existing customer/order records.
     */
    public function up(): void
    {
        if (Schema::hasTable('brand_settings')) {
            Schema::table('brand_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('brand_settings', 'logo_url')) {
                    $table->string('logo_url', 500)->nullable()->after('brand_subtitle');
                }
                if (! Schema::hasColumn('brand_settings', 'favicon_url')) {
                    $table->string('favicon_url', 500)->nullable()->after('logo_url');
                }
                if (! Schema::hasColumn('brand_settings', 'share_image_url')) {
                    $table->string('share_image_url', 500)->nullable()->after('favicon_url');
                }
                if (! Schema::hasColumn('brand_settings', 'shipping_flat_rate_toman')) {
                    $table->unsignedBigInteger('shipping_flat_rate_toman')->default(85000)->after('support_hours');
                }
                if (! Schema::hasColumn('brand_settings', 'free_shipping_threshold_toman')) {
                    $table->unsignedBigInteger('free_shipping_threshold_toman')->default(3000000)->after('shipping_flat_rate_toman');
                }
            });
        }

        if (Schema::hasTable('discount_codes')) {
            Schema::table('discount_codes', function (Blueprint $table) {
                if (! Schema::hasColumn('discount_codes', 'min_order_amount_toman')) {
                    $table->unsignedBigInteger('min_order_amount_toman')->default(0)->after('used_count');
                }
                if (! Schema::hasColumn('discount_codes', 'max_discount_amount_toman')) {
                    $table->unsignedBigInteger('max_discount_amount_toman')->nullable()->after('min_order_amount_toman');
                }
                if (! Schema::hasColumn('discount_codes', 'expires_at')) {
                    $table->timestamp('expires_at')->nullable()->after('active');
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (! Schema::hasColumn('orders', 'ref_id')) {
                    $table->string('ref_id', 100)->nullable()->index()->after('tracking_code');
                }
                if (! Schema::hasColumn('orders', 'idempotency_key')) {
                    $table->string('idempotency_key', 128)->nullable()->unique()->after('access_token');
                }
                if (! Schema::hasColumn('orders', 'discount_reserved')) {
                    $table->boolean('discount_reserved')->default(false)->after('stock_reserved');
                }
                if (! Schema::hasColumn('orders', 'paid_at')) {
                    $table->timestamp('paid_at')->nullable()->after('total_amount_toman');
                }
                if (! Schema::hasColumn('orders', 'refund_type')) {
                    $table->string('refund_type', 30)->nullable()->after('paid_at');
                }
                if (! Schema::hasColumn('orders', 'refund_reference')) {
                    $table->string('refund_reference', 120)->nullable()->after('refund_type');
                }
                if (! Schema::hasColumn('orders', 'refunded_at')) {
                    $table->timestamp('refunded_at')->nullable()->after('refund_reference');
                }
            });
        }
    }

    public function down(): void
    {
        // Non-destructive down migration to preserve production records
    }
};
