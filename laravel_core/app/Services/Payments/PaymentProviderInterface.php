<?php

declare(strict_types=1);

namespace App\Services\Payments;

/**
 * PaymentProvider Contract for Iranian Banking Gateways (Zarinpal & Saman SEP)
 * Server-side only; zero credentials or price logic exposed to the browser.
 */
interface PaymentProviderInterface
{
    public function getId(): string;

    public function isConfigured(): bool;

    /**
     * Initiates a payment transaction with the bank gateway for an authoritative server order.
     *
     * @return array{method: 'GET'|'POST', url: string, authority?: string, fields?: array<string, string>}
     */
    public function initiatePayment(string $orderId, int $amountToman, string $callbackUrl, string $mobile): array;

    /**
     * Verifies the transaction server-to-server upon bank callback.
     *
     * @param array<string, mixed> $callbackPayload
     * @return array{verified: bool, refId: string|null, message: string}
     */
    public function verifyCallback(int $expectedAmountToman, array $callbackPayload): array;
}
