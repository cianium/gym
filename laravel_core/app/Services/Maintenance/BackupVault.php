<?php

declare(strict_types=1);

namespace App\Services\Maintenance;

use RuntimeException;

/** Local and optionally exported backups protected with authenticated encryption.
 * Keys must be managed separately from APP_KEY and retained for restores.
 */
final class BackupVault
{
    public const FORMAT = 'arash-fitness-backup-vault-v1';
    private const AAD = 'arash-fitness-backup-vault-v1';

    private function key(): string
    {
        $configured = trim((string) config('services.fitness.backup_encryption_key', ''));
        if (! str_starts_with($configured, 'base64:')) {
            throw new RuntimeException('BACKUP_ENCRYPTION_KEY_MISSING');
        }
        $decoded = base64_decode(substr($configured, 7), true);
        if (! is_string($decoded) || strlen($decoded) !== 32) {
            throw new RuntimeException('BACKUP_ENCRYPTION_KEY_INVALID');
        }
        return $decoded;
    }

    /** @return array{format:string,algorithm:string,nonce:string,tag:string,ciphertext:string} */
    public function encryptBundle(array $bundle): array
    {
        $plain = json_encode($bundle, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        $nonce = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plain, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA,
            $nonce, $tag, self::AAD, 16
        );
        if (! is_string($ciphertext) || strlen($tag) !== 16) {
            throw new RuntimeException('BACKUP_ENCRYPTION_FAILED');
        }
        return [
            'format' => self::FORMAT,
            'algorithm' => 'AES-256-GCM',
            'nonce' => base64_encode($nonce),
            'tag' => base64_encode($tag),
            'ciphertext' => base64_encode($ciphertext),
        ];
    }

    public function decryptBundle(array $envelope): array
    {
        if (($envelope['format'] ?? null) !== self::FORMAT
            || ($envelope['algorithm'] ?? null) !== 'AES-256-GCM') {
            throw new RuntimeException('BACKUP_VAULT_FORMAT_INVALID');
        }
        $nonce = base64_decode((string) ($envelope['nonce'] ?? ''), true);
        $tag = base64_decode((string) ($envelope['tag'] ?? ''), true);
        $ciphertext = base64_decode((string) ($envelope['ciphertext'] ?? ''), true);
        if (! is_string($nonce) || strlen($nonce) !== 12
            || ! is_string($tag) || strlen($tag) !== 16
            || ! is_string($ciphertext)) {
            throw new RuntimeException('BACKUP_VAULT_CONTENT_INVALID');
        }
        $plain = openssl_decrypt(
            $ciphertext, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA,
            $nonce, $tag, self::AAD
        );
        if (! is_string($plain)) throw new RuntimeException('BACKUP_VAULT_AUTHENTICATION_FAILED');
        $bundle = json_decode($plain, true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($bundle)) throw new RuntimeException('BACKUP_VAULT_PAYLOAD_INVALID');
        return $bundle;
    }

    /** Atomic encrypted file; never store sensitive plaintext in a temp file. */
    public function writeSnapshot(string $directory, string $filename, array $bundle): void
    {
        if (basename($filename) !== $filename || ! str_ends_with($filename, '.vault')) {
            throw new RuntimeException('BACKUP_FILENAME_INVALID');
        }
        $envelope = $this->encryptBundle($bundle);
        $serialized = json_encode($envelope, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (! is_dir($directory) && ! @mkdir($directory, 0750, true) && ! is_dir($directory)) {
            throw new RuntimeException('BACKUP_DIRECTORY_CREATE_FAILED');
        }
        $temp = @tempnam($directory, '.vault.tmp.');
        if (! is_string($temp) || ! @chmod($temp, 0600)) {
            if (is_string($temp)) @unlink($temp);
            throw new RuntimeException('BACKUP_TEMP_CREATE_FAILED');
        }
        try {
            if (@file_put_contents($temp, $serialized, LOCK_EX) !== strlen($serialized)) {
                throw new RuntimeException('BACKUP_WRITE_FAILED');
            }
            if (! @rename($temp, $directory . DIRECTORY_SEPARATOR . $filename)) {
                throw new RuntimeException('BACKUP_RENAME_FAILED');
            }
        } finally {
            if (is_file($temp)) @unlink($temp);
        }
    }
}
