<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'orderId' => $this->id,
            'orderNumber' => $this->order_number,
            'trackingCode' => $this->tracking_code,
            'refId' => $this->ref_id ?? $this->tracking_code,
            'status' => $this->payment_status,
            'fulfillmentStatus' => $this->fulfillment_status,
            'stockReserved' => (bool) $this->stock_reserved,
            'gateway' => $this->gateway,
            'createdAt' => $this->created_at?->toIso8601String(),
            'paidAt' => $this->paid_at?->toIso8601String(),
            'refundType' => $this->refund_type,
            'refundReference' => $this->refund_reference,
            'refundedAt' => $this->refunded_at?->toIso8601String(),
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'customerEmail' => $this->customer_email,
            'customerCity' => $this->customer_city,
            'customerAddress' => $this->customer_address,
            'customerPostalCode' => $this->customer_postal_code,
            'customer' => [
                'name' => $this->customer_name,
                'phone' => $this->customer_phone,
                'email' => $this->customer_email,
                'city' => $this->customer_city,
                'address' => $this->customer_address,
                'postalCode' => $this->customer_postal_code,
            ],
            'items' => $this->items->map(fn ($item) => [
                'productId' => $item->product_id,
                'title' => $item->title,
                'type' => $item->type,
                'qty' => (int) $item->qty,
                'quantity' => (int) $item->qty,
                'unitPrice' => (int) $item->unit_price_toman,
                'price' => (int) $item->unit_price_toman,
                'visualPreset' => $item->visual_preset,
                'customImageUrl' => $item->custom_image_url,
                'downloadToken' => $this->payment_status === 'paid' ? $item->download_token : null,
            ])->values()->all(),
            'subtotal' => (int) $this->subtotal_toman,
            'discountAmount' => (int) $this->discount_amount_toman,
            'discountCode' => $this->discount_code,
            'shippingCost' => (int) $this->shipping_cost_toman,
            'totalAmount' => (int) $this->total_amount_toman,
        ];
    }
}
