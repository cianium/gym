<?php

declare(strict_types=1);

// CLI-only recovery tool for authenticated, encrypted local snapshots.
// Do not make this script accessible via the web document root.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit(1);
}

use App\Services\Maintenance\BackupVault;
use Illuminate\Contracts\Console\Kernel;

require dirname(__DIR__) . '/vendor/autoload.php';
$app = require dirname(__DIR__) . '/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$filename = trim((string) ($argv[1] ?? ''));
if ($filename === '' || basename($filename) !== $filename || ! str_ends_with($filename, '.vault')) {
    fwrite(STDERR, "Usage: php installer/decrypt_snapshot.php pre_upgrade_XXXX.vault\n");
    exit(2);
}

$inputPath = storage_path('app/backups/' . $filename);
$inputReal = realpath($inputPath);
$vaultDirectory = realpath(storage_path('app/backups'));
if (! $inputReal || ! $vaultDirectory || dirname($inputReal) !== $vaultDirectory) {
    fwrite(STDERR, "Snapshot file not found in storage/app/backups.\n");
    exit(2);
}

try {
    $content = file_get_contents($inputReal);
    $envelope = is_string($content) ? json_decode($content, true, 512, JSON_THROW_ON_ERROR) : null;
    if (! is_array($envelope)) throw new RuntimeException('INVALID_ENVELOPE');
    $bundle = (new BackupVault())->decryptBundle($envelope);
    $plain = json_encode($bundle, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

    $dir = storage_path('app/decrypted_restore_exports');
    if (! is_dir($dir) && ! mkdir($dir, 0700, true)) throw new RuntimeException('OUTPUT_DIRECTORY_FAILED');
    if (! chmod($dir, 0700)) throw new RuntimeException('OUTPUT_PERMISSION_FAILED');
    $destination = $dir . '/' . pathinfo($filename, PATHINFO_FILENAME)
        . '_' . bin2hex(random_bytes(4)) . '.json';
    $temp = tempnam($dir, '.tmp.');
    if (! is_string($temp) || ! chmod($temp, 0600)) throw new RuntimeException('OUTPUT_TEMP_FAILED');
    try {
        if (file_put_contents($temp, $plain, LOCK_EX) !== strlen($plain)
            || ! rename($temp, $destination)) throw new RuntimeException('OUTPUT_WRITE_FAILED');
    } finally {
        if (is_file($temp)) unlink($temp);
    }
    fwrite(STDOUT, "Decrypted backup: {$destination}\nImport it only on an isolated recovery environment, then securely delete the plaintext file.\n");
} catch (Throwable $error) {
    fwrite(STDERR, "Backup decryption failed: " . get_class($error) . "\n");
    exit(1);
}
