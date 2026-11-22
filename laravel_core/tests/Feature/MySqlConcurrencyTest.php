<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\CoachScheduleController;
use App\Models\CoachAppointmentSlot;
use App\Models\CoachConsultationBooking;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Product;
use App\Models\User;
use App\Services\Payments\PaymentService;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Two genuinely independent MySQL connections, created in separate processes.
 * NEVER run this against a live database: DatabaseMigrations performs migrate:fresh.
 * Must be invoked through tests/run_mysql_staging_suite.sh against a disposable DB.
 */
class MySqlConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    protected function setUp(): void
    {
        // Block the destructive migration setup BEFORE parent::setUp() is reached.
        $db = (string) getenv('DB_DATABASE');
        if (getenv('DB_CONNECTION') !== 'mysql' || ! preg_match('/(?:^test_|_test(?:_|$)|^arash_staging_test$)/i', $db)) {
            $this->markTestSkipped('Separate MySQL database explicitly named test_* or *_test is required.');
        }
        if (! extension_loaded('pcntl') || ! extension_loaded('pdo_mysql')) {
            $this->markTestSkipped('pcntl and pdo_mysql are required for real MySQL parallel requests.');
        }
        parent::setUp();
    }

    private function user(string $role, string $phone, bool $verified = false): User
    {
        $user = User::create([
            'name' => 'Concurrency ' . $role, 'phone' => $phone,
            'role' => $role, 'password' => 'StrongTestPassword!123',
        ]);
        if ($verified) $user->forceFill(['phone_verified_at' => now()])->save();
        return $user;
    }

    /**
     * Spawn exactly two concurrent, isolated PHP processes. Each child drops
     * its inherited PDO connection and reconnects after fork.
     */
    private function race(array $identifiers, callable $callback): array
    {
        $base = sys_get_temp_dir() . '/arash-mysql-race-' . bin2hex(random_bytes(8));
        $children = [];
        try {
            foreach ($identifiers as $index => $identifier) {
                $pid = pcntl_fork();
                if ($pid === -1) throw new \RuntimeException('pcntl_fork failed');
                if ($pid === 0) {
                    try {
                        DB::purge(config('database.default'));
                        for ($counter = 0; $counter < 500 && ! is_file($base . '.start'); $counter++) {
                            usleep(10000);
                        }
                        if (! is_file($base . '.start')) throw new \RuntimeException('race barrier timeout');
                        $result = $callback($identifier);
                        file_put_contents($base . '.' . $index, json_encode(['status' => $result]));
                        exit(0);
                    } catch (\Throwable $e) {
                        file_put_contents($base . '.' . $index, json_encode([
                            'status' => 0, 'error' => get_class($e) . ': ' . $e->getMessage(),
                        ]));
                        exit(1);
                    }
                }
                $children[] = $pid;
            }
            file_put_contents($base . '.start', 'now');
            foreach ($children as $pid) pcntl_waitpid($pid, $status);
            $results = [];
            foreach (array_keys($identifiers) as $index) {
                $results[] = json_decode((string) @file_get_contents($base . '.' . $index), true);
            }
            return $results;
        } finally {
            foreach (array_keys($identifiers) as $index) @unlink($base . '.' . $index);
            @unlink($base . '.start');
        }
    }

    public function test_two_athletes_cannot_reserve_the_same_slot_simultaneously(): void
    {
        $admin = $this->user('admin', '09120010000');
        $first = $this->user('athlete', '09120010001', true);
        $second = $this->user('athlete', '09120010002', true);
        $slot = CoachAppointmentSlot::create([
            'created_by' => $admin->id, 'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHour(), 'is_active' => true,
        ]);

        $responses = $this->race([$first->id, $second->id], static function (int $athleteId) use ($slot) {
            $request = Request::create('/api/v1/athlete/consultations/bookings', 'POST', ['slot_id' => $slot->id]);
            $request->setUserResolver(static fn () => User::findOrFail($athleteId));
            return app(CoachScheduleController::class)->book($request)->getStatusCode();
        });
        $statuses = array_column($responses, 'status');
        sort($statuses);
        $this->assertSame([201, 409], $statuses, json_encode($responses));
        $this->assertSame(1, CoachConsultationBooking::where('active_slot_id', $slot->id)->count());
    }

    public function test_concurrent_duplicate_checkout_creates_only_one_order_and_one_gateway_transaction(): void
    {
        $athlete = $this->user('athlete', '09120010001', true);
        Product::create([
            'id' => 'parallel-physical', 'type' => 'physical',
            'title' => 'One idempotent purchase', 'price_toman' => 150000,
            'description' => '',
            'status' => 'published', 'stock' => 5, 'reserved_stock' => 0,
        ]);
        $key = 'shared-random-checkout-key-' . bin2hex(random_bytes(12));
        $responses = $this->race([$athlete->id, $athlete->id], static function (int $athleteId) use ($key) {
            config()->set('services.zarinpal.merchant_id', str_repeat('A', 36));
            Http::fake(['https://payment.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'TEST_PARALLEL_BANK_AUTHORITY'],
            ], 200)]);
            $request = Request::create('/api/v1/athlete/checkout', 'POST', [
                'gateway' => 'zarinpal', 'idempotencyKey' => $key,
                'customer' => ['name' => 'Parallel buyer', 'phone' => '09120010001', 'address' => 'Test city, street 123'],
                'items' => [['productId' => 'parallel-physical', 'qty' => 1]],
            ]);
            $request->setUserResolver(static fn () => User::findOrFail($athleteId));
            return app(CheckoutController::class)->store($request, app(PaymentService::class))->getStatusCode();
        });
        $this->assertContains(201, array_column($responses, 'status'), json_encode($responses));
        foreach ($responses as $response) {
            $this->assertContains($response['status'], [201, 409], json_encode($responses));
        }
        $this->assertSame(1, Order::count());
        $this->assertSame(1, PaymentTransaction::count());
        $this->assertSame(1, (int) Product::whereKey('parallel-physical')->value('reserved_stock'));
    }
}
