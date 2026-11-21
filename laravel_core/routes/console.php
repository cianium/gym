<?php

declare(strict_types=1);

use App\Services\Installer\InstallerService;
use App\Services\Payments\PaymentService;
use App\Services\Notifications\BookingSmsOutbox;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// Shared-hosting-safe inventory release: execute `php artisan schedule:run`
// once per minute using the cPanel cron manager. Never expire payments with
// unresolved bank verification (verification_pending/processing).
Artisan::command('payments:expire-pending', function (): void {
    if (! app(InstallerService::class)->isInstalled()) {
        $this->comment('Skipping payment expiry: application has not been installed.');
        return;
    }

    $count = app(PaymentService::class)->expireStalePendingOrders(30);
    $this->info("Expired {$count} abandoned payment(s).");
})->purpose('Release inventory from abandoned, unverified checkout orders');

Schedule::command('payments:expire-pending')->everyFiveMinutes()->withoutOverlapping();

// Transactional outbox; requires cPanel cron running schedule:run once per minute.
Artisan::command('coaching:send-booking-sms', function (BookingSmsOutbox $outbox): void {
    if (! app(InstallerService::class)->isInstalled()) {
        $this->comment('Skipping SMS: application has not been installed.');
        return;
    }
    $result = $outbox->dispatch(10);
    $this->info(json_encode($result, JSON_UNESCAPED_UNICODE));
})->purpose('Process confirmed coaching consultation SMS outbox without duplicate retries');

Schedule::command('coaching:send-booking-sms')->everyFiveMinutes()->withoutOverlapping();
