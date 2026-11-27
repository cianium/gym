import {demoFetch} from "../api/demoFetch";
import React, { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  Check,
  FileText,
  KeyRound,
  LogIn,
  MapPin,
  Package,
  Phone,
  Play,
  Search,
  Send,
  ShieldCheck,
  User
} from 'lucide-react';
import {
  AppRoute,
  CoachProfile,
  CustomerAccount,
  ExplorePost,
  Order,
  Product
} from '../types';
import { formatToman, toPersianDigits } from '../utils/format';
import { LuxuryArtwork } from '../components/VisualMedia';
import { lookupCustomerOrderOnServer } from '../api/mockGateway';

interface AccountViewProps {
  customer: CustomerAccount;
  orders: Order[];
  products: Product[];
  savedPosts: ExplorePost[];
  onUpdateCustomer: (updated: CustomerAccount) => void;
  onOrderVerified?: (order: Order) => void;
  onSelectOrder: (orderId: string) => void;
  onSelectProduct: (productId: string) => void;
  onOpenExplorePost: (postId: string) => void;
  onNavigate: (route: AppRoute) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  customer,
  orders,
  products,
  savedPosts,
  onUpdateCustomer,
  onOrderVerified,
  onSelectOrder,
  onSelectProduct,
  onOpenExplorePost,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'programs' | 'orders' | 'saved' | 'profile'>(
    'programs'
  );
  const [demoName, setDemoName] = useState(customer.name);
  const [demoPhone, setDemoPhone] = useState(customer.phone);
  const [demoEmail, setDemoEmail] = useState(customer.email);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Cryptographic Order Lookup State
  const [lookupOrderId, setLookupOrderId] = useState('');
  const [lookupToken, setLookupToken] = useState('');
  const [lookupPhone, setLookupPhone] = useState(customer.phone || '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Extract all purchased digital plans from orders
  const purchasedDigitalIds = Array.from(
    new Set(
      orders.flatMap((ord) =>
        ord.items.filter((i) => i.type === 'digital').map((i) => i.productId)
      )
    )
  );
  const purchasedPlans = purchasedDigitalIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const handleOrderLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupFeedback(null);
    if (!lookupOrderId.trim() || !lookupToken.trim()) {
      setLookupFeedback({
        ok: false,
        message: 'شناسه سفارش و توکن مالکیت سفارش جهت احراز هویت رمزنگاری‌شده الزامی است.'
      });
      return;
    }

    setLookupLoading(true);
    const res = await lookupCustomerOrderOnServer({
      orderId: lookupOrderId.trim(),
      accessToken: lookupToken.trim(),
      phone: lookupPhone.trim() || undefined
    });
    setLookupLoading(false);

    if (!res.ok || !res.order) {
      setLookupFeedback({
        ok: false,
        message: res.error || 'سفارش یافت نشد یا توکن مالکیت سفارش معتبر نیست.'
      });
      return;
    }

    onUpdateCustomer({
      ...customer,
      name: res.order.customerName || customer.name || 'ورزشکار',
      phone: res.order.customerPhone || lookupPhone.trim() || customer.phone,
      level: customer.level || 'ورزشکار رسمی',
      memberSince: customer.memberSince || res.order.createdAt || '۱۴۰۳',
      isLoggedInDemo: true
    });

    if (onOrderVerified) {
      onOrderVerified(res.order);
    }

    setLookupFeedback({
      ok: true,
      message: `سفارش ${res.order.orderNumber} با موفقیت احراز هویت و به پنل شما اضافه شد.`
    });
    setLookupOrderId('');
    setLookupToken('');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer({
      ...customer,
      name: demoName.trim() || customer.name,
      phone: demoPhone.trim() || customer.phone,
      email: demoEmail.trim() || customer.email
    });
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2400);
  };

  if (!customer.isLoggedInDemo) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8 pb-28">
        <div className="bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08]">
          <div className="flex items-center gap-1.5 text-xs text-[#C8A66A] font-semibold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>احراز هویت رمزنگاری‌شده مالکیت سفارش</span>
          </div>
          <h1 className="text-xl font-extrabold text-[#F5F2EC]">
            پیگیری سفارش و دسترسی به برنامه‌ها
          </h1>
          <p className="text-xs text-[#929292] mt-1.5 leading-relaxed">
            برای مشاهده وضعیت سفارش و دانلود برنامه‌های تمرینی خریداری‌شده، شناسه سفارش و توکن امنیتی اختصاصی سفارش خود را وارد نمایید.
          </p>

          {lookupFeedback && (
            <div
              className={`mt-4 p-3 rounded-xl text-xs ${
                lookupFeedback.ok
                  ? 'bg-[#254F38]/30 border border-[#3E7B59] text-[#9CE2B9]'
                  : 'bg-red-500/15 border border-red-500/35 text-red-300'
              }`}
            >
              {lookupFeedback.message}
            </div>
          )}

          <form onSubmit={handleOrderLookupSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1.5">
                شناسه یا شماره سفارش *
              </label>
              <input
                type="text"
                required
                dir="ltr"
                placeholder="ord-..."
                value={lookupOrderId}
                onChange={(e) => setLookupOrderId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1.5">
                توکن امنیتی مالکیت سفارش (Order Access Token) *
              </label>
              <input
                type="password"
                required
                dir="ltr"
                placeholder="توکن ۴۸ کاراکتری صادرشده هنگام خرید"
                value={lookupToken}
                onChange={(e) => setLookupToken(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1.5">
                شماره موبایل ثبت‌شده در سفارش (اختیاری)
              </label>
              <input
                type="tel"
                dir="ltr"
                placeholder="0912..."
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <button
              type="submit"
              disabled={lookupLoading}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {lookupLoading ? 'در حال اعتبارسنجی رمزنگاری‌شده...' : 'احراز هویت و مشاهده سفارش'}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-28 md:pb-16">
      {/* Top Customer Summary Header */}
      <div className="bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-[#C8A66A] flex items-center justify-center shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#929292]">
              <span className="text-[#C8A66A] font-semibold">{customer.level}</span>
              <span aria-hidden="true">·</span>
              <span>عضویت از {customer.memberSince}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mt-1">
              {customer.name}
            </h1>
            <p className="text-xs text-[#929292] font-mono mt-0.5" dir="ltr">
              {customer.phone} · {customer.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('contact')}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F2EC] flex items-center gap-2 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-[#C8A66A]" />
            <span>پشتیبانی و تماس</span>
          </button>
        </div>
      </div>

      {/* Segmented Account Section Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#1D1D1D] rounded-2xl border border-white/[0.08] mb-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('programs')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'programs'
              ? 'bg-[#C8A66A] text-[#101010]'
              : 'text-[#929292] hover:text-[#F5F2EC]'
          }`}
        >
          برنامه‌های تمرینی من ({toPersianDigits(purchasedPlans.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#C8A66A] text-[#101010]'
              : 'text-[#929292] hover:text-[#F5F2EC]'
          }`}
        >
          سفارش‌ها و مرسولات ({toPersianDigits(orders.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'saved'
              ? 'bg-[#C8A66A] text-[#101010]'
              : 'text-[#929292] hover:text-[#F5F2EC]'
          }`}
        >
          پست‌های ذخیره‌شده ({toPersianDigits(savedPosts.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#C8A66A] text-[#101010]'
              : 'text-[#929292] hover:text-[#F5F2EC]'
          }`}
        >
          ویرایش اطلاعات حساب
        </button>
      </div>

      {/* Tab 1: Purchased Training Plans */}
      {activeTab === 'programs' && (
        <div className="space-y-4">
          {purchasedPlans.length === 0 ? (
            <div className="bg-[#1D1D1D] rounded-3xl p-8 text-center border border-white/[0.08]">
              <BookOpen className="w-8 h-8 text-[#C8A66A] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#F5F2EC]">
                هنوز برنامه تمرینی دیجیتالی تهیه نکرده‌اید
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold cursor-pointer"
              >
                مشاهده برنامه‌های تمرینی
              </button>
            </div>
          ) : (
            purchasedPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                      <LuxuryArtwork
                        preset={plan.visualPreset}
                        customUrl={plan.customImageUrl}
                        alt={plan.title}
                      />
                    </div>
                    <div>
                      <div className="text-xs text-[#C8A66A] font-semibold">
                        فعال و آماده اجرا · {plan.duration}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-[#F5F2EC] mt-0.5">
                        {plan.title}
                      </h2>
                      <p className="text-xs text-[#929292] mt-1">{plan.fileFormat}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProduct(plan.id)}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    مشاهده کامل فازهای تمرینی
                  </button>
                </div>

                {plan.modules && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/[0.08]">
                    {plan.modules.map((mod) => (
                      <div
                        key={mod.weekRange}
                        className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] text-xs space-y-2"
                      >
                        <div className="text-[#C8A66A] font-bold">{mod.weekRange}</div>
                        <div className="font-bold text-[#F5F2EC]">{mod.title}</div>
                        <p className="text-[#929292] leading-relaxed">{mod.focus}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Order History + Cryptographic Order Lookup */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <form
            onSubmit={handleOrderLookupSubmit}
            className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-[#C8A66A]">
              <KeyRound className="w-4 h-4" />
              <span>افزودن یا پیگیری سفارش جدید با توکن امنیتی</span>
            </div>
            {lookupFeedback && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  lookupFeedback.ok
                    ? 'bg-[#254F38]/30 border border-[#3E7B59] text-[#9CE2B9]'
                    : 'bg-red-500/15 border border-red-500/35 text-red-300'
                }`}
              >
                {lookupFeedback.message}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                dir="ltr"
                placeholder="شناسه سفارش (ord-...)"
                value={lookupOrderId}
                onChange={(e) => setLookupOrderId(e.target.value)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
              <input
                type="password"
                dir="ltr"
                placeholder="توکن امنیتی مالکیت سفارش"
                value={lookupToken}
                onChange={(e) => setLookupToken(e.target.value)}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{lookupLoading ? 'در حال بررسی...' : 'بازیابی سفارش از سرور'}</span>
              </button>
            </div>
          </form>

          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#929292]">
                  <span className="font-bold text-[#C8A66A]">{ord.orderNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ord.createdAt}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F5F2EC]">
                    {ord.status === 'completed' ? 'تکمیل شده' : 'در حال پردازش'}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#F5F2EC] mt-2">
                  {ord.items.map((i) => i.title).join(' + ')}
                </div>
                <div className="text-xs text-[#929292] mt-1 tabular-nums">
                  مبلغ کل: {formatToman(ord.totalAmount)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectOrder(ord.id)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F2EC] flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#C8A66A]" />
                <span>مشاهده فاکتور و فایل‌ها</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Saved Explore Posts */}
      {activeTab === 'saved' && (
        <div>
          {savedPosts.length === 0 ? (
            <div className="bg-[#1D1D1D] rounded-3xl p-8 text-center border border-white/[0.08]">
              <Bookmark className="w-8 h-8 text-[#C8A66A] mx-auto mb-3" />
              <h2 className="text-base font-bold text-[#F5F2EC]">
                پستی در لیست ذخیره‌شده‌ها وجود ندارد
              </h2>
              <p className="text-xs text-[#929292] mt-1">
                در بخش اکسپلور می‌توانید ویدیوهای تکنیک حرکتی را برای مرور در باشگاه ذخیره کنید.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('explore')}
                className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold cursor-pointer"
              >
                رفتن به اکسپلور ویدیویی
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenExplorePost(post.id)}
                  className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-[#1D1D1D] border border-white/[0.08] text-right cursor-pointer"
                >
                  <LuxuryArtwork
                    preset={post.visualPreset}
                    customUrl={post.customMediaUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                    <Play className="w-4 h-4 text-[#C8A66A] fill-[#C8A66A]" />
                  </div>
                  <div className="absolute bottom-3 right-3 left-3">
                    <div className="text-xs font-bold text-[#F5F2EC] line-clamp-2">
                      {post.title}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Session Checkout Prefill Info */}
      {activeTab === 'profile' && (
        <form
          onSubmit={handleSaveProfile}
          className="max-w-xl bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-[#F5F2EC]">
              اطلاعات پیش‌فرض فرم خرید (نشست فعلی دستگاه)
            </h2>
            <p className="text-xs text-[#929292] mt-1 leading-relaxed">
              این اطلاعات در نشست فعلی مرورگر شما نگهداری می‌شود تا در زمان ثبت سفارش یا درخواست مشاوره نیازی به تایپ مجدد نداشته باشید. سوابق رسمی هر سفارش به‌صورت مستقل در دیتابیس سرور ثبت می‌گردد.
            </p>
          </div>

          {profileSavedToast && (
            <div className="p-3 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 text-xs text-[#C8A66A] flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>اطلاعات پیش‌فرض فرم خرید در نشست فعلی به‌روزرسانی شد.</span>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#929292] mb-1.5">نام و نام خانوادگی</label>
            <input
              type="text"
              value={demoName}
              onChange={(e) => setDemoName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1.5">شماره همراه</label>
            <input
              type="tel"
              dir="ltr"
              value={demoPhone}
              onChange={(e) => setDemoPhone(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1.5">ایمیل</label>
            <input
              type="email"
              dir="ltr"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
            />
          </div>

          <button
            type="submit"
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs cursor-pointer"
          >
            اعمال در نشست فعلی
          </button>
        </form>
      )}
    </div>
  );
};

interface ContactViewProps {
  coach: CoachProfile;
  onConsultationSubmitted?: (req: {
    id: string;
    senderName: string;
    senderPhone: string;
    goalTopic: string;
    message: string;
    status: 'new' | 'contacted' | 'archived';
    createdAt: string;
  }) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ coach, onConsultationSubmitted }) => {
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [goalTopic, setGoalTopic] = useState('دریافت برنامه اختصاصی هایپرتروفی');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderPhone.trim()) return;
    const payload = {
      senderName: senderName.trim(),
      senderPhone: senderPhone.trim(),
      goalTopic,
      message: message.trim()
    };
    setSubmitted(true);
    setSenderName('');
    setSenderPhone('');
    setMessage('');
    try {
      const res = await demoFetch('/api/v1/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok && onConsultationSubmitted) {
        const created = await res.json();
        onConsultationSubmitted(created);
      }
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-5">
          <div>
            <div className="text-xs text-[#C8A66A] font-semibold">ارتباط مستقیم با دفتر مربی</div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mt-1">
              هماهنگی مشاوره و ارزیابی حضوری
            </h1>
            <p className="text-xs text-[#929292] mt-2 leading-relaxed">
              پاسخگویی به سوالات تخصصی پیرامون برنامه‌های تمرینی و پیگیری مرسولات فیزیکی در روزهای شنبه تا پنجشنبه (ساعت ۱۰ تا ۲۰).
            </p>
          </div>

          <div className="space-y-3.5 pt-4 border-t border-white/[0.08] text-xs">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#C8A66A] shrink-0 mt-0.5" />
              <div>
                <div className="text-[#929292]">آدرس استودیو:</div>
                <div className="text-[#F5F2EC] font-medium mt-0.5">{coach.location}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#C8A66A] shrink-0 mt-0.5" />
              <div>
                <div className="text-[#929292]">تلفن هماهنگی:</div>
                <div className="text-[#F5F2EC] font-mono mt-0.5" dir="ltr">
                  {coach.phone}
                </div>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-4"
        >
          <h2 className="text-base font-bold text-[#F5F2EC]">
            ارسال درخواست مشاوره تمرینی
          </h2>

          {submitted && (
            <div className="p-4 rounded-2xl bg-[#C8A66A]/15 border border-[#C8A66A]/45 text-xs text-[#F5F2EC] flex items-center gap-2.5">
              <Check className="w-5 h-5 text-[#C8A66A] shrink-0" />
              <span>
                درخواست مشاوره شما با موفقیت ثبت شد. تیم مربیگری در اسرع وقت با شما تماس می‌گیرد.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1.5">نام و نام خانوادگی *</label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1.5">شماره تماس *</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1.5">موضوع مشاوره</label>
            <select
              value={goalTopic}
              onChange={(e) => setGoalTopic(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
            >
              <option value="دریافت برنامه اختصاصی هایپرتروفی">
                دریافت برنامه اختصاصی هایپرتروفی و بازآرایی بدن
              </option>
              <option value="ارزیابی حضوری بیومکانیک و اصلاح فرم">
                وقت ارزیابی حضوری بیومکانیک و اصلاح فرم
              </option>
              <option value="پیگیری سفارش تجهیزات ورزشی">
                پیگیری سفارش تجهیزات ورزشی فیزیکی
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1.5">
              سابقه تمرینی، هدف و توضیحات شما
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="سابقه تمرین، وزن، قد و هدف اصلی خود را بنویسید..."
              className="w-full p-3.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>ثبت درخواست مشاوره</span>
          </button>
        </form>
      </div>
    </div>
  );
};
