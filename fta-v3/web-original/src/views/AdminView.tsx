import React, { useRef, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Film,
  GripVertical,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Monitor,
  Package,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  UserCheck,
  X
} from 'lucide-react';
import {
  AppRoute,
  AuditLogEntry,
  BrandConfig,
  CoachProfile,
  ConsultationRequest,
  DiscountCode,
  ExplorePost,
  ImageDisplayMode,
  Order,
  PageRevision,
  PaymentGatewayStatusInfo,
  Product,
  SectionBgType,
  SectionBlockType,
  SectionGradientPreset,
  SectionHeightMode,
  SectionVisualConfig,
  SiteModulesConfig,
  ThemeColorsConfig,
  VisualPresetKey
} from '../types';
import { formatToman, toPersianDigits } from '../utils/format';
import { LuxuryArtwork } from '../components/VisualMedia';
import {
  CustomizableSection,
  GRADIENT_PRESET_STYLES,
  PreviewViewportMode
} from '../components/CustomizableSection';
import { WhiteLabelControlPanel } from '../admin/WhiteLabelControlPanel';
import { SeoOpenGraphEditor } from '../admin/SeoOpenGraphEditor';
import { uploadMediaToServer } from '../api/mockGateway';

interface AdminViewProps {
  coach: CoachProfile;
  brandConfig?: BrandConfig;
  siteModules?: SiteModulesConfig;
  revisions?: PageRevision[];
  consultations?: ConsultationRequest[];
  discounts?: DiscountCode[];
  gateways?: PaymentGatewayStatusInfo[];
  auditLogs?: AuditLogEntry[];
  products: Product[];
  posts: ExplorePost[];
  orders: Order[];
  sectionConfigs: SectionVisualConfig[];
  themeColors?: ThemeColorsConfig;
  onUpdateThemeColors?: (colors: ThemeColorsConfig) => void;
  onUpdateCoach: (coach: CoachProfile) => void;
  onUpdateBrandConfig?: (brand: BrandConfig) => void;
  onUpdateSiteModules?: (modules: SiteModulesConfig) => void;
  onUpdateConsultations?: (items: ConsultationRequest[]) => void;
  onUpdateDiscounts?: (items: DiscountCode[]) => void;
  onPublishRevision?: (label: string) => void;
  onRestoreRevision?: (revision: PageRevision) => void;
  onUpdateSectionConfigs: (configs: SectionVisualConfig[]) => void;
  onResetSectionConfigs: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onSavePost: (post: ExplorePost) => void;
  onDeletePost: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onAddCoachReply: (postId: string, replyText: string) => void;
  onToggleOrderStatus: (orderId: string) => void;
  onResetDemoData: () => void;
  onNavigate?: (route: AppRoute) => void;
}

export const THEME_COLOR_PRESETS: ThemeColorsConfig[] = [
  {
    primaryColor: '#C8A66A',
    secondaryColor: '#D6B77D',
    presetName: 'طلایی کلاسیک (Classic Gold)'
  },
  {
    primaryColor: '#D98A4E',
    secondaryColor: '#ECA36B',
    presetName: 'برنز گرم ورزشی (Warm Bronze)'
  },
  {
    primaryColor: '#B8C2CC',
    secondaryColor: '#D5DEE6',
    presetName: 'پلاتینیوم نقره‌ای (Platinum)'
  },
  {
    primaryColor: '#34D399',
    secondaryColor: '#6EE7B7',
    presetName: 'زمردی مدرن (Emerald Volt)'
  },
  {
    primaryColor: '#F43F5E',
    secondaryColor: '#FB7185',
    presetName: 'زرشکی تیتانیوم (Crimson)'
  },
  {
    primaryColor: '#F59E0B',
    secondaryColor: '#FBBF24',
    presetName: 'کهربایی لوکس (Royal Amber)'
  }
];

type AdminSection =
  | 'overview'
  | 'sections'
  | 'products'
  | 'media'
  | 'comments'
  | 'orders'
  | 'profile'
  | 'seo'
  | 'whitelabel';

export const BLOCK_TYPE_LABELS: Record<SectionBlockType, string> = {
  'full-width-hero': 'کاور تمام‌عرض (Full-Width Hero)',
  'promotional-banner': 'بنر کمپین تبلیغاتی (Promotional Banner)',
  'product-spotlight': 'اسپات‌لایت محصول (Product Spotlight)',
  'training-cover': 'کاور برنامه تمرینی (Training Cover)',
  'profile-cover': 'کاور پروفایل مربی (Profile Cover)',
  'cta-banner': 'بنر فراخوان اقدام (CTA Banner)',
  'section-background': 'پس‌زمینه سکشن محتوایی (Section Background)'
};

const BG_TYPE_OPTIONS: { id: SectionBgType; label: string }[] = [
  { id: 'solid', label: 'رنگ یکدست' },
  { id: 'gradient', label: 'گرادینت لوکس' },
  { id: 'image', label: 'تصویر کاور' },
  { id: 'image-overlay', label: 'تصویر + لایه تیره' }
];

const DISPLAY_MODE_OPTIONS: { id: ImageDisplayMode; label: string }[] = [
  { id: 'cover', label: 'پوشش کامل (Cover)' },
  { id: 'contain', label: 'نمایش کامل (Contain)' },
  { id: 'center', label: 'مرکز (Center)' },
  { id: 'top', label: 'تراز بالا (Top)' },
  { id: 'bottom', label: 'تراز پایین (Bottom)' }
];

const HEIGHT_MODE_OPTIONS: { id: SectionHeightMode; label: string }[] = [
  { id: 'compact', label: 'فشرده (۱۶۰px)' },
  { id: 'medium', label: 'متوسط (۲۴۰px)' },
  { id: 'tall', label: 'بلند (۳۴۰px)' },
  { id: 'hero', label: 'تمام‌قد Hero (۴۲۰px)' }
];

const GRADIENT_OPTIONS: { id: SectionGradientPreset; label: string }[] = [
  { id: 'obsidian-gold', label: 'طلایی ابسیدین (Obsidian Gold)' },
  { id: 'charcoal-bronze', label: 'برنز ذغالی (Charcoal Bronze)' },
  { id: 'deep-onyx', label: 'اونیکس عمیق (Deep Onyx)' },
  { id: 'crimson-slate', label: 'زرشکی تیره ورزشی (Crimson Slate)' },
  { id: 'emerald-night', label: 'زمردی تیره (Emerald Night)' }
];

const SOLID_COLOR_SWATCHES = [
  { hex: '#101010', name: 'مشکی اصلی' },
  { hex: '#161616', name: 'ذغالی تیره' },
  { hex: '#1D1D1D', name: 'سطح کارت' },
  { hex: '#241E14', name: 'قهوه‌ای طلایی تیره' },
  { hex: '#1F1717', name: 'زرشکی مات' },
  { hex: '#131F1C', name: 'سبز سنگی تیره' }
];

type PreviewWidthOption = '375px' | '768px' | '1024px';

const BREAKPOINT_SWITCHER_OPTIONS: {
  width: PreviewWidthOption;
  viewport: PreviewViewportMode;
  label: string;
  persianLabel: string;
  frameClass: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    width: '375px',
    viewport: 'mobile',
    label: 'Mobile (375px)',
    persianLabel: 'موبایل (۳۷۵px)',
    frameClass: 'rounded-[30px] border-[3px] border-white/15 p-3',
    description:
      'نمای موبایل (375px): چیدمان عمودی تک‌ستونه و بررسی برش عمودی کاور و خوانایی متن روی صفحات کوچک',
    icon: Smartphone
  },
  {
    width: '768px',
    viewport: 'tablet',
    label: 'Tablet (768px)',
    persianLabel: 'تبلت (۷۶۸px)',
    frameClass: 'rounded-[24px] border-[2px] border-white/15 p-4',
    description:
      'نمای تبلت (768px): چیدمان دو ستونه متوازن با گسترش افقی تصویر پس‌زمینه و لایه تیره',
    icon: Tablet
  },
  {
    width: '1024px',
    viewport: 'desktop',
    label: 'Desktop (1024px)',
    persianLabel: 'دسکتاپ (۱۰۲۴px)',
    frameClass: 'rounded-2xl border border-white/15 p-5',
    description:
      'نمای دسکتاپ (1024px): چیدمان عریض دوازده‌ستونه با تایپوگرافی بزرگ و کادر سینمایی',
    icon: Monitor
  }
];

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.type && !allowedTypes.includes(file.type)) {
      reject(new Error('فقط فایل‌های تصویری استاندارد (JPG, PNG, WebP) مجاز هستند'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('حداکثر حجم مجاز فایل تصویر ۵ مگابایت است'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('خطا در خواندن فایل'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1100;
        const maxHeight = 1100;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('خطا در پردازش تصویر'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          async (blob) => {
            if (!blob) {
              reject(new Error('خطا در تبدیل تصویر به فایل باینری'));
              return;
            }
            const uploadRes = await uploadMediaToServer(blob, file.name || 'image.jpg');
            if (!uploadRes.ok || !uploadRes.url) {
              reject(new Error(uploadRes.error || 'خطا در ذخیره فایل رسانه روی سرور'));
              return;
            }
            resolve(uploadRes.url);
          },
          'image/jpeg',
          0.84
        );
      };
      img.onerror = () => reject(new Error('فرمت تصویر نامعتبر است'));
      img.src = result;
    };
    reader.onerror = () => reject(new Error('خطا در بارگذاری تصویر'));
    reader.readAsDataURL(file);
  });
}

interface SortableSectionItemProps {
  sec: SectionVisualConfig;
  isSelected: boolean;
  isReorderable: boolean;
  isBeingDragged: boolean;
  isDragOverThis: boolean;
  dropPosition: 'before' | 'after';
  isFirstInPage: boolean;
  isLastInPage: boolean;
  onSelect: (id: string) => void;
  onToggleEnabled: (id: string) => void;
  onMoveOrder: (id: string, direction: 'up' | 'down') => void;
  onDeleteCustomBlock: (id: string) => void;
  onNativeDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onNativeDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onNativeDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onNativeDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onNativeDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onNativeDragEnd: () => void;
}

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  sec,
  isSelected,
  isReorderable,
  isBeingDragged,
  isDragOverThis,
  dropPosition,
  isFirstInPage,
  isLastInPage,
  onSelect,
  onToggleEnabled,
  onMoveOrder,
  onDeleteCustomBlock,
  onNativeDragStart,
  onNativeDragEnter,
  onNativeDragOver,
  onNativeDragLeave,
  onNativeDrop,
  onNativeDragEnd
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: sec.id,
    disabled: !isReorderable
  });

  const activeDragging = isDragging || isBeingDragged;

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: activeDragging ? 30 : undefined,
    touchAction: isReorderable ? 'none' : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      {...(isReorderable ? attributes : {})}
      {...(isReorderable ? listeners : {})}
      role="listitem"
      aria-current={isSelected ? 'true' : undefined}
      data-testid={`section-list-item-${sec.id}`}
      data-section-id={sec.id}
      data-page-target={sec.pageTarget}
      data-section-order={sec.order}
      data-selected={isSelected}
      data-enabled={sec.enabled}
      onDragStart={onNativeDragStart}
      onDragEnter={onNativeDragEnter}
      onDragOver={onNativeDragOver}
      onDragLeave={onNativeDragLeave}
      onDrop={onNativeDrop}
      onDragEnd={onNativeDragEnd}
      onClick={() => onSelect(sec.id)}
      className={`group relative p-3.5 rounded-2xl border transition-colors cursor-pointer select-none ${
        activeDragging
          ? 'opacity-65 scale-[0.99] border-dashed border-[#C8A66A] bg-[#1F1B14] shadow-2xl'
          : isDragOverThis
            ? 'bg-[#2C2519] border-[#C8A66A] ring-2 ring-[#C8A66A]'
            : isSelected
              ? 'bg-[#26221B] border-[#C8A66A] shadow-md ring-1 ring-[#C8A66A]/40'
              : 'bg-[#141414] border-white/[0.06] hover:border-white/20'
      }`}
    >
      {/* Visual Drop Insertion Line Indicator */}
      {isDragOverThis && dropPosition === 'before' && (
        <div
          aria-hidden="true"
          className="absolute -top-1.5 inset-x-3 h-1 rounded-full bg-[#C8A66A] shadow-[0_0_8px_#C8A66A]"
        />
      )}
      {isDragOverThis && dropPosition === 'after' && (
        <div
          aria-hidden="true"
          className="absolute -bottom-1.5 inset-x-3 h-1 rounded-full bg-[#C8A66A] shadow-[0_0_8px_#C8A66A]"
        />
      )}

      <div className="flex items-start gap-2.5">
        {/* Drag Handle for Home and Shop sections */}
        {isReorderable && (
          <div
            data-testid={`section-drag-handle-${sec.id}`}
            title="بکشید و رها کنید برای تغییر ترتیب چیدمان"
            aria-label={`دستگیره جابه‌جایی ${sec.label}`}
            className="mt-2 p-1 rounded-lg text-[#929292] hover:text-[#C8A66A] hover:bg-white/5 cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Miniature Visual Swatch */}
        <div
          className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 relative bg-[#101010]"
          style={
            sec.bgType === 'solid'
              ? { backgroundColor: sec.solidColor }
              : sec.bgType === 'gradient'
                ? {
                    backgroundImage: GRADIENT_PRESET_STYLES[sec.gradientPreset]
                  }
                : undefined
          }
        >
          {(sec.bgType === 'image' ||
            sec.bgType === 'image-overlay' ||
            sec.id === 'home-hero') && (
            <LuxuryArtwork
              preset={sec.imagePreset}
              customUrl={sec.customImageUrl}
              displayMode={sec.imageDisplayMode}
              alt={sec.label}
              className="w-full h-full"
            />
          )}
          <span
            className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
              sec.enabled ? 'bg-emerald-400' : 'bg-zinc-500'
            }`}
          />
        </div>

        {/* Section Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-[#C8A66A] font-semibold truncate">
              <span>
                {sec.pageTarget === 'home'
                  ? `صفحه اصلی · ردیف ${toPersianDigits(sec.order)}`
                  : sec.pageTarget === 'shop'
                    ? `فروشگاه · ردیف ${toPersianDigits(sec.order)}`
                    : sec.pageTarget === 'explore'
                      ? 'اکسپلور'
                      : 'فوتر سراسری'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-[#929292]">
                {sec.bgType === 'solid'
                  ? 'رنگ یکدست'
                  : sec.bgType === 'gradient'
                    ? 'گرادینت'
                    : sec.bgType === 'image'
                      ? 'تصویر'
                      : 'تصویر + لایه تیره'}
              </span>
            </div>

            {/* Enable/Disable Toggle Switch */}
            <div
              className="flex items-center gap-1.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                role="switch"
                aria-checked={sec.enabled}
                data-testid={`section-toggle-${sec.id}`}
                aria-label={
                  sec.enabled ? `غیرفعال کردن ${sec.label}` : `فعال کردن ${sec.label}`
                }
                onClick={() => onToggleEnabled(sec.id)}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  sec.enabled
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                    : 'bg-white/5 text-[#929292] border border-white/10'
                }`}
              >
                <span
                  className={`w-6 h-3.5 rounded-full relative transition-colors flex items-center px-0.5 ${
                    sec.enabled ? 'bg-emerald-500/50' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                      sec.enabled
                        ? 'bg-emerald-300 -translate-x-2.5'
                        : 'bg-[#929292] translate-x-0'
                    }`}
                  />
                </span>
                <span>{sec.enabled ? 'فعال' : 'غیرفعال'}</span>
              </button>
            </div>
          </div>

          <div
            className={`text-xs font-bold mt-1 truncate ${
              sec.enabled ? 'text-[#F5F2EC]' : 'text-[#929292] line-through'
            }`}
          >
            {sec.label}
          </div>

          <div className="text-[11px] text-[#929292] truncate mt-0.5">{sec.title}</div>

          {/* Click-to-Edit Action Row + Reorder/Delete */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/[0.05]">
            <button
              type="button"
              data-testid={`section-customize-btn-${sec.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(sec.id);
              }}
              className={`text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                isSelected ? 'text-[#C8A66A]' : 'text-[#F5F2EC]/80 hover:text-[#C8A66A]'
              }`}
            >
              {isSelected ? (
                <SlidersHorizontal className="w-3.5 h-3.5" />
              ) : (
                <Edit3 className="w-3.5 h-3.5" />
              )}
              <span>
                {isSelected ? 'پنل سفارشی‌سازی باز است' : 'باز کردن پنل سفارشی‌سازی'}
              </span>
            </button>

            <div
              className="flex items-center gap-1 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {isReorderable && (
                <>
                  <button
                    type="button"
                    data-testid={`section-move-up-${sec.id}`}
                    disabled={isFirstInPage}
                    onClick={() => onMoveOrder(sec.id, 'up')}
                    aria-label="انتقال به بالا"
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed text-[#929292] hover:text-[#F5F2EC] flex items-center justify-center cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    data-testid={`section-move-down-${sec.id}`}
                    disabled={isLastInPage}
                    onClick={() => onMoveOrder(sec.id, 'down')}
                    aria-label="انتقال به پایین"
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-35 disabled:cursor-not-allowed text-[#929292] hover:text-[#F5F2EC] flex items-center justify-center cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </>
              )}

              {sec.isCustomBlock && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomBlock(sec.id)}
                  aria-label="حذف بخش سفارشی"
                  className="w-6 h-6 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface SectionVisualConfigEditorProps {
  sectionConfigs: SectionVisualConfig[];
  themeColors?: ThemeColorsConfig;
  onUpdateThemeColors?: (colors: ThemeColorsConfig) => void;
  onUpdateSectionConfigs: (configs: SectionVisualConfig[]) => void;
  onResetSectionConfigs: () => void;
  onNavigate?: (route: AppRoute) => void;
  onShowToast: (msg: string) => void;
}

export const SectionVisualConfigEditor: React.FC<SectionVisualConfigEditorProps> = ({
  sectionConfigs,
  themeColors,
  onUpdateThemeColors,
  onUpdateSectionConfigs,
  onResetSectionConfigs,
  onShowToast
}) => {
  // Theme Color Picker State (Primary Brand Color & Secondary Accent Color)
  const [localTheme, setLocalTheme] = useState<ThemeColorsConfig>(
    themeColors || THEME_COLOR_PRESETS[0]
  );
  const activeTheme = themeColors || localTheme;

  const applyThemeColors = (nextTheme: ThemeColorsConfig) => {
    setLocalTheme(nextTheme);
    onUpdateThemeColors?.(nextTheme);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--accent-gold', nextTheme.primaryColor);
      root.style.setProperty('--accent-primary', nextTheme.primaryColor);
      root.style.setProperty('--accent-secondary', nextTheme.secondaryColor);
      root.style.setProperty('--accent-gold-hover', nextTheme.secondaryColor);
      root.style.setProperty(
        '--border-gold',
        `color-mix(in srgb, ${nextTheme.primaryColor} 28%, transparent)`
      );
    }
  };

  // Searchable List View & Deep Customization Panel State
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<'all' | 'home' | 'shop' | 'explore' | 'global'>(
    'all'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    sectionConfigs[0]?.id || 'home-hero'
  );
  const [previewWidth, setPreviewWidth] = useState<PreviewWidthOption>('375px');
  const previewViewport: PreviewViewportMode =
    previewWidth === '1024px' ? 'desktop' : previewWidth === '768px' ? 'tablet' : 'mobile';
  const [previewMode, setPreviewMode] = useState<'single' | 'page'>('single');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showNewBlockModal, setShowNewBlockModal] = useState(false);
  const [newBlockPageTarget, setNewBlockPageTarget] = useState<'home' | 'shop'>('home');
  const [newBlockLabel, setNewBlockLabel] = useState('بنر کمپین جدید');
  const [newBlockType, setNewBlockType] = useState<SectionBlockType>('promotional-banner');
  const [newBlockTitle, setNewBlockTitle] = useState('پروتکل تخصصی آماده‌سازی مسابقه');
  const [newBlockSubtitle, setNewBlockSubtitle] = useState(
    'برنامه‌ریزی دقیق تمرین و تغذیه برای رسیدن به حداکثر تفکیک عضلانی.'
  );

  // Drag-and-Drop Reordering State
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customizationPanelRef = useRef<HTMLDivElement | null>(null);

  const pageTargetPriority: Record<SectionVisualConfig['pageTarget'], number> = {
    home: 1,
    shop: 2,
    explore: 3,
    global: 4
  };

  const sortedSections = [...sectionConfigs].sort((a, b) => {
    if (a.pageTarget !== b.pageTarget) {
      return pageTargetPriority[a.pageTarget] - pageTargetPriority[b.pageTarget];
    }
    return a.order - b.order;
  });

  const pageTargetPersianLabel: Record<SectionVisualConfig['pageTarget'], string> = {
    home: 'صفحه اصلی',
    shop: 'فروشگاه',
    explore: 'اکسپلور',
    global: 'فوتر سراسری'
  };

  const normalizedSectionQuery = sectionSearchQuery.trim().toLowerCase();

  const filteredSections = sortedSections.filter((s) => {
    const matchesPage = pageFilter === 'all' ? true : s.pageTarget === pageFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'enabled'
          ? s.enabled
          : !s.enabled;
    const matchesSearch =
      !normalizedSectionQuery ||
      s.label.toLowerCase().includes(normalizedSectionQuery) ||
      s.title.toLowerCase().includes(normalizedSectionQuery) ||
      s.subtitle.toLowerCase().includes(normalizedSectionQuery) ||
      (s.kicker && s.kicker.toLowerCase().includes(normalizedSectionQuery)) ||
      s.id.toLowerCase().includes(normalizedSectionQuery) ||
      s.pageTarget.toLowerCase().includes(normalizedSectionQuery) ||
      pageTargetPersianLabel[s.pageTarget].toLowerCase().includes(normalizedSectionQuery) ||
      BLOCK_TYPE_LABELS[s.blockType].toLowerCase().includes(normalizedSectionQuery);

    return matchesPage && matchesStatus && matchesSearch;
  });

  const handleOpenSectionCustomization = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        customizationPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    }
  };

  const activeSection =
    sectionConfigs.find((s) => s.id === selectedSectionId) ||
    filteredSections[0] ||
    sectionConfigs[0];

  const updateActiveSectionField = <K extends keyof SectionVisualConfig>(
    field: K,
    value: SectionVisualConfig[K]
  ) => {
    if (!activeSection) return;
    const next = sectionConfigs.map((sec) =>
      sec.id === activeSection.id ? { ...sec, [field]: value } : sec
    );
    onUpdateSectionConfigs(next);
  };

  const handleToggleSectionEnabled = (id: string) => {
    const next = sectionConfigs.map((sec) =>
      sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
    );
    onUpdateSectionConfigs(next);
    onShowToast('وضعیت نمایش بخش به‌روزرسانی شد');
  };

  const handleMoveSectionOrder = (id: string, direction: 'up' | 'down') => {
    const target = sectionConfigs.find((s) => s.id === id);
    if (!target || (target.pageTarget !== 'home' && target.pageTarget !== 'shop')) return;

    const samePage = [...sectionConfigs]
      .filter((s) => s.pageTarget === target.pageTarget)
      .sort((a, b) => a.order - b.order);

    const idx = samePage.findIndex((s) => s.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= samePage.length) return;

    const reordered = [...samePage];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(swapIdx, 0, moved);

    const orderMap = new Map<string, number>();
    reordered.forEach((item, index) => {
      orderMap.set(item.id, index + 1);
    });

    const next = sectionConfigs.map((sec) =>
      orderMap.has(sec.id) ? { ...sec, order: orderMap.get(sec.id)! } : sec
    );

    onUpdateSectionConfigs(next);
    onShowToast(
      target.pageTarget === 'home'
        ? 'ترتیب چیدمان بخش‌های صفحه اصلی تغییر کرد'
        : 'ترتیب چیدمان بخش‌های صفحه فروشگاه تغییر کرد'
    );
  };

  const handleReorderSectionByDrag = (
    sourceId: string,
    targetId: string,
    explicitPosition?: 'before' | 'after'
  ) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const sourceSec = sectionConfigs.find((s) => s.id === sourceId);
    const targetSec = sectionConfigs.find((s) => s.id === targetId);
    if (!sourceSec || !targetSec) return;

    if (sourceSec.pageTarget !== targetSec.pageTarget) {
      onShowToast('فقط بخش‌های متعلق به یک صفحه (صفحه اصلی یا فروشگاه) با هم جابه‌جا می‌شوند');
      return;
    }

    if (sourceSec.pageTarget !== 'home' && sourceSec.pageTarget !== 'shop') {
      return;
    }

    const samePage = [...sectionConfigs]
      .filter((s) => s.pageTarget === sourceSec.pageTarget)
      .sort((a, b) => a.order - b.order);

    const sourceIdx = samePage.findIndex((s) => s.id === sourceId);
    const targetIdxInFull = samePage.findIndex((s) => s.id === targetId);
    if (sourceIdx === -1 || targetIdxInFull === -1) return;

    const effectivePosition: 'before' | 'after' =
      explicitPosition ?? (sourceIdx < targetIdxInFull ? 'after' : 'before');

    const withoutSource = samePage.filter((s) => s.id !== sourceId);
    const targetIdx = withoutSource.findIndex((s) => s.id === targetId);
    if (targetIdx === -1) return;

    const insertIdx = effectivePosition === 'after' ? targetIdx + 1 : targetIdx;
    const reorderedPage = [
      ...withoutSource.slice(0, insertIdx),
      sourceSec,
      ...withoutSource.slice(insertIdx)
    ];

    const orderMap = new Map<string, number>();
    reorderedPage.forEach((item, index) => {
      orderMap.set(item.id, index + 1);
    });

    const next = sectionConfigs.map((sec) =>
      orderMap.has(sec.id) ? { ...sec, order: orderMap.get(sec.id)! } : sec
    );

    onUpdateSectionConfigs(next);
    onShowToast(
      sourceSec.pageTarget === 'home'
        ? 'ترتیب چیدمان بخش‌های صفحه اصلی با موفقیت تغییر کرد'
        : 'ترتیب چیدمان بخش‌های صفحه فروشگاه با موفقیت تغییر کرد'
    );
  };

  // dnd-kit sensors & handlers for smooth Drag-and-Drop reordering
  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDndKitDragStart = (event: DragStartEvent) => {
    setDraggedSectionId(String(event.active.id));
  };

  const handleDndKitDragOver = (event: DragOverEvent) => {
    const overId = event.over ? String(event.over.id) : null;
    setDragOverSectionId(overId);
    if (overId && event.active.id !== overId) {
      const activeSec = sectionConfigs.find((s) => s.id === String(event.active.id));
      const overSec = sectionConfigs.find((s) => s.id === overId);
      if (activeSec && overSec && activeSec.pageTarget === overSec.pageTarget) {
        setDropPosition(activeSec.order < overSec.order ? 'after' : 'before');
      }
    }
  };

  const handleDndKitDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedSectionId(null);
    setDragOverSectionId(null);

    if (!over || active.id === over.id) return;

    const sourceId = String(active.id);
    const targetId = String(over.id);

    const sourceSec = sectionConfigs.find((s) => s.id === sourceId);
    const targetSec = sectionConfigs.find((s) => s.id === targetId);
    if (!sourceSec || !targetSec) return;

    if (sourceSec.pageTarget !== targetSec.pageTarget) {
      onShowToast('فقط بخش‌های متعلق به یک صفحه (صفحه اصلی یا فروشگاه) با هم جابه‌جا می‌شوند');
      return;
    }

    if (sourceSec.pageTarget !== 'home' && sourceSec.pageTarget !== 'shop') {
      return;
    }

    const samePage = [...sectionConfigs]
      .filter((s) => s.pageTarget === sourceSec.pageTarget)
      .sort((a, b) => a.order - b.order);

    const oldIndex = samePage.findIndex((s) => s.id === sourceId);
    const newIndex = samePage.findIndex((s) => s.id === targetId);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedPage = arrayMove(samePage, oldIndex, newIndex);

    const orderMap = new Map<string, number>();
    reorderedPage.forEach((item, index) => {
      orderMap.set(item.id, index + 1);
    });

    const next = sectionConfigs.map((sec) =>
      orderMap.has(sec.id) ? { ...sec, order: orderMap.get(sec.id)! } : sec
    );

    onUpdateSectionConfigs(next);
    onShowToast(
      sourceSec.pageTarget === 'home'
        ? 'ترتیب چیدمان بخش‌های صفحه اصلی با موفقیت تغییر کرد'
        : 'ترتیب چیدمان بخش‌های صفحه فروشگاه با موفقیت تغییر کرد'
    );
  };

  const handleSectionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSection) return;

    if (!file.type.startsWith('image/')) {
      setUploadStatus('لطفاً یک فایل تصویری معتبر (JPG, PNG, WebP) انتخاب کنید.');
      return;
    }

    try {
      setUploadStatus('در حال بهینه‌سازی و بارگذاری تصویر کاور...');
      const dataUrl = await compressImageFile(file);
      const next = sectionConfigs.map((sec) =>
        sec.id === activeSection.id
          ? {
              ...sec,
              customImageUrl: dataUrl,
              bgType:
                sec.bgType === 'solid' || sec.bgType === 'gradient'
                  ? 'image-overlay'
                  : sec.bgType
            }
          : sec
      );
      onUpdateSectionConfigs(next);
      setUploadStatus('تصویر کاور با موفقیت بارگذاری و اعمال شد.');
      setTimeout(() => setUploadStatus(null), 3000);
    } catch {
      setUploadStatus('خطا در پردازش تصویر. لطفاً تصویر دیگری امتحان کنید.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockTitle.trim()) return;

    const targetPageOrders = sectionConfigs
      .filter((s) => s.pageTarget === newBlockPageTarget)
      .map((s) => s.order);
    const maxOrder = targetPageOrders.length > 0 ? Math.max(...targetPageOrders) : 1;

    const created: SectionVisualConfig = {
      id: `custom-sec-${Date.now()}`,
      pageTarget: newBlockPageTarget,
      blockType: newBlockType,
      label: newBlockLabel.trim() || 'بخش تصویری سفارشی',
      kicker: 'بخش ویژه مربی',
      title: newBlockTitle.trim(),
      subtitle: newBlockSubtitle.trim(),
      ctaText: 'مشاهده جزئیات در فروشگاه',
      ctaRoute: 'shop',
      enabled: true,
      order: maxOrder + 1,
      bgType: 'image-overlay',
      solidColor: '#1D1D1D',
      gradientPreset: 'obsidian-gold',
      imagePreset: 'reel-deadlift',
      imageDisplayMode: 'cover',
      overlayOpacity: 72,
      heightMode: 'medium',
      isCustomBlock: true
    };

    onUpdateSectionConfigs([...sectionConfigs, created]);
    setSelectedSectionId(created.id);
    setShowNewBlockModal(false);
    onShowToast(
      newBlockPageTarget === 'shop'
        ? 'بخش تصویری جدید به صفحه فروشگاه اضافه شد'
        : 'بخش تصویری جدید به صفحه اصلی اضافه شد'
    );
  };

  const handleDeleteCustomBlock = (id: string) => {
    const remaining = sectionConfigs.filter((s) => s.id !== id);
    onUpdateSectionConfigs(remaining);
    if (selectedSectionId === id && remaining[0]) {
      setSelectedSectionId(remaining[0].id);
    }
    onShowToast('بخش سفارشی حذف شد');
  };

  const renderResponsiveSectionPreview = (
    secConfig: SectionVisualConfig,
    compactInList = false
  ) => {
    const forceEnabledConfig = { ...secConfig, enabled: true };

    if (secConfig.id === 'home-hero' && !compactInList) {
      return (
        <div
          className={
            previewViewport === 'desktop'
              ? 'grid grid-cols-12 gap-5 items-stretch'
              : previewViewport === 'tablet'
                ? 'grid grid-cols-12 gap-4 items-stretch'
                : 'flex flex-col gap-3'
          }
        >
          <div
            className={
              previewViewport === 'desktop'
                ? 'col-span-5 order-2'
                : previewViewport === 'tablet'
                  ? 'col-span-5 order-2'
                  : 'order-1'
            }
          >
            <div
              className={`relative rounded-2xl overflow-hidden border border-white/10 bg-[#1D1D1D] ${
                previewViewport === 'mobile'
                  ? 'h-[230px]'
                  : previewViewport === 'tablet'
                    ? 'h-full min-h-[280px]'
                    : 'h-full min-h-[340px]'
              }`}
            >
              <LuxuryArtwork
                preset={secConfig.imagePreset}
                customUrl={secConfig.customImageUrl}
                displayMode={secConfig.imageDisplayMode}
                alt={secConfig.title}
                className="w-full h-full"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to top, rgba(16,16,16,0.92) 0%, rgba(16,16,16,${(
                    secConfig.overlayOpacity * 0.005
                  ).toFixed(2)}) 60%, transparent 100%)`
                }}
              />
              <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between text-[10px] text-[#F5F2EC]/90">
                <span className="font-mono text-[#C8A66A]">ARASH KAZEMI</span>
                <span>کاور پرتره ({secConfig.imageDisplayMode})</span>
              </div>
            </div>
          </div>

          <div
            className={
              previewViewport === 'desktop'
                ? 'col-span-7 order-1'
                : previewViewport === 'tablet'
                  ? 'col-span-7 order-1'
                  : 'order-2'
            }
          >
            <CustomizableSection
              config={forceEnabledConfig}
              previewViewport={previewViewport}
              renderDefaultBannerContent
              className="h-full"
            />
          </div>
        </div>
      );
    }

    if (
      (secConfig.id === 'home-programs' || secConfig.id === 'home-products') &&
      !compactInList
    ) {
      return (
        <CustomizableSection config={forceEnabledConfig} previewViewport={previewViewport}>
          <div>
            {secConfig.kicker && (
              <div className="text-[11px] font-semibold text-[#C8A66A] mb-1">
                {secConfig.kicker}
              </div>
            )}
            <h3
              className={`font-extrabold text-[#F5F2EC] ${
                previewViewport === 'desktop'
                  ? 'text-2xl'
                  : previewViewport === 'tablet'
                    ? 'text-xl'
                    : 'text-base'
              }`}
            >
              {secConfig.title}
            </h3>
            {secConfig.subtitle && (
              <p className="text-xs text-[#F5F2EC]/80 mt-1">{secConfig.subtitle}</p>
            )}
          </div>

          <div
            className={`mt-4 grid gap-3 ${
              previewViewport === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {[1, 2].map((num) => (
              <div
                key={num}
                className="p-3 rounded-2xl bg-[#141414]/90 border border-white/10 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                  <LuxuryArtwork
                    preset={
                      secConfig.id === 'home-programs'
                        ? 'digital-hypertrophy'
                        : 'physical-straps'
                    }
                    alt="نمونه محصول"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-[#C8A66A] font-semibold">
                    {secConfig.id === 'home-programs' ? 'پروتکل دیجیتال' : 'تجهیزات ورزشی'}
                  </div>
                  <div className="text-xs font-bold text-[#F5F2EC] truncate">
                    {num === 1
                      ? 'نمونه کارت اول در این سکشن'
                      : 'نمونه کارت دوم در چیدمان واکنش‌گرا'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CustomizableSection>
      );
    }

    return (
      <CustomizableSection
        config={forceEnabledConfig}
        previewViewport={previewViewport}
        renderDefaultBannerContent
        className={compactInList ? '!min-h-[120px]' : ''}
      />
    );
  };

  if (!activeSection) return null;

  const currentBreakpointMeta =
    BREAKPOINT_SWITCHER_OPTIONS.find((opt) => opt.width === previewWidth) ||
    BREAKPOINT_SWITCHER_OPTIONS[0];
  const isLowContrastWarning =
    (activeSection.bgType === 'image' || activeSection.bgType === 'image-overlay') &&
    activeSection.overlayOpacity < 35;
  const previewTargetPage = activeSection.pageTarget === 'shop' ? 'shop' : 'home';
  const homeEnabledPreviewList = [...sectionConfigs]
    .filter((s) => s.pageTarget === previewTargetPage && s.enabled)
    .sort((a, b) => a.order - b.order);

  const hasActiveFilters =
    Boolean(sectionSearchQuery.trim()) || pageFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-[#1D1D1D] rounded-3xl p-4 sm:p-5 border border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-[#C8A66A] font-semibold">
            سیستم مدیریت بصری بخش‌ها و کاورهای سایت (بدون نیاز به کدنویسی)
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-[#F5F2EC] mt-0.5">
            شخصی‌سازی پس‌زمینه، تصاویر کاور، خوانایی متن و تست واکنش‌گرایی
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowNewBlockModal(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن بنر / بخش تصویری جدید</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetSectionConfigs();
              onShowToast('تنظیمات ظاهری تمام بخش‌ها به حالت استاندارد بازگردانی شد');
            }}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#929292] hover:text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>بازنشانی پیش‌فرض</span>
          </button>
        </div>
      </div>

      {/* THEME COLOR PICKER (Primary Brand Color & Secondary Accent Color -> CSS Variables) */}
      <div
        data-testid="theme-color-picker"
        className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <div className="text-xs font-semibold text-[#C8A66A] flex items-center gap-1.5">
              <Palette className="w-4 h-4" />
              <span>Theme Color Picker — انتخابگر رنگ تم و هویت بصری برند</span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#F5F2EC] mt-0.5">
              تنظیم رنگ اصلی برند (Primary) و رنگ مکمل (Secondary Accent) در کل اپلیکیشن
            </h3>
            <p className="text-[11px] text-[#929292] mt-0.5">
              تغییر این رنگ‌ها بلافاصله متغیرهای CSS سراسری (مانند{' '}
              <code className="font-mono text-[#C8A66A]" dir="ltr">
                --accent-gold
              </code>{' '}
              و{' '}
              <code className="font-mono text-[#C8A66A]" dir="ltr">
                --accent-secondary
              </code>
              ) را در تمام صفحات به‌روزرسانی می‌کند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-[11px] font-mono text-[#F5F2EC] flex items-center gap-2"
              dir="ltr"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: activeTheme.primaryColor }}
              />
              <span>--accent-gold: {activeTheme.primaryColor}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                applyThemeColors(THEME_COLOR_PRESETS[0]);
                onShowToast('رنگ تم به طلایی کلاسیک (#C8A66A) بازنشانی شد');
              }}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#929292] hover:text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>طلایی پیش‌فرض</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Brand Color (--accent-gold) */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="primary-brand-color-input"
                className="text-xs font-bold text-[#F5F2EC]"
              >
                رنگ اصلی برند (Primary Brand Color)
              </label>
              <span className="text-[11px] font-mono text-[#929292]" dir="ltr">
                --accent-gold
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="primary-brand-color-input"
                data-testid="primary-color-picker"
                type="color"
                value={activeTheme.primaryColor}
                onChange={(e) =>
                  applyThemeColors({
                    ...activeTheme,
                    primaryColor: e.target.value,
                    presetName: 'سفارشی'
                  })
                }
                aria-label="Primary Brand Color"
                className="w-12 h-11 rounded-xl cursor-pointer bg-[#101010] border border-white/15 p-1 shrink-0"
              />
              <input
                type="text"
                dir="ltr"
                value={activeTheme.primaryColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    applyThemeColors({
                      ...activeTheme,
                      primaryColor: val,
                      presetName: 'سفارشی'
                    });
                  }
                }}
                aria-label="کد هگز رنگ اصلی برند"
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
              <div
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#101010] shrink-0"
                style={{ backgroundColor: activeTheme.primaryColor }}
              >
                نمونه دکمه اصلی
              </div>
            </div>
          </div>

          {/* Secondary Accent Color (--accent-secondary / --accent-gold-hover) */}
          <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="secondary-accent-color-input"
                className="text-xs font-bold text-[#F5F2EC]"
              >
                رنگ مکمل و هاور (Secondary Accent Color)
              </label>
              <span className="text-[11px] font-mono text-[#929292]" dir="ltr">
                --accent-secondary
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="secondary-accent-color-input"
                data-testid="secondary-color-picker"
                type="color"
                value={activeTheme.secondaryColor}
                onChange={(e) =>
                  applyThemeColors({
                    ...activeTheme,
                    secondaryColor: e.target.value,
                    presetName: 'سفارشی'
                  })
                }
                aria-label="Secondary Accent Color"
                className="w-12 h-11 rounded-xl cursor-pointer bg-[#101010] border border-white/15 p-1 shrink-0"
              />
              <input
                type="text"
                dir="ltr"
                value={activeTheme.secondaryColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    applyThemeColors({
                      ...activeTheme,
                      secondaryColor: val,
                      presetName: 'سفارشی'
                    });
                  }
                }}
                aria-label="کد هگز رنگ مکمل برند"
                className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs font-mono text-[#F5F2EC] text-left"
              />
              <div
                className="px-3 py-2 rounded-xl text-xs font-bold text-[#101010] shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${activeTheme.primaryColor} 0%, ${activeTheme.secondaryColor} 100%)`
                }}
              >
                گرادینت ترکیبی
              </div>
            </div>
          </div>
        </div>

        {/* Curated Luxury Theme Presets */}
        <div>
          <div className="text-[11px] text-[#929292] mb-2">
            پالت‌های آماده لوکس ورزشی (کلیک برای اعمال فوری در کل سایت):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {THEME_COLOR_PRESETS.map((preset) => {
              const isSelected =
                activeTheme.primaryColor.toLowerCase() ===
                  preset.primaryColor.toLowerCase() &&
                activeTheme.secondaryColor.toLowerCase() ===
                  preset.secondaryColor.toLowerCase();
              return (
                <button
                  key={preset.presetName}
                  type="button"
                  onClick={() => {
                    applyThemeColors(preset);
                    onShowToast(`پالت رنگی «${preset.presetName}» اعمال شد`);
                  }}
                  className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? 'bg-[#26221B] border-[#C8A66A] shadow-md'
                      : 'bg-[#141414] border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <span className="flex items-center -space-x-1.5 shrink-0">
                    <span
                      className="w-4 h-4 rounded-full border border-black/40"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/40"
                      style={{ backgroundColor: preset.secondaryColor }}
                    />
                  </span>
                  <span className="text-[11px] font-bold text-[#F5F2EC] truncate">
                    {preset.presetName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Split Editor: Searchable List View + Click-to-Edit Deep Customization Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Searchable Editable Sections List View */}
        <div className="lg:col-span-5 bg-[#1D1D1D] rounded-3xl p-4 sm:p-5 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#F5F2EC]">
                فهرست بخش‌های قابل ویرایش سایت
              </h3>
              <p className="text-[11px] text-[#929292] mt-0.5">
                نمایش {toPersianDigits(filteredSections.length)} از{' '}
                {toPersianDigits(sectionConfigs.length)} بخش — برای ویرایش روی هر بخش کلیک کنید
              </p>
            </div>
            <span className="text-[11px] font-semibold text-[#C8A66A] bg-[#C8A66A]/15 px-2.5 py-1 rounded-xl border border-[#C8A66A]/30">
              {toPersianDigits(sectionConfigs.filter((s) => s.enabled).length)} فعال
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#929292] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              data-testid="section-search-input"
              value={sectionSearchQuery}
              onChange={(e) => setSectionSearchQuery(e.target.value)}
              placeholder="جستجوی نام بخش، عنوان، متن یا نوع کاور..."
              aria-label="جستجوی بخش‌های قابل ویرایش"
              className="w-full min-h-[42px] pr-10 pl-9 py-2 rounded-2xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] placeholder:text-[#929292] focus:outline-none focus:border-[#C8A66A]"
            />
            {sectionSearchQuery && (
              <button
                type="button"
                onClick={() => setSectionSearchQuery('')}
                aria-label="پاک کردن جستجو"
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 text-[#F5F2EC] flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Page Target & Status Filters */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 p-1 bg-[#101010] rounded-xl overflow-x-auto no-scrollbar text-[11px]">
              {[
                { id: 'all', label: 'همه صفحات' },
                { id: 'home', label: 'صفحه اصلی' },
                { id: 'shop', label: 'فروشگاه' },
                { id: 'explore', label: 'اکسپلور' },
                { id: 'global', label: 'فوتر' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setPageFilter(tab.id as 'all' | 'home' | 'shop' | 'explore' | 'global')
                  }
                  className={`px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                    pageFilter === tab.id
                      ? 'bg-[#C8A66A] text-[#101010]'
                      : 'text-[#929292] hover:text-[#F5F2EC]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#929292]">وضعیت نمایش:</span>
              <div className="flex items-center gap-1 bg-[#101010] p-1 rounded-xl border border-white/[0.06]">
                {[
                  { id: 'all', label: 'همه' },
                  { id: 'enabled', label: 'فقط فعال‌ها' },
                  { id: 'disabled', label: 'مخفی‌ها' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as 'all' | 'enabled' | 'disabled')}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-white/15 text-[#F5F2EC]'
                        : 'text-[#929292] hover:text-[#F5F2EC]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-0.5 text-[11px]">
                <span className="text-[#929292]">
                  {toPersianDigits(filteredSections.length)} نتیجه یافت شد
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSectionSearchQuery('');
                    setPageFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-[#C8A66A] hover:underline font-semibold cursor-pointer"
                >
                  پاکسازی فیلترها
                </button>
              </div>
            )}
          </div>

          {/* Drag-and-Drop Reordering Hint */}
          <div className="p-2.5 rounded-xl bg-[#141414] border border-[#C8A66A]/25 flex items-center gap-2 text-[11px] text-[#C8C4BC]">
            <GripVertical className="w-4 h-4 text-[#C8A66A] shrink-0" />
            <span>
              برای تغییر ترتیب چیدمان <strong className="text-[#F5F2EC]">صفحه اصلی</strong> و{' '}
              <strong className="text-[#F5F2EC]">فروشگاه</strong>، هر بخش را بکشید و رها کنید
              (Drag &amp; Drop).
            </span>
          </div>

          {/* Searchable & Drag-and-Drop Reorderable Section List Items */}
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragStart={handleDndKitDragStart}
            onDragOver={handleDndKitDragOver}
            onDragEnd={handleDndKitDragEnd}
            onDragCancel={() => {
              setDraggedSectionId(null);
              setDragOverSectionId(null);
            }}
          >
            <SortableContext
              items={filteredSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div
                data-testid="editable-sections-list"
                role="list"
                aria-label="فهرست بخش‌های قابل ویرایش و جابه‌جایی"
                className="space-y-2.5 max-h-[680px] overflow-y-auto pr-0.5"
              >
                {filteredSections.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#141414] border border-white/[0.06] text-center space-y-2.5">
                    <div className="text-xs font-bold text-[#F5F2EC]">
                      هیچ بخشی مطابق با عبارت جستجو یافت نشد
                    </div>
                    <p className="text-[11px] text-[#929292]">
                      عبارت جستجو یا فیلتر صفحه را تغییر دهید تا سایر بخش‌های قابل ویرایش نمایش
                      داده شوند.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSectionSearchQuery('');
                        setPageFilter('all');
                        setStatusFilter('all');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#C8A66A]/20 text-[#C8A66A] text-xs font-bold cursor-pointer"
                    >
                      نمایش تمام بخش‌ها
                    </button>
                  </div>
                ) : (
                  filteredSections.map((sec) => {
                    const isSelected = sec.id === activeSection.id;
                    const isReorderable =
                      sec.pageTarget === 'home' || sec.pageTarget === 'shop';
                    const isBeingDragged = draggedSectionId === sec.id;
                    const draggedSectionObj = draggedSectionId
                      ? sectionConfigs.find((s) => s.id === draggedSectionId)
                      : null;
                    const isValidDropTarget =
                      isReorderable &&
                      draggedSectionObj &&
                      draggedSectionObj.id !== sec.id &&
                      draggedSectionObj.pageTarget === sec.pageTarget;
                    const isDragOverThis =
                      dragOverSectionId === sec.id && Boolean(isValidDropTarget);

                    const samePageSorted = isReorderable
                      ? [...sectionConfigs]
                          .filter((s) => s.pageTarget === sec.pageTarget)
                          .sort((a, b) => a.order - b.order)
                      : [];
                    const indexInPage = samePageSorted.findIndex((s) => s.id === sec.id);
                    const isFirstInPage = indexInPage <= 0;
                    const isLastInPage =
                      indexInPage === -1 || indexInPage >= samePageSorted.length - 1;

                    return (
                      <SortableSectionItem
                        key={sec.id}
                        sec={sec}
                        isSelected={isSelected}
                        isReorderable={isReorderable}
                        isBeingDragged={isBeingDragged}
                        isDragOverThis={isDragOverThis}
                        dropPosition={dropPosition}
                        isFirstInPage={isFirstInPage}
                        isLastInPage={isLastInPage}
                        onSelect={handleOpenSectionCustomization}
                        onToggleEnabled={handleToggleSectionEnabled}
                        onMoveOrder={handleMoveSectionOrder}
                        onDeleteCustomBlock={handleDeleteCustomBlock}
                        onNativeDragStart={(e) => {
                          if (!isReorderable) {
                            e.preventDefault();
                            return;
                          }
                          setDraggedSectionId(sec.id);
                          try {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', sec.id);
                          } catch {}
                        }}
                        onNativeDragEnter={(e) => {
                          if (!isReorderable) return;
                          e.preventDefault();
                          if (draggedSectionId && draggedSectionId !== sec.id) {
                            setDragOverSectionId(sec.id);
                          }
                        }}
                        onNativeDragOver={(e) => {
                          if (!isReorderable) return;
                          e.preventDefault();
                          try {
                            e.dataTransfer.dropEffect = 'move';
                          } catch {}

                          if (dragOverSectionId !== sec.id) {
                            setDragOverSectionId(sec.id);
                          }

                          if (e.clientY > 0) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const midpoint = rect.top + rect.height / 2;
                            const nextPos = e.clientY > midpoint ? 'after' : 'before';
                            if (dropPosition !== nextPos) {
                              setDropPosition(nextPos);
                            }
                          } else if (draggedSectionObj) {
                            const nextPos =
                              draggedSectionObj.order < sec.order ? 'after' : 'before';
                            if (dropPosition !== nextPos) {
                              setDropPosition(nextPos);
                            }
                          }
                        }}
                        onNativeDragLeave={(e) => {
                          if (
                            dragOverSectionId === sec.id &&
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
                            setDragOverSectionId(null);
                          }
                        }}
                        onNativeDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          let sourceId = draggedSectionId;
                          if (!sourceId) {
                            try {
                              sourceId = e.dataTransfer.getData('text/plain');
                            } catch {}
                          }
                          const sourceObj = sourceId
                            ? sectionConfigs.find((s) => s.id === sourceId)
                            : null;
                          let resolvedPosition: 'before' | 'after' | undefined;
                          if (e.clientY > 0) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            resolvedPosition =
                              e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
                          } else if (sourceObj) {
                            resolvedPosition =
                              sourceObj.order < sec.order ? 'after' : 'before';
                          }

                          setDraggedSectionId(null);
                          setDragOverSectionId(null);

                          if (sourceId && sourceId !== sec.id) {
                            handleReorderSectionByDrag(sourceId, sec.id, resolvedPosition);
                          }
                        }}
                        onNativeDragEnd={() => {
                          setDraggedSectionId(null);
                          setDragOverSectionId(null);
                        }}
                      />
                    );
                  })
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Specific Section Deep Customization Panel with Breakpoint Switcher & Dynamic Live Preview */}
        <div
          ref={customizationPanelRef}
          data-testid="section-customization-panel"
          data-active-section-id={activeSection.id}
          className="lg:col-span-7 bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-[11px] text-[#C8A66A] font-semibold">
                <span>{BLOCK_TYPE_LABELS[activeSection.blockType]}</span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="customization-panel-section-id"
                  className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#101010] border border-white/10 text-[#929292]"
                  dir="ltr"
                >
                  {activeSection.id}
                </span>
              </div>
              <h3
                data-testid="customization-panel-title"
                className="text-base sm:text-lg font-bold text-[#F5F2EC] mt-1"
              >
                پنل سفارشی‌سازی بخش: {activeSection.label}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="انتخاب سریع بخش برای سفارشی‌سازی"
                value={activeSection.id}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-semibold text-[#F5F2EC]"
              >
                {sortedSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.enabled ? 'فعال' : 'غیرفعال'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                role="switch"
                data-testid="active-section-toggle"
                aria-checked={activeSection.enabled}
                onClick={() => handleToggleSectionEnabled(activeSection.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  activeSection.enabled
                    ? 'bg-[#C8A66A]/20 border border-[#C8A66A]/50 text-[#C8A66A]'
                    : 'bg-white/5 border border-white/10 text-[#929292]'
                }`}
              >
                {activeSection.enabled ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>فعال در سایت</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>غیرفعال (مخفی)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* BREAKPOINT SWITCHER UI & DYNAMIC WIDTH LIVE PREVIEW CONTAINER */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#141414] border border-[#C8A66A]/35 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs sm:text-sm font-bold text-[#F5F2EC] flex items-center gap-2">
                  <currentBreakpointMeta.icon className="w-4 h-4 text-[#C8A66A]" />
                  <span>Breakpoint Switcher</span>
                  <span className="text-[11px] font-normal text-[#929292]">
                    ({currentBreakpointMeta.persianLabel})
                  </span>
                </div>
                <p className="text-[11px] text-[#929292] mt-0.5">
                  {currentBreakpointMeta.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#929292]">عرض فعلی (previewWidth):</span>
                <span
                  data-testid="active-preview-width"
                  className="text-xs font-mono font-bold text-[#C8A66A] bg-[#C8A66A]/15 px-2.5 py-1 rounded-lg border border-[#C8A66A]/40"
                  dir="ltr"
                >
                  {previewWidth}
                </span>
              </div>
            </div>

            {/* Breakpoint Switcher Row with Buttons for Mobile (375px), Tablet (768px), and Desktop (1024px) */}
            <div
              role="group"
              aria-label="Breakpoint Switcher"
              data-testid="breakpoint-switcher"
              className="flex flex-wrap sm:grid sm:grid-cols-3 gap-2 p-1.5 bg-[#101010] rounded-2xl border border-white/10"
            >
              {BREAKPOINT_SWITCHER_OPTIONS.map((bp) => {
                const Icon = bp.icon;
                const isActive = previewWidth === bp.width;
                return (
                  <button
                    key={bp.width}
                    type="button"
                    data-testid={`breakpoint-btn-${bp.viewport}`}
                    data-breakpoint={bp.width}
                    aria-label={bp.label}
                    aria-pressed={isActive}
                    title={bp.persianLabel}
                    onClick={() => setPreviewWidth(bp.width)}
                    className={`flex-1 min-h-[42px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#C8A66A] text-[#101010] shadow-md'
                        : 'text-[#929292] hover:text-[#F5F2EC] hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span dir="ltr">{bp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Preview Mode Selector */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#929292]">
                کانتینر پیش‌نمایش زنده ({currentBreakpointMeta.label} — {currentBreakpointMeta.persianLabel}):
              </span>
              <div className="flex items-center gap-1 p-1 bg-[#101010] rounded-xl border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewMode('single')}
                  className={`min-h-[30px] px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    previewMode === 'single'
                      ? 'bg-[#C8A66A] text-[#101010]'
                      : 'text-[#929292] hover:text-[#F5F2EC]'
                  }`}
                >
                  بخش انتخاب‌شده
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('page')}
                  className={`min-h-[30px] px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                    previewMode === 'page'
                      ? 'bg-[#C8A66A] text-[#101010]'
                      : 'text-[#929292] hover:text-[#F5F2EC]'
                  }`}
                >
                  کل صفحه
                </button>
              </div>
            </div>

            {/* Live Preview Container controlled by previewWidth ('375px' | '768px' | '1024px') */}
            <div
              data-testid="section-live-preview-scroll-wrapper"
              className="w-full overflow-x-auto pb-2 pt-1"
            >
              <div
                data-testid="section-preview-window"
                data-preview-width={previewWidth}
                style={{
                  width: previewWidth,
                  minWidth: previewWidth
                }}
                className={`mx-auto bg-[#0B0B0B] shadow-2xl transition-all duration-300 ${currentBreakpointMeta.frameClass}`}
              >
                <div className="flex items-center justify-between px-3 pb-2.5 mb-3 border-b border-white/[0.07] text-[11px] text-[#929292]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C8A66A]">ARASH LUXURY</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeSection.label}</span>
                  </div>
                  <span
                    className="font-mono text-[10px] text-[#C8A66A] font-semibold"
                    dir="ltr"
                  >
                    {currentBreakpointMeta.label}
                  </span>
                </div>

                {previewMode === 'single' ? (
                  <div className="space-y-3">
                    {!activeSection.enabled && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 text-center">
                        این بخش در حال حاضر غیرفعال (مخفی) است — پیش‌نمایش در حالت فعال:
                      </div>
                    )}

                    {renderResponsiveSectionPreview(activeSection, false)}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#929292] px-1 pt-2 border-t border-white/[0.06]">
                      <span>
                        عرض ویوپورت:{' '}
                        <strong className="text-[#C8A66A] font-mono" dir="ltr">
                          {previewWidth}
                        </strong>
                      </span>
                      <span>
                        نحوه نمایش تصویر:{' '}
                        <strong className="text-[#F5F2EC]">{activeSection.imageDisplayMode}</strong>
                      </span>
                      <span>
                        تیرگی لایه خوانایی:{' '}
                        <strong className="text-[#C8A66A] tabular-nums">
                          {toPersianDigits(activeSection.overlayOpacity)}٪
                        </strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto space-y-3 pr-0.5">
                    {homeEnabledPreviewList.map((sec) => (
                      <div
                        key={sec.id}
                        onClick={() => setSelectedSectionId(sec.id)}
                        className={`cursor-pointer rounded-3xl transition-all ${
                          sec.id === activeSection.id ? 'ring-2 ring-[#C8A66A]' : ''
                        }`}
                      >
                        {renderResponsiveSectionPreview(sec, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. Background Type Selector */}
          <div>
            <label className="block text-xs font-bold text-[#F5F2EC] mb-2 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-[#C8A66A]" />
              <span>۱. نوع پس‌زمینه بخش (Background Type)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BG_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateActiveSectionField('bgType', opt.id)}
                  className={`min-h-[42px] px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    activeSection.bgType === opt.id
                      ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                      : 'bg-[#101010] text-[#929292] border-white/10 hover:text-[#F5F2EC]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Conditional Background Settings */}
          {activeSection.bgType === 'solid' && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-3">
              <div className="text-xs font-semibold text-[#F5F2EC]">
                انتخاب رنگ پس‌زمینه یکدست:
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {SOLID_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => updateActiveSectionField('solidColor', swatch.hex)}
                    className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer ${
                      activeSection.solidColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'border-[#C8A66A] text-[#F5F2EC]'
                        : 'border-white/10 text-[#929292]'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/25"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span>{swatch.name}</span>
                  </button>
                ))}

                <label className="px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#929292] flex items-center gap-2 cursor-pointer">
                  <span>رنگ دلخواه:</span>
                  <input
                    type="color"
                    value={activeSection.solidColor}
                    onChange={(e) => updateActiveSectionField('solidColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                </label>
              </div>
            </div>
          )}

          {activeSection.bgType === 'gradient' && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-3">
              <div className="text-xs font-semibold text-[#F5F2EC]">
                انتخاب گرادینت لوکس ورزشی:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GRADIENT_OPTIONS.map((grad) => (
                  <button
                    key={grad.id}
                    type="button"
                    onClick={() => updateActiveSectionField('gradientPreset', grad.id)}
                    style={{ backgroundImage: GRADIENT_PRESET_STYLES[grad.id] }}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-right text-xs font-bold transition-all cursor-pointer ${
                      activeSection.gradientPreset === grad.id
                        ? 'border-[#C8A66A] text-[#F5F2EC] ring-1 ring-[#C8A66A]'
                        : 'border-white/10 text-[#F5F2EC]/80 hover:border-white/30'
                    }`}
                  >
                    {grad.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(activeSection.bgType === 'image' ||
            activeSection.bgType === 'image-overlay' ||
            activeSection.id === 'home-hero') && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#F5F2EC] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#C8A66A]" />
                  <span>تصویر کاور و پس‌زمینه بخش</span>
                </div>
                {activeSection.customImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveSectionField('customImageUrl', undefined);
                      onShowToast('تصویر سفارشی حذف شد و طرح پیش‌فرض جایگزین گردید');
                    }}
                    className="text-[11px] text-red-400 hover:underline cursor-pointer"
                  >
                    حذف تصویر آپلود شده
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSectionImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#C8A66A]/15 hover:bg-[#C8A66A]/25 border border-[#C8A66A]/45 text-[#C8A66A] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>آپلود تصویر کاور از گوشی یا سیستم</span>
                </button>
              </div>

              {uploadStatus && (
                <div className="text-[11px] text-[#C8A66A] font-medium">{uploadStatus}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">
                    کاور استودیویی پیش‌فرض:
                  </label>
                  <select
                    value={activeSection.imagePreset}
                    onChange={(e) =>
                      updateActiveSectionField('imagePreset', e.target.value as VisualPresetKey)
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  >
                    <option value="coach-portrait">پرتره استودیویی مربی</option>
                    <option value="digital-hypertrophy">دمبل و دفترچه برنامه تمرینی</option>
                    <option value="physical-straps">تجهیزات چرمی و سگک برنجی</option>
                    <option value="reel-deadlift">صحنه ددلیفت و هالتر سنگین</option>
                    <option value="reel-mobility">موبیلیتی و کتل‌بل استودیو</option>
                    <option value="reel-nutrition">گرافیک تغذیه و درشت‌مغذی‌ها</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">
                    یا لینک مستقیم تصویر (URL):
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={
                      activeSection.customImageUrl?.startsWith('data:')
                        ? ''
                        : activeSection.customImageUrl || ''
                    }
                    onChange={(e) => updateActiveSectionField('customImageUrl', e.target.value)}
                    placeholder="https://..."
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-[#929292] mb-1.5">
                  نحوه قرارگیری و برش تصویر (Image Display Mode):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DISPLAY_MODE_OPTIONS.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateActiveSectionField('imageDisplayMode', mode.id)}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                        activeSection.imageDisplayMode === mode.id
                          ? 'bg-[#C8A66A]/20 border-[#C8A66A] text-[#C8A66A]'
                          : 'bg-[#101010] border-white/10 text-[#929292] hover:text-[#F5F2EC]'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#929292]">
                    تیرگی لایه محافظ خوانایی متن (Overlay Darkness):
                  </span>
                  <span className="font-bold text-[#C8A66A] tabular-nums">
                    {toPersianDigits(activeSection.overlayOpacity)}٪
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={activeSection.overlayOpacity}
                  onChange={(e) =>
                    updateActiveSectionField('overlayOpacity', Number(e.target.value))
                  }
                  className="w-full accent-[#C8A66A] cursor-pointer"
                />
                {isLowContrastWarning && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      برای حفظ خوانایی متن فارسی روی تصویر، پیشنهاد می‌شود تیرگی لایه حداقل ۴۵٪
                      باشد.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Section Height Control */}
          <div>
            <label className="block text-xs font-bold text-[#F5F2EC] mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#C8A66A]" />
              <span>۲. ارتفاع و فضای عمودی بخش (Section Height)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HEIGHT_MODE_OPTIONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => updateActiveSectionField('heightMode', h.id)}
                  className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    activeSection.heightMode === h.id
                      ? 'bg-[#C8A66A] text-[#101010] border-[#C8A66A]'
                      : 'bg-[#101010] text-[#929292] border-white/10 hover:text-[#F5F2EC]'
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Text Overlay Controls */}
          <div className="pt-3 border-t border-white/[0.08] space-y-3">
            <div className="text-xs font-bold text-[#F5F2EC]">
              ۳. متن‌ها و عنوان روی کاور بخش
            </div>

            <div>
              <label className="block text-[11px] text-[#929292] mb-1">
                سرتیتر کوتاه (Kicker):
              </label>
              <input
                type="text"
                data-testid="customization-kicker-input"
                value={activeSection.kicker || ''}
                onChange={(e) => updateActiveSectionField('kicker', e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#929292] mb-1">
                عنوان اصلی بخش (Title) *:
              </label>
              <input
                type="text"
                data-testid="customization-title-input"
                value={activeSection.title}
                onChange={(e) => updateActiveSectionField('title', e.target.value)}
                className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs font-bold text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-[#929292] mb-1">
                توضیح کوتاه زیرعنوان (Subtitle):
              </label>
              <textarea
                rows={2}
                data-testid="customization-subtitle-input"
                value={activeSection.subtitle}
                onChange={(e) => updateActiveSectionField('subtitle', e.target.value)}
                className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            {activeSection.ctaText !== undefined && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">
                    متن دکمه فراخوان (CTA):
                  </label>
                  <input
                    type="text"
                    value={activeSection.ctaText || ''}
                    onChange={(e) => updateActiveSectionField('ctaText', e.target.value)}
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#929292] mb-1">مقصد دکمه:</label>
                  <select
                    value={activeSection.ctaRoute || 'shop'}
                    onChange={(e) =>
                      updateActiveSectionField('ctaRoute', e.target.value as AppRoute)
                    }
                    className="w-full min-h-[40px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  >
                    <option value="shop">فروشگاه برنامه‌ها و تجهیزات</option>
                    <option value="explore">اکسپلور ویدیویی (Reels)</option>
                    <option value="contact">فرم مشاوره و تماس مستقیم</option>
                    <option value="account">حساب کاربری</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onShowToast('تغییرات بخش در سایت ذخیره و اعمال شد')}
              className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>ذخیره و تایید تنظیمات این بخش</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPreviewMode((prev) => (prev === 'page' ? 'single' : 'page'));
                onShowToast(
                  previewMode === 'page'
                    ? 'حالت پیش‌نمایش تک‌بخش فعال شد'
                    : 'پیش‌نمایش کامل چیدمان صفحه در محیط کاری فعال شد'
                );
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#F5F2EC] flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#C8A66A]" />
              <span>{previewMode === 'page' ? 'پیش‌نمایش تک‌بخش' : 'پیش‌نمایش چیدمان صفحه'}</span>
            </button>
          </div>
        </div>
      </div>

      {showNewBlockModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowNewBlockModal(false)}
        >
          <form
            onSubmit={handleCreateCustomBlock}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#1D1D1D] border border-white/15 rounded-3xl p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[#F5F2EC]">
              افزودن بنر یا بخش تصویری جدید به سایت
            </h3>

            <div>
              <label className="block text-xs text-[#929292] mb-1">
                صفحه مقصد (Page Target)
              </label>
              <select
                value={newBlockPageTarget}
                onChange={(e) => setNewBlockPageTarget(e.target.value as 'home' | 'shop')}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              >
                <option value="home">صفحه اصلی (Home)</option>
                <option value="shop">صفحه فروشگاه (Shop)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">
                نوع بلوک محتوایی (Content Block Type)
              </label>
              <select
                value={newBlockType}
                onChange={(e) => setNewBlockType(e.target.value as SectionBlockType)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              >
                {Object.entries(BLOCK_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">
                نام مدیریتی بخش (برای نمایش در لیست ادمین)
              </label>
              <input
                type="text"
                required
                value={newBlockLabel}
                onChange={(e) => setNewBlockLabel(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان روی بنر *</label>
              <input
                type="text"
                required
                value={newBlockTitle}
                onChange={(e) => setNewBlockTitle(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">متن کوتاه زیرعنوان</label>
              <textarea
                rows={2}
                value={newBlockSubtitle}
                onChange={(e) => setNewBlockSubtitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold cursor-pointer"
              >
                ایجاد و باز کردن در ویرایشگر
              </button>
              <button
                type="button"
                onClick={() => setShowNewBlockModal(false)}
                className="min-h-[44px] px-4 rounded-xl bg-white/10 text-xs text-[#F5F2EC] cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const AdminView: React.FC<AdminViewProps> = ({
  coach,
  brandConfig,
  siteModules,
  revisions,
  consultations,
  discounts,
  gateways,
  auditLogs,
  products,
  posts,
  orders,
  sectionConfigs,
  themeColors,
  onUpdateThemeColors,
  onUpdateCoach,
  onUpdateBrandConfig,
  onUpdateSiteModules,
  onUpdateConsultations,
  onUpdateDiscounts,
  onPublishRevision,
  onRestoreRevision,
  onUpdateSectionConfigs,
  onResetSectionConfigs,
  onSaveProduct,
  onDeleteProduct,
  onSavePost,
  onDeletePost,
  onDeleteComment,
  onAddCoachReply,
  onToggleOrderStatus,
  onResetDemoData,
  onNavigate
}) => {
  const [section, setSection] = useState<AdminSection>('sections');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodType, setProdType] = useState<'digital' | 'physical'>('digital');
  const [prodTitle, setProdTitle] = useState('');
  const [prodSubtitle, setProdSubtitle] = useState('');
  const [prodPrice, setProdPrice] = useState('1450000');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFeaturesText, setProdFeaturesText] = useState(
    'برنامه دقیق ۴ جلسه در هفته\nویدیوی آموزش تکنیک حرکات\nپشتیبانی رفع اشکال'
  );
  const [prodStatus, setProdStatus] = useState<'published' | 'draft' | 'archived'>('published');
  const [prodPreset, setProdPreset] = useState<VisualPresetKey>('digital-hypertrophy');
  const [prodCustomImage, setProdCustomImage] = useState('');
  const [prodLevel, setProdLevel] = useState('متوسط تا پیشرفته');
  const [prodDuration, setProdDuration] = useState('۸ هفته');
  const [prodFileFormat, setProdFileFormat] = useState('PDF تعاملی + جدول اکسل');
  const [prodStock, setProdStock] = useState('15');
  const [prodMaterial, setProdMaterial] = useState('چرم طبیعی و استیل ضدزنگ');

  // Post Form State
  const [postMediaType, setPostMediaType] = useState<'video' | 'image' | 'carousel'>('video');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postTags, setPostTags] = useState('بیومکانیک, هایپرتروفی, آموزش_حرکات');
  const [postPreset, setPostPreset] = useState<VisualPresetKey>('reel-deadlift');
  const [postCustomUrl, setPostCustomUrl] = useState('');
  const [postLinkedProduct, setPostLinkedProduct] = useState<string>(products[0]?.id || '');

  // Comment Reply State
  const [replyTextByPost, setReplyTextByPost] = useState<Record<string, string>>({});

  // Coach Profile Form State
  const [coachName, setCoachName] = useState(coach.name);
  const [coachTitle, setCoachTitle] = useState(coach.title);
  const [coachBio, setCoachBio] = useState(coach.bio);
  const [coachSpecialties, setCoachSpecialties] = useState(coach.specialties.join('، '));
  const [coachPhone, setCoachPhone] = useState(coach.phone);
  const [coachInstagram, setCoachInstagram] = useState(coach.instagramHandle);
  const [coachLocation, setCoachLocation] = useState(coach.location);
  const [coachCustomAvatar, setCoachCustomAvatar] = useState(coach.customAvatarUrl || '');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setProdType('digital');
    setProdTitle('');
    setProdSubtitle('');
    setProdPrice('1450000');
    setProdDesc('');
    setProdFeaturesText('برنامه دقیق ۴ جلسه در هفته\nویدیوی آموزش تکنیک حرکات');
    setProdStatus('published');
    setProdPreset('digital-hypertrophy');
    setProdCustomImage('');
    setProdLevel('متوسط تا پیشرفته');
    setProdDuration('۸ هفته');
    setProdFileFormat('PDF تعاملی + جدول ثبت رکورد');
    setProdStock('15');
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProdType(product.type);
    setProdTitle(product.title);
    setProdSubtitle(product.subtitle);
    setProdPrice(String(product.price));
    setProdDesc(product.description);
    setProdFeaturesText(product.features.join('\n'));
    setProdStatus(product.status);
    setProdPreset(product.visualPreset);
    setProdCustomImage(product.customImageUrl || '');
    setProdLevel(product.level || 'متوسط تا پیشرفته');
    setProdDuration(product.duration || '۱۲ هفته');
    setProdFileFormat(product.fileFormat || 'PDF تعاملی');
    setProdStock(String(product.stock ?? 10));
    setProdMaterial(product.material || 'چرم طبیعی');
    setSection('products');
  };

  const handleProductFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim()) return;
    const numericPrice = Math.max(0, Number(prodPrice) || 0);
    const features = prodFeaturesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const existing = products.find((p) => p.id === editingProductId);
    const newProduct: Product = {
      id: editingProductId || `prod-${Date.now()}`,
      type: prodType,
      title: prodTitle.trim(),
      subtitle: prodSubtitle.trim() || 'طراحی شده توسط آرش کاظمی',
      price: numericPrice,
      description: prodDesc.trim() || prodTitle.trim(),
      features: features.length > 0 ? features : ['تحویل فوری و کیفیت تضمین‌شده'],
      visualPreset: prodPreset,
      customImageUrl: prodCustomImage.trim() || undefined,
      status: prodStatus,
      createdAt: existing?.createdAt || '۱۴۰۳/۰۸/۰۹',
      ...(prodType === 'digital'
        ? {
            level: prodLevel.trim(),
            duration: prodDuration.trim(),
            fileFormat: prodFileFormat.trim(),
            fileSize: '۲۲.۵ مگابایت',
            modules: existing?.modules || [
              {
                weekRange: 'هفته ۱ تا ۴',
                title: 'فاز پایه و سازگاری عصبی-عضلانی',
                focus: 'تثبیت تکنیک و کنترل فاز منفی حرکات اصلی',
                sessionsPerWeek: 4,
                sampleExercises: [
                  'اسکوات هالتر — ۴ ست × ۸ تکرار',
                  'پرس سینه دمبل — ۴ ست × ۱۰ تکرار'
                ]
              }
            ]
          }
        : {
            stock: Math.max(0, Number(prodStock) || 0),
            sku: `AK-GEAR-${Math.floor(100 + Math.random() * 900)}`,
            material: prodMaterial.trim(),
            shippingEstimate: 'ارسال پیشتاز (۱ تا ۳ روز کاری)',
            weightGrams: 350
          })
    };

    onSaveProduct(newProduct);
    resetProductForm();
    showToast(editingProductId ? 'محصول با موفقیت ویرایش شد' : 'محصول جدید به فروشگاه اضافه شد');
  };

  const handlePostFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postCaption.trim()) return;

    const tags = postTags
      .split(/[,،\s]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean);

    const newPost: ExplorePost = {
      id: `post-${Date.now()}`,
      mediaType: postMediaType,
      title: postTitle.trim(),
      caption: postCaption.trim(),
      tags: tags.length > 0 ? tags : ['فیتنس', 'برنامه_تمرینی'],
      visualPreset: postPreset,
      customMediaUrl: postCustomUrl.trim() || undefined,
      likesCount: 1,
      isLiked: false,
      isSaved: false,
      viewsCount: 120,
      durationSec: 16,
      bpmTempo: 105,
      linkedProductId: postLinkedProduct || undefined,
      createdAt: 'لحظاتی پیش',
      comments: [],
      ...(postMediaType === 'carousel'
        ? {
            slides: [
              {
                id: 's-1',
                visualPreset: 'carousel-posture-1',
                slideTitle: 'اسلاید ۱: نکته کلیدی اول',
                slideNote: postTitle.trim()
              },
              {
                id: 's-2',
                visualPreset: 'carousel-posture-2',
                slideTitle: 'اسلاید ۲: اجرای استاندارد',
                slideNote: postCaption.trim().slice(0, 90)
              }
            ]
          }
        : {})
    };

    onSavePost(newPost);
    setPostTitle('');
    setPostCaption('');
    setPostCustomUrl('');
    showToast('پست جدید در فید اکسپلور (Reels) منتشر شد');
  };

  const handleSaveCoachProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const specs = coachSpecialties
      .split(/[،,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    onUpdateCoach({
      ...coach,
      name: coachName.trim() || coach.name,
      title: coachTitle.trim() || coach.title,
      bio: coachBio.trim() || coach.bio,
      specialties: specs.length > 0 ? specs : coach.specialties,
      phone: coachPhone.trim() || coach.phone,
      instagramHandle: coachInstagram.trim() || coach.instagramHandle,
      location: coachLocation.trim() || coach.location,
      customAvatarUrl: coachCustomAvatar.trim() || undefined
    });
    showToast('اطلاعات پروفایل مربی در صفحه اصلی به‌روزرسانی شد');
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments.length, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {toastMsg && (
        <div
          role="status"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold flex items-center gap-2 shadow-xl"
        >
          <Check className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#1D1D1D] rounded-2xl border border-white/[0.08] mb-8 overflow-x-auto no-scrollbar">
        {[
          { id: 'sections', label: 'طراحی ظاهری و کاور بخش‌ها', icon: Palette },
          { id: 'overview', label: 'نمای کلی', icon: Layers },
          { id: 'products', label: 'مدیریت محصولات و برنامه‌ها', icon: ShoppingBag },
          { id: 'media', label: 'انتشار پست اکسپلور (Reels)', icon: Film },
          {
            id: 'comments',
            label: `مدیریت دیدگاه‌ها (${toPersianDigits(totalComments)})`,
            icon: MessageSquare
          },
          { id: 'orders', label: `سفارش‌ها (${toPersianDigits(orders.length)})`, icon: Package },
          { id: 'profile', label: 'ویرایش پروفایل مربی', icon: UserCheck },
          { id: 'seo', label: 'سئو و تگ‌های OpenGraph', icon: Search },
          { id: 'whitelabel', label: 'تنظیمات برند، ماژول‌ها و امنیت (White-Label)', icon: SlidersHorizontal }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id as AdminSection)}
              className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#C8A66A] text-[#101010]'
                  : 'text-[#929292] hover:text-[#F5F2EC]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 0. SECTION CONFIGURATION EDITOR & BREAKPOINT SWITCHER */}
      {section === 'sections' && (
        <SectionVisualConfigEditor
          sectionConfigs={sectionConfigs}
          themeColors={themeColors}
          onUpdateThemeColors={onUpdateThemeColors}
          onUpdateSectionConfigs={onUpdateSectionConfigs}
          onResetSectionConfigs={onResetSectionConfigs}
          onNavigate={onNavigate}
          onShowToast={showToast}
        />
      )}

      {/* 1. OVERVIEW SECTION */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1D1D1D] rounded-2xl p-5 border border-white/[0.08]">
              <div className="text-xs text-[#929292]">فروش کل آزمایشی</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#C8A66A] mt-1 tabular-nums">
                {formatToman(totalRevenue)}
              </div>
            </div>
            <div className="bg-[#1D1D1D] rounded-2xl p-5 border border-white/[0.08]">
              <div className="text-xs text-[#929292]">کل محصولات و برنامه‌ها</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mt-1 tabular-nums">
                {toPersianDigits(products.length)} محصول
              </div>
            </div>
            <div className="bg-[#1D1D1D] rounded-2xl p-5 border border-white/[0.08]">
              <div className="text-xs text-[#929292]">پست‌های ویدیویی و آموزشی</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mt-1 tabular-nums">
                {toPersianDigits(posts.length)} پست
              </div>
            </div>
            <div className="bg-[#1D1D1D] rounded-2xl p-5 border border-white/[0.08]">
              <div className="text-xs text-[#929292]">دیدگاه‌های ثبت‌شده</div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#F5F2EC] mt-1 tabular-nums">
                {toPersianDigits(totalComments)} دیدگاه
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#F5F2EC]">دسترسی سریع مدیریت</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    resetProductForm();
                    setSection('products');
                  }}
                  className="p-4 rounded-2xl bg-[#141414] hover:bg-white/5 border border-white/[0.06] text-right transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5 text-[#C8A66A] mb-2" />
                  <div className="text-xs font-bold text-[#F5F2EC]">
                    افزودن برنامه تمرینی یا محصول جدید
                  </div>
                  <div className="text-[11px] text-[#929292] mt-1">
                    تعریف قیمت، موجودی و سرفصل دیجیتال
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSection('media')}
                  className="p-4 rounded-2xl bg-[#141414] hover:bg-white/5 border border-white/[0.06] text-right transition-colors cursor-pointer"
                >
                  <Film className="w-5 h-5 text-[#C8A66A] mb-2" />
                  <div className="text-xs font-bold text-[#F5F2EC]">
                    انتشار ویدیو یا آلبوم در اکسپلور
                  </div>
                  <div className="text-[11px] text-[#929292] mt-1">
                    اتصال مستقیم پست به محصول فروشگاه
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#F5F2EC]">
                  بازنشانی داده‌های آزمایشی (Reset Demo State)
                </h2>
                <p className="text-xs text-[#929292] mt-1.5 leading-relaxed">
                  در صورتی که محصولات، پست‌ها یا سفارش‌های تستی زیادی ایجاد کرده‌اید، می‌توانید با یک کلیک تمامی اطلاعات را به حالت اولیه بازگردانید.
                </p>
              </div>

              <div className="mt-5">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 text-xs font-semibold text-[#F5F2EC] hover:text-red-300 flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>بازنشانی کامل اطلاعات دمو</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onResetDemoData();
                        setConfirmReset(false);
                        showToast('تمامی اطلاعات دمو به حالت اولیه بازنشانی شد');
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                    >
                      تایید بازنشانی
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-white/10 text-xs text-[#F5F2EC] cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PRODUCTS & TRAINING PLANS MANAGEMENT */}
      {section === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Create / Edit Product Form */}
          <form
            onSubmit={handleProductFormSubmit}
            className="lg:col-span-6 bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F5F2EC]">
                {editingProductId ? 'ویرایش محصول / برنامه تمرینی' : 'افزودن محصول یا برنامه جدید'}
              </h2>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs text-[#C8A66A] hover:underline cursor-pointer"
                >
                  + ایجاد محصول جدید
                </button>
              )}
            </div>

            {/* Product Type Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#101010] rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setProdType('digital');
                  setProdPreset('digital-hypertrophy');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-bold cursor-pointer ${
                  prodType === 'digital'
                    ? 'bg-[#C8A66A] text-[#101010]'
                    : 'text-[#929292] hover:text-[#F5F2EC]'
                }`}
              >
                برنامه تمرینی دیجیتال
              </button>
              <button
                type="button"
                onClick={() => {
                  setProdType('physical');
                  setProdPreset('physical-straps');
                }}
                className={`min-h-[40px] rounded-lg text-xs font-bold cursor-pointer ${
                  prodType === 'physical'
                    ? 'bg-[#C8A66A] text-[#101010]'
                    : 'text-[#929292] hover:text-[#F5F2EC]'
                }`}
              >
                محصول فیزیکی ورزشی
              </button>
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان محصول *</label>
              <input
                type="text"
                required
                value={prodTitle}
                onChange={(e) => setProdTitle(e.target.value)}
                placeholder="مثال: برنامه ۸ هفته‌ای کات و تفکیک عضلانی"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">زیرعنوان کوتاه</label>
              <input
                type="text"
                value={prodSubtitle}
                onChange={(e) => setProdSubtitle(e.target.value)}
                placeholder="مثال: همراه با جدول ماکروها و ویدیوی حرکات"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#929292] mb-1">قیمت (تومان) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={10000}
                  dir="ltr"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left focus:outline-none focus:border-[#C8A66A]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">وضعیت انتشار</label>
                <select
                  value={prodStatus}
                  onChange={(e) => setProdStatus(e.target.value as 'published' | 'draft')}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
                >
                  <option value="published">منتشر شده در فروشگاه</option>
                  <option value="draft">پیش‌نویس (مخفی از مشتری)</option>
                </select>
              </div>
            </div>

            {prodType === 'digital' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
                <div>
                  <label className="block text-xs text-[#929292] mb-1">سطح برنامه</label>
                  <input
                    type="text"
                    value={prodLevel}
                    onChange={(e) => setProdLevel(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#929292] mb-1">مدت دوره</label>
                  <input
                    type="text"
                    value={prodDuration}
                    onChange={(e) => setProdDuration(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#929292] mb-1">فرمت فایل دیجیتال</label>
                  <input
                    type="text"
                    value={prodFileFormat}
                    onChange={(e) => setProdFileFormat(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
                <div>
                  <label className="block text-xs text-[#929292] mb-1">موجودی انبار (عدد)</label>
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#929292] mb-1">متریال ساخت</label>
                  <input
                    type="text"
                    value={prodMaterial}
                    onChange={(e) => setProdMaterial(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#929292] mb-1">طرح گرافیکی پیش‌فرض</label>
                <select
                  value={prodPreset}
                  onChange={(e) => setProdPreset(e.target.value as VisualPresetKey)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                >
                  <option value="digital-hypertrophy">کاور برنامه هایپرتروفی و دمبل</option>
                  <option value="physical-straps">تصویر استودیویی بند لیفت چرم</option>
                  <option value="reel-nutrition">اینفوگرافیک تغذیه و ماکرو</option>
                  <option value="reel-deadlift">استودیو ددلیفت و هالتر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  لینک تصویر سفارشی (اختیاری)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={prodCustomImage}
                  onChange={(e) => setProdCustomImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">توضیحات کامل محصول *</label>
              <textarea
                rows={3}
                required
                value={prodDesc}
                onChange={(e) => setProdDesc(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">
                ویژگی‌های کلیدی (هر خط یک ویژگی)
              </label>
              <textarea
                rows={3}
                value={prodFeaturesText}
                onChange={(e) => setProdFeaturesText(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] focus:outline-none focus:border-[#C8A66A]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingProductId ? 'ذخیره تغییرات محصول' : 'انتشار محصول در فروشگاه'}</span>
            </button>
          </form>

          {/* Existing Products List */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-bold text-[#F5F2EC]">
              فهرست محصولات و برنامه‌ها ({toPersianDigits(products.length)})
            </h2>

            {products.map((p) => (
              <div
                key={p.id}
                className="bg-[#1D1D1D] rounded-3xl p-4 sm:p-5 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <LuxuryArtwork
                      preset={p.visualPreset}
                      customUrl={p.customImageUrl}
                      alt={p.title}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[11px] text-[#929292]">
                      <span className="text-[#C8A66A] font-semibold">
                        {p.type === 'digital' ? 'دیجیتال' : 'فیزیکی'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {p.status === 'published' ? 'منتشر شده' : 'پیش‌نویس'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#F5F2EC] mt-0.5">{p.title}</h3>
                    <div className="text-xs text-[#929292] mt-1 tabular-nums">
                      {formatToman(p.price)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => startEditProduct(p)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#F5F2EC] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C8A66A]" />
                    <span>ویرایش</span>
                  </button>

                  {confirmDeleteId === p.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProduct(p.id);
                        setConfirmDeleteId(null);
                        showToast('محصول حذف شد');
                      }}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer"
                    >
                      تایید حذف
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(p.id)}
                      aria-label="حذف محصول"
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-red-500/20 text-[#929292] hover:text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. EXPLORE MEDIA MANAGEMENT */}
      {section === 'media' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handlePostFormSubmit}
            className="lg:col-span-6 bg-[#1D1D1D] rounded-3xl p-6 border border-white/[0.08] space-y-4"
          >
            <h2 className="text-base font-bold text-[#F5F2EC]">
              ایجاد پست جدید در اکسپلور (Reels)
            </h2>

            <div className="grid grid-cols-3 gap-2 p-1 bg-[#101010] rounded-xl">
              {[
                { type: 'video', label: 'ویدیو (Reels)' },
                { type: 'image', label: 'تک تصویر' },
                { type: 'carousel', label: 'آلبوم اسلایدی' }
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() =>
                    setPostMediaType(item.type as 'video' | 'image' | 'carousel')
                  }
                  className={`min-h-[40px] rounded-lg text-xs font-bold cursor-pointer ${
                    postMediaType === item.type
                      ? 'bg-[#C8A66A] text-[#101010]'
                      : 'text-[#929292] hover:text-[#F5F2EC]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان آموزش *</label>
              <input
                type="text"
                required
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="مثال: تکنیک تنفس شکمی در اسکوات سنگین"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">کپشن و توضیحات تخصصی *</label>
              <textarea
                rows={3}
                required
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                placeholder="توضیحات کامل حرکت و نکات اجرایی..."
                className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#929292] mb-1">سکانس حرکتی / گرافیک</label>
                <select
                  value={postPreset}
                  onChange={(e) => setPostPreset(e.target.value as VisualPresetKey)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                >
                  <option value="reel-deadlift">ویدیوی بیومکانیک ددلیفت</option>
                  <option value="reel-mobility">ویدیوی موبیلیتی شانه با کتل‌بل</option>
                  <option value="reel-nutrition">اینفوگرافیک تغذیه پیرامون تمرین</option>
                  <option value="carousel-posture-1">گرافیک شاخص‌های اضافه‌بار</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  محصول مرتبط در فروشگاه (CTA)
                </label>
                <select
                  value={postLinkedProduct}
                  onChange={(e) => setPostLinkedProduct(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                >
                  <option value="">بدون محصول مرتبط</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  هشتگ‌ها (با ویرگول جدا کنید)
                </label>
                <input
                  type="text"
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#929292] mb-1">
                  لینک ویدیو/تصویر سفارشی (اختیاری)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={postCustomUrl}
                  onChange={(e) => setPostCustomUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>انتشار در فید اکسپلور</span>
            </button>
          </form>

          {/* Existing Posts List */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-base font-bold text-[#F5F2EC]">
              پست‌های منتشر شده ({toPersianDigits(posts.length)})
            </h2>
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-[#1D1D1D] rounded-3xl p-4 border border-white/[0.08] flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    <LuxuryArtwork
                      preset={post.visualPreset}
                      customUrl={post.customMediaUrl}
                      alt={post.title}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#C8A66A] font-semibold">
                      {post.mediaType === 'video'
                        ? 'ویدیو Reels'
                        : post.mediaType === 'carousel'
                          ? 'آلبوم چندصفحه‌ای'
                          : 'تصویر آموزشی'}{' '}
                      · {toPersianDigits(post.likesCount)} پسند
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#F5F2EC] truncate mt-0.5">
                      {post.title}
                    </h3>
                    <p className="text-[11px] text-[#929292] line-clamp-1 mt-1">
                      {post.caption}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onDeletePost(post.id);
                    showToast('پست از اکسپلور حذف شد');
                  }}
                  aria-label="حذف پست"
                  className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-red-500/20 text-[#929292] hover:text-red-400 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. COMMENTS MODERATION */}
      {section === 'comments' && (
        <div className="space-y-6">
          <h2 className="text-base font-bold text-[#F5F2EC]">
            مدیریت دیدگاه‌های ورزشکاران و پاسخ مستقیم مربی
          </h2>

          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <span className="text-xs text-[#C8A66A] font-semibold">پست: </span>
                  <span className="text-sm font-bold text-[#F5F2EC]">{post.title}</span>
                </div>
                <span className="text-xs text-[#929292]">
                  {toPersianDigits(post.comments.length)} دیدگاه
                </span>
              </div>

              <div className="space-y-2.5">
                {post.comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-start justify-between gap-3"
                  >
                    <div className="text-xs">
                      <span className="font-bold text-[#F5F2EC]">{c.authorName}</span>
                      {c.isCoachReply && (
                        <span className="text-[#C8A66A] mr-2 font-semibold">
                          (پاسخ رسمی مربی)
                        </span>
                      )}
                      <p className="text-[#929292] mt-1 leading-relaxed">{c.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteComment(post.id, c.id);
                        showToast('دیدگاه حذف شد');
                      }}
                      aria-label="حذف دیدگاه"
                      className="min-h-[36px] min-w-[36px] rounded-lg bg-white/5 hover:bg-red-500/20 text-[#929292] hover:text-red-400 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={replyTextByPost[post.id] || ''}
                  onChange={(e) =>
                    setReplyTextByPost((prev) => ({ ...prev, [post.id]: e.target.value }))
                  }
                  placeholder="ثبت پاسخ رسمی با نام مربی..."
                  className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const txt = (replyTextByPost[post.id] || '').trim();
                    if (!txt) return;
                    onAddCoachReply(post.id, txt);
                    setReplyTextByPost((prev) => ({ ...prev, [post.id]: '' }));
                    showToast('پاسخ مربی ثبت شد');
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#C8A66A] text-[#101010] text-xs font-bold whitespace-nowrap cursor-pointer"
                >
                  ارسال پاسخ مربی
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. DEMO ORDERS MANAGEMENT */}
      {section === 'orders' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-[#F5F2EC]">
            سفارش‌های ثبت‌شده در سیستم نمایشی ({toPersianDigits(orders.length)})
          </h2>
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-[#1D1D1D] rounded-3xl p-5 sm:p-6 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#C8A66A] text-sm">{ord.orderNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F5F2EC] font-bold">{ord.customerName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#929292]" dir="ltr">
                    {ord.customerPhone}
                  </span>
                </div>
                <div className="text-[#929292]">
                  اقلام:{' '}
                  {ord.items
                    .map((i) => `${i.title} (×${toPersianDigits(i.quantity)})`)
                    .join(' ، ')}
                </div>
                {ord.customerAddress && (
                  <div className="text-[#929292]">
                    نشانی ارسال: {ord.customerCity} — {ord.customerAddress}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4">
                <div className="text-sm font-extrabold text-[#F5F2EC] tabular-nums">
                  {formatToman(ord.totalAmount)}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onToggleOrderStatus(ord.id);
                    showToast('وضعیت سفارش تغییر کرد');
                  }}
                  className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                    ord.status === 'completed'
                      ? 'bg-[#C8A66A]/15 border-[#C8A66A]/45 text-[#C8A66A]'
                      : 'bg-white/5 border-white/15 text-[#929292]'
                  }`}
                >
                  {ord.status === 'completed' ? 'وضعیت: تکمیل شده' : 'وضعیت: در حال پردازش'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. COACH PROFILE & BIO EDITOR */}
      {section === 'profile' && (
        <form
          onSubmit={handleSaveCoachProfile}
          className="max-w-2xl bg-[#1D1D1D] rounded-3xl p-6 sm:p-8 border border-white/[0.08] space-y-4"
        >
          <h2 className="text-base font-bold text-[#F5F2EC]">
            ویرایش برند شخصی، بیوگرافی و اطلاعات کارت هوشمند مربی
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1">نام مربی</label>
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">عنوان تخصصی</label>
              <input
                type="text"
                value={coachTitle}
                onChange={(e) => setCoachTitle(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">
              بیوگرافی و معرفی در صفحه اصلی
            </label>
            <textarea
              rows={4}
              value={coachBio}
              onChange={(e) => setCoachBio(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">
              تخصص‌ها (با ویرگول جدا کنید)
            </label>
            <input
              type="text"
              value={coachSpecialties}
              onChange={(e) => setCoachSpecialties(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#929292] mb-1">شماره تماس مستقیم</label>
              <input
                type="text"
                dir="ltr"
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
              />
            </div>

            <div>
              <label className="block text-xs text-[#929292] mb-1">آیدی اینستاگرام</label>
              <input
                type="text"
                dir="ltr"
                value={coachInstagram}
                onChange={(e) => setCoachInstagram(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">آدرس استودیو / باشگاه</label>
            <input
              type="text"
              value={coachLocation}
              onChange={(e) => setCoachLocation(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#929292] mb-1">
              لینک تصویر پرتره سفارشی مربی (اختیاری)
            </label>
            <input
              type="url"
              dir="ltr"
              value={coachCustomAvatar}
              onChange={(e) => setCoachCustomAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#101010] border border-white/10 text-xs text-[#F5F2EC] font-mono text-left"
            />
          </div>

          <button
            type="submit"
            className="min-h-[48px] px-6 py-3 rounded-xl bg-[#C8A66A] hover:bg-[#D6B77D] text-[#101010] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره و اعمال در پروفایل مربی</span>
          </button>
        </form>
      )}

      {/* 6.5 DEDICATED SEO & OPENGRAPH EDITOR */}
      {section === 'seo' && (
        <SeoOpenGraphEditor
          brandConfig={brandConfig}
          coach={coach}
          onUpdateBrandConfig={onUpdateBrandConfig}
          onShowToast={showToast}
        />
      )}

      {/* 7. WHITE-LABEL BRAND, SITE MODULES, REVISIONS & SECURITY */}
      {section === 'whitelabel' && (
        <WhiteLabelControlPanel
          brandConfig={brandConfig}
          siteModules={siteModules}
          revisions={revisions}
          consultations={consultations}
          discounts={discounts}
          gateways={gateways}
          auditLogs={auditLogs}
          onUpdateBrandConfig={onUpdateBrandConfig}
          onUpdateSiteModules={onUpdateSiteModules}
          onUpdateConsultations={onUpdateConsultations}
          onUpdateDiscounts={onUpdateDiscounts}
          onPublishRevision={onPublishRevision}
          onRestoreRevision={onRestoreRevision}
          onShowToast={showToast}
        />
      )}
    </div>
  );
};
