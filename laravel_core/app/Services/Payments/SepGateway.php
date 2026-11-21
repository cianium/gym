<?php

declare(strict_types=1);

namespace App\Services\Payments;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class SepGateway implements PaymentProviderInterface
{
    public function __construct(
        private readonly string $terminalId,
        private readonly bool $sandbox = false
    ) {}

    public function getId(): string
    {
        return 'sep';
    }

    public function isConfigured(): bool
    {
        return strlen(trim($this->terminalId)) >= 5;
    }

    public function initiatePayment(string $orderId, int $amountToman, string $callbackUrl, string $mobile): array
    {
        $isProduction = app()->environment('production');

        if ($isProduction && ! $this->isConfigured()) {
            throw new RuntimeException('درگاه سامان (SEP) در محیط عملیاتی پیکربندی نشده است (Fail-Closed).');
        }

        if (! $this->isConfigured() && $this->sandbox) {
            return [
                'method' => 'POST',
                'url' => '/payment/result?orderId=' . urlencode($orderId),
                'authority' => 'SEP_SANDBOX_' . bin2hex(random_bytes(8)),
                'fields' => [
                    'OrderId' => $orderId,
                    'Gateway' => 'sep',
                ],
            ];
        }

        $amountRial = $amountToman * 10;
        $response = Http::timeout(15)->post('https://sep.shaparak.ir/onlinepg/onlinepg', [
            'action' => 'token',
            'TerminalId' => $this->terminalId,
            'Amount' => $amountRial,
            'ResNum' => $orderId,
            'RedirectUrl' => $callbackUrl,
            'CellNumber' => $mobile,
        ]);

        $json = $response->json();
        if (! $response->successful() || ($json['status'] ?? 0) !== 1 || empty($json['token'])) {
            throw new RuntimeException('خطا در دریافت توکن پرداخت از درگاه سامان (SEP).');
        }

        $token = (string) $json['token'];

        return [
            'method' => 'POST',
            'url' => 'https://sep.shaparak.ir/OnlinePG/OnlinePG',
            'authority' => $token,
            'fields' => [
                'Token' => $token,
                'GetMethod' => 'false',
            ],
        ];
    }

    /**
     * Verifies Saman SEP callback with distinct outcome states:
     * - 'paid': Bank explicitly verified (Success=true, ResultCode=0, AffectiveAmount matches).
     * - 'cancelled': Customer cancelled on gateway page (State !== 'OK' or empty RefNum).
     * - 'failed': Bank explicitly rejected verification with structured ResultCode.
     * - 'verification_pending': Network timeout, connection error, or 5xx/429 gateway outage.
     */
    public function verifyCallback(int $expectedAmountToman, array $callbackPayload): array
    {
        $state = (string) ($callbackPayload['State'] ?? '');
        $refNum = (string) ($callbackPayload['RefNum'] ?? '');

        if ($state !== 'OK' || $refNum === '') {
            return [
                'verified' => false,
                'state' => 'cancelled',
                'retryable' => false,
                'refId' => null,
                'message' => 'تراکنش درگاه سامان توسط کاربر لغو شد.',
            ];
        }

        if (! $this->isConfigured()) {
            throw new RuntimeException('TERMINAL_NOT_CONFIGURED: شناسه ترمینال سامان برای Verify بانکی تنظیم نشده است (Fail-Closed).');
        }

        try {
            $response = Http::timeout(15)->post(
                'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction',
                [
                    'RefNum' => $refNum,
                    'TerminalNumber' => (int) $this->terminalId,
                ]
            );
        } catch (ConnectionException|Throwable $e) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'خطای موقت شبکه در ارتباط با وب‌سرویس Verify بانک سامان: ' . $e->getMessage(),
            ];
        }

        if ($response->serverError() || $response->status() === 429 || $response->status() === 0) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'عدم پاسخگویی موقت سرور بانک سامان (HTTP ' . $response->status() . '). تراکنش در صف استعلام مجدد قرار گرفت.',
            ];
        }

        $json = $response->json();
        if (! is_array($json) || ! array_key_exists('ResultCode', $json)) {
            return [
                'verified' => false,
                'state' => 'verification_pending',
                'retryable' => true,
                'refId' => null,
                'message' => 'پاسخ نامعتبر از درگاه سامان؛ نیازمند استعلام مجدد.',
            ];
        }

        $expectedRial = $expectedAmountToman * 10;
        $affectiveAmount = (int) ($json['TransactionDetail']['AffectiveAmount'] ?? 0);

        if (
            $response->successful() &&
            ! empty($json['Success']) &&
            ($json['ResultCode'] ?? -1) === 0 &&
            $affectiveAmount === $expectedRial
        ) {
            return [
                'verified' => true,
                'state' => 'paid',
                'retryable' => false,
                'refId' => (string) ($json['TransactionDetail']['StraceNo'] ?? $refNum),
                'message' => 'تراکنش بانک سامان با موفقیت تایید شد.',
            ];
        }

        return [
            'verified' => false,
            'state' => 'failed',
            'retryable' => false,
            'refId' => null,
            'message' => 'تاییدیه مبلغ یا تراکنش از بانک سامان دریافت نشد (کد نتیجه: ' . ($json['ResultCode'] ?? 'unknown') . ').',
        ];
    }
}
