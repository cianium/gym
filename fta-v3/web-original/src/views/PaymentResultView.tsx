import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeadphonesIcon,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  XCircle
} from 'lucide-react';
import { AppRoute, PaymentOrderRecord, PaymentOrderStatus } from '../types';
import {
  fetchOrderStatus,
  PAYMENT_GATEWAYS_CONFIG,
  updateMockOrderStatus
} from '../api/mockGateway';
import { formatPriceNumber, toPersianDigits } from '../utils/format';

interface PaymentResultViewProps {
  orderId: string | null;
  onRetryPaymentStep2: (orderRecord?: PaymentOrderRecord | null) => void;
  onNavigate: (route: AppRoute) => void;
  onOrderPaidSuccess?: (orderRecord: PaymentOrderRecord) => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 60000;

export const PaymentResultView: React.FC<PaymentResultViewProps> = ({
  orderId: propOrderId,
  onRetryPaymentStep2,
  onNavigate,
  onOrderPaidSuccess
}) => {
  const [orderRecord, setOrderRecord] = useState<PaymentOrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPollingTimedOut, setIsPollingTimedOut] = useState<boolean>(false);
  const [elapsedPollSec, setElapsedPollSec] = useState<number>(0);
  const [isSwitchingMock, setIsSwitchingMock] = useState<boolean>(false);

  const paidNotifiedRef = useRef<string | null>(null);

  // استخراج صرفاً orderId از آدرس؛ وضعیت موفقیت هرگز از query string خوانده نمی‌شود
  const resolvedOrderId = (() => {
    if (propOrderId) return propOrderId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const fromSearch = params.get('orderId');
      if (fromSearch) return fromSearch;
    }
    return null;
  })();

  const loadOrderFromApi = useCallback(
    async (targetOrderId: string, showSpinner = false) => {
      if (showSpinner) {
        setIsLoading(true);
      }
      setErrorMessage(null);
      try {
        const data = await fetchOrderStatus(targetOrderId);
        setOrderRecord(data);
        if (data.status === 'paid' && paidNotifiedRef.current !== data.orderId) {
          paidNotifiedRef.current = data.orderId;
          if (onOrderPaidSuccess) {
            onOrderPaidSuccess(data);
          }
        }
        return data;
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'خطا در دریافت اطلاعات سفارش از سرور.'
        );
        return null;
      } finally {
        if (showSpinner) {
          setIsLoading(false);
        }
      }
    },
    [onOrderPaidSuccess]
  );

  // بارگذاری اولیه وضعیت سفارش از GET /api/orders/{orderId}
  useEffect(() => {
    if (!resolvedOrderId) {
      setIsLoading(false);
      setErrorMessage('شناسه سفارش در آدرس یافت نشد.');
      return;
    }
    setIsPollingTimedOut(false);
    setElapsedPollSec(0);
    loadOrderFromApi(resolvedOrderId, true);
  }, [resolvedOrderId, loadOrderFromApi]);

  // در وضعیت pending / processing / verification_pending: Polling هر ۳ ثانیه تا حداکثر ۱ دقیقه
  const isPendingVerificationState =
    orderRecord?.status === 'pending' ||
    orderRecord?.status === 'processing' ||
    orderRecord?.status === 'verification_pending';

  useEffect(() => {
    if (
      !resolvedOrderId ||
      !orderRecord ||
      !isPendingVerificationState ||
      isPollingTimedOut
    ) {
      return;
    }

    const startTime = Date.now();
    const intervalId = window.setInterval(async () => {
      const elapsed = Date.now() - startTime;
      setElapsedPollSec(Math.min(60, Math.round(elapsed / 1000)));

      if (elapsed >= MAX_POLL_DURATION_MS) {
        window.clearInterval(intervalId);
        setIsPollingTimedOut(true);
        return;
      }

      const latest = await loadOrderFromApi(resolvedOrderId, false);
      if (
        latest &&
        latest.status !== 'pending' &&
        latest.status !== 'processing' &&
        latest.status !== 'verification_pending'
      ) {
        window.clearInterval(intervalId);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [resolvedOrderId, orderRecord, isPendingVerificationState, isPollingTimedOut, loadOrderFromApi]);

  const handleSwitchMockStatus = async (nextStatus: PaymentOrderStatus) => {
    if (!resolvedOrderId || isSwitchingMock) return;
    setIsSwitchingMock(true);
    setIsPollingTimedOut(false);
    setElapsedPollSec(0);
    try {
      const updated = await updateMockOrderStatus(resolvedOrderId, nextStatus);
      setOrderRecord(updated);
      if (updated.status === 'paid' && paidNotifiedRef.current !== updated.orderId) {
        paidNotifiedRef.current = updated.orderId;
        if (onOrderPaidSuccess) {
          onOrderPaidSuccess(updated);
        }
      }
    } catch {
      // Ignore mock switch error
    } finally {
      setIsSwitchingMock(false);
    }
  };

  const gatewayTitle =
    PAYMENT_GATEWAYS_CONFIG.find((g) => g.id === orderRecord?.gateway)?.title ||
    (orderRecord?.gateway === 'sep'
      ? 'درگاه سامان (سپ)'
      : 'درگاه آنلاین زرین‌پال');

  return (
    <div
      dir="rtl"
      className="min-h-screen pb-28 md:pb-16 pt-4 sm:pt-8 px-3 sm:px-6 overflow-x-hidden"
    >
      <div className="max-w-2xl mx-auto space-y-5 min-w-0">
        {/* نوار کنترل شبیه‌ساز وضعیت درگاه (فقط در محیط توسعه / غیرفعال در Production) */}
        {false && resolvedOrderId && (
          <div className="bg-[#181818] border border-white/10 rounded-2xl p-3 sm:p-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C8A66A]">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>شبیه‌ساز وضعیت پاسخ بانک (GET /api/orders/{resolvedOrderId.slice(0, 10)}...):</span>
              </span>
              {isSwitchingMock && (
                <Loader2 className="w-3.5 h-3.5 text-[#C8A66A] animate-spin" />
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
              {(
                [
                  { id: 'paid', label: 'موفق (paid)' },
                  { id: 'failed', label: 'ناموفق (failed)' },
                  { id: 'cancelled', label: 'لغو شده (cancelled)' },
                  { id: 'pending', label: 'در انتظار (pending)' }
                ] as { id: PaymentOrderStatus; label: string }[]
              ).map((opt) => {
                const active = orderRecord?.status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isSwitchingMock}
                    onClick={() => handleSwitchMockStatus(opt.id)}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-[transform,opacity] duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A] ${
                      active
                        ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                        : 'bg-[#121212] text-[#C8C4BC] border-white/10 hover:text-[#F5F2EC]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* کارت اصلی نتیجه پرداخت */}
        <div
          aria-live="polite"
          className="bg-[#1D1D1D] border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 min-w-0"
        >
          {isLoading ? (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-[#C8A66A] animate-spin mx-auto" />
              <div className="space-y-1">
                <h1 className="text-base sm:text-lg font-extrabold text-[#F5F2EC]">
                  در حال استعلام وضعیت سفارش از سرور...
                </h1>
                <p className="text-xs text-[#C8C4BC]">
                  لطفاً چند لحظه صبر کنید تا تأییدیه نهایی درگاه دریافت شود.
                </p>
              </div>
            </div>
          ) : errorMessage || !orderRecord ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#9E3A34]/20 border border-[#9E3A34]/50 flex items-center justify-center mx-auto text-[#F28B82]">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-lg font-extrabold text-[#F5F2EC]">
                {errorMessage || 'اطلاعات سفارش یافت نشد'}
              </h1>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onRetryPaymentStep2(null)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>بازگشت به مرحله پرداخت</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#141414] border border-white/15 text-[#F5F2EC] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                >
                  <HeadphonesIcon className="w-4 h-4 text-[#C8A66A]" />
                  <span>تماس با پشتیبانی</span>
                </button>
              </div>
            </div>
          ) : orderRecord.status === 'paid' ? (
            /* ۱. حالت موفق (paid) */
            <div className="space-y-6 min-w-0">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#254F38]/35 border border-[#3E7B59]/70 flex items-center justify-center text-[#9CE2B9]">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <span className="px-3 py-1 rounded-full bg-[#254F38]/30 border border-[#3E7B59]/50 text-[#9CE2B9] text-xs font-bold">
                  پرداخت موفق و تأیید شده
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
                  سفارش شما با موفقیت ثبت و فعال شد
                </h1>
                <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md leading-relaxed">
                  دسترسی به برنامه‌های دیجیتال در حساب کاربری شما فعال گردید و رسید تراکنش ثبت شد.
                </p>
              </div>

              {/* جزئیات کلیدی تراکنش: شماره سفارش، کد پیگیری و مبلغ */}
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 text-xs sm:text-sm min-w-0">
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                  <span className="text-[#C8C4BC]">شماره سفارش:</span>
                  <span className="font-extrabold text-[#F5F2EC] tabular-nums">
                    {orderRecord.orderNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                  <span className="text-[#C8C4BC]">کد پیگیری بانکی:</span>
                  <span className="font-mono font-extrabold text-[#C8A66A] tabular-nums">
                    {orderRecord.trackingCode}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                  <span className="text-[#C8C4BC]">درگاه پرداخت:</span>
                  <span className="font-semibold text-[#F5F2EC]">{gatewayTitle}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[#C8C4BC] font-bold">مبلغ پرداخت‌شده:</span>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="text-base sm:text-lg font-extrabold text-[#C8A66A] tabular-nums">
                      {formatPriceNumber(orderRecord.totalAmount)}
                    </span>
                    <span className="text-xs text-[#C8C4BC]">تومان</span>
                  </div>
                </div>
              </div>

              {/* دانلود مستقیم فایل‌های دیجیتال در صورت وجود مجوز دانلود */}
              {orderRecord.items.some((item) => item.type === 'digital' && item.downloadToken) && (
                <div className="bg-[#141414] border border-[#3E7B59]/45 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm min-w-0">
                  <span className="font-bold text-[#9CE2B9] block">
                    فایل‌های برنامه تمرینی آماده دانلود:
                  </span>
                  <div className="space-y-2">
                    {orderRecord.items
                      .filter((item) => item.type === 'digital' && item.downloadToken)
                      .map((item) => (
                        <a
                          key={item.productId}
                          href={`/api/v1/downloads/${encodeURIComponent(item.downloadToken!)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#254F38]/40 hover:bg-[#254F38]/60 border border-[#3E7B59]/60 text-[#F5F2EC] font-bold text-xs flex items-center justify-between gap-2 transition-colors"
                        >
                          <span className="truncate">{item.title}</span>
                          <span className="text-[#9CE2B9] shrink-0">دانلود مستقیم PDF</span>
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* دکمه اصلی: مشاهده برنامه‌های من */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] text-[#101010] font-extrabold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                >
                  <span>مشاهده برنامه‌های من</span>
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                </button>
              </div>
            </div>
          ) : isPendingVerificationState ? (
            /* ۲. حالت در انتظار یا استعلام مجدد شبکه (pending / processing / verification_pending) */
            <div className="space-y-6 min-w-0 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#C8A66A]/15 border border-[#C8A66A]/45 flex items-center justify-center text-[#C8A66A] mx-auto">
                {isPollingTimedOut || orderRecord.status === 'verification_pending' ? (
                  <Clock className="w-8 h-8" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none" />
                )}
              </div>

              {orderRecord.status === 'verification_pending' ? (
                <div className="space-y-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#C8A66A]/20 border border-[#C8A66A]/45 text-[#E5C88E] text-xs font-bold">
                    در صف استعلام شاپرک (Verification Pending)
                  </span>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
                    در حال بررسی و تایید نهایی تراکنش با بانک
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md mx-auto leading-relaxed">
                    به دلیل کندی موقت ارتباط با شبکه بانکی، استعلام نهایی سفارش{' '}
                    <span className="text-[#F5F2EC] font-bold">{orderRecord.orderNumber}</span> در صف
                    بررسی خودکار قرار دارد و موجودی سفارش شما کاملاً رزرو و محفوظ است.
                  </p>
                </div>
              ) : isPollingTimedOut ? (
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
                    در حال بررسی است
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md mx-auto leading-relaxed">
                    تأییدیه نهایی بانک برای سفارش{' '}
                    <span className="text-[#F5F2EC] font-bold">{orderRecord.orderNumber}</span> هنوز
                    دریافت نشده و تراکنش شما در حال بررسی است. به محض تأیید شاپرک، وضعیت سفارش در
                    حساب کاربری به‌روز می‌شود.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
                    در حال دریافت تأییدیه از بانک...
                  </h1>
                  <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md mx-auto leading-relaxed">
                    وضعیت پرداخت هر ۳ ثانیه به‌صورت خودکار بررسی می‌شود (زمان سپری‌شده:{' '}
                    <span className="tabular-nums text-[#C8A66A] font-bold">
                      {toPersianDigits(elapsedPollSec)}
                    </span>{' '}
                    از ۶۰ ثانیه).
                  </p>
                </div>
              )}

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 text-xs sm:text-sm space-y-2 text-start">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#C8C4BC]">شماره سفارش:</span>
                  <span className="font-bold text-[#F5F2EC] tabular-nums">
                    {orderRecord.orderNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#C8C4BC]">مبلغ تراکنش:</span>
                  <span className="font-extrabold text-[#C8A66A] tabular-nums">
                    {formatPriceNumber(orderRecord.totalAmount)} تومان
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => resolvedOrderId && loadOrderFromApi(resolvedOrderId, true)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>بررسی مجدد وضعیت</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#141414] border border-white/15 text-[#F5F2EC] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                >
                  <HeadphonesIcon className="w-4 h-4 text-[#C8A66A]" />
                  <span>تماس با پشتیبانی</span>
                </button>
              </div>
            </div>
          ) : (
            /* ۳. حالت ناموفق یا لغو شده (failed / cancelled): پیام ساده و بدون سرزنش + تلاش مجدد (برگشت به مرحله ۲) و تماس با پشتیبانی */
            <div className="space-y-6 min-w-0">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#9E3A34]/20 border border-[#9E3A34]/50 flex items-center justify-center text-[#F28B82]">
                  <XCircle className="w-9 h-9" />
                </div>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/15 text-[#E0DCD3] text-xs font-bold">
                  {orderRecord.status === 'cancelled'
                    ? 'انصراف از پرداخت'
                    : 'تراکنش تکمیل نشد'}
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC]">
                  {orderRecord.status === 'cancelled'
                    ? 'پرداخت به درخواست شما متوقف شد'
                    : 'ارتباط با درگاه بانکی تکمیل نشد'}
                </h1>
                <p className="text-xs sm:text-sm text-[#C8C4BC] max-w-md leading-relaxed">
                  {orderRecord.status === 'cancelled'
                    ? 'هیچ مبلغی از حساب شما کسر نشده و اقلام سبد خریدتان بدون تغییر محفوظ است. هر زمان مایل بودید می‌توانید با همان درگاه یا درگاه دیگر پرداخت را انجام دهید.'
                    : 'پرداخت نهایی نشد. چنانچه مبلغی از حساب بانکی شما کسر شده باشد، حداکثر ظرف ۷۲ ساعت به‌صورت خودکار توسط شبکه شاپرک به حسابتان بازگردانده می‌شود.'}
                </p>
              </div>

              <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#C8C4BC]">شماره سفارش:</span>
                  <span className="font-bold text-[#F5F2EC] tabular-nums">
                    {orderRecord.orderNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#C8C4BC]">مبلغ قابل پرداخت:</span>
                  <div className="flex items-baseline gap-1 whitespace-nowrap">
                    <span className="font-extrabold text-[#C8A66A] tabular-nums">
                      {formatPriceNumber(orderRecord.totalAmount)}
                    </span>
                    <span className="text-xs text-[#C8C4BC]">تومان</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onRetryPaymentStep2(orderRecord)}
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:opacity-95 active:scale-[0.98] text-[#101010] font-extrabold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2EC]"
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  <span>تلاش مجدد (انتخاب روش پرداخت)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-[#141414] hover:border-[#C8A66A]/50 border border-white/15 text-[#F5F2EC] font-bold text-sm flex items-center justify-center gap-2 transition-[transform,opacity] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A66A]"
                >
                  <HeadphonesIcon className="w-4 h-4 text-[#C8A66A] shrink-0" />
                  <span>تماس با پشتیبانی</span>
                </button>
              </div>
            </div>
          )}

          {/* فوتر امنیت شاپرک */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-[#C8C4BC]">
            <ShieldCheck className="w-4 h-4 text-[#3E7B59] shrink-0" />
            <span>استعلام مستقیم وضعیت تراکنش از سرور (GET /api/orders)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
