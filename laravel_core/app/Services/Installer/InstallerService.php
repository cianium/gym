<?php

declare(strict_types=1);

namespace App\Services\Installer;

use App\Models\AuditLog;
use App\Models\BrandSetting;
use App\Models\CoachProfile;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class InstallerService
{
    private const FORBIDDEN_PASSWORDS = [
        'coach@1403',
        '12345678',
        'password',
        'admin123',
        'admin1234',
        'qwerty123',
    ];

    public function isInstalled(): bool
    {
        return file_exists(storage_path('installed.lock'));
    }

    public function isDocumentRootSafe(?string $explicitDocRoot = null): bool
    {
        $publicRoot = realpath(public_path()) ?: public_path();
        $storageRoot = realpath(storage_path()) ?: storage_path();
        $baseRoot = realpath(base_path()) ?: base_path();
        $envPath = $baseRoot . DIRECTORY_SEPARATOR . '.env';

        if (str_starts_with($storageRoot, $publicRoot . DIRECTORY_SEPARATOR) || $storageRoot === $publicRoot) {
            return false;
        }

        if (str_starts_with($envPath, $publicRoot . DIRECTORY_SEPARATOR)) {
            return false;
        }

        $serverDocRoot = $explicitDocRoot ?? ($_SERVER['DOCUMENT_ROOT'] ?? '');
        if (is_string($serverDocRoot) && trim($serverDocRoot) !== '') {
            $realDocRoot = realpath($serverDocRoot) ?: rtrim($serverDocRoot, '/\\');
            if ($realDocRoot !== '') {
                if (str_starts_with($storageRoot, $realDocRoot . DIRECTORY_SEPARATOR) || $storageRoot === $realDocRoot) {
                    return false;
                }
                if (str_starts_with($envPath, $realDocRoot . DIRECTORY_SEPARATOR) || $baseRoot === $realDocRoot) {
                    return false;
                }
            }
        }

        return true;
    }

    public function ensureRequiredDirectories(): void
    {
        $directories = [
            storage_path('app/private_downloads'),
            storage_path('app/public/media'),
            storage_path('app/backups'),
            storage_path('database'),
            storage_path('framework/cache'),
            storage_path('framework/cache/data'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            storage_path('logs'),
        ];

        foreach ($directories as $dir) {
            if (! is_dir($dir) && ! @mkdir($dir, 0750, true) && ! is_dir($dir)) {
                throw new RuntimeException("امکان ایجاد دایرکتوری ضروری «{$dir}» وجود ندارد.");
            }
            if (! is_writable($dir)) {
                throw new RuntimeException("دایرکتوری «{$dir}» قابل نوشتن (Writable) نیست.");
            }
        }

        $htaccessPath = storage_path('.htaccess');
        if (! file_exists($htaccessPath)) {
            @file_put_contents($htaccessPath, "Order deny,allow\nDeny from all\n");
        }
    }

    public function getConfiguredSetupToken(): string
    {
        $tokenFile = storage_path('installer_setup.token');
        if (file_exists($tokenFile)) {
            $fromFile = trim((string) @file_get_contents($tokenFile));
            if ($fromFile !== '') {
                return $fromFile;
            }
        }

        return trim((string) config('app.installer_setup_token', env('INSTALLER_SETUP_TOKEN', '')));
    }

    public function isSetupTokenRequired(): bool
    {
        return $this->getConfiguredSetupToken() !== '' || app()->environment('production');
    }

    private const REQUIRED_EXTENSIONS = [
        'ctype',
        'curl',
        'fileinfo',
        'filter',
        'hash',
        'json',
        'mbstring',
        'openssl',
        'pdo',
        'session',
        'tokenizer',
        'xml',
    ];

    public function getMissingExtensions(): array
    {
        $missing = [];
        foreach (self::REQUIRED_EXTENSIONS as $ext) {
            if (! extension_loaded($ext)) {
                $missing[] = $ext;
            }
        }
        return $missing;
    }

    public function getDiagnostics(?string $explicitDocRoot = null): array
    {
        $storageOutsidePublic = $this->isDocumentRootSafe($explicitDocRoot);
        $storageRoot = storage_path();
        $missingExtensions = $this->getMissingExtensions();

        return [
            'installed' => $this->isInstalled(),
            'lockFileExists' => $this->isInstalled(),
            'version' => \App\Http\Controllers\Api\V1\SystemMaintenanceController::RELEASE_VERSION,
            'requiredPhpVersion' => '8.3.0',
            'environment' => app()->environment(),
            'setupTokenRequired' => $this->isSetupTokenRequired(),
            'missingExtensions' => $missingExtensions,
            'checks' => [
                'phpVersionOk' => version_compare(PHP_VERSION, '8.3.0', '>='),
                'requiredExtensionsLoaded' => count($missingExtensions) === 0,
                'pdoMysqlLoaded' => extension_loaded('pdo_mysql') || extension_loaded('pdo_sqlite'),
                'storageOutsideWebRoot' => $storageOutsidePublic,
                'storageWritable' => is_dir($storageRoot) && is_writable($storageRoot),
                'privateDownloadsProtected' => is_dir(storage_path('app/private_downloads')) || is_writable($storageRoot),
                'appKeyGenerated' => str_starts_with((string) config('app.key'), 'base64:'),
                'adminProvisioned' => $this->hasAdminAccount(),
            ],
        ];
    }

    private function hasAdminAccount(): bool
    {
        try {
            return User::where('role', 'admin')->exists();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Authoritative Unified Installation Workflow (v2.2.0 — Section 6):
     * 1. Verify the setup secret.
     * 2. Verify PHP 8.3+ and required extensions.
     * 3. Verify hosting permissions & writable directories.
     * 4. Verify safe document root configuration (rejects when core/.env/storage are inside public web root).
     * 5. Configure MySQL connection securely & test live PDO handshake.
     * 6. Generate a cryptographic application key (APP_KEY).
     * 7. Create the .env environment configuration (0600).
     * 8. Execute database migrations.
     * 9. Create the owner account.
     * 10. Initialize brand-neutral settings.
     * 11. Verify application health (tables, owner, brand, key).
     * 12. Lock the installer after successful installation.
     * 13. Prevent unauthorized reinstallation.
     */
    public function executeInstallation(array $payload, string $ipAddress, ?string $explicitDocRoot = null): array
    {
        if (version_compare(PHP_VERSION, '8.3.0', '<')) {
            throw new RuntimeException('UNSUPPORTED_PHP_VERSION: این پلتفرم نیازمند PHP 8.3.0 یا بالاتر است.');
        }

        $missingExtensions = $this->getMissingExtensions();
        if (count($missingExtensions) > 0) {
            throw new RuntimeException('MISSING_PHP_EXTENSIONS: اکستنشن‌های ضروری PHP روی هاست فعال نیستند: ' . implode(', ', $missingExtensions));
        }

        if ($this->isInstalled()) {
            throw new RuntimeException('ALREADY_INSTALLED: نصب پلتفرم قبلاً تکمیل و قفل شده است (storage/installed.lock).');
        }

        // Verify pre-provisioned Setup Secret Token before allowing web installation
        $expectedSetupToken = $this->getConfiguredSetupToken();
        $providedSetupToken = trim((string) ($payload['setupToken'] ?? ''));
        if ($expectedSetupToken !== '' || app()->environment('production')) {
            if ($expectedSetupToken === '' || $providedSetupToken === '' || ! hash_equals($expectedSetupToken, $providedSetupToken)) {
                throw new RuntimeException('INVALID_INSTALLER_SETUP_TOKEN: توکن امنیتی نصب اولیه (Setup Secret Token) نامعتبر است یا ارسال نشده است.');
            }
        }

        if (! $this->isDocumentRootSafe($explicitDocRoot)) {
            throw new RuntimeException('UNSAFE_DOCUMENT_ROOT: پیکربندی مسیرهای هاست ناامن است. هسته لاراول، پوشه storage، فایل‌های خصوصی و فایل .env باید خارج از DOCUMENT_ROOT (public_html) قرار گیرند.');
        }

        $this->ensureRequiredDirectories();

        $adminPassword = (string) ($payload['adminPassword'] ?? '');
        if (strlen(trim($adminPassword)) < 8 || in_array(strtolower(trim($adminPassword)), self::FORBIDDEN_PASSWORDS, true)) {
            throw new RuntimeException('WEAK_ADMIN_PASSWORD: رمز عبور مالک باید حداقل ۸ کاراکتر و غیرقابل حدس باشد.');
        }

        $adminEmail = strtolower(trim((string) ($payload['adminEmail'] ?? '')));
        if (! filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('INVALID_ADMIN_EMAIL: آدرس ایمیل مالک معتبر نیست.');
        }

        $adminUsername = strtolower(trim((string) ($payload['adminUsername'] ?? 'admin')));
        $brandName = trim((string) ($payload['brandName'] ?? ''));
        $coachName = trim((string) ($payload['coachName'] ?? ''));

        if ($brandName === '' || $coachName === '') {
            throw new RuntimeException('نام برند و نام مربی الزامی است.');
        }

        // Apply supplied DB configuration dynamically if provided
        $connection = (string) ($payload['dbConnection'] ?? config('database.default', 'mysql'));
        if ($connection === 'sqlite' && ! empty($payload['dbName'])) {
            config([
                'database.default' => 'sqlite',
                'database.connections.sqlite.database' => (string) $payload['dbName'],
            ]);
            DB::purge('sqlite');
        } elseif (! empty($payload['dbName']) && ! empty($payload['dbUser'])) {
            config([
                'database.default' => 'mysql',
                'database.connections.mysql.host' => (string) ($payload['dbHost'] ?? '127.0.0.1'),
                'database.connections.mysql.port' => (string) ($payload['dbPort'] ?? '3306'),
                'database.connections.mysql.database' => (string) $payload['dbName'],
                'database.connections.mysql.username' => (string) $payload['dbUser'],
                'database.connections.mysql.password' => (string) ($payload['dbPass'] ?? ''),
            ]);
            DB::purge('mysql');
        }

        // Verify database connectivity before mutating state
        DB::connection()->getPdo();

        // Re-running a partially completed installation must never silently
        // rotate APP_KEY: signed tokens, encrypted data and previous sessions
        // may depend on the original value.
        $configuredAppKey = $this->readExistingEnvironmentValue('APP_KEY')
            ?: (string) config('app.key');
        $decodedKey = str_starts_with($configuredAppKey, 'base64:')
            ? base64_decode(substr($configuredAppKey, 7), true)
            : false;
        if ($this->readExistingEnvironmentValue('APP_KEY') !== null
            && (! is_string($decodedKey) || strlen($decodedKey) !== 32)) {
            throw new RuntimeException('APP_KEY_INVALID: کلید برنامه موجود معتبر نیست و نباید خودکار تعویض شود.');
        }
        $appKey = is_string($decodedKey) && strlen($decodedKey) === 32
            ? $configuredAppKey
            : 'base64:' . base64_encode(random_bytes(32));
        config(['app.key' => $appKey]);

        // Persist .env outside public root Fail-Closed (throws RuntimeException if write/chmod fails)
        $this->persistEnvironmentFile($payload, $appKey, $brandName);

        // Execute actual Laravel migrations
        Artisan::call('migrate', ['--force' => true]);

        $result = DB::transaction(function () use ($payload, $ipAddress, $adminUsername, $adminEmail, $adminPassword, $brandName, $coachName, $appKey) {
            User::where('role', 'admin')->delete();

            $owner = User::create([
                'name' => $coachName,
                'username' => $adminUsername,
                'phone' => (string) ($payload['adminPhone'] ?? '09120000000'),
                'email' => $adminEmail,
                'password' => Hash::make($adminPassword),
                'role' => 'admin',
                'must_change_password' => false,
            ]);

            BrandSetting::query()->delete();
            $brand = BrandSetting::create([
                'brand_name' => $brandName,
                'brand_subtitle' => $payload['brandSubtitle'] ?? 'پلتفرم رسمی مربیگری و برنامه‌های تمرینی',
                'seo_title' => $brandName . ' | پلتفرم رسمی مربیگری',
                'seo_description' => $payload['brandSubtitle'] ?? '',
                'canonical_domain' => $payload['canonicalDomain'] ?? 'https://coach-domain.ir',
                'footer_copyright' => 'تمامی حقوق برای ' . $brandName . ' محفوظ است.',
                'shipping_flat_rate_toman' => 85000,
                'free_shipping_threshold_toman' => 3000000,
                'theme_tokens' => [
                    'primaryColor' => '#C8A66A',
                    'secondaryColor' => '#D6B77D',
                    'presetName' => 'طلایی کلاسیک (Classic Gold)',
                ],
                'site_modules' => [
                    'digitalPrograms' => true,
                    'physicalShop' => true,
                    'exploreReels' => true,
                    'coachingRequests' => true,
                    'nfcSmartCard' => true,
                    'commentsModeration' => true,
                    'discounts' => true,
                ],
            ]);

            CoachProfile::query()->delete();
            CoachProfile::create([
                'name' => $coachName,
                'english_name' => 'Official Coach',
                'title' => 'مربی تخصصی بدنسازی و عملکرد ورزشی',
                'tagline' => $payload['brandSubtitle'] ?? '',
                'bio' => 'پلتفرم اختصاصی طراحی تمرین و تجهیزات ورزشی.',
                'specialties' => ['هایپرتروفی', 'قدرت', 'تغذیه ورزشی'],
                'experience_years' => 10,
                'active_athletes' => 0,
                'programs_delivered' => 0,
                'certifications' => [],
            ]);

            AuditLog::create([
                'action' => 'SYSTEM_INSTALLED',
                'actor' => $owner->email,
                'ip_address' => $ipAddress,
                'details' => 'نصب اولیه پلتفرم، اجرای مایگریشن‌های کامل لاراول و ساخت حساب مالک انجام شد.',
                'created_at' => now(),
            ]);

            return [
                'ownerEmail' => $owner->email,
                'brandName' => $brand->brand_name,
                'appKeyFingerprint' => substr(hash('sha256', $appKey), 0, 16),
            ];
        });

        // Step 11: Verify application health before locking installer
        if (! User::where('role', 'admin')->exists() || ! BrandSetting::exists() || ! str_starts_with($appKey, 'base64:')) {
            throw new RuntimeException('HEALTH_CHECK_FAILED: بررسی سلامت نهایی پس از مایگریشن ناموفق بود.');
        }

        // Step 12: Write installation lock ONLY AFTER migrations, DB transaction, and health checks have succeeded
        $lockData = json_encode([
            'installedAt' => now()->toIso8601String(),
            'version' => \App\Http\Controllers\Api\V1\SystemMaintenanceController::RELEASE_VERSION,
            'phpVersion' => PHP_VERSION,
            'adminEmail' => $result['ownerEmail'],
            'appKeyFingerprint' => $result['appKeyFingerprint'],
            'healthVerified' => true,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $lockPath = storage_path('installed.lock');
        if (! is_string($lockData) || @file_put_contents($lockPath, $lockData, LOCK_EX) === false) {
            throw new RuntimeException('LOCK_WRITE_FAILED: امکان ایجاد فایل قفل نصب (storage/installed.lock) وجود ندارد.');
        }
        if (! @chmod($lockPath, 0600)) {
            @unlink($lockPath);
            throw new RuntimeException('LOCK_PERMISSION_FAILED: امکان تنظیم سطح دسترسی امن فایل قفل نصب وجود ندارد.');
        }

        // Remove the one-time token only after the installation lock is durable and private.
        $tokenFile = storage_path('installer_setup.token');
        if (file_exists($tokenFile) && ! @unlink($tokenFile)) {
            @unlink($lockPath);
            throw new RuntimeException('SETUP_TOKEN_DELETE_FAILED: حذف امن توکن یک‌بارمصرف نصب انجام نشد.');
        }

        return [
            'ok' => true,
            'installed' => true,
            'healthVerified' => true,
            'adminEmail' => $result['ownerEmail'],
            'brandName' => $result['brandName'],
            'appKeyFingerprint' => $result['appKeyFingerprint'],
        ];
    }

    /** Read an installer-owned scalar key; never evaluate .env as PHP code. */
    private function readExistingEnvironmentValue(string $key): ?string
    {
        $path = base_path('.env');
        if (! is_file($path) || is_link($path)) return null;
        $content = @file_get_contents($path);
        if (! is_string($content)) return null;
        $match = [];
        if (! preg_match('/^' . preg_quote($key, '/') . '=(.*)$/m', $content, $match)) return null;
        $value = trim($match[1]);
        if (strlen($value) >= 2 && $value[0] === '"' && substr($value, -1) === '"') {
            $value = substr($value, 1, -1);
        }
        return $value !== '' ? $value : null;
    }

    /**
     * Preserve operator-provided SMTP/SMS/hosting keys; replace only the
     * settings owned by the installer. Use an atomic 0600 file replacement,
     * keeping a private recovery copy outside the web root when updating.
     */
    private function persistEnvironmentFile(array $payload, string $appKey, string $brandName): void
    {
        if (app()->environment('testing') && empty($payload['writeEnvInTests'])) return;

        $envPath = base_path('.env');
        if (is_link($envPath)) {
            throw new RuntimeException('ENV_SYMLINK_REJECTED: فایل تنظیمات نباید لینک نمادین باشد.');
        }
        $existing = is_file($envPath);
        $templatePath = base_path('.env.example');
        $original = $existing ? @file_get_contents($envPath)
            : (is_file($templatePath) ? @file_get_contents($templatePath) : '');
        if (! is_string($original)) {
            throw new RuntimeException('ENV_READ_FAILED: خواندن فایل تنظیمات اولیه ناموفق بود.');
        }

        $canonicalDomain = trim((string) ($payload['canonicalDomain'] ?? 'https://coach-domain.ir'));
        $dbHost = trim((string) ($payload['dbHost'] ?? config('database.connections.mysql.host', '127.0.0.1')));
        $dbPort = trim((string) ($payload['dbPort'] ?? config('database.connections.mysql.port', '3306')));
        $dbName = trim((string) ($payload['dbName'] ?? config('database.connections.mysql.database', '')));
        $dbUser = trim((string) ($payload['dbUser'] ?? config('database.connections.mysql.username', '')));
        $dbPass = (string) ($payload['dbPass'] ?? config('database.connections.mysql.password', ''));

        $existingVaultKey = $this->readExistingEnvironmentValue('BACKUP_ENCRYPTION_KEY');
        $decodedVaultKey = $existingVaultKey && str_starts_with($existingVaultKey, 'base64:')
            ? base64_decode(substr($existingVaultKey, 7), true) : false;
        if ($existingVaultKey !== null && (! is_string($decodedVaultKey) || strlen($decodedVaultKey) !== 32)) {
            throw new RuntimeException('BACKUP_KEY_INVALID: کلید رمزگذاری بکاپ موجود معتبر نیست؛ برای جلوگیری از از دست رفتن بکاپ‌های قدیمی جایگزین خودکار نمی‌شود.');
        }
        $vaultKey = $existingVaultKey ?: 'base64:' . base64_encode(random_bytes(32));

        $values = [
            'APP_NAME' => $this->quoteEnvironmentValue($brandName),
            'APP_ENV' => 'production',
            'APP_KEY' => $appKey,
            'APP_DEBUG' => 'false',
            'APP_TIMEZONE' => 'Asia/Tehran',
            'APP_URL' => $this->quoteEnvironmentValue($canonicalDomain ?: 'http://localhost'),
            'DB_CONNECTION' => 'mysql',
            'DB_HOST' => $this->quoteEnvironmentValue($dbHost),
            'DB_PORT' => $this->quoteEnvironmentValue($dbPort),
            'DB_DATABASE' => $this->quoteEnvironmentValue($dbName),
            'DB_USERNAME' => $this->quoteEnvironmentValue($dbUser),
            'DB_PASSWORD' => $this->quoteEnvironmentValue($dbPass),
            'SESSION_DRIVER' => 'database',
            'CACHE_STORE' => 'database',
            'SESSION_HTTP_ONLY' => 'true',
            'SESSION_SECURE_COOKIE' => 'true',
            'SESSION_SAME_SITE' => 'lax',
            'PAYMENT_SANDBOX' => 'false',
            'ZARINPAL_MERCHANT_ID' => $this->quoteEnvironmentValue(trim((string) ($payload['zarinpalMerchantId'] ?? ''))),
            'SEP_TERMINAL_ID' => $this->quoteEnvironmentValue(trim((string) ($payload['sepTerminalId'] ?? ''))),
            'BACKUP_ENCRYPTION_KEY' => $vaultKey,
        ];

        $lines = preg_split('/\r\n|\n|\r/', $original);
        if (! is_array($lines)) throw new RuntimeException('ENV_PARSE_FAILED');
        $seen = [];
        $merged = [];
        foreach ($lines as $line) {
            if (preg_match('/^([A-Z][A-Z0-9_]*)\s*=/', $line, $match)
                && array_key_exists($match[1], $values)) {
                $key = $match[1];
                if (! isset($seen[$key])) {
                    $merged[] = $key . '=' . $values[$key];
                    $seen[$key] = true;
                }
                // Remove duplicate installer-owned keys, leaving all other
                // settings and comments untouched.
                continue;
            }
            $merged[] = $line;
        }
        foreach ($values as $key => $value) {
            if (! isset($seen[$key])) $merged[] = $key . '=' . $value;
        }
        $content = rtrim(implode("\n", $merged), "\n") . "\n";

        $tempPath = @tempnam(dirname($envPath), '.env.new.');
        if (! is_string($tempPath) || ! @chmod($tempPath, 0600)) {
            if (is_string($tempPath)) @unlink($tempPath);
            throw new RuntimeException('ENV_TEMP_FAILED: امکان ایجاد فایل موقت تنظیمات امن وجود ندارد.');
        }
        try {
            if (@file_put_contents($tempPath, $content, LOCK_EX) !== strlen($content)) {
                throw new RuntimeException('ENV_WRITE_FAILED: ذخیره‌سازی تنظیمات ناموفق بود.');
            }
            if ($existing) {
                $backupDir = storage_path('app/installer_env_backups');
                if (! is_dir($backupDir) && ! @mkdir($backupDir, 0700, true)) {
                    throw new RuntimeException('ENV_BACKUP_DIR_FAILED');
                }
                if (! @chmod($backupDir, 0700)) throw new RuntimeException('ENV_BACKUP_DIR_PERMISSION_FAILED');
                $backupFile = $backupDir . '/env_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.bak';
                $backupTmp = @tempnam($backupDir, '.tmp.');
                if (! is_string($backupTmp) || ! @chmod($backupTmp, 0600)) {
                    if (is_string($backupTmp)) @unlink($backupTmp);
                    throw new RuntimeException('ENV_BACKUP_CREATE_FAILED');
                }
                if (@file_put_contents($backupTmp, $original, LOCK_EX) !== strlen($original)
                    || ! @rename($backupTmp, $backupFile)) {
                    @unlink($backupTmp);
                    throw new RuntimeException('ENV_BACKUP_WRITE_FAILED');
                }
            }
            if (! @rename($tempPath, $envPath)) {
                throw new RuntimeException('ENV_REPLACE_FAILED: جایگزینی امن .env ناموفق بود.');
            }
        } finally {
            if (is_file($tempPath)) @unlink($tempPath);
        }
    }

    private function quoteEnvironmentValue(string $value): string
    {
        $escaped = str_replace(
            ['\\', '"', "\r", "\n"],
            ['\\\\', '\\"', '\\r', '\\n'],
            $value
        );

        return '"' . $escaped . '"';
    }
}

