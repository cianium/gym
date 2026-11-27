import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Search,
  Share2,
  Sparkles,
  Upload
} from 'lucide-react';
import { BrandConfig, CoachProfile } from '../types';
import { INITIAL_BRAND_CONFIG } from '../data/initialData';
import { syncStateToServer, uploadMediaToServer } from '../api/mockGateway';
import { toPersianDigits } from '../utils/format';
import { resolveEffectiveSeoMetadata, syncDocumentHeadSeo } from '../utils/seoHead';

export interface SeoOpenGraphEditorProps {
  brandConfig?: BrandConfig;
  coach?: CoachProfile;
  onUpdateBrandConfig?: (brand: BrandConfig) => void;
  onShowToast?: (msg: string) => void;
}

export const SeoOpenGraphEditor: React.FC<SeoOpenGraphEditorProps> = ({
  brandConfig = INITIAL_BRAND_CONFIG,
  coach,
  onUpdateBrandConfig,
  onShowToast
}) => {
  const [seoTitle, setSeoTitle] = useState<string>(brandConfig.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState<string>(
    brandConfig.seoDescription || ''
  );
  const [canonicalDomain, setCanonicalDomain] = useState<string>(
    brandConfig.canonicalDomain || 'https://example.test'
  );
  const [ogTitle, setOgTitle] = useState<string>(
    brandConfig.ogTitle || brandConfig.seoTitle || ''
  );
  const [ogDescription, setOgDescription] = useState<string>(
    brandConfig.ogDescription || brandConfig.seoDescription || ''
  );
  const [ogSiteName, setOgSiteName] = useState<string>(
    brandConfig.ogSiteName || brandConfig.brandName || ''
  );
  const [ogImage, setOgImage] = useState<string>(
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

  const [previewTab, setPreviewTab] = useState<'serp' | 'social' | 'head'>('social');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const ogFileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync local form state when brandConfig prop updates from server bootstrap
  useEffect(() => {
    setSeoTitle(brandConfig.seoTitle || '');
    setSeoDescription(brandConfig.seoDescription || '');
    setCanonicalDomain(brandConfig.canonicalDomain || 'https://example.test');
    setOgTitle(brandConfig.ogTitle || brandConfig.seoTitle || '');
    setOgDescription(brandConfig.ogDescription || brandConfig.seoDescription || '');
    setOgSiteName(brandConfig.ogSiteName || brandConfig.brandName || '');
    setOgImage(
      brandConfig.ogImage ||
        brandConfig.shareImageUrl ||
        'https://example.test/media/default-og-cover.jpg'
    );
    setOgType(brandConfig.ogType || 'website');
    setTwitterCard(brandConfig.twitterCard || 'summary_large_image');
  }, [
    brandConfig.seoTitle,
    brandConfig.seoDescription,
    brandConfig.canonicalDomain,
    brandConfig.ogTitle,
    brandConfig.ogDescription,
    brandConfig.ogSiteName,
    brandConfig.ogImage,
    brandConfig.shareImageUrl,
    brandConfig.ogType,
    brandConfig.twitterCard,
    brandConfig.brandName
  ]);

  const draftBrandConfig: BrandConfig = {
    ...brandConfig,
    seoTitle: seoTitle.trim() || brandConfig.seoTitle,
    seoDescription: seoDescription.trim() || brandConfig.seoDescription,
    canonicalDomain: canonicalDomain.trim() || brandConfig.canonicalDomain,
    ogTitle: ogTitle.trim() || seoTitle.trim() || brandConfig.seoTitle,
    ogDescription:
      ogDescription.trim() || seoDescription.trim() || brandConfig.seoDescription,
    ogSiteName: ogSiteName.trim() || brandConfig.brandName,
    ogImage: ogImage.trim() || brandConfig.ogImage,
    shareImageUrl: ogImage.trim() || brandConfig.shareImageUrl,
    ogType,
    twitterCard
  };

  // Dynamically reflect edits in document.head immediately as the admin configures them
  useEffect(() => {
    syncDocumentHeadSeo(draftBrandConfig, { coach });
  }, [
    seoTitle,
    seoDescription,
    canonicalDomain,
    ogTitle,
    ogDescription,
    ogSiteName,
    ogImage,
    ogType,
    twitterCard,
    coach
  ]);

  const resolvedPreview = resolveEffectiveSeoMetadata(draftBrandConfig, { coach });

  const titleLength = seoTitle.trim().length;
  const descLength = seoDescription.trim().length;
  const isTitleOptimal = titleLength >= 30 && titleLength <= 65;
  const isDescOptimal = descLength >= 100 && descLength <= 165;

  const handleSyncOgFromSeo = () => {
    setOgTitle(seoTitle);
    setOgDescription(seoDescription);
    if (!ogSiteName.trim()) {
      setOgSiteName(brandConfig.brandName);
    }
    const msg = 'عنوان و توضیحات OpenGraph از مقادیر سئوی سراسری کپی شد';
    setStatusMessage({ ok: true, text: msg });
    onShowToast?.(msg);
  };

  const handleUploadOgCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setStatusMessage({
        ok: false,
        text: 'لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب کنید.'
      });
      return;
    }
    setIsUploadingImage(true);
    setStatusMessage(null);
    try {
      const uploadRes = await uploadMediaToServer(file, file.name || 'og-cover.jpg');
      if (!uploadRes.ok || !uploadRes.url) {
        setStatusMessage({
          ok: false,
          text: uploadRes.error || 'خطا در آپلود تصویر OpenGraph روی سرور'
        });
      } else {
        setOgImage(uploadRes.url);
        const msg = 'تصویر اشتراک‌گذاری OpenGraph با موفقیت در سرور ذخیره شد';
        setStatusMessage({ ok: true, text: msg });
        onShowToast?.(msg);
      }
    } catch {
      setStatusMessage({
        ok: false,
        text: 'خطا در ارتباط با سرور هنگام آپلود تصویر OpenGraph'
      });
    } finally {
      setIsUploadingImage(false);
      if (ogFileInputRef.current) {
        ogFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveSeoSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (
      ogImage.trim().toLowerCase().startsWith('data:image/') ||
      ogImage.trim().toLowerCase().startsWith('data:application/')
    ) {
      setStatusMessage({
        ok: false,
        text: 'ذخیره مستقیم تصاویر Base64 مجاز نیست. لطفاً از دکمه آپلود تصویر یا لینک استاندارد استفاده کنید.'
      });
      return;
    }

    const updatedBrand: BrandConfig = {
      ...brandConfig,
      seoTitle: seoTitle.trim() || brandConfig.seoTitle,
      seoDescription: seoDescription.trim() || brandConfig.seoDescription,
      canonicalDomain: canonicalDomain.trim() || brandConfig.canonicalDomain,
      ogTitle: ogTitle.trim() || seoTitle.trim() || brandConfig.seoTitle,
      ogDescription:
        ogDescription.trim() || seoDescription.trim() || brandConfig.seoDescription,
      ogSiteName: ogSiteName.trim() || brandConfig.brandName,
      ogImage: ogImage.trim() || undefined,
      shareImageUrl: ogImage.trim() || undefined,
      ogType,
      twitterCard
    };

    // Immediately reflect in document.head and parent React state
    syncDocumentHeadSeo(updatedBrand, { coach });
    onUpdateBrandConfig?.(updatedBrand);

    setIsSaving(true);
    try {
      const res = await syncStateToServer({ brandConfig: updatedBrand });
      if (!res.ok) {
        setStatusMessage({
          ok: false,
          text: res.error || 'خطا در ذخیره‌سازی تنظیمات سئو و OpenGraph در سرور'
        });
        onShowToast?.(res.error || 'خطا در ذخیره‌سازی تنظیمات سئو در سرور');
        return;
      }
      const successText =
        'تنظیمات سئوی سراسری و تگ‌های OpenGraph ذخیره و در <head> سند اعمال شد';
      setStatusMessage({ ok: true, text: successText });
      onShowToast?.(successText);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-testid="seo-opengraph-admin-panel"
      className="space-y-6"
    >
      {/* Top Banner */}
      <div className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#C8A66A] flex items-center gap-1.5">
            <Globe className="w-4 h-4" />
            <span>مدیریت سئوی سراسری و کارت‌های اشتراک‌گذاری اجتماعی (Global SEO & OpenGraph)</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#F5F2EC] mt-1">
            تنظیمات عنوان سئو، توضیحات متا، تگ‌های OpenGraph و کارت‌های شبکه اجتماعی
          </h2>
          <p className="text-xs text-[#929292] mt-1 leading-relaxed">
            هرگونه تغییر در این بخش به‌صورت بلادرنگ در تگ‌های{' '}
            <code className="font-mono text-[#C8A66A]" dir="ltr">
              &lt;head&gt;
            </code>{' '}
            مرورگر و خروجی سرور (SSR) برای موتورهای جستجو و شبکه‌های اجتماعی (تلگرام، واتس‌اپ، لینکدین و X) اعمال می‌شود.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="seo-sync-og-button"
            onClick={handleSyncOgFromSeo}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-[#C8A66A]" />
            <span>کپی از عنوان و توضیحات سئو به OpenGraph</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          data-testid="seo-status-banner"
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            statusMessage.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Column */}
        <form
          onSubmit={handleSaveSeoSettings}
          data-testid="seo-opengraph-form"
          className="lg:col-span-7 bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-6"
        >
          {/* Section 1: Search Engine Optimization (SEO) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#C8A66A]" />
                <h3 className="text-sm font-extrabold text-[#F5F2EC]">
                  ۱. متاتگ‌های اصلی موتور جستجو (Google SEO)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#929292]" dir="ltr">
                &lt;title&gt; &amp; meta[name=&quot;description&quot;]
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="global-seo-title-input"
                  className="text-xs font-semibold text-[#F5F2EC]"
                >
                  عنوان سراسری سئو (Global SEO Title) *
                </label>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                    isTitleOptimal
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-[#C8A66A]/15 text-[#C8A66A]'
                  }`}
                >
                  {toPersianDigits(titleLength)} کاراکتر (بازه ایده‌آل: ۳۰ تا ۶۰)
                </span>
              </div>
              <input
                id="global-seo-title-input"
                data-testid="seo-title-input"
                type="text"
                required
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="مثال: آرش کاظمی — پلتفرم جامع مربی فیتنس و برنامه‌های تمرینی"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="global-seo-description-input"
                  className="text-xs font-semibold text-[#F5F2EC]"
                >
                  توضیحات متا سئو (Global Meta Description) *
                </label>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                    isDescOptimal
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-[#C8A66A]/15 text-[#C8A66A]'
                  }`}
                >
                  {toPersianDigits(descLength)} کاراکتر (بازه ایده‌آل: ۱۲۰ تا ۱۶۰)
                </span>
              </div>
              <textarea
                id="global-seo-description-input"
                data-testid="seo-description-input"
                rows={3}
                required
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="خلاصه یک تا دو جمله‌ای از خدمات مربیگری، برنامه‌های تمرینی و تجهیزات تخصصی برای نمایش در نتایج گوگل..."
                className="w-full p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] leading-relaxed focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label
                htmlFor="global-canonical-domain-input"
                className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
              >
                آدرس دامنه کانونیکال (Canonical Domain URL)
              </label>
              <input
                id="global-canonical-domain-input"
                data-testid="seo-canonical-input"
                type="url"
                dir="ltr"
                value={canonicalDomain}
                onChange={(e) => setCanonicalDomain(e.target.value)}
                placeholder="https://example.test"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>
          </div>

          {/* Section 2: OpenGraph & Twitter Cards */}
          <div className="space-y-4 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-[#C8A66A]" />
                <h3 className="text-sm font-extrabold text-[#F5F2EC]">
                  ۲. تگ‌های OpenGraph و کارت‌های شبکه اجتماعی (Social Share)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#929292]" dir="ltr">
                og:* &amp; twitter:*
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="og-title-input"
                  className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
                >
                  عنوان اشتراک‌گذاری (og:title)
                </label>
                <input
                  id="og-title-input"
                  data-testid="og-title-input"
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder="عنوان کارت در تلگرام، واتس‌اپ و لینکدین"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                />
              </div>

              <div>
                <label
                  htmlFor="og-site-name-input"
                  className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
                >
                  نام سایت در OpenGraph (og:site_name)
                </label>
                <input
                  id="og-site-name-input"
                  data-testid="og-site-name-input"
                  type="text"
                  value={ogSiteName}
                  onChange={(e) => setOgSiteName(e.target.value)}
                  placeholder="نام رسمی آکادمی یا برند مربی"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="og-description-input"
                className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
              >
                توضیحات کارت اشتراک‌گذاری (og:description)
              </label>
              <textarea
                id="og-description-input"
                data-testid="og-description-input"
                rows={2}
                value={ogDescription}
                onChange={(e) => setOgDescription(e.target.value)}
                placeholder="توضیحات نمایش داده شده در زیر عنوان کارت اشتراک‌گذاری..."
                className="w-full p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] leading-relaxed focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="og-type-select"
                  className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
                >
                  نوع محتوای OpenGraph (og:type)
                </label>
                <select
                  id="og-type-select"
                  data-testid="og-type-select"
                  value={ogType}
                  onChange={(e) =>
                    setOgType(
                      e.target.value as 'website' | 'profile' | 'article' | 'product'
                    )
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                >
                  <option value="website">وب‌سایت رسمی (website)</option>
                  <option value="profile">پروفایل مربی (profile)</option>
                  <option value="product">فروشگاه و محصولات (product)</option>
                  <option value="article">مقاله و آموزش (article)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="twitter-card-select"
                  className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
                >
                  قالب کارت توییتر / X (twitter:card)
                </label>
                <select
                  id="twitter-card-select"
                  data-testid="twitter-card-select"
                  value={twitterCard}
                  onChange={(e) =>
                    setTwitterCard(
                      e.target.value as 'summary_large_image' | 'summary'
                    )
                  }
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                >
                  <option value="summary_large_image">
                    کارت عریض با تصویر بزرگ (summary_large_image)
                  </option>
                  <option value="summary">کارت فشرده با تصویر کوچک (summary)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="og-image-input"
                className="block text-xs font-semibold text-[#F5F2EC] mb-1.5"
              >
                تصویر کاور OpenGraph (og:image &amp; twitter:image — ابعاد پیشنهادی ۱۲۰۰×۶۳۰)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  id="og-image-input"
                  data-testid="og-image-input"
                  type="text"
                  dir="ltr"
                  value={ogImage}
                  onChange={(e) => setOgImage(e.target.value)}
                  placeholder="https://example.test/media/default-og-cover.jpg"
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
                />
                <input
                  ref={ogFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleUploadOgCoverImage}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => ogFileInputRef.current?.click()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#141414] hover:bg-white/10 border border-white/15 text-xs font-bold text-[#C8A66A] flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? 'در حال آپلود...' : 'آپلود تصویر کاور'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              data-testid="save-seo-opengraph-button"
              disabled={isSaving}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] disabled:opacity-60 text-[#101010] text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'در حال ذخیره‌سازی در سرور...'
                  : 'ذخیره تنظیمات سئو و OpenGraph'}
              </span>
            </button>

            <span className="text-[11px] text-[#929292] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C8A66A]" />
              <span>همگام‌سازی خودکار با document.head فعال است</span>
            </span>
          </div>
        </form>

        {/* Live Preview & Document Head Verification Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[#F5F2EC]">
                پیش‌نمایش زنده (Live SERP &amp; OpenGraph Preview)
              </h3>
              <div className="flex items-center gap-1 p-1 bg-[#101010] rounded-xl border border-white/[0.08]">
                {[
                  { id: 'social', label: 'کارت شبکه اجتماعی' },
                  { id: 'serp', label: 'نتایج گوگل' },
                  { id: 'head', label: 'کدهای <head>' }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPreviewTab(t.id as typeof previewTab)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      previewTab === t.id
                        ? 'bg-[#C8A66A] text-[#101010]'
                        : 'text-[#929292] hover:text-[#F5F2EC]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Social Share Card Preview */}
            {previewTab === 'social' && (
              <div
                data-testid="seo-social-card-preview"
                className="rounded-2xl overflow-hidden bg-[#101010] border border-white/10 shadow-xl"
              >
                <div className="aspect-[1.91/1] bg-gradient-to-br from-[#241E14] via-[#161616] to-[#101010] relative overflow-hidden flex items-center justify-center border-b border-white/10">
                  {resolvedPreview.ogImage &&
                  !resolvedPreview.ogImage.endsWith('default-og-cover.jpg') ? (
                    <img
                      src={resolvedPreview.ogImage}
                      alt={resolvedPreview.ogTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] flex items-center justify-center mx-auto">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-extrabold text-[#F5F2EC]">
                        {resolvedPreview.ogSiteName}
                      </div>
                      <div className="text-[10px] font-mono text-[#C8A66A]" dir="ltr">
                        1200 × 630 · {resolvedPreview.twitterCard}
                      </div>
                    </div>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm border border-white/15 text-[10px] font-mono text-[#C8A66A]" dir="ltr">
                    og:type={resolvedPreview.ogType}
                  </span>
                </div>

                <div className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#929292]">
                    <span className="font-semibold text-[#C8A66A] truncate">
                      {resolvedPreview.ogSiteName}
                    </span>
                    <span className="font-mono text-[10px] truncate" dir="ltr">
                      {resolvedPreview.canonicalBase.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#F5F2EC] line-clamp-2 leading-snug">
                    {resolvedPreview.ogTitle}
                  </div>
                  <p className="text-[11px] text-[#929292] line-clamp-2 leading-relaxed">
                    {resolvedPreview.ogDescription}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Google Search SERP Preview */}
            {previewTab === 'serp' && (
              <div
                data-testid="seo-serp-preview"
                className="p-5 rounded-2xl bg-[#101010] border border-white/10 space-y-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#1D1D1D] border border-white/10 flex items-center justify-center text-[#C8A66A] text-xs font-bold shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#F5F2EC] truncate">
                      {resolvedPreview.brandName}
                    </div>
                    <div
                      className="text-[11px] text-[#929292] font-mono truncate flex items-center gap-1"
                      dir="ltr"
                    >
                      <span>{resolvedPreview.canonicalUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </div>
                  </div>
                </div>

                <div className="text-sm sm:text-base font-bold text-[#8AB4F8] hover:underline leading-snug line-clamp-2">
                  {resolvedPreview.seoTitle}
                </div>

                <p className="text-xs text-[#BDC1C6] leading-relaxed line-clamp-3">
                  {resolvedPreview.seoDescription}
                </p>
              </div>
            )}

            {/* 3. Active <head> Tags Inspector */}
            {previewTab === 'head' && (
              <div
                data-testid="seo-head-code-inspector"
                dir="ltr"
                className="p-4 rounded-2xl bg-[#101010] border border-white/10 font-mono text-[11px] text-[#C8A66A] space-y-1.5 overflow-x-auto text-left"
              >
                <div>&lt;title&gt;{resolvedPreview.seoTitle}&lt;/title&gt;</div>
                <div>
                  &lt;meta name=&quot;description&quot; content=&quot;
                  {resolvedPreview.seoDescription}&quot; /&gt;
                </div>
                <div>
                  &lt;link rel=&quot;canonical&quot; href=&quot;
                  {resolvedPreview.canonicalUrl}&quot; /&gt;
                </div>
                <div>
                  &lt;meta property=&quot;og:title&quot; content=&quot;
                  {resolvedPreview.ogTitle}&quot; /&gt;
                </div>
                <div>
                  &lt;meta property=&quot;og:description&quot; content=&quot;
                  {resolvedPreview.ogDescription}&quot; /&gt;
                </div>
                <div>
                  &lt;meta property=&quot;og:type&quot; content=&quot;
                  {resolvedPreview.ogType}&quot; /&gt;
                </div>
                <div>
                  &lt;meta property=&quot;og:site_name&quot; content=&quot;
                  {resolvedPreview.ogSiteName}&quot; /&gt;
                </div>
                <div>
                  &lt;meta property=&quot;og:image&quot; content=&quot;
                  {resolvedPreview.ogImage}&quot; /&gt;
                </div>
                <div>
                  &lt;meta name=&quot;twitter:card&quot; content=&quot;
                  {resolvedPreview.twitterCard}&quot; /&gt;
                </div>
              </div>
            )}

            {/* SEO Checklist Summary */}
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-2 text-xs">
              <div className="font-bold text-[#F5F2EC] flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#C8A66A]" />
                <span>وضعیت سلامت تگ‌های سئو و OpenGraph در &lt;head&gt;</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#929292]">
                <li className="flex items-center justify-between">
                  <span>تگ عنوان صفحه (&lt;title&gt;)</span>
                  <span className="text-emerald-400 font-bold">فعال و همگام</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>توضیحات متا (meta description)</span>
                  <span className="text-emerald-400 font-bold">فعال و همگام</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>تگ‌های OpenGraph (og:title, og:description, og:image)</span>
                  <span className="text-emerald-400 font-bold">فعال و همگام</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>داده‌های ساختاریافته Schema.org (JSON-LD)</span>
                  <span className="text-emerald-400 font-bold">فعال و همگام</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeoOpenGraphEditor;
