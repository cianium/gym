<?php

declare(strict_types=1);

namespace App\Services\Payments;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class ZarinpalGateway implements PaymentProviderInterface
{
    public function __construct(
        private readonly string $merchantId,
        private readonly bool $sandbox = false
    ) {}

    public function getId(): string
    {
        return 'zarinpal';
    }

    public function isConfigured(): bool
    {
        return strlen(trim($this->merchantId)) >= 32;
    }

    public function initiatePayment(string $orderId, int $amountToman, string $callbackUrl, string $mobile): array
    {
        $isProduction = app()->environment('production');

        if ($isProduction && ! $this->isConfigured()) {
            throw new RuntimeException('درگاه زرین‌پال در محیط عملیاتی پیکربندی نشده است (Fail-Closed).');
        }

        if (! $this->isConfigured() && $this->sandbox) {
            return [
                'method' => 'GET',
                'url' => '/payment/result?orderId=' . urlencode($orderId),
                'authority' => 'SANDBOX_' . bin2hex(random_bytes(8)),
            ];
        }

        $amountRial = $amountToman * 10;
        $response = Http::timeout(15)->post('https://payment.zarinpal.com/pg/v4/payment/request.json', [
            'merchant_id' => $this->merchantId,
            'amount' => $amountRial,
            'callback_url' => $callbackUrl,
            'description' => 'پرداخت سفارش شماره ' . $orderId,
            'metadata' => [
                'mobile' => $mobile,
                'order_id' => $orderId,
            ],
        ]);

        $data = $response->json('data');
        if (! $response->successful() || empty($data['authority']) || ($data['code'] ?? 0) !== 100) {
            throw new RuntimeException('خطا در دریافت توکن پرداخت از درگاه زرین‌پال.');
        }

        $authority = (string) $data['authority'];

        return [
            'method' => 'GET',
            'url' => 'https://payment.zarinpal.com/pg/StartPay/' . urlencode($authority),
            'authority' => $authority,
        ];
    }

    /**
     * Verifies Zarinpal callback with distinct outcome states:
     * - 'paid': Bank explicitly verified (code 100 or 101).
     * - 'cancelled': Customer cancelled on gateway page (Status !== 'OK').
     * - 'failed': Bank explicitly rejected verification with structured error code.
     * - 'verification_pending': Network timeout, connection error, or 5xx/429 gateway outage.
     *   A network error is NEVER treated as proof that payment failed!
     */
    public function verifyCallback(int $expectedAmountToman, array $callbackPayload): array
    {
        $status = (string) ($callbackPayload['Status'] ?? '');
        $authority = (string) ($callbackPayload['Authority'] ?? '');

        if ($status !== 'OK' || $authority === '') {
            return [
                'verified' => false,
                'state' => 'cancelled',
                'retryable' => false,
                'refId' => null,
                'message' => 'تراکنش توسط خریدار در صفحه درگاه لغو شد.',
            ];
        }

        if (! $this->isConfigured()) {
            throw new RuntimeException('MERCHANT_NOT_CONFIGURED: کلید پذیرنده زرین‌پال برای Verify بانکی تنظیم نشده است (Fail-Closed).');
        }

        try {
            $response = Http::timeout(15)->post('https://payment.zarinpal.com/pg/v4/payment/verify.json', [
                'merchant_id' => $this->merchantId,
                'amount' => $expectedAmountToman * 10,
                'authority' => $authority,
            ]);
        } catch (ConnectionException|Throwable $e) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'خطای موقت شبکه در ارتباط با وب‌سرویس Verify زرین‌پال: ' . $e->getMessage(),
            ];
        }

        if ($response->serverError() || $response->status() === 429 || $response->status() === 0) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'عدم پاسخگویی موقت سرور زرین‌پال (HTTP ' . $response->status() . '). تراکنش در صف استعلام مجدد قرار گرفت.',
            ];
        }

        $json = $response->json();
        if (! is_array($json)) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'پاسخ نامعتبر از درگاه زرین‌پال؛ نیازمند استعلام مجدد.',
            ];
        }

        $data = $json['data'] ?? [];
        $code = (int) ($data['code'] ?? 0);

        if ($response->successful() && in_array($code, [100, 101], true)
            && trim((string) ($data['ref_id'] ?? '')) === '') {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'پاسخ پرداخت فاقد شناسه مرجع بانکی است؛ بررسی مجدد الزامی است.',
            ];
        }

        if ($response->successful() && in_array($code, [100, 101], true)) {
            return [
                'verified' => true,
                'state' => 'paid',
                'retryable' => false,
                'refId' => (string) ($data['ref_id'] ?? ''),
                'message' => 'تراکنش با موفقیت توسط شاپرک تایید شد.',
            ];
        }

        return [
            'verified' => false,
            'state' => 'failed',
            'retryable' => false,
            'refId' => null,
            'message' => 'عدم تایید تراکنش توسط بانک (کد وضعیت: ' . ($code ?: ($json['errors']['code'] ?? 'unknown')) . ').',
        ];
    }
}
