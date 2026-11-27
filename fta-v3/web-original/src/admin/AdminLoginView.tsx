import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  User
} from 'lucide-react';
import { fetchAdminSession, loginAdminOnServer } from '../api/mockGateway';

interface AdminLoginViewProps {
  coachName: string;
  onLoginSuccess: () => void;
  onOpenInstaller?: () => void;
  onExitToPublicSite?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  coachName,
  onLoginSuccess,
  onOpenInstaller
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    fetchAdminSession().then((status) => {
      if (!active) return;
      if (status.authenticated) {
        onLoginSuccess();
        return;
      }
      if (status.setupRequired) {
        setSetupRequired(true);
      }
    });
    return () => {
      active = false;
    };
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('لطفاً نام کاربری و رمز عبور مدیریت را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const result = await loginAdminOnServer(trimmedUser, trimmedPass);
      if (result.authenticated) {
        onLoginSuccess();
        return;
      }
      if (result.setupRequired) {
        setSetupRequired(true);
      }
      setErrorMsg(result.error || 'نام کاربری یا رمز عبور وارد شده معتبر نیست.');
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور احراز هویت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-[#161616] rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="text-xs font-semibold text-[#C8A66A]">
            احراز هویت سرور میز کار مربی · {coachName}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
            ورود امن به پنل مدیریت
          </h1>
          <p className="text-xs text-[#929292] leading-relaxed">
            احراز هویت از طریق نشست سمت سرور (HttpOnly Session Cookie)، محافظت CSRF و هش رمزنگاری‌شده انجام می‌شود.
          </p>
        </div>

        {setupRequired && (
          <div className="p-4 rounded-2xl bg-[#1D1D1D] border border-[#C8A66A]/45 text-xs space-y-3">
            <div className="flex items-center gap-2 text-[#C8A66A] font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>نصب اولیه پلتفرم هنوز تکمیل نشده است</span>
            </div>
            <p className="text-[11px] text-[#C8C4BC] leading-relaxed">
              به دلایل امنیتی هیچ رمز عبور پیش‌فرضی در سیستم وجود ندارد. برای ساخت حساب مالک با رمز عبور اختصاصی و قفل کردن نصب‌کننده، وارد جادوگر نصب شوید.
            </p>
            {onOpenInstaller && (
              <button
                type="button"
                onClick={onOpenInstaller}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>ورود به جادوگر نصب امن (/install)</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-xs text-red-300 text-center"
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-username-input"
              className="block text-xs font-semibold text-[#929292] mb-1.5"
            >
              نام کاربری یا ایمیل مدیریت
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#929292] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-username-input"
                data-testid="admin-login-username"
                type="text"
                dir="ltr"
                required
                autoComplete="username"
                placeholder="owner@coach-domain.ir"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full min-h-[46px] pr-10 pl-3.5 py-2.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-semibold text-[#929292] mb-1.5"
            >
              رمز عبور مدیریت
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#929292] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-password-input"
                data-testid="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[46px] pr-10 pl-10 py-2.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
                className="w-8 h-8 rounded-lg text-[#929292] hover:text-[#F5F2EC] flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="admin-login-submit"
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] disabled:opacity-60 text-[#101010] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال اعتبارسنجی امنیتی...</span>
              </>
            ) : (
              <>
                <span>ورود به پنل مدیریت</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[11px] text-[#929292]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C8A66A]" />
          <span>مجهز به محافظت Rate-Limit، نشست HttpOnly، توکن CSRF و ثبت وقایع</span>
        </div>
      </div>
    </div>
  );
};
