import React, { useEffect, useRef, useState } from 'react';
import { ImageDisplayMode, VisualPresetKey } from '../types';
import { toPersianDigits } from '../utils/format';

interface LuxuryArtworkProps {
  preset: VisualPresetKey;
  customUrl?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  overlayCaption?: string;
  displayMode?: ImageDisplayMode;
}

function getDisplayModeClasses(mode: ImageDisplayMode = 'cover'): {
  imgClass: string;
  svgAlign: string;
} {
  switch (mode) {
    case 'contain':
      return { imgClass: 'object-contain object-center p-2', svgAlign: 'xMidYMid meet' };
    case 'center':
      return { imgClass: 'object-cover object-center', svgAlign: 'xMidYMid slice' };
    case 'top':
      return { imgClass: 'object-cover object-top', svgAlign: 'xMidYMin slice' };
    case 'bottom':
      return { imgClass: 'object-cover object-bottom', svgAlign: 'xMidYMax slice' };
    case 'cover':
    default:
      return { imgClass: 'object-cover object-center', svgAlign: 'xMidYMid slice' };
  }
}

export const LuxuryArtwork: React.FC<LuxuryArtworkProps> = ({
  preset,
  customUrl,
  alt,
  className = '',
  aspectClass = 'w-full h-full',
  displayMode = 'cover'
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset error and loaded state when customUrl changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [customUrl]);

  const showCustomImage = Boolean(customUrl && customUrl.trim().length > 0 && !imgError);
  const { imgClass } = getDisplayModeClasses(displayMode);

  return (
    <div
      className={`relative overflow-hidden bg-[#141414] select-none ${aspectClass} ${className}`}
      role="img"
      aria-label={alt}
    >
      {/* Skeleton loader while custom image is loading */}
      {showCustomImage && !imgLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-20 bg-[#1D1D1D] animate-pulse"
        />
      )}

      {showCustomImage && (
        <img
          src={customUrl}
          alt={alt}
          width={400}
          height={300}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-200 motion-reduce:transition-none ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          } ${imgClass}`}
        />
      )}

      {/* High-Craft Dark Athletic Luxury SVG Composition (Always present as base or fallback) */}
      <div
        className={`absolute inset-0 w-full h-full ${
          displayMode === 'contain' ? 'p-4 flex items-center justify-center' : ''
        }`}
      >
        {preset === 'coach-portrait' && <CoachPortraitArt />}
        {preset === 'digital-hypertrophy' && <DigitalHypertrophyArt />}
        {preset === 'physical-straps' && <PhysicalStrapsArt />}
        {preset === 'reel-deadlift' && <DeadliftStaticArt />}
        {preset === 'reel-mobility' && <MobilityStaticArt />}
        {preset === 'reel-nutrition' && <NutritionMacroArt />}
        {preset === 'carousel-posture-1' && <CarouselSlideArt step={1} />}
        {preset === 'carousel-posture-2' && <CarouselSlideArt step={2} />}
        {preset === 'carousel-posture-3' && <CarouselSlideArt step={3} />}
        {preset === 'gold-plates' && <PhysicalStrapsArt />}
      </div>
    </div>
  );
};

function CoachPortraitArt() {
  return (
    <svg viewBox="0 0 600 800" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="coachRim" cx="68%" cy="24%" r="65%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.42" />
          <stop offset="45%" stopColor="#3B2F1E" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#0E0E0E" stopOpacity="1" />
        </radialGradient>
        <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2A2825" />
          <stop offset="50%" stopColor="#171717" />
          <stop offset="100%" stopColor="#0B0B0B" />
        </linearGradient>
        <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0" />
          <stop offset="50%" stopColor="#C8A66A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C8A66A" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="600" height="800" fill="url(#coachRim)" />

      {/* Architectural Dark Gym Fluted Wall Background */}
      <g opacity="0.16" stroke="#C8A66A" strokeWidth="1">
        <line x1="90" y1="0" x2="90" y2="800" />
        <line x1="150" y1="0" x2="150" y2="800" />
        <line x1="210" y1="0" x2="210" y2="800" />
        <line x1="450" y1="0" x2="450" y2="800" />
        <line x1="510" y1="0" x2="510" y2="800" />
      </g>

      {/* Subtle Warm Studio Halo */}
      <circle cx="315" cy="240" r="185" fill="none" stroke="#C8A66A" strokeOpacity="0.22" strokeWidth="1.5" />
      <circle cx="315" cy="240" r="225" fill="none" stroke="#C8A66A" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="6 8" />

      {/* Athletic Coach Silhouette with Rim Lighting */}
      <g>
        {/* Broad Athletic Torso & Compression Top */}
        <path
          d="M135 795 C140 560, 175 435, 228 400 L372 400 C425 435, 460 560, 465 795 Z"
          fill="url(#suitGrad)"
          stroke="#C8A66A"
          strokeOpacity="0.45"
          strokeWidth="2"
        />
        {/* Muscle / Collarbone Rim Highlights */}
        <path
          d="M235 415 Q300 455 365 415"
          fill="none"
          stroke="#C8A66A"
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
        <path
          d="M210 495 Q255 520 292 495 M308 495 Q345 520 390 495"
          fill="none"
          stroke="#C8A66A"
          strokeOpacity="0.32"
          strokeWidth="2"
        />
        {/* Neck & Sculpted Head Silhouette */}
        <path d="M268 338 L264 405 L336 405 L332 338 Z" fill="#1F1D1A" />
        <path
          d="M242 232 C242 172, 272 142, 300 142 C328 142, 358 172, 358 232 C358 296, 334 345, 300 345 C266 345, 242 296, 242 232 Z"
          fill="#24211D"
          stroke="#C8A66A"
          strokeOpacity="0.65"
          strokeWidth="2.2"
        />
        {/* Golden Rim Light Contour on Right Cheek & Shoulder */}
        <path
          d="M342 168 C362 212, 354 286, 330 332"
          fill="none"
          stroke="#E5C88E"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M372 400 C420 426, 448 515, 456 640"
          fill="none"
          stroke="#E5C88E"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.7"
        />
      </g>

      {/* Minimalist Barbell Element in Foreground */}
      <line x1="40" y1="680" x2="560" y2="680" stroke="url(#goldLine)" strokeWidth="3" />
    </svg>
  );
}

function DigitalHypertrophyArt() {
  return (
    <svg viewBox="0 0 800 600" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="hypGlow" cx="72%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#1D1D1D" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0E0E0E" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#hypGlow)" />

      {/* Precision Biomechanical Grid */}
      <g stroke="#F5F2EC" strokeOpacity="0.06" strokeWidth="1">
        <line x1="0" y1="150" x2="800" y2="150" />
        <line x1="0" y1="300" x2="800" y2="300" />
        <line x1="0" y1="450" x2="800" y2="450" />
        <line x1="200" y1="0" x2="200" y2="600" />
        <line x1="400" y1="0" x2="400" y2="600" />
        <line x1="600" y1="0" x2="600" y2="600" />
      </g>

      {/* Architectural Hex Dumbbell & Training Blueprint Tablet */}
      <g transform="translate(115, 110)">
        {/* Digital Program Tablet Frame */}
        <rect
          x="210"
          y="20"
          width="330"
          height="350"
          rx="20"
          fill="#161616"
          stroke="#C8A66A"
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        {/* Clean Geometric Header Indicator Bars (Zero Clipped Text) */}
        <rect x="355" y="54" width="150" height="12" rx="6" fill="#C8A66A" fillOpacity="0.85" />
        <rect x="415" y="74" width="90" height="6" rx="3" fill="#F5F2EC" fillOpacity="0.35" />
        <circle cx="260" cy="64" r="10" fill="#C8A66A" fillOpacity="0.2" stroke="#C8A66A" strokeWidth="1.5" />
        <line x1="245" y1="98" x2="505" y2="98" stroke="#C8A66A" strokeOpacity="0.25" />

        {/* Phase 1, 2, 3 Volume / Intensity Curves */}
        <path
          d="M250 240 Q320 215, 375 175 T505 125"
          fill="none"
          stroke="#C8A66A"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M250 265 Q330 245, 395 230 T505 175"
          fill="none"
          stroke="#F5F2EC"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeDasharray="6 6"
        />
        <circle cx="250" cy="240" r="5" fill="#C8A66A" />
        <circle cx="375" cy="175" r="5" fill="#C8A66A" />
        <circle cx="505" cy="125" r="6" fill="#F5F2EC" stroke="#C8A66A" strokeWidth="3" />

        {/* Metric blocks */}
        <rect x="245" y="290" width="76" height="48" rx="8" fill="#222222" stroke="#C8A66A" strokeOpacity="0.3" />
        <rect x="337" y="290" width="76" height="48" rx="8" fill="#222222" stroke="#C8A66A" strokeOpacity="0.3" />
        <rect x="429" y="290" width="76" height="48" rx="8" fill="#222222" stroke="#C8A66A" strokeOpacity="0.3" />

        {/* Matte Black & Brass Dumbbell in Foreground */}
        <g transform="translate(10, 205)">
          {/* Left Hex Plates */}
          <polygon points="30,40 65,20 95,40 95,120 65,140 30,120" fill="#252525" stroke="#C8A66A" strokeWidth="2" />
          <polygon points="75,48 100,32 122,48 122,112 100,128 75,112" fill="#1B1B1B" stroke="#C8A66A" strokeOpacity="0.6" strokeWidth="1.5" />
          {/* Knurled Brass Handle */}
          <rect x="122" y="70" width="136" height="20" rx="4" fill="#C8A66A" />
          <rect x="142" y="70" width="96" height="20" fill="#A8874C" opacity="0.6" />
          {/* Right Hex Plates */}
          <polygon points="258,48 283,32 305,48 305,112 283,128 258,112" fill="#1B1B1B" stroke="#C8A66A" strokeOpacity="0.6" strokeWidth="1.5" />
          <polygon points="285,40 320,20 350,40 350,120 320,140 285,120" fill="#252525" stroke="#C8A66A" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

function PhysicalStrapsArt() {
  return (
    <svg viewBox="0 0 800 600" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="strapSpot" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.32" />
          <stop offset="60%" stopColor="#181818" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0D0D0D" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#strapSpot)" />

      {/* Studio Stone Pedestal Base */}
      <ellipse cx="400" cy="445" rx="260" ry="50" fill="#1D1D1D" stroke="#C8A66A" strokeOpacity="0.35" strokeWidth="1.5" />

      {/* Leather Lifting Straps & Brushed Brass Buckle Illustration */}
      <g transform="translate(175, 130)">
        {/* Left Coiled Leather Strap */}
        <path
          d="M70 240 C40 160, 110 85, 200 105 C290 125, 315 210, 260 280 C215 335, 115 330, 70 240 Z"
          fill="#1F1D1B"
          stroke="#C8A66A"
          strokeWidth="2.5"
        />
        {/* Kevlar Double Stitching */}
        <path
          d="M88 232 C64 168, 120 106, 196 122 C272 138, 292 206, 246 266"
          fill="none"
          stroke="#C8A66A"
          strokeOpacity="0.65"
          strokeWidth="1.8"
          strokeDasharray="7 5"
        />

        {/* Neoprene Wrist Cuff & Heavy Brass D-Ring */}
        <rect
          x="150"
          y="165"
          width="195"
          height="78"
          rx="18"
          fill="#141414"
          stroke="#C8A66A"
          strokeWidth="2.5"
        />
        {/* Brushed Brass Buckle */}
        <rect
          x="315"
          y="157"
          width="52"
          height="94"
          rx="12"
          fill="none"
          stroke="#E0C184"
          strokeWidth="8"
        />
        <line x1="315" y1="204" x2="352" y2="204" stroke="#E0C184" strokeWidth="6" strokeLinecap="round" />

        {/* Extended Grip Tail */}
        <path
          d="M210 243 L285 345 L355 325 L285 243 Z"
          fill="#26231F"
          stroke="#C8A66A"
          strokeWidth="2"
        />
        {/* Signature Gold Brand Emblem (Geometric — Zero Text Clipping) */}
        <rect x="185" y="190" width="95" height="28" rx="6" fill="#C8A66A" fillOpacity="0.16" stroke="#C8A66A" strokeWidth="1.2" />
        <rect x="202" y="201" width="60" height="6" rx="3" fill="#C8A66A" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

function DeadliftStaticArt() {
  return (
    <svg viewBox="0 0 540 960" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="dlSpot" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#151515" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0B0B0B" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="540" height="960" fill="url(#dlSpot)" />
      {/* Spotlight Beams */}
      <polygon points="270,0 70,960 470,960" fill="#C8A66A" opacity="0.07" />
      {/* Barbell & Olympic Plates */}
      <g transform="translate(0, 80)">
        <line x1="45" y1="560" x2="495" y2="560" stroke="#C8A66A" strokeWidth="6" />
        <rect x="65" y="450" width="28" height="220" rx="6" fill="#222" stroke="#C8A66A" strokeWidth="2.5" />
        <rect x="98" y="468" width="22" height="184" rx="5" fill="#1A1A1A" stroke="#C8A66A" strokeOpacity="0.6" strokeWidth="2" />
        <rect x="447" y="450" width="28" height="220" rx="6" fill="#222" stroke="#C8A66A" strokeWidth="2.5" />
        <rect x="420" y="468" width="22" height="184" rx="5" fill="#1A1A1A" stroke="#C8A66A" strokeOpacity="0.6" strokeWidth="2" />
        {/* Athlete Biomechanical Hinge Vector */}
        <circle cx="270" cy="245" r="34" fill="#24201C" stroke="#C8A66A" strokeWidth="2.5" />
        <path d="M210 320 L330 320 L315 460 L225 460 Z" fill="#1E1C19" stroke="#C8A66A" strokeWidth="2" />
        <line x1="220" y1="335" x2="205" y2="560" stroke="#E0C184" strokeWidth="5" strokeLinecap="round" />
        <line x1="320" y1="335" x2="335" y2="560" stroke="#E0C184" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function MobilityStaticArt() {
  return (
    <svg viewBox="0 0 540 960" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <rect width="540" height="960" fill="#121212" />
      <circle cx="270" cy="380" r="190" fill="none" stroke="#C8A66A" strokeOpacity="0.28" strokeWidth="2" />
      <circle cx="270" cy="380" r="135" fill="none" stroke="#C8A66A" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="8 8" />
      {/* Kettlebell Bottoms-Up Press */}
      <g transform="translate(210, 220)">
        <circle cx="60" cy="70" r="46" fill="#22201D" stroke="#C8A66A" strokeWidth="3" />
        <path d="M32 112 L32 146 L88 146 L88 112" fill="none" stroke="#E0C184" strokeWidth="8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function NutritionMacroArt() {
  return (
    <svg viewBox="0 0 540 960" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="nutriGlow" cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#161616" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#0E0E0E" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="540" height="960" fill="url(#nutriGlow)" />

      {/* Peri-Workout Macro Rings & Timing Chart */}
      <g transform="translate(70, 170)">
        <rect x="0" y="0" width="400" height="460" rx="28" fill="#181818" stroke="#C8A66A" strokeOpacity="0.4" strokeWidth="2" />
        <circle cx="200" cy="175" r="95" fill="none" stroke="#2A2A2A" strokeWidth="18" />
        <circle
          cx="200"
          cy="175"
          r="95"
          fill="none"
          stroke="#C8A66A"
          strokeWidth="18"
          strokeDasharray="410 600"
          strokeLinecap="round"
        />
        <text x="200" y="170" fill="#F5F2EC" fontSize="24" fontWeight="800" textAnchor="middle">
          ۰.۴ گرم / کیلوگرم
        </text>
        <text x="200" y="202" fill="#C8A66A" fontSize="14" fontWeight="600" textAnchor="middle">
          سنتز پروتئین پیرامون تمرین
        </text>

        {/* Macro Breakdown Bars */}
        <g transform="translate(40, 315)">
          <text x="160" y="20" fill="#F5F2EC" fontSize="14" fontWeight="600" textAnchor="middle">
            پروتئین وی ایزوله / سینه مرغ (۴۰٪)
          </text>
          <rect x="0" y="30" width="320" height="10" rx="5" fill="#292929" />
          <rect x="128" y="30" width="192" height="10" rx="5" fill="#C8A66A" />

          <text x="160" y="75" fill="#F5F2EC" fontSize="14" fontWeight="600" textAnchor="middle">
            کربوهیدرات پیچیده و زودهضم (۴۵٪)
          </text>
          <rect x="0" y="85" width="320" height="10" rx="5" fill="#292929" />
          <rect x="85" y="85" width="235" height="10" rx="5" fill="#E5C88E" />
        </g>
      </g>
    </svg>
  );
}

function CarouselSlideArt({ step }: { step: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 540 960" className="w-full h-full object-cover" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`slideGlow-${step}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#C8A66A" stopOpacity="0.34" />
          <stop offset="65%" stopColor="#151515" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0C0C0C" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="540" height="960" fill={`url(#slideGlow-${step})`} />

      {/* Architectural Frame */}
      <rect
        x="48"
        y="130"
        width="444"
        height="490"
        rx="28"
        fill="#171717"
        stroke="#C8A66A"
        strokeOpacity="0.45"
        strokeWidth="2"
      />

      {/* Step Number Badge */}
      <text x="445" y="205" fill="#C8A66A" fontSize="44" fontWeight="800" opacity="0.9">
        {step === 1 ? '۰۱' : step === 2 ? '۰۲' : '۰۳'}
      </text>

      {step === 1 && (
        <g transform="translate(90, 240)">
          {/* Time Under Tension Sine Wave */}
          <path
            d="M10 180 C90 30, 160 30, 230 180 C280 270, 320 270, 355 110"
            fill="none"
            stroke="#C8A66A"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="125" cy="68" r="9" fill="#F5F2EC" stroke="#C8A66A" strokeWidth="4" />
          <text x="180" y="255" fill="#F5F2EC" fontSize="22" fontWeight="700" textAnchor="middle">
            تمپوی کنترل‌شده ۳-۱-۱-۰
          </text>
          <text x="180" y="290" fill="#929292" fontSize="15" textAnchor="middle">
            ۳ ثانیه فرود منفی برای حداکثر فراخوانی تارهای تندإنقباض
          </text>
        </g>
      )}

      {step === 2 && (
        <g transform="translate(95, 235)">
          {/* Progressive Rep Bars */}
          <rect x="35" y="130" width="48" height="100" rx="8" fill="#2A2A2A" stroke="#C8A66A" strokeOpacity="0.4" />
          <rect x="115" y="95" width="48" height="135" rx="8" fill="#383227" stroke="#C8A66A" strokeOpacity="0.7" />
          <rect x="195" y="55" width="48" height="175" rx="8" fill="#C8A66A" />
          <rect x="275" y="25" width="48" height="205" rx="8" fill="#E5C88E" />
          <text x="180" y="275" fill="#F5F2EC" fontSize="22" fontWeight="700" textAnchor="middle">
            پیشرفت تکرار در RPE 8.5
          </text>
          <text x="180" y="310" fill="#929292" fontSize="15" textAnchor="middle">
            افزایش کیفیت و تعداد تکرار پیش از سنگین‌تر کردن وزنه
          </text>
        </g>
      )}

      {step === 3 && (
        <g transform="translate(95, 230)">
          {/* Concentric Recovery & Density Rings */}
          <circle cx="175" cy="120" r="88" fill="none" stroke="#C8A66A" strokeOpacity="0.25" strokeWidth="12" />
          <circle cx="175" cy="120" r="62" fill="none" stroke="#C8A66A" strokeOpacity="0.6" strokeWidth="12" />
          <circle cx="175" cy="120" r="36" fill="#C8A66A" />
          <text x="175" y="265" fill="#F5F2EC" fontSize="22" fontWeight="700" textAnchor="middle">
            تراکم تمرینی و بازیابی بهینه
          </text>
          <text x="175" y="300" fill="#929292" fontSize="15" textAnchor="middle">
            حفظ تناژ بالا در زمان استاندارد ۷۵ تا ۹۰ ثانیه استراحت
          </text>
        </g>
      )}
    </svg>
  );
}

interface ProceduralReelVideoProps {
  preset: VisualPresetKey;
  customVideoUrl?: string;
  isPlaying: boolean;
  isMuted: boolean;
  bpmTempo?: number;
  durationSec?: number;
  onTogglePlay: () => void;
  onProgressUpdate?: (progressPercent: number, currentSec: number) => void;
}

export const ProceduralReelVideo: React.FC<ProceduralReelVideoProps> = ({
  preset,
  customVideoUrl,
  isPlaying,
  isMuted,
  bpmTempo = 108,
  durationSec = 16,
  onTogglePlay,
  onProgressUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [nativeVideoFailed, setNativeVideoFailed] = useState(false);
  const elapsedRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeatIndexRef = useRef<number>(-1);

  const useNativeVideo = Boolean(
    customVideoUrl &&
      customVideoUrl.trim().length > 0 &&
      (customVideoUrl.endsWith('.mp4') || customVideoUrl.endsWith('.webm')) &&
      !nativeVideoFailed
  );

  // Sync native video if provided
  useEffect(() => {
    if (!useNativeVideo || !videoRef.current) return;
    const vid = videoRef.current;
    vid.muted = isMuted;
    if (isPlaying) {
      vid.play().catch(() => {
        // Fallback to procedural canvas if autoplay or source fails
      });
    } else {
      vid.pause();
    }
  }, [useNativeVideo, isPlaying, isMuted]);

  // Subtle Web Audio API studio pulse when unmuted and playing
  useEffect(() => {
    if (isMuted || !isPlaying) {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }

    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
        audioCtxRef.current.suspend().catch(() => {});
      }
    };
  }, [isMuted, isPlaying]);

  // Trigger a soft low-frequency studio tempo pulse on each beat when unmuted
  const triggerStudioBeat = (accent: boolean) => {
    if (isMuted || !audioCtxRef.current || audioCtxRef.current.state !== 'running') return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 130 : 92, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(42, ctx.currentTime + 0.11);

      gain.gain.setValueAtTime(accent ? 0.08 : 0.045, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrameId: number;

    const renderFrame = (timestamp: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }
      const dt = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      if (isPlaying && !prefersReducedMotion) {
        elapsedRef.current = (elapsedRef.current + dt) % durationSec;
      }

      const t = elapsedRef.current;
      const progress = Math.min(100, Math.max(0, (t / durationSec) * 100));
      if (onProgressUpdate) {
        onProgressUpdate(progress, t);
      }

      // Check studio tempo beat for audio synthesis
      const beatDuration = 60 / bpmTempo;
      const currentBeatIndex = Math.floor(t / beatDuration);
      if (isPlaying && !isMuted && currentBeatIndex !== lastBeatIndexRef.current) {
        lastBeatIndexRef.current = currentBeatIndex;
        triggerStudioBeat(currentBeatIndex % 4 === 0);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Dark Athletic Luxury Studio Background
      const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.34, 20, w * 0.5, h * 0.45, h * 0.7);
      bgGrad.addColorStop(0, '#292218');
      bgGrad.addColorStop(0.5, '#141414');
      bgGrad.addColorStop(1, '#0A0A0A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural grid lines
      ctx.strokeStyle = 'rgba(200, 166, 106, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 60; x < w; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 120; y < h; y += 120) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Cycle phase (0..1 sinusoidal rep cycle, ~4 seconds per rep)
      const repPhase = (Math.sin((t * Math.PI * 2) / 3.8 - Math.PI / 2) + 1) / 2; // 0 at bottom, 1 at top lockout

      if (preset === 'reel-deadlift') {
        drawDeadliftBiomechanics(ctx, w, h, repPhase, t);
      } else {
        drawMobilityBiomechanics(ctx, w, h, repPhase, t);
      }

      if (isPlaying && !prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    };

    lastFrameTimeRef.current = null;
    animationFrameId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [preset, isPlaying, isMuted, bpmTempo, durationSec]);

  return (
    <div
      onClick={onTogglePlay}
      className="relative w-full h-full bg-[#101010] cursor-pointer select-none overflow-hidden"
    >
      {useNativeVideo ? (
        <video
          ref={videoRef}
          src={customVideoUrl}
          playsInline
          loop
          muted={isMuted}
          onError={() => setNativeVideoFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          className="w-full h-full object-cover block"
        />
      )}
    </div>
  );
};

function drawDeadliftBiomechanics(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  repPhase: number,
  t: number
) {
  const centerX = w * 0.5;
  const floorY = h * 0.7;

  // Golden overhead spotlight cone
  const coneGrad = ctx.createLinearGradient(centerX, 0, centerX, floorY);
  coneGrad.addColorStop(0, 'rgba(200, 166, 106, 0.20)');
  coneGrad.addColorStop(1, 'rgba(200, 166, 106, 0.0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - 40, 0);
  ctx.lineTo(centerX + 40, 0);
  ctx.lineTo(centerX + 210, floorY);
  ctx.lineTo(centerX - 210, floorY);
  ctx.closePath();
  ctx.fill();

  // Floor platform line
  ctx.strokeStyle = 'rgba(200, 166, 106, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, floorY);
  ctx.lineTo(w * 0.9, floorY);
  ctx.stroke();

  // Barbell vertical position based on repPhase (bottom setup vs lockout)
  const barY = floorY - 58 - repPhase * 115;
  const hipY = floorY - 145 - repPhase * 65;
  const shoulderY = floorY - 245 - repPhase * 110;
  const headY = shoulderY - 52;

  // Vertical Barbell Path Tracker (Gold dashed line)
  ctx.save();
  ctx.strokeStyle = 'rgba(200, 166, 106, 0.45)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, floorY - 240);
  ctx.lineTo(centerX, floorY);
  ctx.stroke();
  ctx.restore();

  // Athlete Silhouette & Kinematic Links
  ctx.strokeStyle = '#38332C';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs (Ankle -> Knee -> Hip)
  const leftAnkleX = centerX - 48;
  const rightAnkleX = centerX + 48;
  const kneeSpread = 58 - repPhase * 10;
  const kneeY = floorY - 82 - repPhase * 18;

  ctx.beginPath();
  ctx.moveTo(leftAnkleX, floorY - 8);
  ctx.lineTo(centerX - kneeSpread, kneeY);
  ctx.lineTo(centerX - 34, hipY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightAnkleX, floorY - 8);
  ctx.lineTo(centerX + kneeSpread, kneeY);
  ctx.lineTo(centerX + 34, hipY);
  ctx.stroke();

  // Sculpted Torso
  const torsoGrad = ctx.createLinearGradient(centerX - 75, shoulderY, centerX + 75, hipY);
  torsoGrad.addColorStop(0, '#2C2721');
  torsoGrad.addColorStop(1, '#191715');
  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = '#C8A66A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 68, shoulderY);
  ctx.lineTo(centerX + 68, shoulderY);
  ctx.lineTo(centerX + 42, hipY);
  ctx.lineTo(centerX - 42, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head with rim light
  ctx.fillStyle = '#24201C';
  ctx.strokeStyle = '#E0C184';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(centerX, headY, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Arms holding barbell (Lat lock indicator)
  ctx.strokeStyle = '#D6B77D';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(centerX - 62, shoulderY + 10);
  ctx.lineTo(centerX - 56, barY);
  ctx.moveTo(centerX + 62, shoulderY + 10);
  ctx.lineTo(centerX + 56, barY);
  ctx.stroke();

  // Olympic Barbell & Matte Black/Gold Bumper Plates
  ctx.strokeStyle = '#E5C88E';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w * 0.1, barY);
  ctx.lineTo(w * 0.9, barY);
  ctx.stroke();

  const drawPlate = (px: number, pw: number, ph: number) => {
    ctx.fillStyle = '#1D1D1D';
    ctx.strokeStyle = '#C8A66A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, barY - ph / 2, pw, ph, 5);
    ctx.fill();
    ctx.stroke();
  };

  drawPlate(w * 0.14, 24, 155);
  drawPlate(w * 0.19, 20, 135);
  drawPlate(w * 0.86 - 24, 24, 155);
  drawPlate(w * 0.81 - 20, 20, 135);

  // Floating chalk particles in studio spotlight
  for (let i = 0; i < 16; i++) {
    const px = ((i * 73 + t * 18) % (w * 0.7)) + w * 0.15;
    const py = ((i * 119 - t * 22 + 900) % (h * 0.55)) + h * 0.18;
    const alpha = 0.15 + 0.2 * Math.sin(t * 2 + i);
    ctx.fillStyle = `rgba(245, 242, 236, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, (i % 3) + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Real-time Biomechanical Angle & Tempo Overlay Card (top-right subtle HUD)
  const hipAngle = Math.round(78 + repPhase * 98);
  const phaseLabel =
    repPhase < 0.25
      ? 'فاز ۱: قفل لتیسیموس و شروع کشش (Setup)'
      : repPhase > 0.8
        ? 'فاز ۲: قفل کامل لگن در بالا (Lockout)'
        : 'فاز ۳: حفظ مسیر عمودی هالتر (Drive)';

  ctx.fillStyle = 'rgba(16, 16, 16, 0.74)';
  ctx.strokeStyle = 'rgba(200, 166, 106, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(w * 0.12, h * 0.13, w * 0.76, 74, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C8A66A';
  ctx.font = '700 15px Vazirmatn, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(phaseLabel, w * 0.84, h * 0.13 + 30);

  ctx.fillStyle = '#F5F2EC';
  ctx.font = '500 13px Vazirmatn, sans-serif';
  ctx.fillText(
    `زاویه باز شدن مفصل ران: ${toPersianDigits(hipAngle)} درجه  ·  فشار درون شکمی: ۱۰۰٪`,
    w * 0.84,
    h * 0.13 + 54
  );
}

function drawMobilityBiomechanics(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  repPhase: number,
  t: number
) {
  const centerX = w * 0.5;
  const centerY = h * 0.46;

  // Concentric Scapular Stability Target Rings
  for (let r = 70; r <= 210; r += 45) {
    ctx.strokeStyle = `rgba(200, 166, 106, ${(0.35 - r * 0.001).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r + Math.sin(t * 2) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Kettlebell Bottoms-Up Overhead Press Motion
  const pressOffset = repPhase * 115;
  const kbY = centerY + 35 - pressOffset;
  const wobbleX = Math.sin(t * 5) * 3.5;

  // Shoulder & Arm Kinematic Line
  ctx.strokeStyle = '#C8A66A';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(centerX - 45, centerY + 145);
  ctx.lineTo(centerX + wobbleX, centerY + 65 - pressOffset * 0.45);
  ctx.lineTo(centerX + wobbleX, kbY + 36);
  ctx.stroke();

  // Joint stability nodes
  ctx.fillStyle = '#F5F2EC';
  ctx.beginPath();
  ctx.arc(centerX - 45, centerY + 145, 9, 0, Math.PI * 2);
  ctx.arc(centerX + wobbleX, centerY + 65 - pressOffset * 0.45, 8, 0, Math.PI * 2);
  ctx.fill();

  // Inverted Kettlebell (Bottoms-up)
  ctx.fillStyle = '#1E1C19';
  ctx.strokeStyle = '#E5C88E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX + wobbleX, kbY - 12, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Kettlebell Handle
  ctx.strokeStyle = '#C8A66A';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(centerX + wobbleX - 20, kbY + 20, 40, 22, 6);
  ctx.stroke();

  // Top instructional telemetry banner
  const stabilityScore = Math.round(92 + Math.sin(t * 1.5) * 6);
  ctx.fillStyle = 'rgba(16, 16, 16, 0.76)';
  ctx.strokeStyle = 'rgba(200, 166, 106, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(w * 0.12, h * 0.13, w * 0.76, 74, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C8A66A';
  ctx.font = '700 15px Vazirmatn, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('پروتکل کنترل کتف و روتاتور کاف (Bottoms-Up KB)', w * 0.84, h * 0.13 + 30);

  ctx.fillStyle = '#F5F2EC';
  ctx.font = '500 13px Vazirmatn, sans-serif';
  ctx.fillText(
    `پایداری مفصل شانه: ${toPersianDigits(stabilityScore)}٪  ·  نگهداری ایزومتریک در اوج دامنه`,
    w * 0.84,
    h * 0.13 + 54
  );
}
