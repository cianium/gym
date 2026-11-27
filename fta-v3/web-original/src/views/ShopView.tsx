import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Download,
  FileText,
  Layers,
  Loader2,
  Lock,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Truck,
  User
} from 'lucide-react';
import {
  AppRoute,
  CartItem,
  Order,
  PaymentGatewayId,
  PaymentOrderStatus,
  Product,
  SectionVisualConfig
} from '../types';
import { formatPriceNumber, formatToman, toPersianDigits } from '../utils/format';
import { LuxuryArtwork } from '../components/VisualMedia';
import { CustomizableSection } from '../components/CustomizableSection';
import { getProductDiscountInfo, DiscountBadge as ProductDiscountBadge, ShopCard } from '../components/ShopCard';
import {
  createCheckoutSession,
  executeGatewayRedirect,
  getMockGatewayOutcome,
  PAYMENT_GATEWAYS_CONFIG,
  setMockGatewayOutcome
} from '../api/mockGateway';

interface ShopViewProps {
  products: Product[];
  cart: CartItem[];
  headerConfig?: SectionVisualConfig;
  sectionConfigs?: SectionVisualConfig[];
  onSelectProduct: (productId: string) => void;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, newQuantity: number) => void;
  onNavigate?: (route: AppRoute) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  products,
  cart,
  headerConfig,
  sectionConfigs = [],
  onSelectProduct,
  onAddToCart,
  onUpdateCartQuantity,
  onNavigate
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'digital' | 'physical'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const publishedProducts = useMemo(
    () => products.filter((p) => p.status === 'published'),
    [products]
  );

  const digitalCount = useMemo(
    () => publishedProducts.filter((p) => p.type === 'digital').length,
    [publishedProducts]
  );

  const physicalCount = useMemo(
    () => publishedProducts.filter((p) => p.type === 'physical').length,
    [publishedProducts]
  );

  const cartQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
    }
    return map;
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return publishedProducts
      .filter((product) => {
        if (categoryFilter !== 'all' && product.type !== categoryFilter) return false;
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.trim().toLowerCase();
          return (
            product.title.toLowerCase().includes(q) ||
            product.subtitle.toLowerCase().includes(q) ||
            product.description.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        return 0;
      });
  }, [publishedProducts, categoryFilter, searchQuery, sortBy]);

  const shopSections = useMemo(() => {
    const rawShopSections = sectionConfigs.filter((s) => s.pageTarget === 'shop');
    const hasGridSection = rawShopSections.some((s) => s.id === 'shop-products-grid');
    const merged: SectionVisualConfig[] = [...rawShopSections];

    if (!merged.some((s) => s.id === 'shop-header') && headerConfig) {
      merged.push(headerConfig);
    }

    if (!hasGridSection) {
      merged.push({
        id: 'shop-products-grid',
        pageTarget: 'shop',
        blockType: 'product-spotlight',
        label: 'ویترین، فیلترها و گرید محصولات فروشگاه',
        title: 'برنامه‌های دیجیتال و تجهیزات باشگاهی',
        subtitle: '',
        enabled: true,
        order: 2,
        bgType: 'solid',
        solidColor: '#101010',
        gradientPreset: 'deep-onyx',
        imagePreset: 'physical-straps',
        imageDisplayMode: 'cover',
        overlayOpacity: 75,
        heightMode: 'medium'
      });
    }

    return merged.filter((s) => s.enabled).sort((a, b) => a.order - b.order);
  }, [sectionConfigs, headerConfig]);

  const filterChips: { id: 'all' | 'digital' | 'physical'; label: string; count: number }[] = [
    { id: 'all', label: 'همه محصولات', count: publishedProducts.length },
    { id: 'digital', label: 'برنامه‌های دیجیتال', count: digitalCount },
    { id: 'physical', label: 'تجهیزات باشگاهی', count: physicalCount }
  ];

  const renderCatalogSection = () => (
    <div className="min-w-0">
      {/* Filter Chips (Horizontal Scroll-Snap, No Scrollbar) + Simple Sort + Search */}
      <div className="bg-[#181818] border border-white/10 rounded-2xl p-3 sm:p-4 mb-5 space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
          {/* Horizontal Scrollable Category Chips */}
          <div
            role="tablist"
            aria-label="فیلتر دسته‌بندی محصولات"
            className="flex items-center gap-2 overflow-x-auto [scroll-snap-type:x_proximity] no-scrollbar min-w-0 pb-0.5"
          >
            {filterChips.map((chip) => {
              const active = categoryFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategoryFilter(chip.id)}
                  className={`shrink-0 snap-start min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 border transition-[transform,opacity] duration-150 motion-reduce:transition-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                    active
                      ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                      : 'bg-[#121212] text-[#C8C4BC] border-white/10 hover:text-[#F5F2EC] hover:border-white/25'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md tabular-nums ${
                      active
                        ? 'bg-[#101010]/20 text-[#101010] font-extrabold'
                        : 'bg-white/5 text-[#C8C4BC]'
                    }`}
                  >
                    {toPersianDigits(chip.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Simple Sort & Search Controls */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 sm:w-52 min-w-0">
              <Search className="w-4 h-4 text-[#C8C4BC] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در محصولات..."
                aria-label="جستجو در محصولات"
                className="w-full min-w-0 min-h-[44px] bg-[#121212] border border-white/10 focus-visible:border-[#C8A66A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] rounded-xl ps-9 pe-3 py-2 text-xs sm:text-sm text-[#F5F2EC] placeholder:text-[#B8B4AC]"
              />
            </div>

            <div className="relative shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C8A66A] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
                aria-label="مرتب‌سازی محصولات"
                className="min-h-[44px] bg-[#121212] border border-white/10 focus-visible:border-[#C8A66A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] rounded-xl ps-8 pe-3 py-2 text-xs sm:text-sm font-semibold text-[#F5F2EC] cursor-pointer"
              >
                <option value="featured">پیشنهاد مربی</option>
                <option value="price-asc">ارزان‌ترین</option>
                <option value="price-desc">گران‌ترین</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid: 2 columns by default (gap 12px), 3 from 640px (sm), 4 from 1024px (lg) */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#1D1D1D] border border-white/10 rounded-2xl p-10 text-center space-y-3">
          <p className="text-[#F5F2EC] font-bold text-base">محصولی با این مشخصات یافت نشد</p>
          <p className="text-xs text-[#C8C4BC]">فیلتر دسته‌بندی یا عبارت جستجو را تغییر دهید.</p>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter('all');
              setSearchQuery('');
            }}
            className="mt-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A]/15 text-[#C8A66A] border border-[#C8A66A]/35 text-xs font-bold hover:opacity-90 active:scale-95 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
          >
            نمایش همه محصولات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 min-w-0">
          {filteredProducts.map((product) => (
            <ShopCard
              key={product.id}
              product={product}
              cartQuantity={cartQuantityMap[product.id] ?? 0}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              onUpdateCartQuantity={onUpdateCartQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen pb-28 md:pb-16 pt-4 sm:pt-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 space-y-6 min-w-0">
        {shopSections.map((sec) => {
          if (sec.id === 'shop-header') {
            return (
              <section key={sec.id} data-section-id={sec.id} className="min-w-0">
                <CustomizableSection config={sec} onNavigate={onNavigate}>
                  <div className="max-w-2xl space-y-2 min-w-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C8A66A]/15 border border-[#C8A66A]/35 text-[#E5C88E] text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-[#C8A66A] shrink-0" />
                      <span>{sec.kicker || 'فروشگاه رسمی برنامه‌های تمرینی و تجهیزات'}</span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-[#F5F2EC] leading-tight">
                      {sec.title || 'پروتکل‌های علمی تمرین و تجهیزات تخصصی آرش'}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#C8C4BC] leading-relaxed">
                      {sec.subtitle ||
                        'تمامی برنامه‌های دیجیتال بلافاصله پس از ثبت سفارش فعال می‌شوند و تجهیزات فیزیکی با ضمانت اصالت ارسال می‌گردند.'}
                    </p>
                  </div>
                </CustomizableSection>
              </section>
            );
          }

          if (sec.id === 'shop-products-grid') {
            return (
              <section key={sec.id} data-section-id={sec.id} className="min-w-0">
                {renderCatalogSection()}
              </section>
            );
          }

          return (
            <section key={sec.id} data-section-id={sec.id} className="min-w-0">
              <CustomizableSection
                config={sec}
                onNavigate={onNavigate}
                renderDefaultBannerContent
              />
            </section>
          );
        })}
      </div>
    </div>
  );
};

interface ProductDetailViewProps {
  product: Product;
  cart: CartItem[];
  isPurchasedDigital?: boolean;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, newQuantity: number) => void;
  onNavigate: (route: AppRoute) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onNavigate
}) => {
  const [openModuleIdx, setOpenModuleIdx] = useState<number | null>(0);
  const [previewSampleUnlocked, setPreviewSampleUnlocked] = useState(false);

  const cartQuantity = useMemo(() => {
    return cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cart, product.id]);

  const isOutOfStock =
    product.type === 'physical' && typeof product.stock === 'number' && product.stock <= 0;
  const isMaxStockReached =
    product.type === 'physical' && typeof product.stock === 'number' && cartQuantity >= product.stock;

  const metaChips = useMemo(() => {
    const chips: string[] = [];
    if (product.type === 'digital') {
      if (product.duration) chips.push(product.duration);
      if (product.level) chips.push(`سطح: ${product.level}`);
      if (product.fileFormat) chips.push(product.fileFormat);
    } else {
      if (product.material) chips.push(product.material);
      if (typeof product.stock === 'number') {
        chips.push(`موجودی انبار: ${toPersianDigits(product.stock)} عدد`);
      }
      if (product.sku) chips.push(`کد: ${product.sku}`);
    }
    return chips;
  }, [product]);

  return (
    <div dir="rtl" className="min-h-screen pb-36 md:pb-24 pt-4 sm:pt-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-w-0">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1D1D1D] border border-white/10 text-xs sm:text-sm font-bold text-[#C8C4BC] hover:text-[#F5F2EC] hover:border-[#C8A66A]/40 mb-5 transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
        >
          <ArrowRight className="w-4 h-4 text-[#C8A66A] shrink-0" />
          <span>بازگشت به فروشگاه</span>
        </button>

        {/* Main Product Showcase */}
        <div className="bg-[#1D1D1D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 min-w-0">
            {/* Artwork Column (4:3 aspect ratio on mobile) */}
            <div className="lg:col-span-5 relative aspect-[4/3] lg:aspect-auto lg:min-h-[420px] bg-[#141414] border-b lg:border-b-0 lg:border-e border-white/10 overflow-hidden">
              <LuxuryArtwork
                preset={product.visualPreset}
                customUrl={product.customImageUrl}
                alt={product.title}
                aspectClass="w-full h-full object-cover"
              />
              <div className="absolute top-3 start-3 z-20">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#101010]/85 text-[#E5C88E] border border-[#C8A66A]/45 backdrop-blur-md">
                  {product.type === 'digital' ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#C8A66A]" />
                      <span>برنامه دیجیتال</span>
                    </>
                  ) : (
                    <>
                      <Package className="w-3.5 h-3.5 text-[#C8A66A]" />
                      <span>تجهیزات</span>
                    </>
                  )}
                </span>
              </div>
              <div className="absolute top-3 end-3 z-20">
                <ProductDiscountBadge product={product} />
              </div>
            </div>

            {/* Product Details & Full Description Column */}
            <div className="lg:col-span-7 p-4 sm:p-8 flex flex-col justify-between space-y-6 min-w-0">
              <div className="space-y-4 min-w-0">
                <div className="space-y-2 min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] leading-snug">
                    {product.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8C4BC] leading-relaxed">
                    {product.subtitle}
                  </p>
                </div>

                {/* Wrapping Metadata Chips */}
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {metaChips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#141414] border border-white/10 text-xs font-semibold text-[#C8C4BC]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                {/* Full Unclipped Description */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-2 min-w-0">
                  <h2 className="text-xs font-extrabold text-[#C8A66A]">توضیحات کامل محصول</h2>
                  <p className="text-xs sm:text-sm text-[#E0DCD3] leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* «شامل چه چیزی می‌شود» (Features List) */}
                <div className="space-y-3 pt-1 min-w-0">
                  <h2 className="text-sm font-extrabold text-[#F5F2EC] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C8A66A] shrink-0" />
                    <span>شامل چه چیزی می‌شود؟</span>
                  </h2>
                  <ul className="space-y-2.5 min-w-0">
                    {product.features.map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#D6D2C9] leading-relaxed min-w-0"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#C8A66A] shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Delivery / Guarantee Badge */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-[#C8C4BC]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#3E7B59] shrink-0" />
                  <span>تضمین اصالت و پشتیبانی مستقیم آرش کاظمی</span>
                </div>
                {product.type === 'physical' && product.shippingEstimate && (
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#C8A66A] shrink-0" />
                    <span>{product.shippingEstimate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Digital Program Curriculum Accordion (if digital) */}
        {product.type === 'digital' && product.modules && product.modules.length > 0 && (
          <div className="mt-6 bg-[#1D1D1D] border border-white/10 rounded-3xl p-4 sm:p-8 space-y-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#C8A66A] block mb-1">سرفصل‌های فازبندی شده</span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#F5F2EC]">
                  ساختار علمی و زمان‌بندی هفته‌های تمرین
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSampleUnlocked(!previewSampleUnlocked)}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/35 text-[#E5C88E] text-xs font-bold hover:opacity-90 active:scale-95 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {previewSampleUnlocked ? 'بستن پیش‌نمایش نمونه' : 'مشاهده نمونه جدول تمرینی'}
                </span>
              </button>
            </div>

            {previewSampleUnlocked && (
              <div className="bg-[#141414] border border-[#C8A66A]/35 rounded-2xl p-4 space-y-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#C8A66A] flex items-center gap-1.5">
                    <FileText className="w-4 h-4 shrink-0" />
                    پیش‌نمایش نمونه شیت تمرینی (روز اول: فوکوس زنجیره قدامی و سینه)
                  </span>
                  <span className="text-[11px] text-[#C8C4BC]">تمپو: ثانیه (منفی-مکث-مثبت)</span>
                </div>
                <div className="overflow-x-auto min-w-0">
                  <table className="w-full text-start text-xs border-collapse min-w-[440px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[#C8C4BC]">
                        <th className="py-2 px-2 text-start">حرکت</th>
                        <th className="py-2 px-2 text-start">ست × تکرار</th>
                        <th className="py-2 px-2 text-start">تمپو</th>
                        <th className="py-2 px-2 text-start">RPE</th>
                        <th className="py-2 px-2 text-start">استراحت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[#F5F2EC]">
                      <tr>
                        <td className="py-2.5 px-2 font-semibold">۱. پرس سینه هالتر دست متوسط</td>
                        <td className="py-2.5 px-2 tabular-nums">۴ × ۸</td>
                        <td className="py-2.5 px-2 text-[#C8A66A] font-mono">3-1-1-0</td>
                        <td className="py-2.5 px-2 tabular-nums">۸.۵</td>
                        <td className="py-2.5 px-2 tabular-nums">۱۲۰ ثانیه</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-semibold">۲. پرس بالاسینه دمبل زاویه ۳۰ درجه</td>
                        <td className="py-2.5 px-2 tabular-nums">۴ × ۱۰</td>
                        <td className="py-2.5 px-2 text-[#C8A66A] font-mono">3-0-1-1</td>
                        <td className="py-2.5 px-2 tabular-nums">۸</td>
                        <td className="py-2.5 px-2 tabular-nums">۹۰ ثانیه</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-2 font-semibold">۳. نشر جانب سیم‌کش از پشت</td>
                        <td className="py-2.5 px-2 tabular-nums">۴ × ۱۵</td>
                        <td className="py-2.5 px-2 text-[#C8A66A] font-mono">2-1-1-1</td>
                        <td className="py-2.5 px-2 tabular-nums">۹</td>
                        <td className="py-2.5 px-2 tabular-nums">۶۰ ثانیه</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="space-y-3 min-w-0">
              {product.modules.map((mod, idx) => {
                const isOpen = openModuleIdx === idx;
                return (
                  <div
                    key={idx}
                    className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden min-w-0"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenModuleIdx(isOpen ? null : idx)}
                      className="w-full min-h-[52px] p-4 flex items-center justify-between text-start hover:bg-white/[0.02] transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C8A66A]"
                    >
                      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-[#C8A66A]/15 text-[#C8A66A] text-xs font-bold shrink-0">
                          {mod.weekRange}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#F5F2EC] min-w-0">
                          {mod.title}
                        </h3>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#C8A66A] shrink-0 ms-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#C8C4BC] shrink-0 ms-2" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#C8C4BC]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#C8A66A]" />
                            {toPersianDigits(mod.sessionsPerWeek)} جلسه در هفته
                          </span>
                          <span>·</span>
                          <span>تمرکز فاز: {mod.focus}</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-semibold text-[#C8A66A] block">
                            نمونه حرکات کلیدی این فاز:
                          </span>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {mod.sampleExercises.map((ex, i) => (
                              <li
                                key={i}
                                className="text-xs text-[#E0DCD3] bg-[#1D1D1D] px-3 py-2 rounded-xl border border-white/10"
                              >
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Purchase Bar (Price + Primary CTA / Stepper) */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-30 bg-[#141414]/95 backdrop-blur-xl border-t border-[#C8A66A]/30 shadow-[0_-10px_30px_rgba(0,0,0,0.6)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 min-w-0">
          {/* Price Info */}
          <div className="min-w-0 shrink-0">
            <span className="text-[11px] font-medium text-[#C8C4BC] block">قیمت نهایی محصول</span>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              {getProductDiscountInfo(product).hasDiscount && (
                <span className="text-xs font-semibold text-[#9E9A92] line-through tabular-nums">
                  {formatPriceNumber(product.price)}
                </span>
              )}
              <span className="text-lg sm:text-2xl font-extrabold text-[#C8A66A] tabular-nums">
                {formatPriceNumber(getProductDiscountInfo(product).finalPrice)}
              </span>
              <span className="text-xs font-semibold text-[#C8C4BC]">تومان</span>
            </div>
          </div>

          {/* Primary Action / Stepper */}
          <div className="flex items-center gap-2 min-w-0 flex-1 max-w-xs justify-end">
            {cartQuantity > 0 ? (
              product.type === 'digital' ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => onNavigate('cart')}
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#254F38] hover:opacity-95 text-[#F5F2EC] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    <Check className="w-4 h-4 shrink-0" />
                    <span>در سبد — مشاهده سبد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                    aria-label="حذف از سبد خرید"
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-[#1D1D1D] border border-white/15 text-[#C8C4BC] hover:text-[#F5F2EC] flex items-center justify-center shrink-0 transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <div className="flex items-center justify-between gap-2 bg-[#1D1D1D] border border-[#C8A66A]/45 rounded-xl p-0.5 flex-1">
                    <button
                      type="button"
                      onClick={() => onUpdateCartQuantity(product.id, cartQuantity + 1)}
                      disabled={isMaxStockReached}
                      aria-label="افزایش تعداد"
                      className="min-w-[44px] min-h-[44px] rounded-lg bg-[#C8A66A] text-[#101010] hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center shrink-0 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <span className="text-sm font-extrabold text-[#F5F2EC] tabular-nums px-1">
                      {toPersianDigits(cartQuantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartQuantity(product.id, cartQuantity - 1)}
                      aria-label="کاهش تعداد"
                      className="min-w-[44px] min-h-[44px] rounded-lg bg-[#141414] text-[#F5F2EC] border border-white/10 hover:border-[#C8A66A]/50 active:scale-95 flex items-center justify-center shrink-0 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('cart')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#254F38] text-[#F5F2EC] text-xs font-bold shrink-0 hover:opacity-95 active:scale-95 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    سبد خرید
                  </button>
                </div>
              )
            ) : (
              <button
                type="button"
                onClick={() => onAddToCart(product.id, 1)}
                disabled={isOutOfStock}
                className="w-full min-h-[44px] px-5 rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] disabled:opacity-45 text-[#101010] font-extrabold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>{isOutOfStock ? 'ناموجود در انبار' : 'افزودن به سبد'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CartViewProps {
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onNavigate: (route: AppRoute) => void;
  onSelectProduct: (productId: string) => void;
}

export const CartView: React.FC<CartViewProps> = ({
  cart,
  products,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  onSelectProduct
}) => {
  const populatedCart = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter((x): x is { productId: string; quantity: number; product: Product } => x !== null);

  const hasPhysical = populatedCart.some((i) => i.product.type === 'physical');
  const subtotal = populatedCart.reduce(
    (sum, i) => sum + getProductDiscountInfo(i.product).finalPrice * i.quantity,
    0
  );
  const shippingCost = hasPhysical ? 85000 : 0;
  const totalAmount = subtotal + shippingCost;

  if (populatedCart.length === 0) {
    return (
      <div dir="rtl" className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#1D1D1D] border border-white/10 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-7 h-7 text-[#C8A66A]" />
        </div>
        <h1 className="text-xl font-extrabold text-[#F5F2EC]">سبد خرید شما خالی است</h1>
        <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md mx-auto">
          برای انتخاب برنامه‌های تمرینی دیجیتال یا تجهیزات تخصصی لیفتینگ، وارد فروشگاه شوید.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('shop')}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 hover:opacity-95 active:scale-95 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
        >
          <span>ورود به فروشگاه</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 md:pb-16 overflow-x-hidden">
      <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mb-6">
        سبد خرید ({toPersianDigits(populatedCart.reduce((acc, i) => acc + i.quantity, 0))} مورد)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-3 min-w-0">
          {populatedCart.map(({ product, quantity }) => (
            <div
              key={product.id}
              className="bg-[#1D1D1D] border border-white/10 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 min-w-0"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelectProduct(product.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProduct(product.id);
                  }
                }}
                className="w-20 sm:w-24 aspect-[4/3] rounded-xl overflow-hidden bg-[#141414] shrink-0 cursor-pointer"
              >
                <LuxuryArtwork
                  preset={product.visualPreset}
                  customUrl={product.customImageUrl}
                  alt={product.title}
                  aspectClass="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <span className="text-[11px] font-bold text-[#C8A66A] block">
                  {product.type === 'digital' ? 'برنامه دیجیتال' : 'تجهیزات'}
                </span>
                <h2
                  onClick={() => onSelectProduct(product.id)}
                  className="text-sm sm:text-base font-bold text-[#F5F2EC] line-clamp-1 cursor-pointer hover:text-[#E5C88E]"
                >
                  {product.title}
                </h2>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                    {getProductDiscountInfo(product).hasDiscount && (
                      <span className="text-xs text-[#9E9A92] line-through tabular-nums">
                        {formatPriceNumber(product.price * quantity)}
                      </span>
                    )}
                    <span className="text-sm sm:text-base font-extrabold text-[#C8A66A] tabular-nums">
                      {formatPriceNumber(getProductDiscountInfo(product).finalPrice * quantity)}
                    </span>
                    <span className="text-xs text-[#C8C4BC]">تومان</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {product.type === 'physical' && (
                      <div className="flex items-center gap-1.5 bg-[#141414] border border-white/10 rounded-xl p-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                          aria-label="افزایش تعداد"
                          className="min-w-[36px] min-h-[36px] rounded-lg bg-[#C8A66A] text-[#101010] flex items-center justify-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-extrabold tabular-nums text-[#F5F2EC]">
                          {toPersianDigits(quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                          aria-label="کاهش تعداد"
                          className="min-w-[36px] min-h-[36px] rounded-lg bg-[#1D1D1D] text-[#F5F2EC] flex items-center justify-center"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveItem(product.id)}
                      aria-label="حذف از سبد"
                      className="min-w-[40px] min-h-[40px] rounded-xl bg-white/5 hover:bg-[#9E3A34]/20 text-[#C8C4BC] hover:text-[#F28B82] flex items-center justify-center transition-opacity duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-4 min-w-0">
          <div className="bg-[#1D1D1D] border border-white/10 rounded-2xl p-5 space-y-4 sticky top-24">
            <h2 className="text-base font-extrabold text-[#F5F2EC] border-b border-white/10 pb-3">
              خلاصه صورتحساب
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between text-[#C8C4BC]">
                <span>مجموع اقلام</span>
                <span className="tabular-nums font-bold text-[#F5F2EC]">
                  {formatPriceNumber(subtotal)} تومان
                </span>
              </div>
              <div className="flex items-center justify-between text-[#C8C4BC]">
                <span>هزینه ارسال تجهیزات</span>
                <span className="tabular-nums font-bold text-[#F5F2EC]">
                  {shippingCost === 0 ? 'رایگان (دیجیتال)' : `${formatPriceNumber(shippingCost)} تومان`}
                </span>
              </div>
              <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="font-bold text-[#F5F2EC]">مبلغ قابل پرداخت</span>
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-lg font-extrabold text-[#C8A66A] tabular-nums">
                    {formatPriceNumber(totalAmount)}
                  </span>
                  <span className="text-xs text-[#C8C4BC]">تومان</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('checkout')}
              className="w-full min-h-[48px] rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] text-[#101010] font-extrabold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
            >
              <span>ادامه و تکمیل سفارش</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CheckoutViewProps {
  cart: CartItem[];
  products: Product[];
  defaultName: string;
  defaultPhone: string;
  defaultEmail?: string;
  initialStep?: 1 | 2 | 3;
  onBackToCart: () => void;
  onNavigateToPaymentResult?: (orderId: string) => void;
}

const CHECKOUT_STEPS: { id: 1 | 2 | 3; title: string; subtitle: string }[] = [
  { id: 1, title: 'اطلاعات', subtitle: 'مشخصات خریدار' },
  { id: 2, title: 'روش پرداخت', subtitle: 'انتخاب درگاه' },
  { id: 3, title: 'تأیید', subtitle: 'بازبینی و پرداخت' }
];

function normalizeDigitsToEnglish(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  cart,
  products,
  defaultName,
  defaultPhone,
  defaultEmail = '',
  initialStep = 1,
  onBackToCart,
  onNavigateToPaymentResult
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Step 1: Customer Information
  const [customerName, setCustomerName] = useState(defaultName);
  const [customerPhone, setCustomerPhone] = useState(defaultPhone);
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [customerCity, setCustomerCity] = useState('تهران');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPostalCode, setCustomerPostalCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Payment Method (Default to first item in PAYMENT_GATEWAYS_CONFIG)
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayId>(
    PAYMENT_GATEWAYS_CONFIG[0]?.id || 'zarinpal'
  );
  const [mockOutcome, setMockOutcome] = useState<PaymentOrderStatus>(() =>
    getMockGatewayOutcome()
  );

  // Step 3: Submission state, double-click lock & per-attempt idempotency key
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const checkoutIdempotencyKeyRef = React.useRef<string>('');

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  // Reset idempotency key whenever cart contents or selected gateway changes
  useEffect(() => {
    checkoutIdempotencyKeyRef.current = '';
  }, [cart, selectedGateway]);

  const populatedCart = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product ? { ...item, product } : null;
      })
      .filter((x): x is { productId: string; quantity: number; product: Product } => x !== null);
  }, [cart, products]);

  const hasPhysical = useMemo(
    () => populatedCart.some((i) => i.product.type === 'physical'),
    [populatedCart]
  );

  const subtotal = useMemo(
    () =>
      populatedCart.reduce(
        (sum, i) => sum + getProductDiscountInfo(i.product).finalPrice * i.quantity,
        0
      ),
    [populatedCart]
  );

  const shippingCost = hasPhysical ? 85000 : 0;
  const totalAmount = subtotal + shippingCost;
  const totalCount = populatedCart.reduce((acc, i) => acc + i.quantity, 0);

  const selectedGatewayConfig = useMemo(
    () =>
      PAYMENT_GATEWAYS_CONFIG.find((g) => g.id === selectedGateway) ||
      PAYMENT_GATEWAYS_CONFIG[0],
    [selectedGateway]
  );

  const validateStep1 = (): boolean => {
    const nextErrors: Record<string, string> = {};
    const trimmedName = customerName.trim();
    const normalizedPhone = normalizeDigitsToEnglish(customerPhone.trim()).replace(/[\s-]/g, '');
    const trimmedEmail = customerEmail.trim();

    if (trimmedName.length < 2) {
      nextErrors.name = 'لطفاً نام و نام خانوادگی خود را کامل وارد کنید.';
    }

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      nextErrors.phone = 'شماره موبایل معتبر ۱۱ رقمی (با شروع ۰۹) وارد کنید.';
    }

    if (trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'ساختار ایمیل وارد شده معتبر نیست.';
    }

    if (hasPhysical) {
      if (customerCity.trim().length < 2) {
        nextErrors.city = 'لطفاً نام شهر مقصد را وارد کنید.';
      }
      if (customerAddress.trim().length < 8) {
        nextErrors.address = 'لطفاً نشانی دقیق پستی جهت ارسال تجهیزات را وارد کنید.';
      }
      const normalizedPostal = normalizeDigitsToEnglish(customerPostalCode.trim());
      if (normalizedPostal.length > 0 && !/^\d{10}$/.test(normalizedPostal)) {
        nextErrors.postalCode = 'کد پستی باید ۱۰ رقم بدون خط تیره باشد.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoToStep = (targetStep: 1 | 2 | 3) => {
    if (isSubmitting) return;
    if (targetStep > 1 && !validateStep1()) {
      setStep(1);
      return;
    }
    setSubmitError(null);
    setStep(targetStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrimaryAction = async () => {
    if (isSubmitting) return;

    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 2) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Step 3: Submit Checkout via POST /api/v1/checkout (no price sent from frontend)
    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const normalizedPhone = normalizeDigitsToEnglish(customerPhone.trim()).replace(/[\s-]/g, '');
      const normalizedPostal = normalizeDigitsToEnglish(customerPostalCode.trim());

      if (!checkoutIdempotencyKeyRef.current) {
        checkoutIdempotencyKeyRef.current =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const response = await createCheckoutSession({
        items: populatedCart.map((item) => ({
          productId: item.productId,
          qty: item.quantity
        })),
        customer: {
          name: customerName.trim(),
          phone: normalizedPhone,
          email: customerEmail.trim() || undefined,
          ...(hasPhysical
            ? {
                city: customerCity.trim(),
                address: customerAddress.trim(),
                postalCode: normalizedPostal || undefined
              }
            : {})
        },
        gateway: selectedGateway,
        idempotencyKey: checkoutIdempotencyKeyRef.current
      });

      const resolvedRedirect = response.redirect || {
        method: selectedGateway === 'sep' ? 'POST' : 'GET',
        url: response.paymentUrl || `/payment/result?orderId=${encodeURIComponent(response.orderId)}`
      };

      // If parent SPA provides in-app handler and redirect points to /payment/result, also support standard redirect
      if (
        resolvedRedirect.method === 'GET' &&
        resolvedRedirect.url.startsWith('/payment/result') &&
        onNavigateToPaymentResult
      ) {
        try {
          window.history.pushState({}, '', resolvedRedirect.url);
        } catch {}
        onNavigateToPaymentResult(response.orderId);
        return;
      }

      executeGatewayRedirect(resolvedRedirect);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'خطا در برقراری ارتباط با سرویس پرداخت. لطفاً دوباره تلاش کنید.'
      );
      setIsSubmitting(false);
    }
  };

  const handleOutcomeChange = (nextOutcome: PaymentOrderStatus) => {
    setMockOutcome(nextOutcome);
    setMockGatewayOutcome(nextOutcome);
  };

  if (populatedCart.length === 0) {
    return (
      <div dir="rtl" className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4 overflow-x-hidden">
        <div className="w-16 h-16 rounded-2xl bg-[#1D1D1D] border border-white/10 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-7 h-7 text-[#C8A66A]" />
        </div>
        <h1 className="text-xl font-extrabold text-[#F5F2EC]">سبد خرید شما خالی است</h1>
        <p className="text-xs sm:text-sm text-[#D0CCC4] max-w-md mx-auto">
          برای تکمیل فرآیند خرید، ابتدا محصول مورد نظر خود را به سبد خرید اضافه کنید.
        </p>
        <button
          type="button"
          onClick={onBackToCart}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] font-extrabold text-xs sm:text-sm inline-flex items-center gap-2 hover:opacity-95 active:scale-95 transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
        >
          <span>بازگشت به سبد خرید</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen pb-32 pt-4 sm:pt-7 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 min-w-0">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-2 mb-4 min-w-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (step === 1) {
                onBackToCart();
              } else {
                setStep((prev) => (prev === 3 ? 2 : 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="inline-flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1D1D1D] border border-white/10 text-xs sm:text-sm font-bold text-[#D0CCC4] hover:text-[#F5F2EC] hover:border-[#C8A66A]/40 disabled:opacity-50 transition-[transform,opacity] duration-150 motion-reduce:transition-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
          >
            <ArrowRight className="w-4 h-4 text-[#C8A66A] shrink-0" />
            <span>{step === 1 ? 'بازگشت به سبد خرید' : 'بازگشت به مرحله قبل'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D0CCC4] bg-[#181818] border border-white/10 px-3 py-2 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-[#C8A66A] shrink-0" />
            <span>پروتکل پرداخت امن شاپرک</span>
          </div>
        </div>

        {/* 3-Step Stepper: اطلاعات ← روش پرداخت ← تأیید */}
        <nav
          aria-label="مراحل تکمیل خرید"
          className="bg-[#1D1D1D] border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 min-w-0"
        >
          <ol className="grid grid-cols-3 gap-2 min-w-0">
            {CHECKOUT_STEPS.map((s, idx) => {
              const isCurrent = step === s.id;
              const isCompleted = step > s.id;
              return (
                <li key={s.id} className="min-w-0 flex items-center">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleGoToStep(s.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full min-h-[44px] px-2 sm:px-3 py-2 rounded-xl flex items-center gap-2 text-start border transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] min-w-0 ${
                      isCurrent
                        ? 'bg-[#C8A66A]/15 border-[#C8A66A] text-[#F5F2EC]'
                        : isCompleted
                        ? 'bg-[#141414] border-[#3E7B59]/50 text-[#D0CCC4] hover:border-[#C8A66A]/40'
                        : 'bg-[#141414] border-white/10 text-[#B8B4AC] hover:text-[#F5F2EC]'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 tabular-nums ${
                        isCurrent
                          ? 'bg-[#C8A66A] text-[#101010]'
                          : isCompleted
                          ? 'bg-[#254F38] text-[#F5F2EC]'
                          : 'bg-white/10 text-[#D0CCC4]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        toPersianDigits(s.id)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs sm:text-sm font-extrabold truncate">
                        {s.title}
                      </span>
                      <span className="hidden sm:block text-[11px] text-[#C8C4BC] truncate">
                        {s.subtitle}
                      </span>
                    </div>
                    {idx < CHECKOUT_STEPS.length - 1 && (
                      <ArrowLeft className="w-3.5 h-3.5 text-[#9E9A92] shrink-0 hidden md:block ms-auto" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Collapsible Mobile Order Summary (جمع‌شونده در موبایل) */}
        <div className="lg:hidden bg-[#1D1D1D] border border-white/10 rounded-2xl mb-4 overflow-hidden min-w-0">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen((prev) => !prev)}
            aria-expanded={mobileSummaryOpen}
            className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C8A66A]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingBag className="w-4 h-4 text-[#C8A66A] shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-[#F5F2EC] truncate">
                خلاصه سفارش ({toPersianDigits(totalCount)} کالا)
              </span>
              {mobileSummaryOpen ? (
                <ChevronUp className="w-4 h-4 text-[#C8A66A] shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#D0CCC4] shrink-0" />
              )}
            </div>
            <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0">
              <span className="text-sm font-extrabold text-[#C8A66A] tabular-nums">
                {formatPriceNumber(totalAmount)}
              </span>
              <span className="text-[11px] font-semibold text-[#D0CCC4]">تومان</span>
            </div>
          </button>

          {mobileSummaryOpen && (
            <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3 min-w-0">
              <ul className="space-y-2 min-w-0">
                {populatedCart.map(({ product, quantity }) => {
                  const unitPrice = getProductDiscountInfo(product).finalPrice;
                  return (
                    <li
                      key={product.id}
                      className="flex items-center justify-between gap-2 text-xs text-[#E0DCD3] min-w-0"
                    >
                      <span className="truncate min-w-0">
                        {product.title} × {toPersianDigits(quantity)}
                      </span>
                      <span className="tabular-nums font-bold text-[#F5F2EC] shrink-0 whitespace-nowrap">
                        {formatPriceNumber(unitPrice * quantity)} تومان
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[#D0CCC4]">
                  <span>جمع اقلام</span>
                  <span className="tabular-nums font-bold text-[#F5F2EC]">
                    {formatPriceNumber(subtotal)} تومان
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#D0CCC4]">
                  <span>هزینه ارسال</span>
                  <span className="tabular-nums font-bold text-[#F5F2EC]">
                    {shippingCost === 0
                      ? 'رایگان (دیجیتال)'
                      : `${formatPriceNumber(shippingCost)} تومان`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Checkout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-w-0">
          {/* Active Step Card */}
          <div className="lg:col-span-8 min-w-0">
            {/* STEP 1: اطلاعات خریدار */}
            {step === 1 && (
              <section
                aria-labelledby="checkout-step-1-heading"
                className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-4 sm:p-7 space-y-5 min-w-0"
              >
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/35 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-[#C8A66A]" />
                  </div>
                  <div className="min-w-0">
                    <h1
                      id="checkout-step-1-heading"
                      className="text-base sm:text-lg font-extrabold text-[#F5F2EC]"
                    >
                      ۱. اطلاعات خریدار
                    </h1>
                    <p className="text-xs text-[#D0CCC4]">
                      لینک دسترسی به برنامه‌ها و کد رهگیری به شماره موبایل شما ارسال می‌شود.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                  {/* Name */}
                  <div className="min-w-0">
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                    >
                      نام و نام خانوادگی <span className="text-[#C8A66A]">*</span>
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                      }}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'checkout-name-error' : undefined}
                      placeholder="مثلاً: آرش کاظمی"
                      className={`w-full min-w-0 min-h-[44px] bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] placeholder:text-[#9E9A92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                        errors.name ? 'border-[#E57373]' : 'border-white/15'
                      }`}
                    />
                    {errors.name && (
                      <p
                        id="checkout-name-error"
                        role="alert"
                        aria-live="polite"
                        className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Mobile */}
                  <div className="min-w-0">
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                    >
                      شماره موبایل <span className="text-[#C8A66A]">*</span>
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      dir="ltr"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      aria-invalid={Boolean(errors.phone)}
                      aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
                      placeholder="09123456789"
                      className={`w-full min-w-0 min-h-[44px] bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] font-mono text-end placeholder:text-[#9E9A92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                        errors.phone ? 'border-[#E57373]' : 'border-white/15'
                      }`}
                    />
                    {errors.phone && (
                      <p
                        id="checkout-phone-error"
                        role="alert"
                        aria-live="polite"
                        className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Email */}
                <div className="min-w-0">
                  <label
                    htmlFor="checkout-email"
                    className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                  >
                    ایمیل <span className="text-[#B8B4AC] font-normal">(اختیاری — جهت دریافت نسخه پشتیبان فایل‌ها)</span>
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'checkout-email-error' : undefined}
                    placeholder="athlete@example.com"
                    className={`w-full min-w-0 min-h-[44px] bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] font-mono text-end placeholder:text-[#9E9A92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                      errors.email ? 'border-[#E57373]' : 'border-white/15'
                    }`}
                  />
                  {errors.email && (
                    <p
                      id="checkout-email-error"
                      role="alert"
                      aria-live="polite"
                      className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>

                {/* Physical Product Shipping Address (ONLY shown if cart has physical equipment) */}
                {hasPhysical ? (
                  <div className="pt-4 border-t border-white/10 space-y-4 min-w-0">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#E5C88E]">
                      <Truck className="w-4 h-4 text-[#C8A66A] shrink-0" />
                      <span>اطلاعات ارسال پستی تجهیزات فیزیکی</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                      <div className="min-w-0">
                        <label
                          htmlFor="checkout-city"
                          className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                        >
                          شهر <span className="text-[#C8A66A]">*</span>
                        </label>
                        <input
                          id="checkout-city"
                          type="text"
                          value={customerCity}
                          onChange={(e) => {
                            setCustomerCity(e.target.value);
                            if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                          }}
                          aria-invalid={Boolean(errors.city)}
                          aria-describedby={errors.city ? 'checkout-city-error' : undefined}
                          className={`w-full min-w-0 min-h-[44px] bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                            errors.city ? 'border-[#E57373]' : 'border-white/15'
                          }`}
                        />
                        {errors.city && (
                          <p
                            id="checkout-city-error"
                            role="alert"
                            aria-live="polite"
                            className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.city}</span>
                          </p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <label
                          htmlFor="checkout-postal"
                          className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                        >
                          کد پستی ۱۰ رقمی <span className="text-[#B8B4AC] font-normal">(اختیاری)</span>
                        </label>
                        <input
                          id="checkout-postal"
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={customerPostalCode}
                          onChange={(e) => {
                            setCustomerPostalCode(e.target.value);
                            if (errors.postalCode)
                              setErrors((prev) => ({ ...prev, postalCode: '' }));
                          }}
                          aria-invalid={Boolean(errors.postalCode)}
                          aria-describedby={errors.postalCode ? 'checkout-postal-error' : undefined}
                          placeholder="1234567890"
                          className={`w-full min-w-0 min-h-[44px] bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] font-mono text-end placeholder:text-[#9E9A92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                            errors.postalCode ? 'border-[#E57373]' : 'border-white/15'
                          }`}
                        />
                        {errors.postalCode && (
                          <p
                            id="checkout-postal-error"
                            role="alert"
                            aria-live="polite"
                            className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{errors.postalCode}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <label
                        htmlFor="checkout-address"
                        className="block text-xs font-bold text-[#E0DCD3] mb-1.5"
                      >
                        نشانی دقیق پستی <span className="text-[#C8A66A]">*</span>
                      </label>
                      <textarea
                        id="checkout-address"
                        rows={2}
                        value={customerAddress}
                        onChange={(e) => {
                          setCustomerAddress(e.target.value);
                          if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
                        }}
                        aria-invalid={Boolean(errors.address)}
                        aria-describedby={errors.address ? 'checkout-address-error' : undefined}
                        placeholder="خیابان، کوچه، پلاک، واحد..."
                        className={`w-full min-w-0 bg-[#141414] border rounded-xl px-3.5 py-2.5 text-sm text-[#F5F2EC] placeholder:text-[#9E9A92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                          errors.address ? 'border-[#E57373]' : 'border-white/15'
                        }`}
                      />
                      {errors.address && (
                        <p
                          id="checkout-address-error"
                          role="alert"
                          aria-live="polite"
                          className="mt-1.5 text-xs font-semibold text-[#F28B82] flex items-center gap-1"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{errors.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#141414] border border-white/10 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs text-[#D0CCC4]">
                    <Sparkles className="w-4 h-4 text-[#C8A66A] shrink-0" />
                    <span>
                      سبد خرید شما فقط شامل محصولات دیجیتال است؛ نیازی به وارد کردن آدرس پستی نیست و دسترسی بلافاصله پس از پرداخت فعال می‌شود.
                    </span>
                  </div>
                )}
              </section>
            )}

            {/* STEP 2: انتخاب روش پرداخت (Vertical Radio Cards from Config) */}
            {step === 2 && (
              <section
                aria-labelledby="checkout-step-2-heading"
                className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-4 sm:p-7 space-y-5 min-w-0"
              >
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/35 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-[#C8A66A]" />
                  </div>
                  <div className="min-w-0">
                    <h1
                      id="checkout-step-2-heading"
                      className="text-base sm:text-lg font-extrabold text-[#F5F2EC]"
                    >
                      ۲. انتخاب روش پرداخت
                    </h1>
                    <p className="text-xs text-[#D0CCC4]">
                      پرداخت با کلیه کارت‌های بانکی عضو شبکه شتاب و رمز پویا امکان‌پذیر است.
                    </p>
                  </div>
                </div>

                {/* Vertical Radio Cards (role="radiogroup") */}
                <div
                  role="radiogroup"
                  aria-labelledby="checkout-step-2-heading"
                  className="space-y-3 min-w-0"
                >
                  {PAYMENT_GATEWAYS_CONFIG.map((gw) => {
                    const isChecked = selectedGateway === gw.id;
                    return (
                      <div
                        key={gw.id}
                        role="radio"
                        aria-checked={isChecked}
                        tabIndex={0}
                        onClick={() => setSelectedGateway(gw.id)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setSelectedGateway(gw.id);
                          }
                        }}
                        className={`w-full min-h-[76px] p-4 rounded-2xl border cursor-pointer flex items-start gap-3.5 transition-[transform,opacity] duration-150 motion-reduce:transition-none active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] min-w-0 ${
                          isChecked
                            ? 'bg-[#141414] border-[#C8A66A] shadow-[0_0_0_1px_rgba(200,166,106,0.35)]'
                            : 'bg-[#141414]/70 border-white/10 hover:border-white/25'
                        }`}
                      >
                        {/* Custom Radio Indicator */}
                        <span
                          aria-hidden="true"
                          className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isChecked ? 'border-[#C8A66A]' : 'border-[#9E9A92]'
                          }`}
                        >
                          {isChecked && (
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C8A66A]" />
                          )}
                        </span>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm sm:text-base font-extrabold text-[#F5F2EC]">
                              {gw.title}
                            </span>
                            {gw.badge && (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[#C8A66A]/15 text-[#E5C88E] border border-[#C8A66A]/35">
                                {gw.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#D0CCC4] leading-relaxed">
                            {gw.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mock Gateway Outcome Selector (strictly dev-only, never rendered in Production) */}
                {false && (
                  <div className="bg-[#141414] border border-dashed border-[#C8A66A]/35 rounded-2xl p-3.5 space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#E5C88E]">
                        حالت شبیه‌ساز درگاه (Mock Gateway):
                      </span>
                      <span className="text-[11px] text-[#C8C4BC] font-mono" dir="ltr">
                        POST /api/checkout
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { id: 'paid', label: 'پرداخت موفق' },
                          { id: 'failed', label: 'ناموفق' },
                          { id: 'cancelled', label: 'لغو توسط کاربر' },
                          { id: 'pending', label: 'در انتظار (Polling)' }
                        ] as { id: PaymentOrderStatus; label: string }[]
                      ).map((opt) => {
                        const active = mockOutcome === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleOutcomeChange(opt.id)}
                            className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-[transform,opacity] duration-150 motion-reduce:transition-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                              active
                                ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                                : 'bg-[#1D1D1D] text-[#D0CCC4] border-white/10 hover:text-[#F5F2EC]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* STEP 3: تأیید نهایی و انتقال به درگاه */}
            {step === 3 && (
              <section
                aria-labelledby="checkout-step-3-heading"
                className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-4 sm:p-7 space-y-5 min-w-0"
              >
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/35 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#C8A66A]" />
                  </div>
                  <div className="min-w-0">
                    <h1
                      id="checkout-step-3-heading"
                      className="text-base sm:text-lg font-extrabold text-[#F5F2EC]"
                    >
                      ۳. تأیید اطلاعات و پرداخت نهایی
                    </h1>
                    <p className="text-xs text-[#D0CCC4]">
                      لطفاً مشخصات و روش پرداخت انتخابی خود را پیش از انتقال به درگاه بررسی کنید.
                    </p>
                  </div>
                </div>

                {/* Review Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0">
                  <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#C8A66A]">مشخصات خریدار</span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleGoToStep(1)}
                        className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-[#E5C88E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                      >
                        ویرایش
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#F5F2EC] break-words">
                      {customerName}
                    </div>
                    <div className="text-xs text-[#D0CCC4] font-mono" dir="ltr">
                      {toPersianDigits(customerPhone)}
                    </div>
                    {customerEmail.trim() && (
                      <div className="text-xs text-[#D0CCC4] font-mono truncate" dir="ltr">
                        {customerEmail.trim()}
                      </div>
                    )}
                    {hasPhysical && (
                      <div className="text-xs text-[#D0CCC4] pt-1 border-t border-white/10 break-words">
                        {customerCity} — {customerAddress}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#C8A66A]">درگاه پرداخت انتخابی</span>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleGoToStep(2)}
                        className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-[#E5C88E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                      >
                        تغییر درگاه
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#F5F2EC]">
                      {selectedGatewayConfig.title}
                    </div>
                    <p className="text-xs text-[#D0CCC4] leading-relaxed">
                      {selectedGatewayConfig.description}
                    </p>
                  </div>
                </div>

                {/* Order Items Review */}
                <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3 min-w-0">
                  <span className="text-xs font-extrabold text-[#C8A66A] block">
                    اقلام سفارش ({toPersianDigits(totalCount)} مورد)
                  </span>
                  <ul className="divide-y divide-white/10 min-w-0">
                    {populatedCart.map(({ product, quantity }) => {
                      const unitPrice = getProductDiscountInfo(product).finalPrice;
                      return (
                        <li
                          key={product.id}
                          className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 min-w-0"
                        >
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-[#F5F2EC] block truncate">
                              {product.title}
                            </span>
                            <span className="text-[11px] text-[#C8C4BC]">
                              تعداد: {toPersianDigits(quantity)} ·{' '}
                              {product.type === 'digital' ? 'برنامه دیجیتال' : 'تجهیزات فیزیکی'}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1 whitespace-nowrap shrink-0">
                            <span className="text-xs sm:text-sm font-extrabold text-[#C8A66A] tabular-nums">
                              {formatPriceNumber(unitPrice * quantity)}
                            </span>
                            <span className="text-[11px] text-[#D0CCC4]">تومان</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Error Alert */}
                {submitError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="bg-[#9E3A34]/20 border border-[#E57373]/40 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs font-bold text-[#F28B82]"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Desktop Order Summary Sidebar */}
          <aside className="hidden lg:block lg:col-span-4 min-w-0">
            <div className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-5 space-y-4 sticky top-24 min-w-0">
              <h2 className="text-base font-extrabold text-[#F5F2EC] border-b border-white/10 pb-3">
                خلاصه سفارش ({toPersianDigits(totalCount)} کالا)
              </h2>

              <ul className="space-y-2.5 max-h-60 overflow-y-auto pe-1 min-w-0">
                {populatedCart.map(({ product, quantity }) => {
                  const unitPrice = getProductDiscountInfo(product).finalPrice;
                  return (
                    <li
                      key={product.id}
                      className="flex items-start justify-between gap-2 text-xs min-w-0"
                    >
                      <span className="text-[#E0DCD3] line-clamp-1 min-w-0">
                        {product.title} × {toPersianDigits(quantity)}
                      </span>
                      <span className="tabular-nums font-bold text-[#F5F2EC] shrink-0 whitespace-nowrap">
                        {formatPriceNumber(unitPrice * quantity)} تومان
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-white/10 pt-3 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between text-[#D0CCC4]">
                  <span>مجموع اقلام</span>
                  <span className="tabular-nums font-bold text-[#F5F2EC]">
                    {formatPriceNumber(subtotal)} تومان
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#D0CCC4]">
                  <span>هزینه ارسال</span>
                  <span className="tabular-nums font-bold text-[#F5F2EC]">
                    {shippingCost === 0
                      ? 'رایگان (دیجیتال)'
                      : `${formatPriceNumber(shippingCost)} تومان`}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="font-extrabold text-[#F5F2EC]">مبلغ نهایی</span>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-lg font-extrabold text-[#C8A66A] tabular-nums">
                      {formatPriceNumber(totalAmount)}
                    </span>
                    <span className="text-xs text-[#D0CCC4]">تومان</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky Bottom Payment Bar (مبلغ نهایی تومان و دکمه پرداخت چسبیده به پایین صفحه) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#141414]/95 backdrop-blur-xl border-t border-[#C8A66A]/35 shadow-[0_-10px_30px_rgba(0,0,0,0.65)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0 shrink-0">
            <span className="text-[11px] font-semibold text-[#D0CCC4] block">
              مبلغ قابل پرداخت
            </span>
            <div className="flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-lg sm:text-2xl font-extrabold text-[#C8A66A] tabular-nums">
                {formatPriceNumber(totalAmount)}
              </span>
              <span className="text-xs font-semibold text-[#D0CCC4]">تومان</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePrimaryAction}
            className="min-h-[48px] px-5 sm:px-7 py-2.5 rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-[#101010] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC] shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>در حال اتصال به درگاه...</span>
              </>
            ) : step === 1 ? (
              <>
                <span>ادامه به انتخاب روش پرداخت</span>
                <ArrowLeft className="w-4 h-4 shrink-0" />
              </>
            ) : step === 2 ? (
              <>
                <span>ادامه به تأیید نهایی</span>
                <ArrowLeft className="w-4 h-4 shrink-0" />
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 shrink-0" />
                <span>پرداخت آنلاین</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface OrderDetailViewProps {
  order: Order;
  products: Product[];
  onNavigate: (route: AppRoute) => void;
}

export const OrderDetailView: React.FC<OrderDetailViewProps> = ({
  order,
  onNavigate
}) => {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-8 pb-28 md:pb-16 overflow-x-hidden">
      <div className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-5 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold text-[#3E7B59] block mb-1">
              سفارش با موفقیت ثبت شد
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#F5F2EC]">
              شماره سفارش: {order.orderNumber}
            </h1>
          </div>
          <span className="text-xs text-[#C8C4BC]">{order.createdAt}</span>
        </div>

        <div className="space-y-3">
          {order.items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-white/10 rounded-2xl p-3.5"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#F5F2EC] line-clamp-1">{item.title}</div>
                <div className="text-xs text-[#C8C4BC] mt-0.5">
                  تعداد: {toPersianDigits(item.quantity)} ·{' '}
                  {item.type === 'digital' ? 'برنامه تمرینی دیجیتال' : 'محصول فیزیکی'}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                {item.type === 'digital' && (
                  <a
                    href={`/api/v1/downloads/${encodeURIComponent(
                      item.downloadToken || 'tok-demo-hypertrophy'
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#C8A66A]/15 hover:bg-[#C8A66A]/25 border border-[#C8A66A]/45 text-[#C8A66A] text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود امن برنامه</span>
                  </a>
                )}
                <div className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-sm font-extrabold text-[#C8A66A] tabular-nums">
                    {formatPriceNumber(item.price * item.quantity)}
                  </span>
                  <span className="text-xs text-[#C8C4BC]">تومان</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-[#C8C4BC]">جمع کل:</span>
            <span className="text-lg font-extrabold text-[#C8A66A] tabular-nums">
              {formatPriceNumber(order.totalAmount)}
            </span>
            <span className="text-xs text-[#C8C4BC]">تومان</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] font-bold text-xs sm:text-sm"
          >
            بازگشت به فروشگاه
          </button>
        </div>
      </div>
    </div>
  );
};

export { formatToman };
