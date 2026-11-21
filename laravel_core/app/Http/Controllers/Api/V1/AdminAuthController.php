<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\AdminLoginRequest;
use App\Models\AuditLog;
use App\Models\User;
use App\Services\Installer\InstallerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminAuthController
{
    public function session(Request $request, InstallerService $installer): JsonResponse
    {
        $user = $request->user();

        if (! $user || $user->role !== 'admin') {
            return response()->json([
                'authenticated' => false,
                'username' => null,
                'csrfToken' => null,
                'setupRequired' => ! $installer->isInstalled(),
            ]);
        }

        return response()->json([
            'authenticated' => true,
            'username' => $user->email ?? $user->username,
            'csrfToken' => $request->session()->token(),
            'mustChangePassword' => (bool) $user->must_change_password,
            'setupRequired' => false,
        ]);
    }

    public function login(AdminLoginRequest $request, InstallerService $installer): JsonResponse
    {
        if (! $installer->isInstalled()) {
            return response()->json([
                'error' => 'پلتفرم هنوز نصب نشده است. لطفاً ابتدا از طریق جادوگر نصب (/install) حساب مالک را ایجاد کنید.',
                'setupRequired' => true,
            ], 403);
        }

        $identity = strtolower(trim((string) $request->input('username')));
        $password = (string) $request->input('password');

        $user = User::where('role', 'admin')
            ->where(function ($query) use ($identity) {
                $query->where('email', $identity)
                    ->orWhere('username', $identity);
            })
            ->first();

        if (! $user || ! Hash::check($password, (string) $user->password)) {
            AuditLog::create([
                'action' => 'ADMIN_LOGIN_FAILED',
                'actor' => $identity,
                'ip_address' => (string) $request->ip(),
                'details' => 'تلاش ناموفق برای ورود به پنل مدیریت',
                'created_at' => now(),
            ]);

            return response()->json([
                'error' => 'نام کاربری یا رمز عبور مدیریت معتبر نیست.',
            ], 401);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);

        AuditLog::create([
            'action' => 'ADMIN_LOGIN_SUCCESS',
            'actor' => (string) $user->email,
            'ip_address' => (string) $request->ip(),
            'details' => 'ورود موفق به پنل مدیریت',
            'created_at' => now(),
        ]);

        return response()->json([
            'authenticated' => true,
            'username' => $user->email ?? $user->username,
            'csrfToken' => $request->session()->token(),
            'mustChangePassword' => (bool) $user->must_change_password,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $actor = (string) ($request->user()?->email ?? 'admin');
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        AuditLog::create([
            'action' => 'ADMIN_LOGOUT',
            'actor' => $actor,
            'ip_address' => (string) $request->ip(),
            'details' => 'خروج از نشست مدیریت',
            'created_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'currentPassword' => ['required', 'string'],
            'newPassword' => ['required', 'string', 'min:12', 'max:255'],
            'newEmail' => ['nullable', 'email', 'max:190', 'unique:users,email,' . $request->user()->id],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check((string) $request->input('currentPassword'), (string) $user->password)) {
            return response()->json([
                'error' => 'رمز عبور فعلی اشتباه است.',
            ], 400);
        }

        $user->password = Hash::make((string) $request->input('newPassword'));
        $user->must_change_password = false;

        if ($request->filled('newEmail')) {
            $user->email = strtolower(trim((string) $request->input('newEmail')));
        }

        $user->save();

        // Rotating the password also revokes other active database-backed
        // sessions. The current browser keeps a freshly rotated session ID.
        if (config('session.driver') === 'database') {
            DB::table('sessions')->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())->delete();
        }
        // Rotate the session identifier without unexpectedly invalidating the
        // CSRF token currently held by the already-authenticated admin UI.
        $request->session()->migrate(true);

        AuditLog::create([
            'action' => 'ADMIN_PASSWORD_CHANGED',
            'actor' => (string) $user->email,
            'ip_address' => (string) $request->ip(),
            'details' => 'رمز عبور مدیریت با موفقیت تغییر یافت.',
            'created_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'email' => $user->email,
        ]);
    }
}
