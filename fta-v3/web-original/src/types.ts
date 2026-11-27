export type AppRoute =
  | 'home'
  | 'shop'
  | 'explore'
  | 'account'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'payment-result'
  | 'order-detail'
  | 'contact'
  | 'admin'
  | 'install';

export type VisualPresetKey =
  | 'coach-portrait'
  | 'digital-hypertrophy'
  | 'physical-straps'
  | 'reel-deadlift'
  | 'reel-mobility'
  | 'reel-nutrition'
  | 'carousel-posture-1'
  | 'carousel-posture-2'
  | 'carousel-posture-3'
  | 'gold-plates';

export type SectionBlockType =
  | 'full-width-hero'
  | 'promotional-banner'
  | 'product-spotlight'
  | 'training-cover'
  | 'profile-cover'
  | 'cta-banner'
  | 'section-background';

export type SectionBgType = 'solid' | 'gradient' | 'image' | 'image-overlay';

export type SectionGradientPreset =
  | 'obsidian-gold'
  | 'charcoal-bronze'
  | 'deep-onyx'
  | 'crimson-slate'
  | 'emerald-night';

export type ImageDisplayMode = 'cover' | 'contain' | 'center' | 'top' | 'bottom';

export type SectionHeightMode = 'compact' | 'medium' | 'tall' | 'hero';

export interface SectionVisualConfig {
  id: string;
  pageTarget: 'home' | 'shop' | 'explore' | 'global';
  blockType: SectionBlockType;
  label: string;
  kicker?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaRoute?: AppRoute;
  enabled: boolean;
  order: number;
  bgType: SectionBgType;
  solidColor: string;
  gradientPreset: SectionGradientPreset;
  imagePreset: VisualPresetKey;
  customImageUrl?: string;
  imageDisplayMode: ImageDisplayMode;
  overlayOpacity: number; // 0 to 90
  heightMode: SectionHeightMode;
  isCustomBlock?: boolean;
}

export interface Certification {
  id: string;
  title: string;
  issuer: string;
  year: string;
  code: string;
}

export interface CoachProfile {
  name: string;
  englishName: string;
  title: string;
  tagline: string;
  bio: string;
  specialties: string[];
  experienceYears: number;
  activeAthletes: number;
  programsDelivered: number;
  location: string;
  phone: string;
  email: string;
  instagramHandle: string;
  telegramHandle: string;
  youtubeHandle: string;
  nfcSerialCode: string;
  visualPreset: VisualPresetKey;
  customAvatarUrl?: string;
  certifications: Certification[];
}

export interface TrainingModule {
  weekRange: string;
  title: string;
  focus: string;
  sessionsPerWeek: number;
  sampleExercises: string[];
}

export interface Product {
  id: string;
  slug?: string;
  type: 'digital' | 'physical';
  title: string;
  subtitle: string;
  price: number; // in Toman (base price or regular price)
  discountPrice?: number; // in Toman (discounted price if on sale)
  originalPrice?: number; // optional pre-discount price alias
  description: string;
  features: string[];
  visualPreset: VisualPresetKey;
  customImageUrl?: string;
  status: 'published' | 'draft' | 'archived';
  isArchived?: boolean;
  createdAt: string;
  // Digital training plan fields
  level?: string;
  duration?: string;
  fileFormat?: string;
  fileSize?: string;
  privateFilePath?: string;
  fileVersion?: number;
  modules?: TrainingModule[];
  // Physical fitness product fields
  stock?: number;
  reservedStock?: number;
  sku?: string;
  material?: string;
  shippingEstimate?: string;
  weightGrams?: number;
}

export interface PostComment {
  id: string;
  authorName: string;
  authorRole?: string;
  text: string;
  createdAt: string;
  isCoachReply?: boolean;
  approved?: boolean;
}

export interface ExploreMediaSlide {
  id: string;
  visualPreset: VisualPresetKey;
  customUrl?: string;
  slideTitle: string;
  slideNote: string;
}

export interface ExplorePost {
  id: string;
  mediaType: 'video' | 'image' | 'carousel';
  title: string;
  caption: string;
  tags: string[];
  visualPreset: VisualPresetKey;
  customMediaUrl?: string;
  slides?: ExploreMediaSlide[];
  likesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  viewsCount: number;
  durationSec?: number;
  bpmTempo?: number;
  linkedProductId?: string;
  createdAt: string;
  comments: PostComment[];
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItemSnapshot {
  productId: string;
  title: string;
  type: 'digital' | 'physical';
  price: number;
  quantity: number;
  visualPreset: VisualPresetKey;
  customImageUrl?: string;
  downloadToken?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode?: string;
  refId?: string | null;
  gateway?: PaymentGatewayId;
  createdAt: string;
  paidAt?: string | null;
  refundType?: 'manual' | 'gateway' | null;
  refundReference?: string | null;
  refundedAt?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  customerAddress?: string;
  customerPostalCode?: string;
  customerNotes?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discountAmount?: number;
  discountCode?: string;
  shippingCost: number;
  totalAmount: number;
  status: 'completed' | 'processing' | 'refunded' | string;
  fulfillmentStatus?:
    | 'pending'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'reconciliation_required'
    | 'refund_required';
  postalTrackingCode?: string;
}

export interface CustomerAccount {
  id?: string;
  name: string;
  phone: string;
  email: string;
  level: string;
  memberSince: string;
  isLoggedInDemo: boolean;
}

export interface ThemeColorsConfig {
  primaryColor: string;
  secondaryColor: string;
  bgColor?: string;
  surfaceColor?: string;
  fontFamily?: 'Vazirmatn' | 'IRANSansX' | 'YekanBakh';
  presetName?: string;
}

export type PaymentGatewayId = 'zarinpal' | 'sep' | string;

export type PaymentOrderStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'verification_pending'
  | 'reconciliation_required'
  | 'refunded';

export interface PaymentEventRecord {
  id: string;
  orderId: string;
  transactionId?: string;
  gateway: PaymentGatewayId;
  eventType: string;
  previousStatus?: string | null;
  nextStatus: string;
  authorityOrRef?: string | null;
  amountToman: number;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface CheckoutCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  notes?: string;
}

export interface CheckoutItemPayload {
  productId: string;
  qty: number;
}

export interface CheckoutRequestPayload {
  items: CheckoutItemPayload[];
  customer: CheckoutCustomerPayload;
  gateway: PaymentGatewayId;
  discountCode?: string;
  idempotencyKey?: string;
}

export interface CheckoutRedirectInstruction {
  method: 'GET' | 'POST';
  url: string;
  fields?: Record<string, string>;
}

export interface CheckoutResponsePayload {
  orderId: string;
  orderNumber?: string;
  trackingCode?: string;
  accessToken?: string;
  authority?: string;
  paymentUrl?: string;
  redirect: CheckoutRedirectInstruction;
  gatewayMode?: 'production' | 'sandbox-dev';
  subtotalToman?: number;
  discountAmountToman?: number;
  shippingCostToman?: number;
  totalAmountToman?: number;
  idempotentReplay?: boolean;
}

export interface PaymentOrderRecord {
  orderId: string;
  orderNumber: string;
  trackingCode: string;
  refId?: string | null;
  accessToken?: string;
  idempotencyKey?: string;
  status: PaymentOrderStatus;
  fulfillmentStatus?:
    | 'pending'
    | 'packed'
    | 'shipped'
    | 'delivered'
    | 'reconciliation_required'
    | 'refund_required';
  stockReserved?: boolean;
  discountReserved?: boolean;
  createdAtMs?: number;
  paidAt?: string | null;
  refundType?: 'manual' | 'gateway' | null;
  refundReference?: string | null;
  refundedAt?: string | null;
  gateway: PaymentGatewayId;
  gatewayMode?: 'production' | 'sandbox-dev';
  createdAt: string;
  customer: CheckoutCustomerPayload;
  items: {
    productId: string;
    title: string;
    type: 'digital' | 'physical';
    qty: number;
    unitPrice: number;
    visualPreset: VisualPresetKey;
    customImageUrl?: string;
    downloadToken?: string;
  }[];
  subtotal: number;
  discountAmount?: number;
  discountCode?: string;
  shippingCost: number;
  totalAmount: number;
}

/**
 * WHITE-LABEL BRAND & MODULE CONFIGURATION
 * Enables any fitness coach to customize brand identity, SEO, and active modules
 * without modifying source code.
 */
export interface SiteModulesConfig {
  digitalPrograms: boolean;
  physicalShop: boolean;
  exploreReels: boolean;
  coachingRequests: boolean;
  nfcSmartCard: boolean;
  commentsModeration: boolean;
  discounts: boolean;
}

export interface BrandConfig {
  brandName: string;
  brandSubtitle: string;
  logoUrl?: string;
  faviconUrl?: string;
  shareImageUrl?: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'profile' | 'article' | 'product';
  ogSiteName?: string;
  twitterCard?: 'summary_large_image' | 'summary';
  canonicalDomain: string;
  footerCopyright: string;
  primaryCtaText: string;
  primaryCtaRoute: AppRoute;
  supportHours: string;
  shippingFlatRateToman: number;
  freeShippingThresholdToman: number;
}

/**
 * VISUAL WEBSITE BUILDER — DRAFT / PREVIEW / PUBLISH REVISIONS
 */
export interface PageRevision {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'published';
  sectionsSnapshot: SectionVisualConfig[];
  themeSnapshot: ThemeColorsConfig;
}

/**
 * COACHING CONSULTATION & ASSESSMENT REQUESTS
 */
export interface ConsultationRequest {
  id: string;
  senderName: string;
  senderPhone: string;
  goalTopic: string;
  message: string;
  status: 'new' | 'contacted' | 'archived';
  coachNotes?: string;
  createdAt: string;
}

/**
 * COMMERCE DISCOUNT CODES
 */
export interface DiscountCode {
  id: string;
  code: string;
  percentOff: number;
  maxUses: number;
  usedCount: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number | null;
  expiresAt?: string | null;
  active: boolean;
  createdAt: string;
}

/**
 * PAYMENT GATEWAY STATUS & READINESS (Honesty & Security Contract)
 */
export interface PaymentGatewayStatusInfo {
  id: PaymentGatewayId;
  title: string;
  enabled: boolean;
  sandbox: boolean;
  merchantConfigured: boolean;
  readinessLabel: string;
  callbackUrl: string;
}

/**
 * AUDIT LOG ENTRY
 */
export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  ip: string;
  details: string;
  createdAt: string;
}
