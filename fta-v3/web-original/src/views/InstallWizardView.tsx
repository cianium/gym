import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  fetchInstallerStatus,
  InstallerStatusPayload,
  runSystemInstaller
} from '../api/mockGateway';

interface InstallWizardViewProps {
  onInstallCompleted: () => void;
  onGoToAdminLogin: () => void;
}

export const InstallWizardView: React.FC<InstallWizardViewProps> = ({
  onInstallCompleted,
  onGoToAdminLogin
}) => {
  const [status, setStatus] = useState<InstallerStatusPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Installer Form State (Brand-Neutral White-Label Defaults)
  const [brandName, setBrandName] = useState('آکادمی اختصاصی مربی');
  const [brandSubtitle, setBrandSubtitle] = useState('پلتفرم تخصصی مربیگری و برنامه‌های تمرینی');
  const [canonicalDomain, setCanonicalDomain] = useState('https://example.test');
  const [coachName, setCoachName] = useState('نام مربی');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('owner@coach-domain.ir');
  const [adminPassword, setAdminPassword] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [dbHost, setDbHost] = useState('127.0.0.1');
  const [dbPort, setDbPort] = useState('3306');
  const [dbName, setDbName] = useState('cpanel_fitness_wl');
  const [dbUser, setDbUser] = useState('cpanel_dbuser');
  const [dbPass, setDbPass] = useState('');

  useEffect(() => {
    let active = true;
    fetchInstallerStatus()
      .then((res) => {
        if (active) {
          setStatus(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRunInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (adminPassword.trim().length < 8) {
      setErrorMsg('رمز عبور اختصاصی مالک باید حداقل ۸ کاراکتر باشد.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await runSystemInstaller({
        brandName,
        brandSubtitle,
        canonicalDomain,
        coachName,
        adminUsername,
        adminEmail,
        adminPassword,
        setupToken: setupToken.trim() || undefined,
        dbHost,
        dbPort,
        dbName,
        dbUser,
        dbPass
      });

      if (!result.ok) {
        setErrorMsg(result.error || 'خطا در اجرای نصب‌کننده.');
        setSubmitting(false);
        return;
      }

      const updatedStatus = await fetchInstallerStatus();
      setStatus(updatedStatus);
      setSuccessMsg(
        'نصب اولیه با موفقیت انجام شد، کلید رمزنگاری تولید گردید، حساب مالک ایجاد شد و قفل نصب (installed.lock) فعال شد.'
      );
      setSubmitting(false);
      onInstallCompleted();
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور نصب‌کننده.');
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#101010] text-[#F5F2EC] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-[#161616] border border-[#C8A66A]/35 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>جادوگر نصب امن هاست اشتراکی (Single-Tenant Installer)</span>
            </div>
            <span className="text-xs font-mono text-[#929292]" dir="ltr">
              {status?.version || 'v2.2.0-single-tenant'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
            راه‌اندازی و قفل امنیتی پلتفرم White-Label مربی ورزشی
          </h1>
          <p className="text-xs sm:text-sm text-[#929292] leading-relaxed">
            این نصب‌کننده پیش‌نیازهای امنیتی <code className="font-mono text-[#C8A66A]">PHP 8.3+</code>، مسیرهای خارج از <code className="font-mono text-[#C8A66A]">public_html</code>، اتصال دیتابیس، تولید <code className="font-mono text-[#C8A66A]">APP_KEY</code>، ساخت حساب مالک بدون رمز پیش‌فرض و ایجاد فایل قفل <code className="font-mono text-[#C8A66A]">storage/installed.lock</code> را اجرا می‌کند.
          </p>
        </div>

        {/* Security & Path Checks */}
        <div className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
            <Server className="w-4 h-4" />
            <span>بررسی امنیتی مسیرهای هاست و پیش‌نیازهای سیستم (PHP 8.3+)</span>
          </div>

          {loading ? (
            <div className="py-6 text-center text-xs text-[#929292] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C8A66A]" />
              <span>در حال بررسی وضعیت امنیتی سرور...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                {
                  label: 'نسخه PHP 8.3+ (سازگار با Laravel 13)',
                  ok: status?.checks.phpVersionOk ?? true
                },
                {
                  label: 'جداسازی مسیر storage/ خارج از Web Root',
                  ok: status?.checks.storageOutsideWebRoot ?? true
                },
                {
                  label: 'دسترسی نوشتن امن در مسیر دیتابیس و لاگ‌ها',
                  ok: status?.checks.storageWritable ?? true
                },
                {
                  label: 'محافظت از پوشه فایل‌های دیجیتال خصوصی',
                  ok: status?.checks.privateDownloadsProtected ?? true
                },
                {
                  label: 'تولید کلید رمزنگاری (APP_KEY)',
                  ok: status?.checks.appKeyGenerated ?? false
                },
                {
                  label: 'وضعیت قفل نصب مجدد (storage/installed.lock)',
                  ok: Boolean(status?.installed)
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-between gap-2"
                >
                  <span className="text-[#E0DCD3]">{item.label}</span>
                  <span
                    className={`font-bold shrink-0 ${
                      item.ok ? 'text-[#9CE2B9]' : 'text-[#C8A66A]'
                    }`}
                  >
                    {item.ok ? 'تأیید شده ✓' : 'در انتظار نصب'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Already Installed Lock Notice OR Installation Form */}
        {status?.installed ? (
          <div className="bg-[#1D1D1D] border border-[#3E7B59]/60 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#254F38]/40 border border-[#3E7B59] flex items-center justify-center text-[#9CE2B9] shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#F5F2EC]">
                  نصب سیستم تکمیل و قفل شده است (Installed & Locked)
                </h2>
                <p className="text-xs text-[#929292] mt-1">
                  فایل قفل <code className="font-mono text-[#9CE2B9]">storage/installed.lock</code> فعال است و هرگونه درخواست نصب مجدد با کد <code className="font-mono text-[#F28B82]">403 Forbidden</code> مسدود می‌شود.
                </p>
              </div>
            </div>

            {successMsg && (
              <div className="p-4 rounded-2xl bg-[#254F38]/30 border border-[#3E7B59] text-xs text-[#9CE2B9] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onGoToAdminLogin}
                className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-extrabold flex items-center gap-2 cursor-pointer"
              >
                <span>ورود به پنل مدیریت مربی</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleRunInstall}
            className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                <KeyRound className="w-4 h-4" />
                <span>پیکربندی اولیه برند، دیتابیس و حساب مالک</span>
              </div>
              <p className="text-xs text-[#929292]">
                هیچ رمز عبور پیش‌فرضی در سیستم وجود ندارد. رمز عبور انتخابی شما با الگوریتم رمزنگاری یک‌طرفه ذخیره می‌شود.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/35 text-xs text-red-300 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Brand & Coach Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#929292] mb-1">نام برند / آکادمی *</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#929292] mb-1">نام و نام خانوادگی مربی *</label>
                <input
                  type="text"
                  required
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#929292] mb-1">شعار برند</label>
                <input
                  type="text"
                  value={brandSubtitle}
                  onChange={(e) => setBrandSubtitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#929292] mb-1">دامنه اختصاصی مربی (URL)</label>
                <input
                  type="url"
                  dir="ltr"
                  value={canonicalDomain}
                  onChange={(e) => setCanonicalDomain(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                />
              </div>
            </div>

            {/* MySQL Connection Config (for Laravel .env generation) */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                <Database className="w-4 h-4" />
                <span>تنظیمات اتصال دیتابیس MySQL / MariaDB (هاست اشتراکی)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">DB_HOST</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">DB_PORT</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">DB_DATABASE</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">DB_USERNAME</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">DB_PASSWORD</label>
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="رمز عبور دیتابیس MySQL..."
                    value={dbPass}
                    onChange={(e) => setDbPass(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">
                    توکن امنیتی نصب (INSTALLER_SETUP_TOKEN در صورت فعال بودن)
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    placeholder="storage/installer_setup.token"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
              </div>
            </div>

            {/* Owner Account Credentials */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                <ShieldCheck className="w-4 h-4" />
                <span>ایجاد حساب مالک پلتفرم (رمز عبور اختصاصی)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-[#929292] mb-1">نام کاربری مدیر *</label>
                  <input
                    type="text"
                    dir="ltr"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#929292] mb-1">ایمیل مالک *</label>
                  <input
                    type="email"
                    dir="ltr"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#929292] mb-1">
                    رمز عبور قوی (حداقل ۸ کاراکتر) *
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    required
                    minLength={8}
                    placeholder="رمز عبور اختصاصی..."
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] disabled:opacity-60 text-[#101010] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال اجرای مایگریشن‌ها، تولید APP_KEY و قفل نصب...</span>
                </>
              ) : (
                <>
                  <span>اجرای نصب نهایی و قفل کردن نصب‌کننده</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
