<?php

declare(strict_types=1);

return [
    'fitness' => [
        'require_verified_checkout' => true,
        'require_idempotency_key' => true,
        'backup_encryption_key' => env('BACKUP_ENCRYPTION_KEY', ''),
    ],
    'athlete_sms' => [
        'token' => env('ATHLETE_MELIPAYAMAK_TOKEN'),
        'body_id' => env('ATHLETE_MELIPAYAMAK_BODY_ID'),
    ],
    'booking_sms' => [
        'token' => env('BOOKING_MELIPAYAMAK_TOKEN'),
        'body_id' => env('BOOKING_MELIPAYAMAK_BODY_ID'),
        'coach_phone' => env('COACH_NOTIFICATION_PHONE'),
    ],
    'zarinpal' => [
        'merchant_id' => env('ZARINPAL_MERCHANT_ID', ''),
        'sandbox' => (bool) env('PAYMENT_SANDBOX', false),
        'request_url' => 'https://payment.zarinpal.com/pg/v4/payment/request.json',
        'verify_url' => 'https://payment.zarinpal.com/pg/v4/payment/verify.json',
        'startpay_url' => 'https://payment.zarinpal.com/pg/StartPay/',
    ],

    'sep' => [
        'terminal_id' => env('SEP_TERMINAL_ID', ''),
        'sandbox' => (bool) env('PAYMENT_SANDBOX', false),
        'token_url' => 'https://sep.shaparak.ir/onlinepg/onlinepg',
        'verify_url' => 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction',
    ],
];
