import React, { useMemo, useState } from 'react';
import { Check, Minus, Plus, ShoppingBag, Sparkles, Package, Percent } from 'lucide-react';
import { Product } from '../types';
import { formatPriceNumber, toPersianDigits } from '../utils/format';
import { LuxuryArtwork } from './VisualMedia';

export interface ProductDiscountInfo {
  hasDiscount: boolean;
  discountPercent: number;
  finalPrice: number;
  basePrice: number;
}

/**
 * Automatically calculates discount percentage and final price from Product object
 * when `discountPrice` or `originalPrice` is present.
 */
export function getProductDiscountInfo(product: Product): ProductDiscountInfo {
  if (
    typeof product.discountPrice === 'number' &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    const basePrice = product.price;
    const finalPrice = product.discountPrice;
    const discountPercent = Math.round(((basePrice - finalPrice) / basePrice) * 100);
    return {
      hasDiscount: discountPercent > 0,
      discountPercent,
      finalPrice,
      basePrice
    };
  }

  if (
    typeof product.originalPrice === 'number' &&
    product.originalPrice > product.price &&
    product.price > 0
  ) {
    const basePrice = product.originalPrice;
    const finalPrice = product.price;
    const discountPercent = Math.round(((basePrice - finalPrice) / basePrice) * 100);
    return {
      hasDiscount: discountPercent > 0,
      discountPercent,
      finalPrice,
      basePrice
    };
  }

  return {
    hasDiscount: false,
    discountPercent: 0,
    finalPrice: product.price,
    basePrice: product.price
  };
}

/**
 * کامپوننت «نشان تخفیف» درصدی با فونت طلایی در پس‌زمینه تیره روی گوشه بالای کارت محصول
 */
export const DiscountBadge: React.FC<{ product: Product; className?: string }> = ({
  product,
  className = ''
}) => {
  const { hasDiscount, discountPercent } = useMemo(
    () => getProductDiscountInfo(product),
    [product]
  );

  if (!hasDiscount || discountPercent <= 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#101010]/92 border border-[#C8A66A]/55 backdrop-blur-md shadow-md ${className}`}
      aria-label={`${toPersianDigits(discountPercent)} درصد تخفیف`}
    >
      <span className="text-[11px] sm:text-xs font-extrabold text-[#C8A66A] tabular-nums leading-none">
        {toPersianDigits(discountPercent)}٪
      </span>
      <span className="text-[10px] sm:text-[11px] font-bold text-[#E5C88E] leading-none ms-0.5">
        تخفیف
      </span>
      <Percent className="w-2.5 h-2.5 text-[#C8A66A] shrink-0 hidden sm:inline-block" />
    </div>
  );
};

export interface ShopCardProps {
  product: Product;
  cartQuantity: number;
  showDiscountBadge?: boolean;
  onSelectProduct: (productId: string) => void;
  onAddToCart: (productId: string, quantity?: number) => void;
  onUpdateCartQuantity?: (productId: string, newQuantity: number) => void;
}

/**
 * Extracts 2 to 3 concise, non-truncating metadata chips for the product card.
 * Examples: «۱۲ هفته», «۴ تا ۵ جلسه», «متوسط تا پیشرفته»
 */
function getProductMetaChips(product: Product): string[] {
  const chips: string[] = [];

  if (product.type === 'digital') {
    if (product.duration) {
      const parenMatch = product.duration.match(/^([^(]+)\(([^)]+)\)/);
      if (parenMatch) {
        const mainDuration = parenMatch[1].trim();
        const subDuration = parenMatch[2].replace('در هفته', '').trim();
        if (mainDuration) chips.push(mainDuration);
        if (subDuration) chips.push(subDuration);
      } else {
        chips.push(product.duration.trim());
      }
    } else {
      chips.push('۱۲ هفته');
      chips.push('۴ تا ۵ جلسه');
    }

    if (product.level) {
      chips.push(product.level.trim());
    } else {
      chips.push('متوسط تا پیشرفته');
    }
  } else {
    if (product.material) {
      const materialParts = product.material
        .split('+')
        .map((part) => part.trim())
        .filter(Boolean);
      if (materialParts[0]) {
        chips.push(materialParts[0]);
      }
      if (materialParts[1]) {
        chips.push(materialParts[1]);
      }
    } else {
      chips.push('چرم طبیعی');
      chips.push('دوخت کولار');
    }

    if (typeof product.stock === 'number') {
      chips.push(product.stock > 0 ? `موجود (${toPersianDigits(product.stock)})` : 'ناموجود');
    } else {
      chips.push('ضمانت اصالت');
    }
  }

  return chips.slice(0, 3);
}

export const ShopCard: React.FC<ShopCardProps> = ({
  product,
  cartQuantity,
  showDiscountBadge = true,
  onSelectProduct,
  onAddToCart,
  onUpdateCartQuantity
}) => {
  const [imageReady, setImageReady] = useState(true);
  const metaChips = useMemo(() => getProductMetaChips(product), [product]);
  const discountInfo = useMemo(() => getProductDiscountInfo(product), [product]);

  const isOutOfStock =
    product.type === 'physical' && typeof product.stock === 'number' && product.stock <= 0;
  const isMaxStockReached =
    product.type === 'physical' && typeof product.stock === 'number' && cartQuantity >= product.stock;

  const handleCardClick = () => {
    onSelectProduct(product.id);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectProduct(product.id);
    }
  };

  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product.id, 1);
  };

  const handleDecrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onUpdateCartQuantity) {
      onUpdateCartQuantity(product.id, cartQuantity - 1);
    }
  };

  const handleIncrement = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (product.type === 'digital') {
      return;
    }
    if (onUpdateCartQuantity && !isMaxStockReached) {
      onUpdateCartQuantity(product.id, cartQuantity + 1);
    } else if (!onUpdateCartQuantity && !isMaxStockReached) {
      onAddToCart(product.id, 1);
    }
  };

  return (
    <article
      dir="rtl"
      className="group relative flex flex-col min-w-0 w-full rounded-2xl bg-[#1D1D1D] border border-white/10 overflow-hidden transition-[transform,opacity] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#C8A66A]"
    >
      {/* Clickable Product Link Area (Image + Title + Chips + Price) */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        aria-label={`مشاهده جزئیات ${product.title}`}
        className="flex flex-col flex-1 min-w-0 cursor-pointer text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C8A66A]"
      >
        {/* 1. Image: aspect-ratio 4/3, object-fit cover, explicit dimensions, lazy loading, skeleton, and corner badges */}
        <div className="relative w-full aspect-[4/3] bg-[#141414] overflow-hidden shrink-0">
          {!imageReady && (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 bg-[#242424] animate-pulse"
            />
          )}

          <div
            onLoad={() => setImageReady(true)}
            className="w-full h-full transition-transform duration-200 motion-reduce:transition-none group-hover:scale-[1.03]"
          >
            <LuxuryArtwork
              preset={product.visualPreset}
              customUrl={product.customImageUrl}
              alt={product.title}
              aspectClass="w-full h-full object-cover"
            />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1D1D1D]/75 to-transparent"
          />

          {/* Product Type Badge on Image Start-Top Corner using RTL Logical Properties */}
          <div className="absolute top-2 start-2 z-20 max-w-[62%]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-bold backdrop-blur-md border ${
                product.type === 'digital'
                  ? 'bg-[#101010]/85 text-[#E5C88E] border-[#C8A66A]/45'
                  : 'bg-[#101010]/85 text-[#F5F2EC] border-white/20'
              }`}
            >
              {product.type === 'digital' ? (
                <Sparkles className="w-3 h-3 text-[#C8A66A] shrink-0" />
              ) : (
                <Package className="w-3 h-3 text-[#C8A66A] shrink-0" />
              )}
              <span className="truncate">
                {product.type === 'digital' ? 'برنامه دیجیتال' : 'تجهیزات'}
              </span>
            </span>
          </div>

          {/* Discount Percentage Badge on Image End-Top Corner (Gold Font on Dark Background) */}
          {showDiscountBadge && discountInfo.hasDiscount && (
            <div className="absolute top-2 end-2 z-20">
              <DiscountBadge product={product} />
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="flex flex-col flex-1 min-w-0 p-2.5 sm:p-3.5 gap-2">
          {/* 2. Title: max 2 lines (line-clamp-2), size 15-16px, weight 700 */}
          <h3 className="text-[15px] sm:text-[16px] font-bold text-[#F5F2EC] leading-[1.45] line-clamp-2 min-h-[2.9em] group-hover:text-[#E5C88E] transition-opacity duration-150 break-words">
            {product.title}
          </h3>

          {/* 3. Metadata Chips: 2 to 3 small chips, wrapping cleanly without clipping, contrast >= 4.5:1 */}
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {metaChips.map((chip, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-md bg-[#121212] border border-white/10 text-[10px] sm:text-[11px] font-medium text-[#C8C4BC] leading-snug break-words"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* 4. Price: Large gold number, smaller «تومان» beside it, single line, tabular-nums, Persian separator (٬) */}
          <div className="mt-auto pt-2 border-t border-white/10 min-w-0">
            {discountInfo.hasDiscount && (
              <div className="flex items-center justify-end gap-1 min-w-0 whitespace-nowrap mb-0.5">
                <span className="text-[11px] font-medium text-[#B8B4AC] line-through tabular-nums">
                  {formatPriceNumber(discountInfo.basePrice)}
                </span>
              </div>
            )}
            <div className="flex items-baseline justify-end gap-1 min-w-0 whitespace-nowrap">
              <span className="text-base sm:text-lg font-extrabold text-[#C8A66A] tabular-nums tracking-tight">
                {formatPriceNumber(discountInfo.finalPrice)}
              </span>
              <span className="text-[11px] sm:text-xs font-semibold text-[#C8C4BC]">
                تومان
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Single Full-Width Primary CTA (min-height 44px) or Stepper / In-Cart State */}
      <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5 pt-0 min-w-0">
        {cartQuantity > 0 ? (
          product.type === 'digital' ? (
            /* Digital Product In-Cart State: «در سبد ✓» */
            <button
              type="button"
              onClick={handleDecrement}
              aria-label={`در سبد خرید — حذف ${product.title}`}
              className="w-full min-h-[44px] px-2.5 rounded-xl bg-[#254F38]/45 border border-[#3E7B59]/70 text-[#9CE2B9] hover:opacity-90 active:scale-[0.98] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">در سبد ✓</span>
            </button>
          ) : (
            /* Physical Product Stepper: (− ۱ +) with 44x44px touch targets and >= 8px gap */
            <div
              className="flex items-center justify-between gap-2 min-w-0 w-full bg-[#141414] border border-[#C8A66A]/45 rounded-xl p-0.5"
              role="group"
              aria-label={`تغییر تعداد ${product.title} در سبد خرید`}
            >
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isMaxStockReached}
                aria-label="افزایش تعداد"
                className="min-w-[44px] min-h-[44px] rounded-lg bg-[#C8A66A] text-[#101010] hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center shrink-0 transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>

              <span
                aria-live="polite"
                className="flex-1 min-w-0 text-center text-xs sm:text-sm font-extrabold text-[#F5F2EC] tabular-nums select-none"
              >
                {toPersianDigits(cartQuantity)}
              </span>

              <button
                type="button"
                onClick={handleDecrement}
                aria-label="کاهش تعداد"
                className="min-w-[44px] min-h-[44px] rounded-lg bg-[#1D1D1D] text-[#F5F2EC] border border-white/10 hover:border-[#C8A66A]/50 active:scale-95 flex items-center justify-center shrink-0 transition-[transform,opacity] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={handleAddClick}
            disabled={isOutOfStock}
            className="w-full min-h-[44px] px-2.5 rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none text-[#101010] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-[transform,opacity] duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1D1D1D]"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="whitespace-nowrap">{isOutOfStock ? 'ناموجود' : 'افزودن به سبد'}</span>
          </button>
        )}
      </div>
    </article>
  );
};
