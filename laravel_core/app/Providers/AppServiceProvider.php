<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Order;
use App\Policies\AdminPolicy;
use App\Policies\OrderPolicy;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentService;
use App\Services\Payments\SepGateway;
use App\Services\Payments\ZarinpalGateway;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ZarinpalGateway::class, function () {
            return new ZarinpalGateway(
                (string) config('services.zarinpal.merchant_id', ''),
                (bool) config('services.zarinpal.sandbox', false)
            );
        });

        $this->app->singleton(SepGateway::class, function () {
            return new SepGateway(
                (string) config('services.sep.terminal_id', ''),
                (bool) config('services.sep.sandbox', false)
            );
        });

        $this->app->singleton(PaymentService::class, function ($app) {
            return new PaymentService(
                $app->make(ZarinpalGateway::class),
                $app->make(SepGateway::class)
            );
        });

        $this->app->alias(PaymentService::class, PaymentGatewayManager::class);
    }

    public function boot(): void
    {
        Gate::policy(Order::class, OrderPolicy::class);
        Gate::define('manage-platform', [AdminPolicy::class, 'managePlatform']);
    }
}
