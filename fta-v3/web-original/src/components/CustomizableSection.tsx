import React from 'react';
import { ArrowLeft } from 'lucide-react';
import {
  AppRoute,
  SectionGradientPreset,
  SectionHeightMode,
  SectionVisualConfig
} from '../types';
import { LuxuryArtwork } from './VisualMedia';

export type PreviewViewportMode = 'mobile' | 'tablet' | 'desktop';

export const GRADIENT_PRESET_STYLES: Record<SectionGradientPreset, string> = {
  'obsidian-gold':
    'linear-gradient(135deg, #272116 0%, #171614 48%, #0E0E0E 100%)',
  'charcoal-bronze':
    'linear-gradient(135deg, #231F1D 0%, #1C1814 55%, #111111 100%)',
  'deep-onyx':
    'linear-gradient(180deg, #1E1E1E 0%, #141414 50%, #0A0A0A 100%)',
  'crimson-slate':
    'linear-gradient(135deg, #2A1616 0%, #181414 55%, #0E0E0E 100%)',
  'emerald-night':
    'linear-gradient(135deg, #13241E 0%, #131917 55%, #0D0F0E 100%)'
};

export const HEIGHT_MODE_CLASSES: Record<SectionHeightMode, string> = {
  compact: 'min-h-[160px] py-5 px-5 sm:py-6 sm:px-8',
  medium: 'min-h-[240px] py-7 px-6 sm:py-9 sm:px-10',
  tall: 'min-h-[340px] py-10 px-6 sm:py-12 sm:px-10',
  hero: 'min-h-[420px] py-8 px-6 sm:py-10 sm:px-10'
};

const PREVIEW_VIEWPORT_HEIGHT_CLASSES: Record<
  PreviewViewportMode,
  Record<SectionHeightMode, string>
> = {
  mobile: {
    compact: 'min-h-[150px] py-4 px-4',
    medium: 'min-h-[220px] py-6 px-5',
    tall: 'min-h-[300px] py-8 px-5',
    hero: 'min-h-[360px] py-7 px-5'
  },
  tablet: {
    compact: 'min-h-[175px] py-6 px-7',
    medium: 'min-h-[260px] py-8 px-8',
    tall: 'min-h-[350px] py-10 px-8',
    hero: 'min-h-[420px] py-9 px-8'
  },
  desktop: {
    compact: 'min-h-[190px] py-7 px-10',
    medium: 'min-h-[290px] py-10 px-12',
    tall: 'min-h-[390px] py-12 px-12',
    hero: 'min-h-[460px] py-12 px-12'
  }
};

interface CustomizableSectionProps {
  config: SectionVisualConfig;
  children?: React.ReactNode;
  className?: string;
  onNavigate?: (route: AppRoute) => void;
  renderDefaultBannerContent?: boolean;
  previewViewport?: PreviewViewportMode;
}

/**
 * Renders a configurable section container with dynamic background type
 * (solid, gradient, image, image-overlay), image display mode, overlay darkness,
 * and vertical height. Supports explicit previewViewport ('mobile' | 'tablet' | 'desktop')
 * for the Admin Breakpoint Switcher.
 */
export const CustomizableSection: React.FC<CustomizableSectionProps> = ({
  config,
  children,
  className = '',
  onNavigate,
  renderDefaultBannerContent = false,
  previewViewport
}) => {
  if (!config.enabled) return null;

  const isImageBg = config.bgType === 'image' || config.bgType === 'image-overlay';
  const effectiveOverlay =
    config.bgType === 'image-overlay'
      ? Math.max(25, Math.min(92, config.overlayOpacity))
      : config.bgType === 'image'
        ? Math.min(40, config.overlayOpacity)
        : 0;

  const containerStyle: React.CSSProperties =
    config.bgType === 'solid'
      ? { backgroundColor: config.solidColor || '#1D1D1D' }
      : config.bgType === 'gradient'
        ? {
            backgroundImage:
              GRADIENT_PRESET_STYLES[config.gradientPreset] ||
              GRADIENT_PRESET_STYLES['obsidian-gold']
          }
        : { backgroundColor: '#141414' };

  const heightClasses = previewViewport
    ? PREVIEW_VIEWPORT_HEIGHT_CLASSES[previewViewport][config.heightMode]
    : HEIGHT_MODE_CLASSES[config.heightMode] || HEIGHT_MODE_CLASSES.medium;

  const titleSizeClass = previewViewport
    ? previewViewport === 'mobile'
      ? 'text-lg font-extrabold'
      : previewViewport === 'tablet'
        ? 'text-2xl font-extrabold'
        : 'text-3xl font-extrabold'
    : 'text-xl sm:text-2xl lg:text-3xl font-extrabold';

  const subtitleSizeClass = previewViewport
    ? previewViewport === 'mobile'
      ? 'text-xs'
      : 'text-sm'
    : 'text-xs sm:text-sm';

  const contentLayoutClass =
    previewViewport === 'desktop'
      ? 'flex flex-row items-end justify-between gap-8'
      : previewViewport === 'tablet'
        ? 'flex flex-col sm:flex-row sm:items-end justify-between gap-6'
        : 'flex flex-col justify-between gap-4';

  return (
    <div
      style={containerStyle}
      className={`relative rounded-3xl overflow-hidden border border-white/[0.09] transition-all duration-300 ${heightClasses} ${className}`}
    >
      {/* Background Cover Image Layer when bgType is 'image' or 'image-overlay' */}
      {isImageBg && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <LuxuryArtwork
            preset={config.imagePreset}
            customUrl={config.customImageUrl}
            alt={config.title}
            displayMode={config.imageDisplayMode}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Controlled Dark Readability Scrim Layer */}
      {isImageBg && effectiveOverlay > 0 && (
        <div
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-200"
          style={{
            background: `linear-gradient(180deg, rgba(10,10,10,${(
              effectiveOverlay * 0.0085
            ).toFixed(2)}) 0%, rgba(10,10,10,${(effectiveOverlay * 0.01).toFixed(
              2
            )}) 100%)`
          }}
        />
      )}

      {/* Foreground Content */}
      <div className="relative z-10 h-full flex flex-col justify-between">
        {renderDefaultBannerContent ? (
          <div className={contentLayoutClass}>
            <div className="max-w-2xl">
              {config.kicker && (
                <div className="text-xs font-semibold text-[#C8A66A] mb-1.5">
                  {config.kicker}
                </div>
              )}
              <h2
                className={`${titleSizeClass} text-[#F5F2EC] leading-snug`}
                style={{ textWrap: 'balance' }}
              >
                {config.title}
              </h2>
              {config.subtitle && (
                <p
                  className={`${subtitleSizeClass} text-[#F5F2EC]/85 mt-2.5 leading-relaxed`}
                >
                  {config.subtitle}
                </p>
              )}
            </div>

            {config.ctaText && (
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate(config.ctaRoute || 'shop')}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>{config.ctaText}</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
