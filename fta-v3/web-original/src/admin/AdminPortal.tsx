import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Layers,
  Save,
  Share2,
  Sparkles
} from 'lucide-react';
import {
  AppRoute,
  AuditLogEntry,
  BrandConfig,
  CoachProfile,
  ConsultationRequest,
  DiscountCode,
  ExplorePost,
  Order,
  PageRevision,
  PaymentGatewayStatusInfo,
  Product,
  SectionVisualConfig,
  SiteModulesConfig,
  ThemeColorsConfig
} from '../types';
import { INITIAL_BRAND_CONFIG } from '../data/initialData';
import { AdminLayout } from '../components/AdminLayout';
import { AdminLoginView } from './AdminLoginView';
import { SeoOpenGraphEditor } from './SeoOpenGraphEditor';
import { AdminView } from '../views/AdminView';
import {
  fetchAdminSession,
  logoutAdminOnServer,
  syncStateToServer
} from '../api/mockGateway';
import { syncDocumentHeadSeo } from '../utils/seoHead';
import { toPersianDigits } from '../utils/format';

interface AdminPortalProps {
  coach: CoachProfile;
  brandConfig?: BrandConfig;
  siteModules?: SiteModulesConfig;
  revisions?: PageRevision[];
  consultations?: ConsultationRequest[];
  discounts?: DiscountCode[];
  gateways?: PaymentGatewayStatusInfo[];
  auditLogs?: AuditLogEntry[];
  products: Product[];
  posts: ExplorePost[];
  orders: Order[];
  sectionConfigs: SectionVisualConfig[];
  themeColors: ThemeColorsConfig;
  onUpdateThemeColors: (colors: ThemeColorsConfig) => void;
  onUpdateCoach: (coach: CoachProfile) => void;
  onUpdateBrandConfig?: (brand: BrandConfig) => void;
  onUpdateSiteModules?: (modules: SiteModulesConfig) => void;
  onUpdateConsultations?: (items: ConsultationRequest[]) => void;
  onUpdateDiscounts?: (items: DiscountCode[]) => void;
  onPublishRevision?: (label: string) => void;
  onRestoreRevision?: (revision: PageRevision) => void;
  onUpdateSectionConfigs: (configs: SectionVisualConfig[]) => void;
  onResetSectionConfigs: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSavePost: (post: ExplorePost) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onAddCoachReply: (postId: string, replyText: string) => void;
  onToggleOrderStatus: (orderId: string) => void;
  onResetDemoData: () => void;
  onAdminAuthenticated?: () => void;
  onOpenInstaller?: () => void;
  onExitToPublicRoute?: (route?: AppRoute) => void;
}

function updateHeadMetaTag(
  attrKey: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined' || !document.head) return;
  let meta = document.head.querySelector(
    `meta[${attrKey}="${attrValue}"]`
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attrKey, attrValue);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  coach,
  brandConfig = INITIAL_BRAND_CONFIG,
  siteModules,
  revisions,
  consultations,
  discounts,
  gateways,
  auditLogs,
  products,
  posts,
  orders,
  sectionConfigs,
  themeColors,
  onUpdateThemeColors,
  onUpdateCoach,
  onUpdateBrandConfig,
  onUpdateSiteModules,
  onUpdateConsultations,
  onUpdateDiscounts,
  onPublishRevision,
  onRestoreRevision,
  onUpdateSectionConfigs,
  onResetSectionConfigs,
  onSaveProduct,
  onDeleteProduct,
  onSavePost,
  onDeletePost,
  onDeleteComment,
  onAddCoachReply,
  onToggleOrderStatus,
  onResetDemoData,
  onAdminAuthenticated,
  onOpenInstaller
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingSession, setIsCheckingSession] = useState<boolean>(true);
  const [portalMode, setPortalMode] = useState<'workspace' | 'seo'>('workspace');
  const [isSeoPanelExpanded, setIsSeoPanelExpanded] = useState<boolean>(true);

  // Dedicated SEO Management state within AdminPortal
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
  const [ogImage, setOgImage] = useState<string>(
    brandConfig.ogImage ||
      brandConfig.shareImageUrl ||
      'https://example.test/media/default-og-cover.jpg'
  );
  const [ogType, setOgType] = useState<'website' | 'profile' | 'article' | 'product'>(
    brandConfig.ogType || 'website'
  );
  const [ogSiteName, setOgSiteName] = useState<string>(
    brandConfig.ogSiteName || brandConfig.brandName || ''
  );
  const [twitterCard, setTwitterCard] = useState<'summary_large_image' | 'summary'>(
    brandConfig.twitterCard || 'summary_large_image'
  );
  const [isSavingSeo, setIsSavingSeo] = useState<boolean>(false);
  const [seoSaveFeedback, setSeoSaveFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Sync local SEO Management state when brandConfig prop updates from server
  useEffect(() => {
    setSeoTitle(brandConfig.seoTitle || '');
    setSeoDescription(brandConfig.seoDescription || '');
    setCanonicalDomain(brandConfig.canonicalDomain || 'https://example.test');
    setOgTitle(brandConfig.ogTitle || brandConfig.seoTitle || '');
    setOgDescription(brandConfig.ogDescription || brandConfig.seoDescription || '');
    setOgImage(
      brandConfig.ogImage ||
        brandConfig.shareImageUrl ||
        'https://example.test/media/default-og-cover.jpg'
    );
    setOgType(brandConfig.ogType || 'website');
    setOgSiteName(brandConfig.ogSiteName || brandConfig.brandName || '');
    setTwitterCard(brandConfig.twitterCard || 'summary_large_image');
  }, [brandConfig]);

  // Dynamically update document.head (document.title, meta description, OpenGraph, Twitter Card, canonical)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const effectiveTitle = seoTitle.trim() || brandConfig.seoTitle || brandConfig.brandName;
    const effectiveDesc =
      seoDescription.trim() || brandConfig.seoDescription || brandConfig.brandSubtitle;
    const effectiveOgTitle = ogTitle.trim() || effectiveTitle;
    const effectiveOgDesc = ogDescription.trim() || effectiveDesc;
    const effectiveOgSiteName = ogSiteName.trim() || brandConfig.brandName;
    const effectiveOgImage =
      ogImage.trim() ||
      brandConfig.ogImage ||
      'https://example.test/media/default-og-cover.jpg';

    if (effectiveTitle) {
      document.title = effectiveTitle;
    }
    updateHeadMetaTag('name', 'description', effectiveDesc);
    updateHeadMetaTag('property', 'og:title', effectiveOgTitle);
    updateHeadMetaTag('property', 'og:description', effectiveOgDesc);
    updateHeadMetaTag('property', 'og:image', effectiveOgImage);
    updateHeadMetaTag('property', 'og:type', ogType);
    updateHeadMetaTag('property', 'og:site_name', effectiveOgSiteName);
    updateHeadMetaTag('name', 'twitter:card', twitterCard);
    updateHeadMetaTag('name', 'twitter:title', effectiveOgTitle);
    updateHeadMetaTag('name', 'twitter:description', effectiveOgDesc);
    updateHeadMetaTag('name', 'twitter:image', effectiveOgImage);

    syncDocumentHeadSeo(
      {
        ...brandConfig,
        seoTitle: effectiveTitle,
        seoDescription: effectiveDesc,
        canonicalDomain: canonicalDomain.trim() || brandConfig.canonicalDomain,
        ogTitle: effectiveOgTitle,
        ogDescription: effectiveOgDesc,
        ogImage: effectiveOgImage,
        ogType,
        ogSiteName: effectiveOgSiteName,
        twitterCard
      },
      { coach }
    );
  }, [
    seoTitle,
    seoDescription,
    canonicalDomain,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogSiteName,
    twitterCard,
    brandConfig,
    coach
  ]);

  useEffect(() => {
    let mounted = true;
    fetchAdminSession()
      .then((res) => {
        if (mounted) {
          setIsAuthenticated(res.authenticated);
          setIsCheckingSession(false);
          if (res.authenticated && onAdminAuthenticated) {
            onAdminAuthenticated();
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setIsCheckingSession(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [onAdminAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    if (onAdminAuthenticated) {
      onAdminAuthenticated();
    }
  };

  const handleLogout = async () => {
    await logoutAdminOnServer();
    setIsAuthenticated(false);
  };

  const handleCopySeoToOpenGraph = () => {
    setOgTitle(seoTitle);
    setOgDescription(seoDescription);
    if (!ogSiteName.trim()) {
      setOgSiteName(brandConfig.brandName);
    }
    setSeoSaveFeedback({
      ok: true,
      message: 'مقادیر عنوان و توضیحات سئو در فیلدهای OpenGraph کپی شد.'
    });
  };

  const handleSaveSeoManagement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSeoSaveFeedback(null);

    if (
      ogImage.trim().toLowerCase().startsWith('data:image/') ||
      ogImage.trim().toLowerCase().startsWith('data:application/')
    ) {
      setSeoSaveFeedback({
        ok: false,
        message:
          'ذخیره مستقیم تصاویر Base64 مجاز نیست. لطفاً آدرس تصویر استاندارد وارد کنید.'
      });
      return;
    }

    const updatedBrandConfig: BrandConfig = {
      ...brandConfig,
      seoTitle: seoTitle.trim() || brandConfig.seoTitle,
      seoDescription: seoDescription.trim() || brandConfig.seoDescription,
      canonicalDomain: canonicalDomain.trim() || brandConfig.canonicalDomain,
      ogTitle: ogTitle.trim() || seoTitle.trim() || brandConfig.seoTitle,
      ogDescription:
        ogDescription.trim() || seoDescription.trim() || brandConfig.seoDescription,
      ogImage: ogImage.trim() || brandConfig.ogImage,
      shareImageUrl: ogImage.trim() || brandConfig.shareImageUrl,
      ogType,
      ogSiteName: ogSiteName.trim() || brandConfig.brandName,
      twitterCard
    };

    syncDocumentHeadSeo(updatedBrandConfig, { coach });
    onUpdateBrandConfig?.(updatedBrandConfig);

    setIsSavingSeo(true);
    try {
      const res = await syncStateToServer({ brandConfig: updatedBrandConfig });
      if (!res.ok) {
        setSeoSaveFeedback({
          ok: false,
          message: res.error || 'خطا در ذخیره‌سازی تنظیمات سئو و OpenGraph در سرور'
        });
        return;
      }
      setSeoSaveFeedback({
        ok: true,
        message:
          'تنظیمات سئوی سراسری و تگ‌های OpenGraph با موفقیت در سرور ذخیره و در <head> سند اعمال شد.'
      });
    } finally {
      setIsSavingSeo(false);
    }
  };

  const activeSectionsCount = sectionConfigs.filter((s) => s.enabled).length;

  return (
    <AdminLayout
      coach={coach}
      isAuthenticated={isAuthenticated}
      onLogout={handleLogout}
      stats={{
        sectionsCount: activeSectionsCount,
        productsCount: products.length,
        ordersCount: orders.length,
        postsCount: posts.length
      }}
    >
      {isCheckingSession ? (
        <div className="max-w-md mx-auto px-4 py-20 text-center text-xs text-[#929292]">
          در حال بررسی نشست امنیتی مربی...
        </div>
      ) : !isAuthenticated ? (
        <AdminLoginView
          coachName={coach.name}
          onLoginSuccess={handleLoginSuccess}
          onOpenInstaller={onOpenInstaller}
        />
      ) : (
        <div className="space-y-4">
          {/* Dedicated AdminPortal Workspace & Global SEO Switcher Bar */}
          <div
            data-testid="admin-portal-mode-bar"
            className="max-w-7xl mx-auto px-4 md:px-8 pt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 p-1 bg-[#161616] rounded-2xl border border-white/[0.08]">
              <button
                type="button"
                data-testid="admin-portal-workspace-tab"
                onClick={() => setPortalMode('workspace')}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  portalMode === 'workspace'
                    ? 'bg-[#C8A66A] text-[#101010]'
                    : 'text-[#929292] hover:text-[#F5F2EC]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>کنسول جامع مدیریت سایت</span>
              </button>
              <button
                type="button"
                data-testid="admin-portal-seo-tab"
                onClick={() => setPortalMode('seo')}
                className={`min-h-[38px] px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                  portalMode === 'seo'
                    ? 'bg-[#C8A66A] text-[#101010]'
                    : 'text-[#929292] hover:text-[#F5F2EC]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>مدیریت سئو و OpenGraph (SEO Management)</span>
              </button>
            </div>

            <div
              className="text-[11px] text-[#929292] font-mono hidden sm:flex items-center gap-2"
              dir="ltr"
            >
              <span className="text-[#C8A66A]">SEO Title:</span>
              <span className="text-[#F5F2EC] truncate max-w-[260px]">
                {seoTitle || brandConfig.seoTitle}
              </span>
            </div>
          </div>

          {/* Dedicated SEO Management Section within AdminPortal */}
          <section
            aria-label="SEO Management"
            data-testid="seo-management-section"
            className="max-w-7xl mx-auto px-4 md:px-8"
          >
            <div className="bg-[#1D1D1D] rounded-3xl border border-white/[0.08] overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-[#171717]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-extrabold text-[#F5F2EC]">
                        مدیریت سئوی سراسری و تگ‌های OpenGraph (SEO Management)
                      </h2>
                      <span
                        className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#101010] border border-white/10 text-[10px] font-mono text-[#C8A66A]"
                        dir="ltr"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>LIVE HEAD SYNC</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#929292] mt-0.5">
                      ویرایش عنوان سراسری سایت، توضیحات متا و تگ‌های اشتراک‌گذاری OpenGraph با اعمال آنی در{' '}
                      <code className="font-mono text-[#C8A66A]" dir="ltr">
                        document.head
                      </code>{' '}
                      و ذخیره‌سازی در سرور
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySeoToOpenGraph}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>کپی عنوان و توضیحات سئو در OpenGraph</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSeoPanelExpanded((prev) => !prev)}
                    aria-expanded={isSeoPanelExpanded}
                    className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#101010] hover:bg-white/5 border border-white/10 text-[11px] font-semibold text-[#929292] hover:text-[#F5F2EC] flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isSeoPanelExpanded ? 'جمع کردن پنل' : 'باز کردن پنل سئو'}</span>
                    {isSeoPanelExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {isSeoPanelExpanded && (
                <form
                  onSubmit={handleSaveSeoManagement}
                  data-testid="admin-portal-seo-form"
                  className="p-5 sm:p-6 space-y-5"
                >
                  {seoSaveFeedback && (
                    <div
                      role="status"
                      data-testid="admin-portal-seo-feedback"
                      className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                        seoSaveFeedback.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{seoSaveFeedback.message}</span>
                    </div>
                  )}

                  {/* Row 1: Global SEO Title, Canonical Domain, Meta Description */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-7">
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="admin-portal-seo-title"
                          className="text-xs font-semibold text-[#F5F2EC]"
                        >
                          عنوان سراسری سئو سایت (Global SEO Title)
                        </label>
                        <span className="text-[10px] font-mono text-[#C8A66A]">
                          {toPersianDigits(seoTitle.trim().length)} کاراکتر
                        </span>
                      </div>
                      <input
                        id="admin-portal-seo-title"
                        name="seoTitle"
                        data-testid="admin-portal-seo-title-input"
                        type="text"
                        required
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        placeholder="عنوان اصلی سایت در تب مرورگر و نتایج گوگل"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                      />
                    </div>

                    <div className="md:col-span-5">
                      <label
                        htmlFor="admin-portal-canonical-domain"
                        className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                      >
                        دامنه کانونیکال (Canonical Domain)
                      </label>
                      <input
                        id="admin-portal-canonical-domain"
                        name="canonicalDomain"
                        data-testid="admin-portal-canonical-input"
                        type="url"
                        dir="ltr"
                        value={canonicalDomain}
                        onChange={(e) => setCanonicalDomain(e.target.value)}
                        placeholder="https://example.test"
                        className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
                      />
                    </div>

                    <div className="md:col-span-12">
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="admin-portal-seo-description"
                          className="text-xs font-semibold text-[#F5F2EC]"
                        >
                          توضیحات متا سئو (Global Meta Description)
                        </label>
                        <span className="text-[10px] font-mono text-[#C8A66A]">
                          {toPersianDigits(seoDescription.trim().length)} کاراکتر
                        </span>
                      </div>
                      <textarea
                        id="admin-portal-seo-description"
                        name="seoDescription"
                        data-testid="admin-portal-seo-description-input"
                        rows={2}
                        required
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        placeholder="توضیحات متا برای موتورهای جستجو (۱۲۰ تا ۱۶۰ کاراکتر)..."
                        className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] leading-relaxed focus:outline-none focus:border-[#C8A66A]"
                      />
                    </div>
                  </div>

                  {/* Row 2: OpenGraph & Social Share Tags */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>تگ‌های OpenGraph و کارت اشتراک‌گذاری شبکه‌های اجتماعی (OpenGraph Tags)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="admin-portal-og-title"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          عنوان OpenGraph (og:title)
                        </label>
                        <input
                          id="admin-portal-og-title"
                          name="ogTitle"
                          data-testid="admin-portal-og-title-input"
                          type="text"
                          value={ogTitle}
                          onChange={(e) => setOgTitle(e.target.value)}
                          placeholder="عنوان کارت اشتراک‌گذاری"
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-portal-og-site-name"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          نام سایت (og:site_name)
                        </label>
                        <input
                          id="admin-portal-og-site-name"
                          name="ogSiteName"
                          data-testid="admin-portal-og-site-name-input"
                          type="text"
                          value={ogSiteName}
                          onChange={(e) => setOgSiteName(e.target.value)}
                          placeholder="نام برند یا آکادمی"
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="admin-portal-og-type"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          نوع محتوا (og:type)
                        </label>
                        <select
                          id="admin-portal-og-type"
                          name="ogType"
                          data-testid="admin-portal-og-type-select"
                          value={ogType}
                          onChange={(e) =>
                            setOgType(
                              e.target.value as 'website' | 'profile' | 'article' | 'product'
                            )
                          }
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                        >
                          <option value="website">website</option>
                          <option value="profile">profile</option>
                          <option value="product">product</option>
                          <option value="article">article</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                      <div className="sm:col-span-5">
                        <label
                          htmlFor="admin-portal-og-description"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          توضیحات OpenGraph (og:description)
                        </label>
                        <input
                          id="admin-portal-og-description"
                          name="ogDescription"
                          data-testid="admin-portal-og-description-input"
                          type="text"
                          value={ogDescription}
                          onChange={(e) => setOgDescription(e.target.value)}
                          placeholder="توضیحات کارت در تلگرام، واتس‌اپ و لینکدین"
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                        />
                      </div>

                      <div className="sm:col-span-5">
                        <label
                          htmlFor="admin-portal-og-image"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          تصویر OpenGraph (og:image)
                        </label>
                        <input
                          id="admin-portal-og-image"
                          name="ogImage"
                          data-testid="admin-portal-og-image-input"
                          type="text"
                          dir="ltr"
                          value={ogImage}
                          onChange={(e) => setOgImage(e.target.value)}
                          placeholder="https://example.test/media/default-og-cover.jpg"
                          className="w-full min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left focus:outline-none focus:border-[#C8A66A]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="admin-portal-twitter-card"
                          className="block text-xs font-semibold text-[#F5F2EC] mb-1"
                        >
                          کارت X (twitter:card)
                        </label>
                        <select
                          id="admin-portal-twitter-card"
                          name="twitterCard"
                          data-testid="admin-portal-twitter-card-select"
                          value={twitterCard}
                          onChange={(e) =>
                            setTwitterCard(
                              e.target.value as 'summary_large_image' | 'summary'
                            )
                          }
                          className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                        >
                          <option value="summary_large_image">summary_large_image</option>
                          <option value="summary">summary</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="submit"
                      data-testid="admin-portal-save-seo-button"
                      disabled={isSavingSeo}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] disabled:opacity-60 text-[#101010] text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {isSavingSeo
                          ? 'در حال ذخیره‌سازی در سرور...'
                          : 'ذخیره تنظیمات سئو و OpenGraph (Save SEO Settings)'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPortalMode((prev) => (prev === 'seo' ? 'workspace' : 'seo'))
                      }
                      className="text-xs font-semibold text-[#C8A66A] hover:underline cursor-pointer"
                    >
                      {portalMode === 'seo'
                        ? 'بازگشت به کنسول مدیریت بخش‌ها و محصولات'
                        : 'مشاهده پیش‌نمایش زنده گوگل و کارت شبکه اجتماعی ←'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

          {portalMode === 'seo' ? (
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-2">
              <SeoOpenGraphEditor
                brandConfig={brandConfig}
                coach={coach}
                onUpdateBrandConfig={onUpdateBrandConfig}
              />
            </div>
          ) : (
            <AdminView
              coach={coach}
              brandConfig={brandConfig}
              siteModules={siteModules}
              revisions={revisions}
              consultations={consultations}
              discounts={discounts}
              gateways={gateways}
              auditLogs={auditLogs}
              products={products}
              posts={posts}
              orders={orders}
              sectionConfigs={sectionConfigs}
              themeColors={themeColors}
              onUpdateThemeColors={onUpdateThemeColors}
              onUpdateCoach={onUpdateCoach}
              onUpdateBrandConfig={onUpdateBrandConfig}
              onUpdateSiteModules={onUpdateSiteModules}
              onUpdateConsultations={onUpdateConsultations}
              onUpdateDiscounts={onUpdateDiscounts}
              onPublishRevision={onPublishRevision}
              onRestoreRevision={onRestoreRevision}
              onUpdateSectionConfigs={onUpdateSectionConfigs}
              onResetSectionConfigs={onResetSectionConfigs}
              onSaveProduct={onSaveProduct}
              onDeleteProduct={onDeleteProduct}
              onSavePost={onSavePost}
              onDeletePost={onDeletePost}
              onDeleteComment={onDeleteComment}
              onAddCoachReply={onAddCoachReply}
              onToggleOrderStatus={onToggleOrderStatus}
              onResetDemoData={onResetDemoData}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
};

