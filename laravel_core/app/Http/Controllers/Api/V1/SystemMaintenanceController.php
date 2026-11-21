<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\ConsultationRequest;
use App\Models\DigitalEntitlement;
use App\Models\DiscountCode;
use App\Models\ExplorePost;
use App\Models\MediaFile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PageRevision;
use App\Models\PageSection;
use App\Models\PaymentEvent;
use App\Models\PaymentTransaction;
use App\Models\PostComment;
use App\Models\Product;
use App\Models\User;
use App\Models\TrainingPlan;
use App\Models\TrainingProgress;
use App\Models\CoachAppointmentSlot;
use App\Models\CoachConsultationBooking;
use App\Models\CoachMessage;
use App\Models\CoachSmsOutbox;
use App\Services\Maintenance\BackupVault;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class SystemMaintenanceController
{
    public const RELEASE_VERSION = '2.3.2';
    public const SCHEMA_VERSION = '2026_11_10_000002';
    // Retain the signed 2.2.0 payload envelope for backwards-compatible imports.
    public const BACKUP_FORMAT = 'white-label-fitness-backup-v2.2.0';

    public function status(): JsonResponse
    {
        $backupsDir = storage_path('app/backups');
        $snapshots = [];
        if (is_dir($backupsDir)) {
            foreach (scandir($backupsDir) ?: [] as $file) {
                if (str_ends_with($file, '.json') || str_ends_with($file, '.vault')) {
                    $full = $backupsDir . DIRECTORY_SEPARATOR . $file;
                    $snapshots[] = [
                        'filename' => $file,
                        'encrypted' => str_ends_with($file, '.vault'),
                        'sizeBytes' => (int) @filesize($full),
                        'createdAt' => date('c', (int) @filemtime($full)),
                    ];
                }
            }
        }

        return response()->json([
            'ok' => true,
            'releaseVersion' => self::RELEASE_VERSION,
            'schemaVersion' => self::SCHEMA_VERSION,
            'phpVersion' => PHP_VERSION,
            'compatible' => version_compare(PHP_VERSION, '8.3.0', '>='),
            'counts' => [
                'products' => Product::count(),
                'orders' => Order::count(),
                'entitlements' => DigitalEntitlement::count(),
                'posts' => ExplorePost::count(),
                'mediaFiles' => MediaFile::count(),
                'athletes' => User::where('role', 'athlete')->count(),
                'trainingPlans' => Schema::hasTable('training_plans') ? TrainingPlan::count() : 0,
                'consultationBookings' => Schema::hasTable('coach_consultation_bookings') ? CoachConsultationBooking::count() : 0,
                'smsUnknown' => Schema::hasTable('coach_sms_outbox') ? CoachSmsOutbox::where('state', 'unknown')->count() : 0,
            ],
            'snapshots' => $snapshots,
        ]);
    }

    public function exportBackup(Request $request): JsonResponse
    {
        // Backup bundles contain password hashes, TOTP secrets, remember tokens,
        // order access tokens, payment records and private files. Never return
        // this payload as plaintext, even to an authenticated administrator.
        try {
            $bundle = (new BackupVault())->encryptBundle($this->buildBackupBundle());
        } catch (RuntimeException) {
            return response()->json([
                'error' => 'کلید اختصاصی رمزگذاری بکاپ تنظیم نشده یا معتبر نیست.',
                'code' => 'BACKUP_ENCRYPTION_KEY_REQUIRED',
            ], 503);
        }

        AuditLog::create([
            'action' => 'ADMIN_BACKUP_EXPORTED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => 'خروجی رمزگذاری‌شده پشتیبان (دیتابیس + رسانه عمومی + فایل‌های خصوصی دیجیتال) تهیه شد.',
            'created_at' => now(),
        ]);

        return response()->json($bundle);
    }

    public function createPreUpgradeSnapshot(Request $request): JsonResponse
    {
        $backupsDir = storage_path('app/backups');
        $bundle = $this->buildBackupBundle();
        $filename = 'pre_upgrade_v' . self::RELEASE_VERSION . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.vault';
        try {
            (new BackupVault())->writeSnapshot($backupsDir, $filename, $bundle);
        } catch (RuntimeException) {
            return response()->json([
                'error' => 'ثبت بکاپ رمزگذاری‌شده ناموفق بود؛ کلید بکاپ و دسترسی ذخیره‌سازی را بررسی کنید.',
                'code' => 'SNAPSHOT_ENCRYPTED_WRITE_FAILED',
            ], 503);
        }

        AuditLog::create([
            'action' => 'ADMIN_PRE_UPGRADE_SNAPSHOT',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => "ایجاد نسخه پشتیبان امن پیش از ارتقا: {$filename}",
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'filename' => $filename,
            'sha256' => $bundle['sha256'],
            'createdAt' => $bundle['createdAt'],
            'encrypted' => true,
        ], 201);
    }

    public function restoreBackup(Request $request): JsonResponse
    {
        if (strlen($request->getContent()) > 134_217_728) {
            return response()->json([
                'error' => 'حجم فایل پشتیبان از سقف مجاز ۱۲۸ مگابایت بیشتر است.',
                'code' => 'BACKUP_TOO_LARGE',
            ], 413);
        }

        $payload = $request->all();
        $backup = isset($payload['backup']) && is_array($payload['backup'])
            ? $payload['backup']
            : $payload;
        if (($backup['format'] ?? null) === BackupVault::FORMAT) {
            try {
                $backup = (new BackupVault())->decryptBundle($backup);
            } catch (\Throwable) {
                return response()->json([
                    'error' => 'رمزگشایی یا اعتبارسنجی بکاپ رمزگذاری‌شده ناموفق بود.',
                    'code' => 'BACKUP_VAULT_INVALID',
                ], 422);
            }
        }

        $format = (string) ($backup['format'] ?? '');
        $version = (string) ($backup['releaseVersion'] ?? '');
        $data = $backup['data'] ?? null;

        if ($format !== self::BACKUP_FORMAT || ! in_array($version, ['2.2.0', '2.3.1', self::RELEASE_VERSION], true) || ! is_array($data)) {
            return response()->json([
                'error' => 'ساختار یا نسخه فایل پشتیبان معتبر یا سازگار نیست.',
                'code' => 'INVALID_BACKUP_FORMAT',
            ], 422);
        }

        $providedHash = trim((string) ($backup['sha256'] ?? ''));
        if (! preg_match('/^[a-f0-9]{64}$/', $providedHash)) {
            return response()->json([
                'error' => 'فایل پشتیبان فاقد checksum معتبر SHA-256 است.',
                'code' => 'BACKUP_CHECKSUM_REQUIRED',
            ], 422);
        }

        $encodedForHash = json_encode([
            'data' => $data,
            'files' => $backup['files'] ?? [],
        ], JSON_UNESCAPED_UNICODE);
        if (! is_string($encodedForHash) || ! hash_equals($providedHash, hash('sha256', $encodedForHash))) {
            return response()->json([
                'error' => 'Checksum فایل پشتیبان با محتوا مطابقت ندارد.',
                'code' => 'BACKUP_CHECKSUM_MISMATCH',
            ], 422);
        }

        $providedSignature = trim((string) ($backup['signature'] ?? ''));
        if (! preg_match('/^[a-f0-9]{64}$/', $providedSignature)) {
            return response()->json([
                'error' => 'فایل پشتیبان فاقد امضای معتبر سرور است.',
                'code' => 'BACKUP_SIGNATURE_REQUIRED',
            ], 422);
        }
        if (! hash_equals($providedSignature, $this->signBackupPayload($encodedForHash))) {
            return response()->json([
                'error' => 'امضای فایل پشتیبان با این نصب مطابقت ندارد یا محتوا دست‌کاری شده است.',
                'code' => 'BACKUP_SIGNATURE_MISMATCH',
            ], 422);
        }

        // Fail closed BEFORE any data mutation if we cannot make an encrypted,
        // authenticated rollback snapshot of the current state.
        $backupsDir = storage_path('app/backups');
        $preRestoreFile = 'pre_restore_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.vault';
        try {
            (new BackupVault())->writeSnapshot($backupsDir, $preRestoreFile, $this->buildBackupBundle());
        } catch (\Throwable) {
            return response()->json([
                'error' => 'پیش از بازیابی، تهیه بکاپ رمزگذاری‌شده ممکن نبود؛ هیچ داده‌ای تغییر نکرد.',
                'code' => 'PRE_RESTORE_ENCRYPTED_SNAPSHOT_FAILED',
            ], 503);
        }

        try {
            $decodedPublicMedia = $this->decodeBackupFiles($backup['files']['publicMedia'] ?? [], 'public media');
            $decodedPrivateDownloads = $this->decodeBackupFiles($backup['files']['privateDownloads'] ?? [], 'private download');
        } catch (RuntimeException) {
            return response()->json([
                'error' => 'یکی از فایل‌های ضمیمه backup نامعتبر یا مخدوش است.',
                'code' => 'BACKUP_FILE_VALIDATION_FAILED',
            ], 422);
        }

        try {
            DB::transaction(function () use ($data, $decodedPublicMedia, $decodedPrivateDownloads) {
                if (! empty($data['brandSettings']) && is_array($data['brandSettings'])) {
                $bs = $data['brandSettings'];
                BrandSetting::updateOrCreate(
                    ['id' => $bs['id'] ?? 1],
                    collect($bs)->except(['id', 'created_at', 'updated_at'])->toArray()
                );
            }

            if (! empty($data['coachProfile']) && is_array($data['coachProfile'])) {
                $cp = $data['coachProfile'];
                CoachProfile::updateOrCreate(
                    ['id' => $cp['id'] ?? 1],
                    collect($cp)->except(['id', 'created_at', 'updated_at'])->toArray()
                );
            }

            // The 2.2.0 snapshot never backed up users and coaching records.
            // Version 2.3.0 restores them ahead of dependent plans/appointments.
            // Sessions and short-lived OTP challenges are deliberately NOT restored.
            foreach (($data['users'] ?? []) as $userData) {
                if (! is_array($userData) || ! isset($userData['id'])) continue;
                User::unguarded(static function () use ($userData): void {
                    User::updateOrCreate(['id' => (int) $userData['id']],
                        collect($userData)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }

            foreach (($data['trainingPlans'] ?? []) as $plan) {
                if (! is_array($plan) || ! isset($plan['id'])) continue;
                TrainingPlan::unguarded(static function () use ($plan): void {
                    TrainingPlan::updateOrCreate(['id' => (int) $plan['id']],
                        collect($plan)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }
            foreach (($data['trainingProgress'] ?? []) as $progress) {
                if (! is_array($progress) || ! isset($progress['id'])) continue;
                TrainingProgress::unguarded(static function () use ($progress): void {
                    TrainingProgress::updateOrCreate(['id' => (int) $progress['id']],
                        collect($progress)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }
            foreach (($data['consultationSlots'] ?? []) as $slot) {
                if (! is_array($slot) || ! isset($slot['id'])) continue;
                CoachAppointmentSlot::unguarded(static function () use ($slot): void {
                    CoachAppointmentSlot::updateOrCreate(['id' => (int) $slot['id']],
                        collect($slot)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }
            foreach (($data['consultationBookings'] ?? []) as $booking) {
                if (! is_array($booking) || ! isset($booking['id'])) continue;
                CoachConsultationBooking::unguarded(static function () use ($booking): void {
                    CoachConsultationBooking::updateOrCreate(['id' => (int) $booking['id']],
                        collect($booking)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }
            foreach (($data['coachMessages'] ?? []) as $message) {
                if (! is_array($message) || ! isset($message['id'])) continue;
                CoachMessage::unguarded(static function () use ($message): void {
                    CoachMessage::updateOrCreate(['id' => (int) $message['id']],
                        collect($message)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }
            foreach (($data['coachSmsOutbox'] ?? []) as $sms) {
                if (! is_array($sms) || ! isset($sms['id'])) continue;
                // Never automatically re-send an SMS after restoring an older snapshot.
                if (in_array($sms['state'] ?? '', ['queued', 'sending'], true)) {
                    $sms['state'] = 'unknown';
                    $sms['last_error_code'] = 'restored_requires_manual_reconciliation';
                    $sms['lease_until'] = null;
                }
                CoachSmsOutbox::unguarded(static function () use ($sms): void {
                    CoachSmsOutbox::updateOrCreate(['id' => (int) $sms['id']],
                        collect($sms)->except(['id', 'created_at', 'updated_at'])->toArray());
                });
            }

            foreach (($data['pageSections'] ?? []) as $sec) {
                if (! empty($sec['id'])) {
                    PageSection::updateOrCreate(
                        ['id' => (string) $sec['id']],
                        collect($sec)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['products'] ?? []) as $prod) {
                if (! empty($prod['id'])) {
                    Product::updateOrCreate(
                        ['id' => (string) $prod['id']],
                        collect($prod)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['explorePosts'] ?? []) as $post) {
                if (! empty($post['id'])) {
                    ExplorePost::updateOrCreate(
                        ['id' => (string) $post['id']],
                        collect($post)->except(['id', 'comments', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['postComments'] ?? []) as $cmt) {
                if (! empty($cmt['id'])) {
                    PostComment::updateOrCreate(
                        ['id' => (string) $cmt['id']],
                        collect($cmt)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            // Non-destructively restore customer orders, order items, transactions, and digital entitlements
            foreach (($data['orders'] ?? []) as $ord) {
                if (! empty($ord['id'])) {
                    Order::updateOrCreate(
                        ['id' => (string) $ord['id']],
                        collect($ord)->except(['id', 'items', 'entitlements', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['orderItems'] ?? []) as $item) {
                if (! empty($item['order_id']) && ! empty($item['product_id'])) {
                    OrderItem::updateOrCreate(
                        [
                            'order_id' => (string) $item['order_id'],
                            'product_id' => (string) $item['product_id'],
                        ],
                        collect($item)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['digitalEntitlements'] ?? []) as $ent) {
                if (! empty($ent['token'])) {
                    DigitalEntitlement::updateOrCreate(
                        ['token' => (string) $ent['token']],
                        collect($ent)->except(['token', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['paymentTransactions'] ?? []) as $tx) {
                if (! empty($tx['order_id']) && ! empty($tx['authority_or_token'])) {
                    PaymentTransaction::updateOrCreate(
                        [
                            'order_id' => (string) $tx['order_id'],
                            'authority_or_token' => (string) $tx['authority_or_token'],
                        ],
                        collect($tx)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['paymentEvents'] ?? []) as $evt) {
                if (! empty($evt['id'])) {
                    PaymentEvent::updateOrCreate(
                        ['id' => (int) $evt['id']],
                        collect($evt)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['discountCodes'] ?? []) as $disc) {
                if (! empty($disc['code'])) {
                    DiscountCode::updateOrCreate(
                        ['code' => (string) $disc['code']],
                        collect($disc)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['consultationRequests'] ?? []) as $cons) {
                if (! empty($cons['id'])) {
                    ConsultationRequest::updateOrCreate(
                        ['id' => (string) $cons['id']],
                        collect($cons)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['pageRevisions'] ?? []) as $rev) {
                if (! empty($rev['id'])) {
                    PageRevision::updateOrCreate(
                        ['id' => (string) $rev['id']],
                        collect($rev)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

            foreach (($data['mediaFiles'] ?? []) as $mf) {
                if (! empty($mf['id'])) {
                    MediaFile::updateOrCreate(
                        ['id' => (string) $mf['id']],
                        collect($mf)->except(['id', 'created_at', 'updated_at'])->toArray()
                    );
                }
            }

                foreach ($decodedPublicMedia as $name => $contents) {
                    if (! Storage::disk('public')->put('media/' . $name, $contents)) {
                        throw new RuntimeException("RESTORE_PUBLIC_MEDIA_WRITE_FAILED: {$name}");
                    }
                }

                foreach ($decodedPrivateDownloads as $name => $contents) {
                    if (! Storage::disk('private_downloads')->put($name, $contents)) {
                        throw new RuntimeException("RESTORE_PRIVATE_FILE_WRITE_FAILED: {$name}");
                    }
                }
            });
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'error' => 'بازیابی کامل نشد و تغییرات دیتابیس بازگردانده شد. snapshot پیش از بازیابی حفظ شده است.',
                'code' => 'BACKUP_RESTORE_FAILED',
                'preRestoreSnapshot' => basename($preRestoreFile),
            ], 500);
        }

        AuditLog::create([
            'action' => 'ADMIN_BACKUP_RESTORED',
            'actor' => (string) ($request->user()?->email ?? 'admin'),
            'ip_address' => (string) $request->ip(),
            'details' => 'بازیابی کامل و غیرمخرب دیتابیس، تنظیمات برند، سفارش‌ها و فایل‌های خصوصی انجام شد.',
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'restoredVersion' => $version,
            'preRestoreSnapshot' => basename($preRestoreFile),
        ]);
    }

    /** @return array<string, string> */
    private function decodeBackupFiles(mixed $items, string $label): array
    {
        if (! is_array($items) || count($items) > 2_000) {
            throw new RuntimeException("INVALID_BACKUP_FILE_LIST: {$label}");
        }

        $decodedFiles = [];
        foreach ($items as $item) {
            if (! is_array($item)) {
                throw new RuntimeException("INVALID_BACKUP_FILE_ENTRY: {$label}");
            }
            $originalName = (string) ($item['filename'] ?? '');
            $name = basename($originalName);
            $b64 = (string) ($item['contentBase64'] ?? '');
            $expectedHash = trim((string) ($item['sha256'] ?? ''));
            if ($name === '' || $name !== $originalName || $b64 === '' || ! preg_match('/^[a-f0-9]{64}$/', $expectedHash)) {
                throw new RuntimeException("INVALID_BACKUP_FILE_METADATA: {$label}");
            }
            $decoded = base64_decode($b64, true);
            if ($decoded === false || ! hash_equals($expectedHash, hash('sha256', $decoded))) {
                throw new RuntimeException("BACKUP_FILE_CHECKSUM_MISMATCH: {$name}");
            }
            $decodedFiles[$name] = $decoded;
        }

        return $decodedFiles;
    }

    private function buildBackupBundle(): array
    {
        $brand = BrandSetting::first();
        $coach = CoachProfile::first();

        $data = [
            'brandSettings' => $brand ? $brand->toArray() : null,
            // Signed backups contain credential hashes and personally identifying
            // data: encrypt downloaded JSON using a trusted encrypted vault.
            'users' => User::all()->makeVisible(['password', 'totp_secret', 'remember_token'])->toArray(),
            'trainingPlans' => Schema::hasTable('training_plans') ? TrainingPlan::all()->toArray() : [],
            'trainingProgress' => Schema::hasTable('training_progress') ? TrainingProgress::all()->toArray() : [],
            'consultationSlots' => Schema::hasTable('coach_appointment_slots') ? CoachAppointmentSlot::all()->toArray() : [],
            'consultationBookings' => Schema::hasTable('coach_consultation_bookings') ? CoachConsultationBooking::all()->toArray() : [],
            'coachMessages' => Schema::hasTable('coach_messages') ? CoachMessage::all()->toArray() : [],
            'coachSmsOutbox' => Schema::hasTable('coach_sms_outbox') ? CoachSmsOutbox::all()->toArray() : [],
            'coachProfile' => $coach ? $coach->toArray() : null,
            'pageSections' => PageSection::orderBy('sort_order')->get()->toArray(),
            'products' => Product::all()->toArray(),
            'explorePosts' => ExplorePost::all()->toArray(),
            'postComments' => PostComment::all()->toArray(),
            'orders' => Order::all()->makeVisible(['access_token'])->toArray(),
            'orderItems' => OrderItem::all()->toArray(),
            'paymentTransactions' => PaymentTransaction::all()->toArray(),
            'paymentEvents' => PaymentEvent::all()->toArray(),
            'digitalEntitlements' => DigitalEntitlement::all()->toArray(),
            'discountCodes' => DiscountCode::all()->toArray(),
            'consultationRequests' => ConsultationRequest::all()->toArray(),
            'pageRevisions' => PageRevision::all()->toArray(),
            'mediaFiles' => MediaFile::all()->toArray(),
        ];

        $publicMedia = [];
        foreach (Storage::disk('public')->files('media') as $relPath) {
            $raw = Storage::disk('public')->get($relPath);
            if ($raw !== null) {
                $publicMedia[] = [
                    'filename' => basename($relPath),
                    'sha256' => hash('sha256', $raw),
                    'contentBase64' => base64_encode($raw),
                ];
            }
        }

        $privateDownloads = [];
        foreach (Storage::disk('private_downloads')->files() as $relPath) {
            $name = basename($relPath);
            if (str_starts_with($name, '.')) {
                continue;
            }
            $raw = Storage::disk('private_downloads')->get($relPath);
            if ($raw !== null) {
                $privateDownloads[] = [
                    'filename' => $name,
                    'sha256' => hash('sha256', $raw),
                    'contentBase64' => base64_encode($raw),
                ];
            }
        }

        $files = [
            'publicMedia' => $publicMedia,
            'privateDownloads' => $privateDownloads,
        ];

        $encodedPayload = json_encode([
            'data' => $data,
            'files' => $files,
        ], JSON_UNESCAPED_UNICODE);
        if (! is_string($encodedPayload)) {
            throw new RuntimeException('BACKUP_ENCODING_FAILED');
        }

        $sha256 = hash('sha256', $encodedPayload);
        $signature = $this->signBackupPayload($encodedPayload);

        return [
            'format' => self::BACKUP_FORMAT,
            'releaseVersion' => self::RELEASE_VERSION,
            'schemaVersion' => self::SCHEMA_VERSION,
            'createdAt' => now()->toIso8601String(),
            'sha256' => $sha256,
            'signature' => $signature,
            'data' => $data,
            'files' => $files,
        ];
    }

    private function signBackupPayload(string $encodedPayload): string
    {
        $key = (string) config('app.key');
        if ($key === '') {
            throw new RuntimeException('BACKUP_SIGNING_KEY_MISSING');
        }

        return hash_hmac('sha256', $encodedPayload, $key);
    }
}
