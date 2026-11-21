<?php

declare(strict_types=1);

namespace App\Services\Notifications;

use Illuminate\Http\Client\Response;

/**
 * Shared-service template API: HTTP 2xx alone is NOT proof of acceptance.
 * Only a positive numeric recId is a confirmed provider acceptance receipt.
 * Rejections can be retried by an operator; ambiguous outcomes must not be
 * resent automatically (the SMS may already have been delivered).
 */
final class MeliPayamakReceipt
{
    /** @return array{state: 'accepted'|'rejected'|'unknown', receipt: ?string} */
    public static function classify(Response $response): array
    {
        $payload = $response->json();
        $rawReceipt = is_array($payload) ? ($payload['recId'] ?? null) : null;
        $receipt = (is_string($rawReceipt) || is_int($rawReceipt))
            ? trim((string) $rawReceipt)
            : '';

        if ($response->successful() && preg_match('/^[1-9][0-9]{0,29}$/D', $receipt)) {
            return ['state' => 'accepted', 'receipt' => $receipt];
        }

        // Client errors are explicit provider rejections. 2xx with no valid
        // receipt, 5xx and transport failures are ambiguous, not accepted.
        return [
            'state' => $response->clientError() ? 'rejected' : 'unknown',
            'receipt' => null,
        ];
    }
}
