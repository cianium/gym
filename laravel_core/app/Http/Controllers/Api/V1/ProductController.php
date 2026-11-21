<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController
{
    public function index(): JsonResponse
    {
        $products = Product::where('is_archived', false)->orderByDesc('created_at')->get();

        return response()->json([
            'ok' => true,
            'products' => $products,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->upsertProduct($request, null);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->upsertProduct($request, $id);
    }

    private function upsertProduct(Request $request, ?string $routeId): JsonResponse
    {
        $validated = $request->validate([
            'id' => ['sometimes', 'string', 'max:64'],
            'type' => ['required', 'in:digital,physical'],
            'title' => ['required', 'string', 'min:2', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'discountPrice' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'features' => ['nullable', 'array'],
            'visualPreset' => ['nullable', 'string', 'max:48'],
            'customImageUrl' => ['nullable', 'string', 'max:2048'],
            'status' => ['nullable', 'in:published,draft,archived'],
            'level' => ['nullable', 'string', 'max:80'],
            'duration' => ['nullable', 'string', 'max:80'],
            'fileFormat' => ['nullable', 'string', 'max:120'],
            'fileSize' => ['nullable', 'string', 'max:48'],
            'modules' => ['nullable', 'array'],
            'stock' => ['nullable', 'integer', 'min:0'],
            'sku' => ['nullable', 'string', 'max:64'],
            'material' => ['nullable', 'string', 'max:255'],
            'shippingEstimate' => ['nullable', 'string', 'max:255'],
        ]);

        $customImageUrl = $validated['customImageUrl'] ?? null;
        if (is_string($customImageUrl) && str_starts_with(strtolower(trim($customImageUrl)), 'data:')) {
            return response()->json([
                'error' => 'ذخیره مستقیم تصاویر Base64 (Data URL) در دیتابیس مجاز نیست. لطفاً ابتدا فایل را از طریق مسیر /api/v1/admin/media بارگذاری کنید.',
                'code' => 'BASE64_MEDIA_PERSISTENCE_FORBIDDEN',
            ], 422);
        }

        $productId = $routeId ?: (string) ($validated['id'] ?? ('prod-' . time() . '-' . random_int(100, 999)));

        $product = DB::transaction(function () use ($productId, $validated, $customImageUrl, $request) {
            $saved = Product::updateOrCreate(
                ['id' => $productId],
                [
                    'type' => $validated['type'],
                    'title' => $validated['title'],
                    'subtitle' => $validated['subtitle'] ?? null,
                    'price_toman' => (int) $validated['price'],
                    'discount_price_toman' => isset($validated['discountPrice']) ? (int) $validated['discountPrice'] : null,
                    'description' => $validated['description'] ?? '',
                    'features' => $validated['features'] ?? [],
                    'visual_preset' => $validated['visualPreset'] ?? 'digital-hypertrophy',
                    'custom_image_url' => $customImageUrl,
                    'status' => $validated['status'] ?? 'published',
                    'is_archived' => ($validated['status'] ?? 'published') === 'archived',
                    'level' => $validated['level'] ?? null,
                    'duration' => $validated['duration'] ?? null,
                    'file_format' => $validated['fileFormat'] ?? null,
                    'file_size' => $validated['fileSize'] ?? null,
                    'modules' => $validated['modules'] ?? null,
                    'stock' => isset($validated['stock']) ? (int) $validated['stock'] : null,
                    'sku' => $validated['sku'] ?? null,
                    'material' => $validated['material'] ?? null,
                    'shipping_estimate' => $validated['shippingEstimate'] ?? null,
                ]
            );

            AuditLog::create([
                'action' => 'ADMIN_PRODUCT_SAVED',
                'actor' => (string) ($request->user()?->email ?? 'admin'),
                'ip_address' => (string) $request->ip(),
                'details' => "ذخیره غیرمخرب محصول {$saved->id} ({$saved->title})",
                'created_at' => now(),
            ]);

            return $saved;
        });

        return response()->json([
            'ok' => true,
            'product' => $product,
        ]);
    }

    /**
     * Non-destructive product deletion:
     * If a product is referenced by historical `order_items`, it is soft-archived
     * (`is_archived = true`, `status = 'archived'`) so historical order records never break.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $product = Product::find($id);
        if (! $product) {
            return response()->json([
                'error' => 'محصول مورد نظر یافت نشد.',
                'code' => 'PRODUCT_NOT_FOUND',
            ], 404);
        }

        $result = DB::transaction(function () use ($product, $id, $request) {
            $hasOrderHistory = OrderItem::where('product_id', $id)->exists();
            if ($hasOrderHistory) {
                $product->update([
                    'status' => 'archived',
                    'is_archived' => true,
                ]);
                $mode = 'archived';
            } else {
                $product->delete();
                $mode = 'deleted';
            }

            AuditLog::create([
                'action' => $mode === 'archived' ? 'ADMIN_PRODUCT_ARCHIVED' : 'ADMIN_PRODUCT_DELETED',
                'actor' => (string) ($request->user()?->email ?? 'admin'),
                'ip_address' => (string) $request->ip(),
                'details' => "حذف امن محصول {$id} (حالت: {$mode} جهت حفظ تاریخچه سفارش‌ها)",
                'created_at' => now(),
            ]);

            return $mode;
        });

        return response()->json([
            'ok' => true,
            'id' => $id,
            'mode' => $result,
        ]);
    }
}
