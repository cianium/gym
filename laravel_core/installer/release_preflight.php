<?php
/** Read-only deployment preflight. Run: php installer/release_preflight.php */
declare(strict_types=1);
$root = dirname(__DIR__);
$errors = []; $warnings = [];
$required = ['ctype','curl','fileinfo','filter','gd','hash','json','mbstring','openssl','pdo','session','tokenizer','xml','dom'];
if (PHP_VERSION_ID < 80300) $errors[] = 'PHP 8.3 or newer is required';
foreach ($required as $extension) if (!extension_loaded($extension)) $errors[] = "Missing PHP extension: $extension";
if (!extension_loaded('pdo_mysql')) $errors[] = 'Missing pdo_mysql (required for MySQL deployment)';
foreach (['artisan','vendor/autoload.php','bootstrap/app.php'] as $file) {
    if (!is_file("$root/$file")) $errors[] = "Missing application file: $file";
}
if (!is_file("$root/.env")) $errors[] = 'Missing .env: configure server-specific secrets outside the public webroot';
else {
    $env = file_get_contents("$root/.env") ?: '';
    foreach (['APP_KEY','APP_URL','DB_HOST','DB_DATABASE','DB_USERNAME'] as $key) {
        if (!preg_match('/^'.preg_quote($key,'/').'=(.+)$/m', $env, $match) || trim($match[1], " \t\r\n\"'") === '') $errors[] = "Missing setting: $key";
    }
    if (preg_match('/^APP_DEBUG\s*=\s*true\s*$/mi', $env)) $errors[] = 'APP_DEBUG=true is unsafe in production';
    if (!preg_match('/^APP_ENV\s*=\s*production\s*$/mi', $env)) $warnings[] = 'APP_ENV is not production';
    if (!preg_match('/^APP_URL\s*=\s*https:\/\//mi', $env)) $warnings[] = 'APP_URL should use HTTPS';
}
foreach (['storage','bootstrap/cache'] as $dir) {
    if (!is_dir("$root/$dir")) $errors[] = "Missing directory: $dir";
    elseif (!is_writable("$root/$dir")) $warnings[] = "Not writable by CLI user: $dir (check PHP-FPM user)";
}
if (!is_file(dirname($root).'/public_html/index.php')) $errors[] = 'Missing public_html/index.php';
if (is_file(dirname($root).'/public_html/.env')) $errors[] = 'Secret .env found under public_html';
if (is_dir(dirname($root).'/public_html/vendor')) $errors[] = 'vendor directory found under public_html';
if (is_file("$root/public/.env")) $errors[] = 'Secret .env found under public directory';
if (is_dir("$root/public/vendor")) $errors[] = 'vendor directory found under public directory';
foreach ($errors as $message) echo "FAIL: $message\n";
foreach ($warnings as $message) echo "WARN: $message\n";
echo 'RESULT: '.(count($errors) ? 'NO-GO' : 'PREFLIGHT PASS (not a production certification)')."\n";
exit(count($errors) ? 1 : 0);
