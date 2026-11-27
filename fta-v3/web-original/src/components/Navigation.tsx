import React from 'react';
import {
  Home,
  ShoppingBag,
  Compass,
  User,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { AppRoute } from '../types';
import { toPersianDigits } from '../utils/format';

interface NavigationProps {
  currentRoute: AppRoute;
  cartCount: number;
  coachName: string;
  onNavigate: (route: AppRoute) => void;
  onBack: () => void;
  onOpenQrCard: () => void;
}

const PRIMARY_TABS: { route: AppRoute; label: string; icon: React.FC<{ className?: string }> }[] = [
  { route: 'home', label: 'خانه', icon: Home },
  { route: 'shop', label: 'فروشگاه', icon: ShoppingBag },
  { route: 'explore', label: 'اکسپلور', icon: Compass },
  { route: 'account', label: 'حساب کاربری', icon: User }
];

const ROUTE_TITLES: Record<AppRoute, string> = {
  home: 'پروفایل رسمی مربی',
  shop: 'فروشگاه تخصصی',
  explore: 'اکسپلور ویدیویی',
  account: 'حساب کاربری',
  'product-detail': 'جزئیات محصول',
  cart: 'سبد خرید',
  checkout: 'تکمیل سفارش',
  'payment-result': 'نتیجه پرداخت سفارش',
  'order-detail': 'جزئیات سفارش و دسترسی',
  contact: 'تماس و مشاوره مستقیم',
  admin: 'پنل مدیریت',
  install: 'نصب و راه‌اندازی سیستم'
};

export const TopHeader: React.FC<NavigationProps> = ({
  currentRoute,
  cartCount,
  coachName,
  onNavigate,
  onBack,
  onOpenQrCard
}) => {
  const isPrimaryRoute =
    currentRoute === 'home' ||
    currentRoute === 'shop' ||
    currentRoute === 'explore' ||
    currentRoute === 'account';

  const isExplore = currentRoute === 'explore';

  return (
    <header
      className={`w-full z-40 transition-colors ${
        isExplore
          ? 'fixed top-0 right-0 left-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent border-b-0'
          : 'sticky top-0 bg-[#101010]/90 backdrop-blur-md border-b border-white/[0.08]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-[52px] md:h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark (Desktop) / Back or Brand (Mobile) */}
        <div className="flex items-center gap-2 shrink-0">
          {!isPrimaryRoute ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="بازگشت به صفحه قبل"
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-[#F5F2EC] hover:text-[#C8A66A] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-base md:text-lg font-bold tracking-tight text-[#F5F2EC] hover:text-[#C8A66A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPrimaryRoute ? coachName : ROUTE_TITLES[currentRoute]}
          </button>
        </div>

        {/* Zone 2: Desktop Single-Line Navigation Links (3-Zone Top Bar Contract) */}
        <nav aria-label="منوی اصلی" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {PRIMARY_TABS.map((tab) => {
            const isActive =
              currentRoute === tab.route ||
              (tab.route === 'shop' &&
                (currentRoute === 'product-detail' ||
                  currentRoute === 'cart' ||
                  currentRoute === 'checkout'));
            return (
              <button
                key={tab.route}
                type="button"
                onClick={() => onNavigate(tab.route)}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'text-[#C8A66A] border-[#C8A66A] font-semibold'
                    : 'text-[#929292] border-transparent hover:text-[#F5F2EC]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-1.5 shrink-0">
          {currentRoute === 'home' && (
            <button
              type="button"
              onClick={onOpenQrCard}
              aria-label="کارت ویزیت هوشمند QR و NFC"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#F5F2EC] hover:text-[#C8A66A] transition-colors cursor-pointer"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label={`سبد خرید (${toPersianDigits(cartCount)} کالا)`}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1D1D1D] hover:bg-[#262626] border border-white/[0.08] text-xs font-semibold text-[#F5F2EC] flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#C8A66A]" />
            <span className="hidden sm:inline">سبد خرید</span>
            <span className="tabular-nums text-[#C8A66A] font-bold">
              {toPersianDigits(cartCount)}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

interface BottomTabBarProps {
  currentRoute: AppRoute;
  cartCount: number;
  onNavigate: (route: AppRoute) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentRoute,
  cartCount,
  onNavigate
}) => {
  // Hide bottom tab bar on checkout or product-detail where sticky bottom action bar is shown on mobile
  if (currentRoute === 'checkout') {
    return null;
  }

  return (
    <nav
      aria-label="ناوبری پایین صفحه موبایل"
      className="md:hidden fixed bottom-0 right-0 left-0 z-40 bg-[#101010]/95 backdrop-blur-md border-t border-white/[0.08] pb-safe"
    >
      <div className="grid grid-cols-4 items-center h-16 max-w-md mx-auto px-2">
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            currentRoute === tab.route ||
            (tab.route === 'shop' &&
              (currentRoute === 'product-detail' || currentRoute === 'cart')) ||
            (tab.route === 'account' && currentRoute === 'order-detail');

          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => onNavigate(tab.route)}
              className={`min-h-[44px] min-w-[44px] flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer relative ${
                isActive ? 'text-[#C8A66A]' : 'text-[#929292] hover:text-[#F5F2EC]'
              }`}
            >
              <div className="relative">
                <Icon className="w-[21px] h-[21px]" />
                {tab.route === 'shop' && cartCount > 0 && (
                  <span className="absolute -top-1.5 -left-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C8A66A] text-[#101010] text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {toPersianDigits(cartCount)}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] mt-1 whitespace-nowrap shrink-0 ${
                  isActive ? 'font-bold text-[#C8A66A]' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
