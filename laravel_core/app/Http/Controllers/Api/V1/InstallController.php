<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\InstallSystemRequest;
use App\Services\Installer\InstallerService;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class InstallController
{
    public function status(InstallerService $installer): JsonResponse
    {
        return response()->json($installer->getDiagnostics());
    }

    public function run(InstallSystemRequest $request, InstallerService $installer): JsonResponse
    {
        if ($installer->isInstalled()) {
            return response()->json([
                'error' => 'نصب پلتفرم قبلاً تکمیل و قفل شده است (storage/installed.lock).',
                'code' => 'ALREADY_INSTALLED',
            ], 403);
        }

        try {
            $payload = $request->validated();
            $explicitDocRoot = isset($payload['documentRoot']) ? (string) $payload['documentRoot'] : null;

            $result = $installer->executeInstallation(
                $payload,
                (string) $request->ip(),
                $explicitDocRoot
            );

            return response()->json($result);
        } catch (RuntimeException $e) {
            $msg = $e->getMessage();
            $code = 'INSTALL_FAILED';
            $status = 400;

            if (str_contains($msg, 'INVALID_INSTALLER_SETUP_TOKEN')) {
                $code = 'INVALID_INSTALLER_SETUP_TOKEN';
                $status = 403;
            } elseif (str_contains($msg, 'ALREADY_INSTALLED')) {
                $code = 'ALREADY_INSTALLED';
                $status = 403;
            } elseif (str_contains($msg, 'UNSAFE_DOCUMENT_ROOT')) {
                $code = 'UNSAFE_DOCUMENT_ROOT';
                $status = 400;
            } elseif (str_contains($msg, 'WEAK_ADMIN_PASSWORD')) {
                $code = 'WEAK_ADMIN_PASSWORD';
                $status = 400;
            } elseif (str_contains($msg, 'ENV_WRITE_FAILED') || str_contains($msg, 'ENV_PERMISSION_FAILED')) {
                $code = 'ENV_WRITE_FAILED';
                $status = 500;
            }

            return response()->json([
                'error' => $msg,
                'code' => $code,
            ], $status);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Installer execution error', [
                'exception' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'خطا در اجرای عملیات نصب. لطفاً تنظیمات دیتابیس و دسترسی پوشه storage را بررسی نمایید.',
                'code' => 'INSTALL_INTERNAL_ERROR',
            ], 500);
        }
    }
}

