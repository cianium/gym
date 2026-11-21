<?php

declare(strict_types=1);

namespace App\Services\Payments;

/**
 * Unified PaymentGatewayManager contract aliasing PaymentService
 * so any controller or service injecting either class shares the exact same
 * singleton instance, gateway drivers, and accounting methods.
 */
class PaymentGatewayManager extends PaymentService
{
}
