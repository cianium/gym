<?php

declare(strict_types=1);

/**
 * Self-Hosted Shared Hosting Unified Installer Entry Point (cPanel / DirectAdmin)
 * White-Label Fitness Coach Platform — Single-Tenant Production Installer (PHP 8.3+)
 *
 * Delegates all installation logic to the single authoritative Laravel service:
 *   App\Services\Installer\InstallerService
 * which verifies the pre-provisioned setup token, enforces PHP 8.3+, validates
 * document-root isolation, creates writable storage directories, generates APP_KEY,
 * writes .env (0600) fail-closed, runs the full Laravel migrations, creates the
 * owner account, and writes storage/installed.lock ONLY after installation succeeds.
 */

if (PHP_VERSION_ID < 80300) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    exit('خطای پیش‌نیاز سرور: این پلتفرم نیازمند PHP 8.3.0 یا بالاتر است. نسخه فعلی: ' . PHP_VERSION);
}

$laravelRoot = is_dir(dirname(__DIR__) . '/laravel_core')
    ? dirname(__DIR__) . '/laravel_core'
    : dirname(__DIR__);

$storageDir = $laravelRoot . '/storage';
$lockFile = $storageDir . '/installed.lock';

if (file_exists($lockFile)) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    exit('نصب پلتفرم قبلاً تکمیل و قفل شده است (storage/installed.lock). امکان اجرای مجدد نصب‌کننده وجود ندارد.');
}

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 3600,
        'path' => '/',
        'secure' => (! empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    @session_start();
}

if (empty($_SESSION['wl_installer_csrf'])) {
    $_SESSION['wl_installer_csrf'] = bin2hex(random_bytes(32));
}
$installerCsrfToken = (string) $_SESSION['wl_installer_csrf'];

require $laravelRoot . '/vendor/autoload.php';
/** @var \Illuminate\Foundation\Application $app */
$app = require_once $laravelRoot . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

/** @var \App\Services\Installer\InstallerService $installer */
$installer = $app->make(\App\Services\Installer\InstallerService::class);

$docRoot = isset($_SERVER['DOCUMENT_ROOT']) ? (string) $_SERVER['DOCUMENT_ROOT'] : null;
$diagnostics = $installer->getDiagnostics($docRoot);

$checks = [
    'PHP >= 8.3.0' => (bool) ($diagnostics['checks']['phpVersionOk'] ?? false),
    'PDO MySQL Extension' => (bool) ($diagnostics['checks']['pdoMysqlLoaded'] ?? false),
    'OpenSSL & CSPRNG' => extension_loaded('openssl'),
    'Mbstring & JSON' => extension_loaded('mbstring') && extension_loaded('json'),
    'Storage Writable' => (bool) ($diagnostics['checks']['storageWritable'] ?? false),
    'Storage & .env Outside Web Root' => (bool) ($diagnostics['checks']['storageOutsideWebRoot'] ?? false),
];

$allPrereqsPassed = ! in_array(false, $checks, true);
$errorMsg = null;
$installSuccess = null;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && $allPrereqsPassed) {
    $submittedCsrf = (string) ($_POST['_csrf_token'] ?? '');
    if ($submittedCsrf === '' || ! hash_equals($installerCsrfToken, $submittedCsrf)) {
        http_response_code(403);
        $errorMsg = 'توکن امنیتی CSRF نامعتبر است. لطفاً صفحه را مجدداً بارگذاری کنید.';
    } else {
        try {
            $payload = [
                'setupToken' => trim((string) ($_POST['setup_token'] ?? '')),
                'dbHost' => trim((string) ($_POST['db_host'] ?? '127.0.0.1')),
                'dbPort' => trim((string) ($_POST['db_port'] ?? '3306')),
                'dbName' => trim((string) ($_POST['db_name'] ?? '')),
                'dbUser' => trim((string) ($_POST['db_user'] ?? '')),
                'dbPass' => (string) ($_POST['db_pass'] ?? ''),
                'brandName' => trim((string) ($_POST['brand_name'] ?? '')),
                'brandSubtitle' => trim((string) ($_POST['brand_subtitle'] ?? 'پلتفرم تخصصی مربیگری و برنامه‌های تمرینی')),
                'canonicalDomain' => trim((string) ($_POST['canonical_domain'] ?? '')),
                'coachName' => trim((string) ($_POST['coach_name'] ?? '')),
                'adminEmail' => strtolower(trim((string) ($_POST['admin_email'] ?? ''))),
                'adminUsername' => strtolower(trim((string) ($_POST['admin_username'] ?? 'admin'))),
                'adminPassword' => (string) ($_POST['admin_password'] ?? ''),
            ];

            $clientIp = (string) ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
            $installSuccess = $installer->executeInstallation($payload, $clientIp, $docRoot);
            unset($_SESSION['wl_installer_csrf']);
        } catch (Throwable $e) {
            $errorMsg = 'خطا در اجرای نصب یکپارچه لاراول: ' . $e->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>نصب‌کننده امن پلتفرم White-Label مربی ورزشی (PHP 8.3+)</title>
  <style>
    body { background: #101010; color: #F5F2EC; font-family: Tahoma, sans-serif; padding: 24px; line-height: 1.7; }
    .box { max-width: 720px; margin: 0 auto; background: #1D1D1D; border: 1px solid rgba(200,166,106,0.35); border-radius: 20px; padding: 28px; }
    h1 { color: #C8A66A; font-size: 20px; margin-top: 0; }
    h2 { color: #F5F2EC; font-size: 15px; margin-top: 22px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
    .ok { color: #9CE2B9; font-weight: bold; }
    .fail { color: #F28B82; font-weight: bold; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
    label { display: block; font-size: 12px; color: #929292; margin-bottom: 4px; }
    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); background: #101010; color: #F5F2EC; font-size: 13px; }
    .btn { margin-top: 20px; width: 100%; padding: 13px; border-radius: 12px; border: none; background: #C8A66A; color: #101010; font-weight: bold; font-size: 14px; cursor: pointer; }
    .alert-err { background: rgba(242,139,130,0.15); border: 1px solid rgba(242,139,130,0.4); color: #F28B82; padding: 12px; border-radius: 12px; font-size: 13px; margin: 14px 0; }
    .alert-ok { background: rgba(156,226,185,0.15); border: 1px solid rgba(156,226,185,0.4); color: #9CE2B9; padding: 16px; border-radius: 12px; font-size: 13px; margin: 14px 0; }
  </style>
</head>
<body>
  <div class="box">
    <h1>جادوگر نصب امن پلتفرم White-Label (هاست اشتراکی cPanel / DirectAdmin — PHP 8.3+)</h1>

    <?php if ($installSuccess): ?>
      <div class="alert-ok">
        <strong>نصب و راه‌اندازی با موفقیت تکمیل و قفل شد!</strong><br />
        • برند: <?= htmlspecialchars($installSuccess['brandName'], ENT_QUOTES, 'UTF-8') ?><br />
        • حساب مالک: <?= htmlspecialchars($installSuccess['adminEmail'], ENT_QUOTES, 'UTF-8') ?><br />
        • اثر انگشت کلید رمزنگاری (APP_KEY): <code><?= htmlspecialchars($installSuccess['appKeyFingerprint'], ENT_QUOTES, 'UTF-8') ?></code><br />
        • فایل قفل <code>storage/installed.lock</code> با سطح دسترسی <code>0600</code> ایجاد شد.
      </div>
    <?php else: ?>
      <h2>۱. بررسی پیش‌نیازهای PHP 8.3+ و امنیت مسیرهای هاست</h2>
      <?php foreach ($checks as $label => $passed): ?>
        <div class="row">
          <span><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></span>
          <span class="<?= $passed ? 'ok' : 'fail' ?>"><?= $passed ? 'تأیید شده ✓' : 'نیاز به اصلاح ✗' ?></span>
        </div>
      <?php endforeach; ?>

      <?php if ($errorMsg): ?>
        <div class="alert-err"><?= htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8') ?></div>
      <?php endif; ?>

      <?php if ($allPrereqsPassed): ?>
        <form method="post" action="">
          <input type="hidden" name="_csrf_token" value="<?= htmlspecialchars($installerCsrfToken, ENT_QUOTES, 'UTF-8') ?>" />

          <h2>۲. توکن امنیتی نصب اولیه (Setup Secret Token)</h2>
          <div>
            <label>توکن نصب اولیه (مقدار INSTALLER_SETUP_TOKEN در فایل .env یا storage/installer_setup.token) *</label>
            <input type="password" name="setup_token" placeholder="Setup Token..." dir="ltr" required />
          </div>

          <h2>۳. اطلاعات اتصال دیتابیس MySQL / MariaDB</h2>
          <div class="grid">
            <div>
              <label>میزبان دیتابیس (DB_HOST) *</label>
              <input type="text" name="db_host" value="127.0.0.1" dir="ltr" required />
            </div>
            <div>
              <label>پورت (DB_PORT) *</label>
              <input type="text" name="db_port" value="3306" dir="ltr" required />
            </div>
            <div>
              <label>نام دیتابیس (DB_DATABASE) *</label>
              <input type="text" name="db_name" placeholder="cpanel_fitness_wl" dir="ltr" required />
            </div>
            <div>
              <label>نام کاربری دیتابیس (DB_USERNAME) *</label>
              <input type="text" name="db_user" placeholder="cpanel_dbuser" dir="ltr" required />
            </div>
            <div>
              <label>رمز عبور دیتابیس (DB_PASSWORD)</label>
              <input type="password" name="db_pass" dir="ltr" />
            </div>
            <div>
              <label>دامنه رسمی سایت (APP_URL) *</label>
              <input type="url" name="canonical_domain" placeholder="https://coach-domain.ir" dir="ltr" required />
            </div>
          </div>

          <h2>۴. تنظیمات اولیه برند و حساب مالک (بدون رمز پیش‌فرض)</h2>
          <div class="grid">
            <div>
              <label>نام برند / آکادمی *</label>
              <input type="text" name="brand_name" placeholder="آکادمی تخصصی مربی" required />
            </div>
            <div>
              <label>نام و نام خانوادگی مربی *</label>
              <input type="text" name="coach_name" placeholder="نام مربی" required />
            </div>
            <div>
              <label>نام کاربری مدیر *</label>
              <input type="text" name="admin_username" value="admin" dir="ltr" required />
            </div>
            <div>
              <label>ایمیل مالک *</label>
              <input type="email" name="admin_email" placeholder="owner@coach-domain.ir" dir="ltr" required />
            </div>
            <div style="grid-column: span 2;">
              <label>رمز عبور اختصاصی مالک (حداقل ۸ کاراکتر) *</label>
              <input type="password" name="admin_password" minlength="8" dir="ltr" required />
            </div>
          </div>

          <button type="submit" class="btn">اجرای مایگریشن‌ها، تولید APP_KEY، ساخت حساب مالک و قفل نصب</button>
        </form>
      <?php endif; ?>
    <?php endif; ?>
  </div>
</body>
</html>

