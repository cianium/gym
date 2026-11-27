import React, { useEffect, useState } from 'react';
import {
  Check,
  CreditCard,
  Database,
  Download,
  Globe,
  History,
  KeyRound,
  Layers,
  MessageSquare,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Tag,
  Trash2,
  Upload
} from 'lucide-react';
import {
  AuditLogEntry,
  BrandConfig,
  ConsultationRequest,
  DiscountCode,
  PageRevision,
  PaymentGatewayStatusInfo,
  SiteModulesConfig
} from '../types';
import {
  INITIAL_BRAND_CONFIG,
  INITIAL_SITE_MODULES
} from '../data/initialData';
import {
  changeAdminPasswordOnServer,
  createPreUpgradeSnapshot,
  exportSystemBackup,
  fetchSystemMaintenanceStatus,
  restoreSystemBackup,
  syncStateToServer,
  SystemMaintenanceStatus
} from '../api/mockGateway';
import { formatPriceNumber, toPersianDigits } from '../utils/format';
import { syncDocumentHeadSeo } from '../utils/seoHead';

interface WhiteLabelControlPanelProps {
  brandConfig?: BrandConfig;
  siteModules?: SiteModulesConfig;
  revisions?: PageRevision[];
  consultations?: ConsultationRequest[];
  discounts?: DiscountCode[];
  gateways?: PaymentGatewayStatusInfo[];
  auditLogs?: AuditLogEntry[];
  onUpdateBrandConfig?: (brand: BrandConfig) => void;
  onUpdateSiteModules?: (modules: SiteModulesConfig) => void;
  onUpdateConsultations?: (items: ConsultationRequest[]) => void;
  onUpdateDiscounts?: (items: DiscountCode[]) => void;
  onPublishRevision?: (label: string) => void;
  onRestoreRevision?: (revision: PageRevision) => void;
  onShowToast: (msg: string) => void;
}

export const WhiteLabelControlPanel: React.FC<WhiteLabelControlPanelProps> = ({
  brandConfig = INITIAL_BRAND_CONFIG,
  siteModules = INITIAL_SITE_MODULES,
  revisions = [],
  consultations = [],
  discounts = [],
  gateways = [],
  auditLogs = [],
  onUpdateBrandConfig,
  onUpdateSiteModules,
  onUpdateConsultations,
  onUpdateDiscounts,
  onPublishRevision,
  onRestoreRevision,
  onShowToast
}) => {
  const [subTab, setSubTab] = useState<
    'brand' | 'modules' | 'revisions' | 'consultations' | 'discounts' | 'security' | 'maintenance'
  >('brand');

  // Maintenance & Backup State
  const [sysStatus, setSysStatus] = useState<SystemMaintenanceStatus | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  useEffect(() => {
    if (subTab === 'maintenance') {
      fetchSystemMaintenanceStatus().then((st) => {
        if (st) setSysStatus(st);
      });
    }
  }, [subTab]);

  // Brand Config Form State
  const [bName, setBName] = useState(brandConfig.brandName);
  const [bSubtitle, setBSubtitle] = useState(brandConfig.brandSubtitle);
  const [seoTitle, setSeoTitle] = useState(brandConfig.seoTitle);
  const [seoDesc, setSeoDesc] = useState(brandConfig.seoDescription);
  const [ogTitle, setOgTitle] = useState(brandConfig.ogTitle || brandConfig.seoTitle);
  const [ogDesc, setOgDesc] = useState(brandConfig.ogDescription || brandConfig.seoDescription);
  const [ogImg, setOgImg] = useState(
    brandConfig.ogImage ||
      brandConfig.shareImageUrl ||
      'https://example.test/media/default-og-cover.jpg'
  );
  const [ogType, setOgType] = useState<'website' | 'profile' | 'article' | 'product'>(
    brandConfig.ogType || 'website'
  );
  const [twitterCard, setTwitterCard] = useState<'summary_large_image' | 'summary'>(
    brandConfig.twitterCard || 'summary_large_image'
  );
  const [domain, setDomain] = useState(brandConfig.canonicalDomain);
  const [copyright, setCopyright] = useState(brandConfig.footerCopyright);
  const [shippingFlat, setShippingFlat] = useState(String(brandConfig.shippingFlatRateToman));
  const [freeShipThreshold, setFreeShipThreshold] = useState(
    String(brandConfig.freeShippingThresholdToman)
  );

  // Revision Publish State
  const [revisionLabel, setRevisionLabel] = useState('');

  // Discount Form State
  const [newCode, setNewCode] = useState('');
  const [newPercent, setNewPercent] = useState('15');
  const [newMaxUses, setNewMaxUses] = useState('50');

  // Security Password State
  const [currPass, setCurrPass] = useState('');
  const [nextPass, setNextPass] = useState('');
  const [nextEmail, setNextEmail] = useState('');
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateBrandConfig) return;
    const nextBrand: BrandConfig = {
      ...brandConfig,
      brandName: bName.trim() || brandConfig.brandName,
      brandSubtitle: bSubtitle.trim() || brandConfig.brandSubtitle,
      seoTitle: seoTitle.trim() || brandConfig.seoTitle,
      seoDescription: seoDesc.trim() || brandConfig.seoDescription,
      ogTitle: ogTitle.trim() || seoTitle.trim() || brandConfig.seoTitle,
      ogDescription: ogDesc.trim() || seoDesc.trim() || brandConfig.seoDescription,
      ogImage: ogImg.trim() || brandConfig.ogImage,
      shareImageUrl: ogImg.trim() || brandConfig.shareImageUrl,
      ogType,
      ogSiteName: bName.trim() || brandConfig.brandName,
      twitterCard,
      canonicalDomain: domain.trim() || brandConfig.canonicalDomain,
      footerCopyright: copyright.trim() || brandConfig.footerCopyright,
      shippingFlatRateToman: Math.max(0, Number(shippingFlat) || 0),
      freeShippingThresholdToman: Math.max(0, Number(freeShipThreshold) || 0)
    };
    syncDocumentHeadSeo(nextBrand);
    const res = await syncStateToServer({ brandConfig: nextBrand });
    if (!res.ok) {
      onShowToast(res.error || 'خطا در ذخیره‌سازی تنظیمات برند در سرور');
      return;
    }
    onUpdateBrandConfig(nextBrand);
    onShowToast('تنظیمات White-Label برند، سئو و OpenGraph در دیتابیس سرور ذخیره شد');
  };

  const toggleModule = async (key: keyof SiteModulesConfig) => {
    if (!onUpdateSiteModules) return;
    const updated: SiteModulesConfig = {
      ...siteModules,
      [key]: !siteModules[key]
    };
    const res = await syncStateToServer({ siteModules: updated });
    if (!res.ok) {
      onShowToast(res.error || 'خطا در به‌روزرسانی ماژول در سرور');
      return;
    }
    onUpdateSiteModules(updated);
    onShowToast('وضعیت ماژول سایت در سرور به‌روزرسانی شد');
  };

  const handleAddDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !onUpdateDiscounts) return;
    const created: DiscountCode = {
      id: `disc-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      percentOff: Math.min(90, Math.max(1, Number(newPercent) || 10)),
      maxUses: Math.max(1, Number(newMaxUses) || 50),
      usedCount: 0,
      active: true,
      createdAt: 'هم‌اکنون'
    };
    const nextDiscounts = [created, ...discounts];
    const res = await syncStateToServer({ discounts: nextDiscounts });
    if (!res.ok) {
      onShowToast(res.error || 'خطا در ثبت کد تخفیف در سرور');
      return;
    }
    onUpdateDiscounts(nextDiscounts);
    setNewCode('');
    onShowToast(`کد تخفیف ${created.code} در دیتابیس سرور ایجاد شد`);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    const res = await changeAdminPasswordOnServer(currPass, nextPass, nextEmail || undefined);
    if (res.ok) {
      setCurrPass('');
      setNextPass('');
      setPassMsg({ ok: true, text: 'رمز عبور مدیریت با موفقیت در سرور تغییر یافت.' });
      onShowToast('رمز عبور مدیریت تغییر یافت');
    } else {
      setPassMsg({ ok: false, text: res.error || 'خطا در تغییر رمز عبور.' });
    }
  };

  const MODULE_META: { key: keyof SiteModulesConfig; title: string; desc: string }[] = [
    {
      key: 'digitalPrograms',
      title: 'فروش برنامه‌های تمرینی دیجیتال',
      desc: 'نمایش و فروش پروتکل‌های تمرینی PDF همراه با صدور توکن دانلود امن'
    },
    {
      key: 'physicalShop',
      title: 'فروشگاه تجهیزات فیزیکی ورزشی',
      desc: 'مدیریت موجودی انبار، محاسبه هزینه ارسال و دریافت آدرس پستی در تسویه‌حساب'
    },
    {
      key: 'exploreReels',
      title: 'فید ویدیویی اکسپلور (Reels)',
      desc: 'پخش‌کننده عمودی ویدیوهای آموزشی و کاروسل‌های تکنیک حرکتی متصل به محصولات'
    },
    {
      key: 'coachingRequests',
      title: 'فرم دریافت درخواست مشاوره و ارزیابی',
      desc: 'ثبت درخواست‌های مشاوره ورزشکاران در صفحه تماس و پنل مدیریت'
    },
    {
      key: 'nfcSmartCard',
      title: 'کارت ویزیت هوشمند QR / NFC',
      desc: 'دکمه اشتراک‌گذاری سریع پروفایل مربی در هدر و بخش Hero'
    },
    {
      key: 'discounts',
      title: 'سیستم کد تخفیف در تسویه‌حساب',
      desc: 'امکان وارد کردن کد کوپن تخفیف در مرحله تسویه‌حساب با اعتبارسنجی سرور'
    }
  ];

  return (
    <div className="space-y-6" data-testid="white-label-control-panel">
      {/* Sub-navigation bar */}
      <div className="flex items-center gap-2 p-1.5 bg-[#161616] rounded-2xl border border-white/[0.08] overflow-x-auto no-scrollbar">
        {[
          { id: 'brand', label: 'تنظیمات برند و سئو (White-Label)', icon: Globe },
          { id: 'modules', label: 'ماژول‌های فعال سایت', icon: Sliders },
          {
            id: 'revisions',
            label: `تاریخچه نسخه‌ها (${toPersianDigits(revisions.length)})`,
            icon: History
          },
          {
            id: 'consultations',
            label: `درخواست‌های مشاوره (${toPersianDigits(consultations.length)})`,
            icon: MessageSquare
          },
          {
            id: 'discounts',
            label: `کدهای تخفیف (${toPersianDigits(discounts.length)})`,
            icon: Tag
          },
          { id: 'security', label: 'درگاه پرداخت، امنیت و لاگ سرور', icon: ShieldCheck },
          { id: 'maintenance', label: 'پشتیبان‌گیری، بازیابی و ارتقا (v2.2.0)', icon: Database }
        ].map((item) => {
          const Icon = item.icon;
          const active = subTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id as typeof subTab)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? 'bg-[#C8A66A] text-[#101010]'
                  : 'text-[#929292] hover:text-[#F5F2EC]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. BRAND & SEO */}
      {subTab === 'brand' && (
        <form
          onSubmit={handleSaveBrand}
          className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4 max-w-3xl"
        >
          <div>
            <div className="text-xs font-semibold text-[#C8A66A]">
              معماری مستقل از برند (Brand-Independent System)
            </div>
            <h3 className="text-base font-extrabold text-[#F5F2EC] mt-0.5">
              تنظیمات نام برند، سئو، فوتر و تعرفه ارسال
            </h3>
            <p className="text-xs text-[#929292] mt-1">
              تمامی عناوین سایت، متاتگ‌های سئو و فوتر بدون نیاز به تغییر کد از این بخش خوانده می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1">نام رسمی برند / آکادمی</label>
              <input
                type="text"
                value={bName}
                onChange={(e) => setBName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#929292] mb-1">شعار کوتاه برند</label>
              <input
                type="text"
                value={bSubtitle}
                onChange={(e) => setBSubtitle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان سئو (HTML Title)</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#929292] mb-1">دامنه اختصاصی نصب (Canonical URL)</label>
              <input
                type="url"
                dir="ltr"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">توضیحات متا سئو (Meta Description)</label>
            <textarea
              rows={2}
              value={seoDesc}
              onChange={(e) => setSeoDesc(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان OpenGraph (og:title)</label>
              <input
                type="text"
                value={ogTitle}
                onChange={(e) => setOgTitle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#929292] mb-1">تصویر اشتراک‌گذاری OpenGraph (og:image)</label>
              <input
                type="text"
                dir="ltr"
                value={ogImg}
                onChange={(e) => setOgImg(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs text-[#929292] mb-1">نوع محتوا (og:type)</label>
              <select
                value={ogType}
                onChange={(e) =>
                  setOgType(e.target.value as 'website' | 'profile' | 'article' | 'product')
                }
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              >
                <option value="website">website</option>
                <option value="profile">profile</option>
                <option value="product">product</option>
                <option value="article">article</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs text-[#929292] mb-1">کارت توییتر (twitter:card)</label>
              <select
                value={twitterCard}
                onChange={(e) =>
                  setTwitterCard(e.target.value as 'summary_large_image' | 'summary')
                }
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              >
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs text-[#929292] mb-1">توضیحات OpenGraph (og:description)</label>
              <input
                type="text"
                value={ogDesc}
                onChange={(e) => setOgDesc(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1">
                هزینه ارسال ثابت محصولات فیزیکی (تومان)
              </label>
              <input
                type="number"
                dir="ltr"
                value={shippingFlat}
                onChange={(e) => setShippingFlat(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
            </div>
            <div>
              <label className="block text-xs text-[#929292] mb-1">
                سقف ارسال رایگان (تومان)
              </label>
              <input
                type="number"
                dir="ltr"
                value={freeShipThreshold}
                onChange={(e) => setFreeShipThreshold(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">متن کپی‌رایت فوتر</label>
            <input
              type="text"
              value={copyright}
              onChange={(e) => setCopyright(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
            />
          </div>

          <button
            type="submit"
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تنظیمات برند و سئو</span>
          </button>
        </form>
      )}

      {/* 2. SITE MODULES */}
      {subTab === 'modules' && (
        <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4">
          <div>
            <div className="text-xs font-semibold text-[#C8A66A]">ماژول‌های قابل تنظیم سایت</div>
            <h3 className="text-base font-extrabold text-[#F5F2EC] mt-0.5">
              فعال یا غیرفعال‌سازی امکانات پلتفرم برای این مربی
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULE_META.map((mod) => {
              const enabled = siteModules[mod.key];
              return (
                <div
                  key={mod.key}
                  className="p-4 rounded-2xl bg-[#141414] border border-white/[0.07] flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#F5F2EC]">{mod.title}</div>
                    <p className="text-[11px] text-[#929292] mt-1 leading-relaxed">{mod.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggleModule(mod.key)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer border transition-colors ${
                      enabled
                        ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                        : 'bg-[#101010] text-[#929292] border-white/10'
                    }`}
                  >
                    {enabled ? 'فعال' : 'غیرفعال'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VISUAL BUILDER REVISIONS (Draft / Publish / Restore) */}
      {subTab === 'revisions' && (
        <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="text-xs font-semibold text-[#C8A66A]">
                تاریخچه نسخه‌های صفحه‌ساز (Page Revisions)
              </div>
              <h3 className="text-base font-extrabold text-[#F5F2EC] mt-0.5">
                ثبت نسخه جدید (Publish Snapshot) و بازگردانی چیدمان‌های قبلی
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={revisionLabel}
                onChange={(e) => setRevisionLabel(e.target.value)}
                placeholder="عنوان نسخه (مثلاً چیدمان کمپین زمستان)..."
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
              <button
                type="button"
                onClick={() => {
                  if (onPublishRevision) {
                    onPublishRevision(revisionLabel.trim() || 'نسخه منتشرشده توسط مربی');
                    setRevisionLabel('');
                  }
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold whitespace-nowrap cursor-pointer"
              >
                ثبت و انتشار نسخه
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-[#C8A66A]">
                      v{toPersianDigits(rev.versionNumber)}
                    </span>
                    <span className="font-bold text-[#F5F2EC]">{rev.label}</span>
                  </div>
                  <div className="text-[11px] text-[#929292] mt-1">
                    زمان ثبت: {rev.createdAt} · توسط: {rev.createdBy} · تعداد بخش‌ها:{' '}
                    {toPersianDigits(rev.sectionsSnapshot.length)}
                  </div>
                </div>

                {onRestoreRevision && (
                  <button
                    type="button"
                    onClick={() => onRestoreRevision(rev)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>بازگردانی این نسخه</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. COACHING CONSULTATION REQUESTS */}
      {subTab === 'consultations' && (
        <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4">
          <h3 className="text-base font-extrabold text-[#F5F2EC]">
            درخواست‌های مشاوره و ارزیابی ثبت‌شده توسط ورزشکاران ({toPersianDigits(consultations.length)})
          </h3>

          {consultations.length === 0 ? (
            <p className="text-xs text-[#929292]">هنوز درخواست مشاوره‌ای ثبت نشده است.</p>
          ) : (
            <div className="space-y-3">
              {consultations.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#F5F2EC]">{req.senderName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#C8A66A]" dir="ltr">
                        {req.senderPhone}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#929292]">{req.createdAt}</span>
                    </div>
                    <div className="text-[#C8A66A] font-semibold">{req.goalTopic}</div>
                    <p className="text-[#C8C4BC] leading-relaxed">{req.message}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!onUpdateConsultations) return;
                      const nextStatus = req.status === 'new' ? 'contacted' : 'new';
                      onUpdateConsultations(
                        consultations.map((c) =>
                          c.id === req.id ? { ...c, status: nextStatus } : c
                        )
                      );
                      onShowToast('وضعیت درخواست مشاوره تغییر کرد');
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer border ${
                      req.status === 'contacted'
                        ? 'bg-[#254F38]/30 border-[#3E7B59]/60 text-[#9CE2B9]'
                        : 'bg-[#C8A66A]/15 border-[#C8A66A]/45 text-[#C8A66A]'
                    }`}
                  >
                    {req.status === 'contacted' ? 'تماس گرفته شد' : 'جدید — در انتظار تماس'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. DISCOUNT CODES */}
      {subTab === 'discounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAddDiscount}
            className="lg:col-span-5 bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4"
          >
            <h3 className="text-base font-extrabold text-[#F5F2EC]">ایجاد کد تخفیف جدید</h3>
            <div>
              <label className="block text-xs text-[#929292] mb-1">کد تخفیف (لاتین)</label>
              <input
                type="text"
                dir="ltr"
                required
                placeholder="WINTER20"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#929292] mb-1">درصد تخفیف</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={newPercent}
                  onChange={(e) => setNewPercent(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#929292] mb-1">سقف تعداد استفاده</label>
                <input
                  type="number"
                  min={1}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت کد تخفیف</span>
            </button>
          </form>

          <div className="lg:col-span-7 bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-3">
            <h3 className="text-base font-extrabold text-[#F5F2EC]">کدهای تخفیف فعال</h3>
            {discounts.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="text-xs">
                  <span className="font-mono font-extrabold text-sm text-[#C8A66A]">{d.code}</span>
                  <span className="text-[#F5F2EC] mr-3 font-bold">
                    {toPersianDigits(d.percentOff)}٪ تخفیف
                  </span>
                  <div className="text-[11px] text-[#929292] mt-1">
                    استفاده شده: {toPersianDigits(d.usedCount)} از {toPersianDigits(d.maxUses)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!onUpdateDiscounts) return;
                    onUpdateDiscounts(discounts.filter((x) => x.id !== d.id));
                    onShowToast('کد تخفیف حذف شد');
                  }}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 text-[#929292] hover:text-red-400 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. SECURITY, GATEWAY READINESS & AUDIT LOGS */}
      {subTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-6">
            {/* Payment Gateways Honest Readiness Status */}
            <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                <CreditCard className="w-4 h-4" />
                <span>وضعیت اتصال درگاه‌های پرداخت بانکی (PaymentProvider)</span>
              </div>
              <div className="space-y-3">
                {gateways.map((gw) => (
                  <div
                    key={gw.id}
                    className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#F5F2EC]">{gw.title}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          gw.merchantConfigured ? 'text-[#9CE2B9]' : 'text-[#C8A66A]'
                        }`}
                      >
                        {gw.merchantConfigured ? 'پیکربندی شده' : 'حالت شبیه‌ساز توسعه (Sandbox)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#929292]">{gw.readinessLabel}</p>
                    <div className="text-[10px] font-mono text-[#929292] truncate" dir="ltr">
                      Callback: {gw.callbackUrl}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Admin Password Change Form */}
            <form
              onSubmit={handlePasswordChange}
              className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                <KeyRound className="w-4 h-4" />
                <span>تغییر رمز عبور و ایمیل مدیر (هش رمزنگاری‌شده Scrypt)</span>
              </div>

              {passMsg && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    passMsg.ok
                      ? 'bg-[#254F38]/30 border border-[#3E7B59] text-[#9CE2B9]'
                      : 'bg-red-500/15 border border-red-500/35 text-red-300'
                  }`}
                >
                  {passMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs text-[#929292] mb-1">رمز عبور فعلی *</label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                />
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  رمز عبور جدید (حداقل ۸ کاراکتر) *
                </label>
                <input
                  type="password"
                  dir="ltr"
                  required
                  minLength={8}
                  value={nextPass}
                  onChange={(e) => setNextPass(e.target.value)}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                />
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  ایمیل جدید مدیریت (اختیاری)
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={nextEmail}
                  onChange={(e) => setNextEmail(e.target.value)}
                  placeholder="admin@coach-domain.ir"
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
                />
              </div>

              <button
                type="submit"
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold cursor-pointer"
              >
                به‌روزرسانی رمز عبور در سرور
              </button>
            </form>
          </div>

          {/* Audit Logs */}
          <div className="lg:col-span-6 bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-[#C8A66A]">
                لاگ امنیتی رویدادهای سرور (Audit Logs)
              </div>
              <span className="text-[11px] text-[#929292]">
                {toPersianDigits(auditLogs.length)} رویداد اخیر
              </span>
            </div>
            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-[#141414] border border-white/[0.06] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-[#C8A66A]">{log.action}</span>
                    <span className="text-[11px] text-[#929292]">{log.createdAt}</span>
                  </div>
                  <p className="text-[#F5F2EC]">{log.details}</p>
                  <div className="text-[10px] font-mono text-[#929292]" dir="ltr">
                    Actor: {log.actor} · IP: {log.ip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. BACKUP, RESTORE & NON-DESTRUCTIVE UPGRADE (Section 9) */}
      {subTab === 'maintenance' && (
        <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="text-xs font-semibold text-[#C8A66A]">
                مدیریت پشتیبان‌گیری، بازیابی و ارتقای غیرمخرب (Backup, Restore & Upgrade)
              </div>
              <h3 className="text-base font-extrabold text-[#F5F2EC] mt-0.5">
                نسخه جاری پلتفرم: v{sysStatus?.releaseVersion || '2.2.0'} · اسکیما:{' '}
                <span className="font-mono text-xs text-[#C8A66A]">
                  {sysStatus?.schemaVersion || '2025_01_01_000001'}
                </span>
              </h3>
              <p className="text-xs text-[#929292] mt-1">
                بسته پشتیبان شامل دیتابیس، تنظیمات برند، سفارش‌ها، مجوزهای دانلود، تصاویر رسانه و فایل‌های PDF خصوصی به همراه امضای SHA-256 است.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={backupBusy}
                onClick={async () => {
                  setBackupBusy(true);
                  const res = await createPreUpgradeSnapshot();
                  setBackupBusy(false);
                  if (res.ok) {
                    onShowToast(`اسنپ‌شات امن پیش از ارتقا (${res.filename}) ذخیره شد`);
                    const st = await fetchSystemMaintenanceStatus();
                    if (st) setSysStatus(st);
                  } else {
                    onShowToast(res.error || 'خطا در ایجاد اسنپ‌شات');
                  }
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-[#F5F2EC] flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#C8A66A]" />
                <span>ثبت اسنپ‌شات پیش از ارتقا</span>
              </button>

              <button
                type="button"
                disabled={backupBusy}
                onClick={async () => {
                  setBackupBusy(true);
                  const res = await exportSystemBackup();
                  setBackupBusy(false);
                  if (res.ok && res.bundle) {
                    const blob = new Blob([JSON.stringify(res.bundle, null, 2)], {
                      type: 'application/json'
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `whitelabel-fitness-backup-v2.2.0-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    onShowToast('نسخه پشتیبان کامل با امضای SHA-256 دانلود شد');
                  } else {
                    onShowToast(res.error || 'خطا در دریافت فایل پشتیبان');
                  }
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>دانلود نسخه پشتیبان کامل (JSON + Files)</span>
              </button>

              <label className="min-h-[42px] px-4 py-2 rounded-xl bg-[#141414] hover:bg-white/10 border border-[#C8A66A]/40 text-xs font-bold text-[#C8A66A] flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>بازیابی از فایل پشتیبان</span>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setBackupBusy(true);
                      const text = await file.text();
                      const parsed = JSON.parse(text) as Record<string, unknown>;
                      const res = await restoreSystemBackup(parsed);
                      setBackupBusy(false);
                      if (res.ok) {
                        onShowToast(
                          `بازیابی کامل با موفقیت انجام شد (${toPersianDigits(
                            res.restoredCounts?.orders ?? 0
                          )} سفارش و فایل‌ها بازگردانی شدند)`
                        );
                        const st = await fetchSystemMaintenanceStatus();
                        if (st) setSysStatus(st);
                      } else {
                        onShowToast(res.error || 'خطا در بازیابی فایل پشتیبان');
                      }
                    } catch {
                      setBackupBusy(false);
                      onShowToast('فایل انتخاب‌شده یک بسته پشتیبان معتبر JSON نیست.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {sysStatus && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {[
                { label: 'محصولات', val: sysStatus.counts.products },
                { label: 'پست‌های ویدیویی', val: sysStatus.counts.posts },
                { label: 'سفارش‌ها', val: sysStatus.counts.orders },
                { label: 'مجوزهای دانلود', val: sysStatus.counts.entitlements },
                { label: 'فایل‌های رسانه', val: sysStatus.counts.mediaFiles },
                { label: 'نسخه‌های چیدمان', val: sysStatus.counts.revisions }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3.5 rounded-2xl bg-[#141414] border border-white/[0.06]"
                >
                  <div className="text-[#929292]">{stat.label}</div>
                  <div className="text-base font-extrabold text-[#F5F2EC] mt-1 tabular-nums">
                    {toPersianDigits(stat.val)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sysStatus?.snapshots && sysStatus.snapshots.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#C8A66A]">
                اسنپ‌شات‌های محافظتی ذخیره‌شده در سرور ({toPersianDigits(sysStatus.snapshots.length)})
              </div>
              <div className="space-y-2">
                {sysStatus.snapshots.map((snap) => (
                  <div
                    key={snap.filename}
                    className="p-3 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-[#F5F2EC]" dir="ltr">
                      {snap.filename}
                    </span>
                    <span className="text-[#929292] font-mono" dir="ltr">
                      {Math.round(snap.sizeBytes / 1024)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
