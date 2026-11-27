import React, { useState } from 'react';
import { X, Share2, Check, Smartphone, Copy, Download } from 'lucide-react';
import { CoachProfile } from '../types';

interface SmartCardModalProps {
  isOpen: boolean;
  coach: CoachProfile;
  onClose: () => void;
}

export const SmartCardModal: React.FC<SmartCardModalProps> = ({ isOpen, coach, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [vcardDownloaded, setVcardDownloaded] = useState(false);

  if (!isOpen) return null;

  const cardUrl = typeof window !== 'undefined' ? window.location.href : 'https://example.test';

  const handleCopyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${coach.name} — ${coach.title}`,
          text: coach.tagline,
          url: cardUrl
        });
        return;
      }
    } catch {
      // Fallback to clipboard
    }

    try {
      await navigator.clipboard.writeText(cardUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadVCard = () => {
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${coach.name}`,
      `TITLE:${coach.title}`,
      `TEL;TYPE=CELL:${coach.phone}`,
      `EMAIL:${coach.email}`,
      `NOTE:${coach.tagline}`,
      'END:VCARD'
    ].join('\n');

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${coach.englishName.toLowerCase().replace(/\s+/g, '_')}_coach.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setVcardDownloaded(true);
    setTimeout(() => setVcardDownloaded(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-card-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#1D1D1D] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 text-[#F5F2EC] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 id="smart-card-title" className="text-lg font-bold text-[#F5F2EC]">
              کارت ویزیت هوشمند (QR / NFC)
            </h2>
            <p className="text-xs text-[#929292] mt-0.5">
              اسکن مستقیم برای دسترسی به برنامه‌های تمرینی و پروفایل مربی
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-[#929292] hover:text-[#F5F2EC] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Luxury Physical NFC Card Preview */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#25221C] via-[#151515] to-[#0D0D0D] border border-[#C8A66A]/35 p-5 mb-5 overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] tracking-widest text-[#C8A66A] font-mono uppercase">
                {coach.englishName}
              </p>
              <h3 className="text-xl font-bold text-[#F5F2EC] mt-1">{coach.name}</h3>
              <p className="text-xs text-[#929292] mt-1 leading-relaxed">{coach.title}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#C8A66A]/15 border border-[#C8A66A]/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#C8A66A]" />
            </div>
          </div>

          {/* Crisp SVG QR Code Matrix */}
          <div className="mt-5 flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="bg-[#F5F2EC] p-2.5 rounded-xl shrink-0">
              <svg viewBox="0 0 100 100" className="w-24 h-24 fill-[#101010]">
                {/* Finder Patterns */}
                <path d="M8,8 h26 v26 h-26 z M13,13 v16 h16 v-16 z M17,17 h8 v8 h-8 z" />
                <path d="M66,8 h26 v26 h-26 z M71,13 v16 h16 v-16 z M75,17 h8 v8 h-8 z" />
                <path d="M8,66 h26 v26 h-26 z M13,71 v16 h16 v-16 z M17,75 h8 v8 h-8 z" />
                {/* Data Matrix Cells */}
                <rect x="40" y="10" width="6" height="6" />
                <rect x="52" y="10" width="6" height="12" />
                <rect x="40" y="22" width="12" height="6" />
                <rect x="10" y="42" width="12" height="6" />
                <rect x="28" y="42" width="6" height="12" />
                <rect x="42" y="42" width="16" height="16" rx="2" fill="#C8A66A" />
                <rect x="64" y="42" width="6" height="12" />
                <rect x="76" y="42" width="14" height="6" />
                <rect x="40" y="64" width="12" height="6" />
                <rect x="58" y="64" width="6" height="18" />
                <rect x="70" y="68" width="18" height="6" />
                <rect x="42" y="78" width="10" height="12" />
                <rect x="70" y="80" width="12" height="10" />
                <rect x="84" y="76" width="8" height="14" />
              </svg>
            </div>

            <div className="text-right flex-1">
              <div className="text-xs text-[#929292]">شناسه تراشه NFC</div>
              <div className="text-xs font-mono text-[#C8A66A] mt-0.5 tabular-nums">
                {coach.nfcSerialCode}
              </div>
              <p className="text-[11px] text-[#929292] mt-2 leading-relaxed">
                کارت فیزیکی را به پشت گوشی نزدیک کنید یا کد QR را با دوربین اسکن نمایید.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadVCard}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            {vcardDownloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>ذخیره مخاطب انجام شد</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ذخیره در مخاطبین (vCard)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F5F2EC] font-semibold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#C8A66A]" />
                <span>لینک پروفایل کپی شد</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-[#C8A66A]" />
                <span>اشتراک‌گذاری لینک کارت</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
