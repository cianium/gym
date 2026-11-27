import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Instagram,
  MapPin,
  Phone,
  Play,
  QrCode,
  Send,
  ShoppingBag,
  Sparkles,
  Youtube
} from 'lucide-react';
import {
  AppRoute,
  CartItem,
  CoachProfile,
  ExplorePost,
  Product,
  SectionVisualConfig
} from '../types';
import { formatCompactCount, toPersianDigits } from '../utils/format';
import { LuxuryArtwork } from '../components/VisualMedia';
import { CustomizableSection } from '../components/CustomizableSection';
import { ShopCard, getProductDiscountInfo } from '../components/ShopCard';

/**
 * کامپوننت «نشان تخفیف» درصدی در گوشه بالای کارت‌های محصول در HomeView
 * در صورت وجود قیمت تخفیفی (discountPrice یا originalPrice در آبجکت Product)،
 * درصد تخفیف را به صورت خودکار محاسبه کرده و با فونت طلایی در پس‌زمینه تیره نمایش می‌دهد.
 */
export const ProductDiscountBadge: React.FC<{ product: Product }> = ({ product }) => {
  const { hasDiscount, discountPercent } = getProductDiscountInfo(product);

  if (!hasDiscount || discountPercent <= 0) return null;

  return (
    <div
      aria-label={`${toPersianDigits(discountPercent)} درصد تخفیف`}
      className="pointer-events-none absolute top-2 end-2 z-30 inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-[#101010]/92 border border-[#C8A66A]/60 backdrop-blur-md shadow-md"
    >
      <span className="text-[11px] sm:text-xs font-extrabold text-[#C8A66A] tabular-nums leading-none">
        {toPersianDigits(discountPercent)}٪
      </span>
      <span className="text-[10px] sm:text-[11px] font-bold text-[#C8A66A] leading-none ms-0.5">
        تخفیف
      </span>
    </div>
  );
};

interface FeaturedProductsCarouselProps {
  items: Product[];
  cartQuantityMap: Record<string, number>;
  onSelectProduct: (productId: string) => void;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, newQuantity: number) => void;
  onViewAll: () => void;
}

const FeaturedProductsCarousel: React.FC<FeaturedProductsCarouselProps> = ({
  items,
  cartQuantityMap,
  onSelectProduct,
  onAddToCart,
  onUpdateCartQuantity,
  onViewAll
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || items.length === 0) return;
    const scrollOffset = Math.abs(el.scrollLeft);
    const firstCard = cardRefs.current[0];
    const gapPx = window.innerWidth >= 1024 ? 16 : window.innerWidth >= 640 ? 14 : 12;
    const cardWidth = firstCard ? firstCard.offsetWidth + gapPx : el.clientWidth * 0.78;
    const idx = Math.min(
      items.length - 1,
      Math.max(0, Math.round(scrollOffset / Math.max(1, cardWidth)))
    );
    if (idx !== activeIndex) {
      setActiveIndex(idx);
    }
  };

  const scrollToIndex = (targetIdx: number) => {
    const boundedIdx = Math.min(items.length - 1, Math.max(0, targetIdx));
    const targetCard = cardRefs.current[boundedIdx];
    const container = scrollContainerRef.current;

    if (targetCard && container) {
      setActiveIndex(boundedIdx);
      targetCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start'
      });
      return;
    }

    if (container) {
      const firstCard = cardRefs.current[0];
      const step = (firstCard ? firstCard.offsetWidth : 280) + 12;
      const delta = (boundedIdx - activeIndex) * -step;
      container.scrollBy({ left: delta, behavior: 'smooth' });
      setActiveIndex(boundedIdx);
    }
  };

  const scrollByCard = (direction: 'next' | 'prev') => {
    const nextIdx =
      direction === 'next'
        ? Math.min(items.length - 1, activeIndex + 1)
        : Math.max(0, activeIndex - 1);
    scrollToIndex(nextIdx);
  };

  return (
    <div className="relative min-w-0">
      {/* Dedicated 'See All Products' Link Header Bar directly above the Featured Products Carousel */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10 min-w-0">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5C88E] min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
          <span className="truncate">محصولات ویژه ({toPersianDigits(items.length)})</span>
        </div>

        <a
          href="#shop"
          onClick={(e) => {
            e.preventDefault();
            onViewAll();
          }}
          aria-label="مشاهده همه محصولات در فروشگاه"
          className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#C8A66A]/15 hover:opacity-95 border border-[#C8A66A]/35 text-xs font-extrabold text-[var(--accent-gold)] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
        >
          <span>مشاهده همه محصولات</span>
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>

      {/* Smooth Scroll-Snap Track with Tailwind utilities and responsive CSS variables */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="region"
        aria-label="کاروسل محصولات ویژه"
        className="featured-products-carousel -mx-6 px-6 sm:-mx-10 sm:px-10 flex items-stretch gap-3 sm:gap-3.5 lg:gap-4 overflow-x-auto scroll-smooth motion-reduce:scroll-auto snap-x snap-mandatory overscroll-x-contain touch-pan-x scroll-ps-6 sm:scroll-ps-10 scroll-pe-6 sm:scroll-pe-10 no-scrollbar pb-2 min-w-0"
      >
        {items.map((product, index) => (
          <div
            key={product.id}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className="relative w-[var(--carousel-card-w,78vw)] max-w-[300px] sm:w-[270px] lg:w-[285px] shrink-0 snap-start snap-always min-w-0 flex transition-transform duration-200 motion-reduce:transition-none"
          >
            {/* کامپوننت نشان تخفیف درصدی در گوشه بالای کارت محصول */}
            <ProductDiscountBadge product={product} />

            <ShopCard
              product={product}
              cartQuantity={cartQuantityMap[product.id] ?? 0}
              showDiscountBadge={false}
              onSelectProduct={onSelectProduct}
              onAddToCart={onAddToCart}
              onUpdateCartQuantity={onUpdateCartQuantity}
            />
          </div>
        ))}

        {/* End-of-carousel "View All Products" card cue */}
        <div className="w-[52vw] max-w-[200px] sm:w-[190px] shrink-0 snap-start min-w-0 flex">
          <button
            type="button"
            onClick={onViewAll}
            className="w-full min-h-full rounded-2xl bg-[#141414]/90 border border-dashed border-[#C8A66A]/40 hover:border-[var(--accent-gold)] p-4 flex flex-col items-center justify-center text-center gap-3 group cursor-pointer transition-[transform,opacity] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
          >
            <div className="w-11 h-11 rounded-full bg-[#C8A66A]/15 border border-[#C8A66A]/35 flex items-center justify-center text-[var(--accent-gold)] group-hover:scale-105 transition-transform duration-200">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <span className="block text-xs sm:text-sm font-extrabold text-[#F5F2EC]">
                همه محصولات
              </span>
              <span className="block text-[11px] text-[#C8C4BC]">
                مشاهده کامل فروشگاه
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Interactive Scroll Cue Footer: Clickable Smooth-Scroll Dots + Prev/Next Buttons */}
      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-between gap-3 min-w-0">
          {/* Interactive Pagination Dots + Swipe Cue */}
          <div className="flex items-center gap-1.5 min-w-0">
            {items.map((item, idx) => {
              const isCurrent = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  aria-label={`اسکرول به محصول ${toPersianDigits(idx + 1)}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className="py-2 px-0.5 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] rounded-full"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-200 ${
                      isCurrent
                        ? 'w-5 bg-[var(--accent-gold)]'
                        : 'w-1.5 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                </button>
              );
            })}
            <span className="text-[11px] text-[#C8C4BC] ms-1.5 sm:hidden truncate">
              برای مشاهده بکشید
            </span>
          </div>

          {/* Prev / Next Navigation Buttons (44x44px touch targets, >= 8px gap) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollByCard('prev')}
              disabled={activeIndex <= 0}
              aria-label="محصول قبلی"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#141414]/90 border border-white/10 hover:border-[#C8A66A]/50 disabled:opacity-40 disabled:pointer-events-none text-[#F5F2EC] flex items-center justify-center transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
            >
              <ChevronRight className="w-4 h-4 text-[var(--accent-gold)]" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard('next')}
              disabled={activeIndex >= items.length - 1}
              aria-label="محصول بعدی"
              className="min-w-[44px] min-h-[44px] rounded-xl bg-[#141414]/90 border border-white/10 hover:border-[#C8A66A]/50 disabled:opacity-40 disabled:pointer-events-none text-[#F5F2EC] flex items-center justify-center transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--accent-gold)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface HomeViewProps {
  coach: CoachProfile;
  products: Product[];
  posts: ExplorePost[];
  cart: CartItem[];
  sectionConfigs: SectionVisualConfig[];
  onNavigate: (route: AppRoute) => void;
  onSelectProduct: (productId: string) => void;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity: (productId: string, delta: number) => void;
  onOpenExplorePost: (postId: string) => void;
  onOpenQrCard: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  coach,
  products,
  posts,
  cart,
  sectionConfigs,
  onNavigate,
  onSelectProduct,
  onAddToCart,
  onUpdateCartQuantity,
  onOpenExplorePost,
  onOpenQrCard
}) => {
  const publishedProducts = useMemo(
    () => products.filter((p) => p.status === 'published'),
    [products]
  );
  const digitalPrograms = useMemo(
    () => publishedProducts.filter((p) => p.type === 'digital'),
    [publishedProducts]
  );
  const physicalProducts = useMemo(
    () => publishedProducts.filter((p) => p.type === 'physical'),
    [publishedProducts]
  );
  const primaryDigitalPlan = digitalPrograms[0] || publishedProducts[0];

  const cartQuantityMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.productId] = (map[item.productId] ?? 0) + item.quantity;
    }
    return map;
  }, [cart]);

  // Filter and sort Home sections according to coach's customization order
  const homeSections = useMemo(
    () =>
      [...sectionConfigs]
        .filter((sec) => sec.pageTarget === 'home' && sec.enabled)
        .sort((a, b) => a.order - b.order),
    [sectionConfigs]
  );

  const renderHorizontalCarousel = (items: Product[]) => (
    <FeaturedProductsCarousel
      items={items}
      cartQuantityMap={cartQuantityMap}
      onSelectProduct={onSelectProduct}
      onAddToCart={onAddToCart}
      onUpdateCartQuantity={onUpdateCartQuantity}
      onViewAll={() => onNavigate('shop')}
    />
  );

  return (
    <div dir="rtl" className="pb-24 md:pb-16 space-y-10 sm:space-y-14 pt-4 md:pt-8 max-w-7xl mx-auto px-3 sm:px-6 md:px-8 overflow-x-hidden min-w-0">
      {homeSections.map((sec) => {
        // 1. HOME HERO SECTION
        if (sec.id === 'home-hero') {
          return (
            <section key={sec.id} className="min-w-0">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch min-w-0">
                {/* Portrait / Profile Cover Column */}
                <div className="lg:col-span-5 order-1 lg:order-2 min-w-0">
                  <div className="relative h-[380px] sm:h-[460px] lg:h-full min-h-[380px] rounded-3xl overflow-hidden border border-white/10 bg-[#1D1D1D]">
                    <LuxuryArtwork
                      preset={sec.imagePreset || coach.visualPreset}
                      customUrl={sec.customImageUrl || coach.customAvatarUrl}
                      displayMode={sec.imageDisplayMode}
                      alt={sec.title || coach.name}
                      className="w-full h-full"
                    />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: `linear-gradient(to top, rgba(16,16,16,0.95) 0%, rgba(16,16,16,${(
                          sec.overlayOpacity * 0.005
                        ).toFixed(2)}) 55%, transparent 100%)`
                      }}
                    />

                    <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex items-end justify-between gap-3 z-20">
                      <div className="min-w-0">
                        <p className="text-xs font-mono tracking-widest text-[#C8A66A] uppercase truncate">
                          {coach.englishName}
                        </p>
                        <p className="text-xs text-[#E0DCD3] mt-0.5 truncate">
                          کارت هوشمند مربی · {coach.nfcSerialCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenQrCard}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010]/85 hover:opacity-95 border border-[#C8A66A]/40 text-[#F5F2EC] text-xs font-semibold flex items-center gap-2 backdrop-blur-md transition-[transform,opacity] duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                      >
                        <QrCode className="w-4 h-4 text-[#C8A66A]" />
                        <span>کارت دیجیتال</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Customizable Hero Bio Card */}
                <div className="lg:col-span-7 order-2 lg:order-1 min-w-0">
                  <CustomizableSection config={sec} className="h-full">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8A66A] font-medium mb-3">
                        <span>{sec.kicker || 'پلتفرم رسمی مربیگری و برنامه‌نویسی تمرین'}</span>
                      </div>

                      <h1
                        className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#F5F2EC] tracking-tight leading-tight"
                        style={{ textWrap: 'balance' }}
                      >
                        {sec.title || coach.name}
                      </h1>

                      <p className="text-sm sm:text-lg font-semibold text-[#C8A66A] mt-2">
                        {sec.subtitle || coach.title}
                      </p>

                      <p className="text-xs sm:text-base text-[#E0DCD3] leading-relaxed mt-4 max-w-2xl">
                        {coach.bio}
                      </p>

                      <div className="mt-6 pt-5 border-t border-white/[0.08]">
                        <div className="text-xs text-[#C8C4BC] mb-2">حوزه‌های تخصصی مربی:</div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-[#F5F2EC] font-medium">
                          {coach.specialties.map((spec, idx) => (
                            <React.Fragment key={spec}>
                              <span>{spec}</span>
                              {idx < coach.specialties.length - 1 && (
                                <span aria-hidden="true" className="text-[#C8A66A]">
                                  ·
                                </span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (primaryDigitalPlan) {
                            onSelectProduct(primaryDigitalPlan.id);
                          } else {
                            onNavigate('shop');
                          }
                        }}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:opacity-95 text-[#101010] font-bold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                      >
                        <span>{sec.ctaText || 'دریافت برنامه تمرینی'}</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('shop')}
                        className="min-h-[48px] px-6 py-3 rounded-xl bg-[#101010]/90 hover:opacity-95 border border-white/15 text-[#F5F2EC] font-semibold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#C8A66A]" />
                        <span>مشاهده فروشگاه</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('explore')}
                        className="min-h-[48px] px-5 py-3 rounded-xl bg-transparent hover:opacity-90 text-[#E0DCD3] hover:text-[#F5F2EC] font-medium text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                      >
                        <Compass className="w-4 h-4 text-[#C8A66A]" />
                        <span>ویدیوهای آموزشی</span>
                      </button>
                    </div>
                  </CustomizableSection>
                </div>
              </div>

              {/* Quantitative Proof Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6 min-w-0">
                <div className="bg-[#1D1D1D] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 min-w-0">
                  <div className="text-xl sm:text-3xl font-extrabold text-[#C8A66A] tabular-nums">
                    +{toPersianDigits(coach.experienceYears)} سال
                  </div>
                  <div className="text-xs text-[#C8C4BC] mt-1">سابقه مربیگری تخصصی و عملی</div>
                </div>
                <div className="bg-[#1D1D1D] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 min-w-0">
                  <div className="text-xl sm:text-3xl font-extrabold text-[#F5F2EC] tabular-nums">
                    +{toPersianDigits(coach.activeAthletes)} نفر
                  </div>
                  <div className="text-xs text-[#C8C4BC] mt-1">ورزشکار فعال تحت نظارت مستقیم</div>
                </div>
                <div className="bg-[#1D1D1D] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 min-w-0">
                  <div className="text-xl sm:text-3xl font-extrabold text-[#F5F2EC] tabular-nums">
                    {toPersianDigits(coach.programsDelivered.toLocaleString('fa-IR'))}
                  </div>
                  <div className="text-xs text-[#C8C4BC] mt-1">برنامه تمرینی و تغذیه تدوین‌شده</div>
                </div>
                <div className="bg-[#1D1D1D] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 min-w-0">
                  <div className="text-xl sm:text-3xl font-extrabold text-[#C8A66A] tabular-nums">
                    ۹۸.۴٪
                  </div>
                  <div className="text-xs text-[#C8C4BC] mt-1">رضایت ورزشکاران در دوره ۱۲ هفته‌ای</div>
                </div>
              </div>
            </section>
          );
        }

        // 2. FEATURED PRODUCTS / DIGITAL PROGRAMS CAROUSEL SECTION
        if (sec.id === 'home-programs') {
          const items = publishedProducts.length > 0 ? publishedProducts : digitalPrograms;
          return (
            <section key={sec.id} className="min-w-0">
              <CustomizableSection config={sec}>
                <div className="flex items-start sm:items-end justify-between gap-3 mb-4 min-w-0">
                  <div className="min-w-0">
                    {sec.kicker && (
                      <p className="text-xs text-[#C8A66A] font-medium mb-1">{sec.kicker}</p>
                    )}
                    <h2 className="text-lg sm:text-2xl font-bold text-[#F5F2EC]">
                      {sec.title || 'محصولات ویژه و برنامه‌های تمرینی'}
                    </h2>
                    {sec.subtitle && (
                      <p className="text-xs sm:text-sm text-[#C8C4BC] mt-1">{sec.subtitle}</p>
                    )}
                  </div>
                  <a
                    href="#shop"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('shop');
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:opacity-90 border border-white/10 text-xs font-bold text-[#C8A66A] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    <span>همه محصولات</span>
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                </div>

                {renderHorizontalCarousel(items)}
              </CustomizableSection>
            </section>
          );
        }

        // 3. FEATURED PHYSICAL PRODUCTS CAROUSEL SECTION
        if (sec.id === 'home-products') {
          const items =
            physicalProducts.length >= 2
              ? [...physicalProducts, ...digitalPrograms]
              : publishedProducts;
          return (
            <section key={sec.id} className="min-w-0">
              <CustomizableSection config={sec}>
                <div className="flex items-start sm:items-end justify-between gap-3 mb-4 min-w-0">
                  <div className="min-w-0">
                    {sec.kicker && (
                      <p className="text-xs text-[#C8A66A] font-medium mb-1">{sec.kicker}</p>
                    )}
                    <h2 className="text-lg sm:text-2xl font-bold text-[#F5F2EC]">{sec.title}</h2>
                    {sec.subtitle && (
                      <p className="text-xs sm:text-sm text-[#C8C4BC] mt-1">{sec.subtitle}</p>
                    )}
                  </div>
                  <a
                    href="#shop"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('shop');
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:opacity-90 border border-white/10 text-xs font-bold text-[#C8A66A] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    <span>همه محصولات</span>
                    <ArrowLeft className="w-4 h-4" />
                  </a>
                </div>

                {renderHorizontalCarousel(items)}
              </CustomizableSection>
            </section>
          );
        }

        // 4. EXPLORE REELS PREVIEW SECTION
        if (sec.id === 'home-explore-preview') {
          return (
            <section key={sec.id} className="min-w-0">
              <CustomizableSection config={sec}>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 min-w-0">
                  <div className="min-w-0">
                    {sec.kicker && (
                      <p className="text-xs text-[#C8A66A] font-medium mb-1">{sec.kicker}</p>
                    )}
                    <h2 className="text-lg sm:text-2xl font-bold text-[#F5F2EC]">{sec.title}</h2>
                    {sec.subtitle && (
                      <p className="text-xs sm:text-sm text-[#C8C4BC] mt-1">{sec.subtitle}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('explore')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/5 hover:opacity-90 border border-white/10 text-xs font-semibold text-[#C8A66A] flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer transition-[transform,opacity] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                  >
                    <span>{sec.ctaText || 'ورود به فید تمام‌صفحه'}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0">
                  {posts.slice(0, 4).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => onOpenExplorePost(post.id)}
                      className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#1D1D1D] border border-white/[0.08] hover:border-[#C8A66A]/50 text-start transition-[transform,opacity] duration-200 cursor-pointer min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                    >
                      <LuxuryArtwork
                        preset={post.visualPreset}
                        customUrl={post.customMediaUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/20" />

                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between text-[11px] text-[#F5F2EC] font-medium">
                        <span>
                          {post.mediaType === 'video'
                            ? 'ویدیو آموزشی'
                            : post.mediaType === 'carousel'
                              ? 'آلبوم چندصفحه‌ای'
                              : 'اینفوگرافیک'}
                        </span>
                        <Play className="w-4 h-4 text-[#C8A66A] fill-[#C8A66A] shrink-0" />
                      </div>

                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <h3 className="text-xs sm:text-sm font-bold text-[#F5F2EC] line-clamp-2 leading-snug">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-[#C8C4BC] mt-1.5 tabular-nums">
                          <span>{formatCompactCount(post.viewsCount)} بازدید</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatCompactCount(post.likesCount)} پسند</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CustomizableSection>
            </section>
          );
        }

        // 5. ABOUT & CERTIFICATIONS SECTION
        if (sec.id === 'home-about') {
          return (
            <section key={sec.id} className="min-w-0">
              <CustomizableSection config={sec}>
                <div className="flex items-center justify-between gap-4 mb-5 min-w-0">
                  <div className="min-w-0">
                    {sec.kicker && (
                      <p className="text-xs text-[#C8A66A] font-medium mb-1">{sec.kicker}</p>
                    )}
                    <h2 className="text-lg sm:text-2xl font-bold text-[#F5F2EC]">{sec.title}</h2>
                    {sec.subtitle && (
                      <p className="text-xs sm:text-sm text-[#C8C4BC] mt-1">{sec.subtitle}</p>
                    )}
                  </div>
                  <Award className="w-7 h-7 text-[#C8A66A] shrink-0" />
                </div>

                <div className="divide-y divide-white/[0.08] bg-[#141414]/85 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/[0.06] min-w-0">
                  {coach.certifications.map((cert) => (
                    <div key={cert.id} className="py-4 first:pt-0 last:pb-0 min-w-0">
                      <div className="text-sm sm:text-base font-bold text-[#F5F2EC]">
                        {cert.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8C4BC] mt-1.5">
                        <span>{cert.issuer}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">سال اخذ: {cert.year}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[#C8A66A]">{cert.code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CustomizableSection>
            </section>
          );
        }

        // 6. CTA & DIRECT CONTACT SECTION
        if (sec.id === 'home-cta') {
          return (
            <section key={sec.id} className="min-w-0">
              <CustomizableSection config={sec}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center min-w-0">
                  <div className="lg:col-span-7 min-w-0">
                    {sec.kicker && (
                      <p className="text-xs text-[#C8A66A] font-medium mb-1">{sec.kicker}</p>
                    )}
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] leading-snug">
                      {sec.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#E0DCD3] mt-2 leading-relaxed">
                      {sec.subtitle}
                    </p>

                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs min-w-0">
                      <div className="flex items-center gap-2.5 text-[#F5F2EC] min-w-0">
                        <MapPin className="w-4 h-4 text-[#C8A66A] shrink-0" />
                        <span className="truncate">{coach.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#F5F2EC]">
                        <Phone className="w-4 h-4 text-[#C8A66A] shrink-0" />
                        <span className="tabular-nums font-mono" dir="ltr">
                          {coach.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#F5F2EC]">
                        <Instagram className="w-4 h-4 text-[#C8A66A] shrink-0" />
                        <span className="font-mono" dir="ltr">
                          {coach.instagramHandle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#F5F2EC]">
                        <Send className="w-4 h-4 text-[#C8A66A] shrink-0" />
                        <span className="font-mono" dir="ltr">
                          {coach.telegramHandle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[#F5F2EC]">
                        <Youtube className="w-4 h-4 text-[#C8A66A] shrink-0" />
                        <span className="font-mono" dir="ltr">
                          {coach.youtubeHandle}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(sec.ctaRoute || 'contact')}
                      className="min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:opacity-95 text-[#101010] font-bold text-xs flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                    >
                      <FileText className="w-4 h-4" />
                      <span>{sec.ctaText || 'فرم مشاوره و تماس مستقیم'}</span>
                    </button>
                  </div>
                </div>
              </CustomizableSection>
            </section>
          );
        }

        // 7. PROMOTIONAL BANNER OR CUSTOM IMAGE BLOCK
        return (
          <section key={sec.id} className="min-w-0">
            <CustomizableSection
              config={sec}
              onNavigate={onNavigate}
              renderDefaultBannerContent
            />
          </section>
        );
      })}
    </div>
  );
};
