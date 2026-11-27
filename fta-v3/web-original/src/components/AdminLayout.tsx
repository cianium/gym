import React from 'react';
import {
  Layers,
  Lock,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { CoachProfile } from '../types';
import { toPersianDigits } from '../utils/format';

export interface AdminLayoutStats {
  sectionsCount?: number;
  productsCount?: number;
  ordersCount?: number;
  postsCount?: number;
}

export interface AdminLayoutProps {
  children: React.ReactNode;
  coach?: CoachProfile;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  workspaceTitle?: string;
  workspaceSubtitle?: string;
  stats?: AdminLayoutStats;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  coach,
  isAuthenticated = true,
  onLogout,
  workspaceTitle,
  workspaceSubtitle,
  stats
}) => {
  const displayCoachName = coach?.name || 'آرش کاظمی';
  const displayTitle = workspaceTitle || `میز کار اختصاصی مربی · ${displayCoachName}`;
  const displaySubtitle =
    workspaceSubtitle || 'کنسول مستقل مدیریت بخش‌ها، برنامه‌های تمرینی، محصولات و سفارش‌ها';

  return (
    <div
      dir="rtl"
      data-testid="admin-layout"
      className="min-h-[100dvh] bg-[#0E0E0E] text-[#F5F2EC] flex flex-col selection:bg-[#C8A66A] selection:text-[#101010]"
    >
      {/* Dedicated Coach Workspace Top Bar (Zero public navigation or storefront headers) */}
      <header
        data-testid="admin-workspace-header"
        className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-white/[0.08]"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {/* Workspace Identity & Breadcrumb */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold text-[#F5F2EC] truncate">
                  {displayTitle}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1D1D1D] border border-white/[0.08] text-[10px] font-mono text-[#C8A66A] shrink-0">
                  <Sparkles className="w-3 h-3" />
                  <span>WORKSPACE · v2.2.0</span>
                </span>
              </div>
              <p className="text-[11px] text-[#929292] truncate mt-0.5">{displaySubtitle}</p>
            </div>
          </div>

          {/* Workspace Metrics & Session Control */}
          <div className="flex items-center gap-3 shrink-0">
            {isAuthenticated && stats && (
              <div
                data-testid="admin-workspace-metrics"
                className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-xl bg-[#161616] border border-white/[0.07] text-xs"
              >
                {typeof stats.sectionsCount === 'number' && (
                  <div className="flex items-center gap-1.5 text-[#929292]">
                    <Layers className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>بخش‌های فعال:</span>
                    <strong className="text-[#F5F2EC] font-bold tabular-nums">
                      {toPersianDigits(stats.sectionsCount)}
                    </strong>
                  </div>
                )}

                {typeof stats.productsCount === 'number' && (
                  <div className="flex items-center gap-1.5 text-[#929292] border-r border-white/[0.08] pr-4">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>محصولات:</span>
                    <strong className="text-[#F5F2EC] font-bold tabular-nums">
                      {toPersianDigits(stats.productsCount)}
                    </strong>
                  </div>
                )}

                {typeof stats.ordersCount === 'number' && (
                  <div className="flex items-center gap-1.5 text-[#929292] border-r border-white/[0.08] pr-4">
                    <Package className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>سفارش‌ها:</span>
                    <strong className="text-[#F5F2EC] font-bold tabular-nums">
                      {toPersianDigits(stats.ordersCount)}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && onLogout ? (
              <button
                type="button"
                data-testid="admin-logout-button"
                onClick={onLogout}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1A1A1A] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-xs font-semibold text-[#929292] hover:text-red-300 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج از پنل</span>
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] border border-white/[0.08] text-[11px] text-[#929292] flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <Lock className="w-3.5 h-3.5 text-[#C8A66A]" />
                <span>نشست امن مربی</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Coach Dashboard Workspace Canvas */}
      <main data-testid="admin-workspace-main" className="flex-1 w-full">
        {children}
      </main>

      {/* Minimalist Workspace Footer */}
      <footer
        data-testid="admin-workspace-footer"
        className="border-t border-white/[0.06] bg-[#101010] py-4 px-4 md:px-8 mt-auto"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#929292]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F5F2EC]">کنسول مدیریت اختصاصی مربی</span>
            <span aria-hidden="true">·</span>
            <span>محیط کاری ایزوله و مستقل از ناوبری عمومی</span>
          </div>
          <div className="font-mono text-[10px] text-[#929292]" dir="ltr">
            WHITE-LABEL FITNESS v2.2.0 · COACH ADMIN WORKSPACE · /admin
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
