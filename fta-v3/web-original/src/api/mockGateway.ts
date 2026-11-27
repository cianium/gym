import {demoFetch} from "./demoFetch";
import {
  AuditLogEntry,
  BrandConfig,
  CheckoutRedirectInstruction,
  CheckoutRequestPayload,
  CheckoutResponsePayload,
  CoachProfile,
  ConsultationRequest,
  DiscountCode,
  ExplorePost,
  Order,
  PageRevision,
  PaymentGatewayId,
  PaymentGatewayStatusInfo,
  PaymentOrderRecord,
  PaymentOrderStatus,
  Product,
  SectionVisualConfig,
  SiteModulesConfig,
  ThemeColorsConfig
} from '../types';

/**
 * تغییر اتصال از لایه محلی به سرور دیگر فقط با تغییر این Base URL انجام می‌شود.
 * هیچ کلید، merchantId یا منطق محرمانه درگاه در فرانت‌اند قرار ندارد.
 */
export const API_BASE_URL: string = '';

export interface PaymentGatewayConfigItem {
  id: PaymentGatewayId;
  title: string;
  description: string;
  badge: string;
  redirectMethod: 'GET' | 'POST';
}

export const PAYMENT_GATEWAYS_CONFIG: PaymentGatewayConfigItem[] = [
  {
    id: 'zarinpal',
    title: 'پرداخت آنلاین با زرین‌پال',
    description:
      'پرداخت امن با تمامی کارت‌های عضو شبکه شتاب از طریق درگاه پرداخت اینترنتی زرین‌پال و فعال‌سازی آنی سفارش.',
    badge: 'پیش‌فرض · شتاب',
    redirectMethod: 'GET'
  },
  {
    id: 'sep',
    title: 'پرداخت آنلاین با درگاه سامان (سپ)',
    description:
      'پرداخت مستقیم بانکی از طریق شبکه الکترونیک پرداخت سامان (SEP) با پشتیبانی ۲۴ ساعته شاپرک.',
    badge: 'درگاه مستقیم بانکی',
    redirectMethod: 'POST'
  }
];

// Ephemeral in-memory token store (never persisted to localStorage)
let activeCsrfToken: string | null = null;
const orderAccessTokensMap: Record<string, string> = {};
let memoryMockOutcome: PaymentOrderStatus = 'pending';

export function getActiveCsrfToken(): string | null {
  return activeCsrfToken;
}

export function setActiveCsrfToken(token: string | null): void {
  activeCsrfToken = token;
}

export function registerOrderAccessToken(orderId: string, token?: string): void {
  if (orderId && token) {
    orderAccessTokensMap[orderId] = token;
  }
}

export function resolveOrderAccessToken(orderId: string): string {
  if (orderAccessTokensMap[orderId]) {
    return orderAccessTokensMap[orderId];
  }
  return '';
}

export function getMockGatewayOutcome(): PaymentOrderStatus {
  return memoryMockOutcome;
}

export function setMockGatewayOutcome(outcome: PaymentOrderStatus): void {
  memoryMockOutcome = outcome;
}

export function installMockGatewayFetchInterceptor(): void {
  // No-op: Global window.fetch monkey-patching is forbidden.
}

/**
 * کلاینت استاندارد فرانت‌اند برای ارسال درخواست تسویه‌حساب به سرور:
 * POST /api/checkout
 * هیچ‌گونه خرید نمایشی آفلاین در صورت قطع سرور ساخته نمی‌شود (Fail-Closed).
 */
export async function createCheckoutSession(
  payload: CheckoutRequestPayload
): Promise<CheckoutResponsePayload> {
  const idempotencyKey =
    payload.idempotencyKey?.trim() ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  const sanitizedPayload: CheckoutRequestPayload = {
    items: payload.items.map((item) => ({
      productId: item.productId,
      qty: item.qty
    })),
    customer: payload.customer,
    gateway: payload.gateway,
    discountCode: payload.discountCode,
    idempotencyKey
  };

  let response: Response;
  try {
    response = await demoFetch(`${API_BASE_URL}/api/v1/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      credentials: 'same-origin',
      body: JSON.stringify(sanitizedPayload)
    });
  } catch {
    throw new Error(
      'عدم دسترسی به سرور پرداخت. در حالت آفلاین امکان ثبت سفارش وجود ندارد. لطفاً اتصال اینترنت یا وضعیت سرور را بررسی کنید.'
    );
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'خطا در ایجاد تراکنش پرداخت در سرور.');
  }

  const rawData = (await response.json()) as Partial<CheckoutResponsePayload> & {
    orderId: string;
    paymentUrl?: string;
  };

  const fallbackUrl =
    rawData.paymentUrl || `/payment/result?orderId=${encodeURIComponent(rawData.orderId)}`;
  const normalizedRedirect: CheckoutRedirectInstruction =
    rawData.redirect && rawData.redirect.url
      ? {
          method: rawData.redirect.method === 'POST' ? 'POST' : 'GET',
          url: rawData.redirect.url,
          ...(rawData.redirect.fields ? { fields: rawData.redirect.fields } : {})
        }
      : {
          method: payload.gateway === 'sep' ? 'POST' : 'GET',
          url: fallbackUrl
        };

  const data: CheckoutResponsePayload = {
    ...rawData,
    orderId: rawData.orderId,
    paymentUrl: rawData.paymentUrl || normalizedRedirect.url,
    redirect: normalizedRedirect
  };

  if (data.orderId && data.accessToken) {
    registerOrderAccessToken(data.orderId, data.accessToken);
  }
  return data;
}

/**
 * دریافت وضعیت سفارش از سرور با ارسال توکن مالکیت سفارش در هدر X-Order-Token یا کوکی HttpOnly:
 * GET /api/orders/{orderId}
 * توکن مالکیت سفارش هرگز در آدرس URL قرار نمی‌گیرد.
 */
export async function fetchOrderStatus(
  orderId: string,
  explicitToken?: string
): Promise<PaymentOrderRecord> {
  const token = explicitToken || resolveOrderAccessToken(orderId);
  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  if (token) {
    headers['X-Order-Token'] = token;
  }

  let response: Response;
  try {
    response = await demoFetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers,
      credentials: 'same-origin'
    });
  } catch {
    throw new Error('ارتباط با سرور جهت استعلام وضعیت سفارش برقرار نشد.');
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'سفارش مورد نظر یافت نشد یا دسترسی مجاز نیست.');
  }

  const record = (await response.json()) as PaymentOrderRecord;
  if (record.accessToken) {
    registerOrderAccessToken(record.orderId, record.accessToken);
  }
  return record;
}

/**
 * تغییر وضعیت شبیه‌ساز درگاه (فقط در محیط توسعه و با ارسال توکن مالکیت سفارش)
 */
export async function updateMockOrderStatus(
  orderId: string,
  status: PaymentOrderStatus,
  explicitToken?: string
): Promise<PaymentOrderRecord> {
  memoryMockOutcome = status;
  const token = explicitToken || resolveOrderAccessToken(orderId);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['X-Order-Token'] = token;
  }

  let response: Response;
  try {
    response = await demoFetch(`${API_BASE_URL}/api/mock-gateway/callback`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ orderId, status, token })
    });
  } catch {
    throw new Error('خطا در ارتباط با سرور جهت شبیه‌سازی پاسخ بانک.');
  }

  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'تغییر وضعیت تراکنش توسط سرور رد شد.');
  }

  return (await response.json()) as PaymentOrderRecord;
}

export function executeGatewayRedirect(redirect: CheckoutRedirectInstruction): void {
  if (redirect.method === 'GET') {
    window.location.assign(redirect.url);
    return;
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = redirect.url;
  form.style.display = 'none';

  if (redirect.fields) {
    Object.entries(redirect.fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });
  }

  document.body.appendChild(form);

  const isInternalSpaRoute = redirect.url.startsWith('/') && !redirect.url.startsWith('//');

  if (isInternalSpaRoute) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.location.assign(redirect.url);
    });
    form.requestSubmit();
  } else {
    form.submit();
  }
}

// ============================================================================
// WHITE-LABEL BACKEND API CLIENT (/api/v1/*)
// ============================================================================

export interface BootstrapResponse {
  version: string;
  installedAt: string;
  installed?: boolean;
  brandConfig: BrandConfig;
  siteModules: SiteModulesConfig;
  coach: CoachProfile;
  themeColors: ThemeColorsConfig;
  sectionConfigs: SectionVisualConfig[];
  draftSectionConfigs?: SectionVisualConfig[];
  revisions?: PageRevision[];
  products: Product[];
  posts: ExplorePost[];
  orders?: Order[];
  consultations?: ConsultationRequest[];
  discounts?: DiscountCode[];
  auditLogs?: AuditLogEntry[];
  gateways?: PaymentGatewayStatusInfo[];
}

export async function fetchBootstrapFromServer(): Promise<BootstrapResponse | null> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/bootstrap`, {
      credentials: 'same-origin'
    });
    if (!res.ok) return null;
    return (await res.json()) as BootstrapResponse;
  } catch {
    return null;
  }
}

export async function syncStateToServer(
  payload: Partial<{
    coach: CoachProfile;
    brandConfig: BrandConfig;
    siteModules: SiteModulesConfig;
    themeColors: ThemeColorsConfig;
    sectionConfigs: SectionVisualConfig[];
    products: Product[];
    deletedProductIds: string[];
    posts: ExplorePost[];
    deletedPostIds: string[];
    deletedSectionIds: string[];
    orders: Order[];
    consultations: ConsultationRequest[];
    discounts: DiscountCode[];
  }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }

    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/state-sync`, {
      method: 'PUT',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        error: errBody.error || 'خطا در ذخیره‌سازی تغییرات در سرور (عدم احراز هویت یا خطای شبکه).'
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'عدم ارتباط با سرور: تغییرات در دیتابیس ذخیره نشد.'
    };
  }
}

export async function uploadMediaToServer(
  blob: Blob,
  originalName = 'upload.jpg'
): Promise<{ ok: boolean; url?: string; id?: string; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }

    const formData = new FormData();
    formData.append('file', blob, originalName);

    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/media`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: formData
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      media?: { id?: string; url?: string };
      error?: string;
    };

    if (!res.ok || !data.ok || !data.media?.url) {
      return {
        ok: false,
        error: data.error || 'خطا در بارگذاری فایل رسانه در سرور.'
      };
    }

    return {
      ok: true,
      url: data.media.url,
      id: data.media.id
    };
  } catch {
    return {
      ok: false,
      error: 'عدم ارتباط با سرور جهت بارگذاری تصویر.'
    };
  }
}

export async function deleteProductOnServer(
  productId: string
): Promise<{ ok: boolean; action?: 'deleted' | 'archived'; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(
      `${API_BASE_URL}/api/v1/admin/products/${encodeURIComponent(productId)}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'same-origin'
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      action?: 'deleted' | 'archived';
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'خطا در حذف یا آرشیو محصول.' };
    }
    return { ok: true, action: data.action };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور جهت حذف محصول.' };
  }
}

export interface AdminSessionStatus {
  authenticated: boolean;
  username: string | null;
  csrfToken: string | null;
  mustChangePassword?: boolean;
  setupRequired?: boolean;
}

export async function fetchAdminSession(): Promise<AdminSessionStatus> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/auth/session`, {
      credentials: 'same-origin'
    });
    if (!res.ok) {
      return { authenticated: false, username: null, csrfToken: null };
    }
    const status = (await res.json()) as AdminSessionStatus;
    if (status.csrfToken) {
      activeCsrfToken = status.csrfToken;
    }
    return status;
  } catch {
    return { authenticated: false, username: null, csrfToken: null };
  }
}

export async function loginAdminOnServer(
  username: string,
  password: string
): Promise<{
  authenticated: boolean;
  username?: string;
  csrfToken?: string;
  mustChangePassword?: boolean;
  setupRequired?: boolean;
  error?: string;
}> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });
    const data = (await res.json().catch(() => ({}))) as {
      authenticated?: boolean;
      username?: string;
      csrfToken?: string;
      mustChangePassword?: boolean;
      setupRequired?: boolean;
      error?: string;
    };
    if (!res.ok || !data.authenticated) {
      return {
        authenticated: false,
        setupRequired: data.setupRequired,
        error: data.error || 'نام کاربری یا رمز عبور مدیریت معتبر نیست.'
      };
    }
    if (data.csrfToken) {
      activeCsrfToken = data.csrfToken;
    }
    return {
      authenticated: true,
      username: data.username,
      csrfToken: data.csrfToken,
      mustChangePassword: data.mustChangePassword
    };
  } catch {
    return {
      authenticated: false,
      error: 'خطا در برقراری ارتباط با سرور احراز هویت.'
    };
  }
}

export async function logoutAdminOnServer(): Promise<void> {
  try {
    const headers: Record<string, string> = {};
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    await demoFetch(`${API_BASE_URL}/api/v1/auth/admin/logout`, {
      method: 'POST',
      headers,
      credentials: 'same-origin'
    });
    activeCsrfToken = null;
  } catch {}
}

export async function changeAdminPasswordOnServer(
  currentPassword: string,
  newPassword: string,
  newEmail?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/auth/admin/password`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ currentPassword, newPassword, newEmail })
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error || 'خطا در تغییر رمز عبور.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرور.' };
  }
}

export async function publishRevisionOnServer(
  label: string,
  sectionConfigs: SectionVisualConfig[],
  themeColors: ThemeColorsConfig
): Promise<{ ok: boolean; revision?: PageRevision; revisions?: PageRevision[]; error?: string }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/revisions/publish`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify({ label, sectionConfigs, themeColors })
    });
    const data = (await res.json().catch(() => ({}))) as {
      revision?: PageRevision;
      revisions?: PageRevision[];
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error || 'خطا در ثبت نسخه در سرور.' };
    }
    return { ok: true, revision: data.revision, revisions: data.revisions };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرور جهت ثبت نسخه.' };
  }
}

export async function resetAdminContentOnServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/reset`, {
      method: 'POST',
      headers,
      credentials: 'same-origin'
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'خطا در بازنشانی داده‌ها در سرور.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور جهت بازنشانی داده‌ها.' };
  }
}

// ============================================================================
// SECURE INSTALLER WIZARD API CLIENT (/api/v1/install/*)
// ============================================================================

export interface InstallerStatusPayload {
  installed: boolean;
  lockFileExists: boolean;
  version: string;
  installedAt: string | null;
  environment: string;
  requiredPhpVersion?: string;
  setupTokenRequired?: boolean;
  checks: {
    phpVersionOk?: boolean;
    storageOutsideWebRoot: boolean;
    storageWritable: boolean;
    privateDownloadsProtected: boolean;
    appKeyGenerated: boolean;
    adminProvisioned: boolean;
  };
}

export async function fetchInstallerStatus(): Promise<InstallerStatusPayload | null> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/install/status`, {
      credentials: 'same-origin'
    });
    if (!res.ok) return null;
    return (await res.json()) as InstallerStatusPayload;
  } catch {
    return null;
  }
}

export interface RunInstallerRequestPayload {
  brandName: string;
  brandSubtitle: string;
  canonicalDomain: string;
  coachName: string;
  adminUsername: string;
  adminEmail: string;
  adminPassword: string;
  setupToken?: string;
  dbHost?: string;
  dbPort?: string;
  dbName?: string;
  dbUser?: string;
  dbPass?: string;
}

export async function runSystemInstaller(
  payload: RunInstallerRequestPayload
): Promise<{
  ok: boolean;
  installed?: boolean;
  adminEmail?: string;
  brandName?: string;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (payload.setupToken) {
      headers['X-Installer-Token'] = payload.setupToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/install/run`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      installed?: boolean;
      adminEmail?: string;
      brandName?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'خطا در اجرای عملیات نصب در سرور.' };
    }
    return {
      ok: true,
      installed: data.installed,
      adminEmail: data.adminEmail,
      brandName: data.brandName
    };
  } catch {
    return { ok: false, error: 'عدم برقراری ارتباط با سرور نصب‌کننده.' };
  }
}

// ============================================================================
// CUSTOMER ORDER & ENTITLEMENT LOOKUP + REELS INTERACTIONS
// ============================================================================

export async function lookupCustomerOrderOnServer(payload: {
  orderId: string;
  accessToken: string;
  phone?: string;
}): Promise<{
  ok: boolean;
  order?: Order;
  paymentOrder?: PaymentOrderRecord;
  error?: string;
  code?: string;
}> {
  try {
    const cleanToken = payload.accessToken.trim();
    if (cleanToken && payload.orderId.trim()) {
      registerOrderAccessToken(payload.orderId.trim(), cleanToken);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cleanToken) {
      headers['X-Order-Token'] = cleanToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/customer/orders/lookup`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      order?: Order;
      paymentOrder?: PaymentOrderRecord;
      error?: string;
      code?: string;
    };
    if (!res.ok || !data.ok || !data.order) {
      return {
        ok: false,
        error: data.error || 'خطا در پیگیری سفارش یا عدم تطابق توکن مالکیت.',
        code: data.code
      };
    }
    if (cleanToken && data.order.id) {
      registerOrderAccessToken(data.order.id, cleanToken);
    }
    return { ok: true, order: data.order, paymentOrder: data.paymentOrder };
  } catch {
    return { ok: false, error: 'خطا در برقراری ارتباط با سرور جهت پیگیری سفارش.' };
  }
}

export async function likePostOnServer(
  postId: string,
  action: 'like' | 'unlike' = 'like'
): Promise<{ ok: boolean; likesCount?: number }> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/posts/${encodeURIComponent(postId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action })
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; likesCount?: number };
    return { ok: Boolean(res.ok && data.ok), likesCount: data.likesCount };
  } catch {
    return { ok: false };
  }
}

export async function submitPublicCommentOnServer(
  postId: string,
  authorName: string,
  text: string
): Promise<{
  ok: boolean;
  moderationRequired?: boolean;
  comment?: {
    id: string;
    authorName: string;
    text: string;
    createdAt: string;
    approved?: boolean;
  };
  message?: string;
  error?: string;
}> {
  try {
    const res = await demoFetch(
      `${API_BASE_URL}/api/v1/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ authorName, text })
      }
    );
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      moderationRequired?: boolean;
      comment?: {
        id: string;
        authorName: string;
        text: string;
        createdAt: string;
        approved?: boolean;
      };
      message?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'خطا در ارسال دیدگاه.' };
    }
    return {
      ok: true,
      moderationRequired: data.moderationRequired,
      comment: data.comment,
      message: data.message
    };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرور جهت ثبت دیدگاه.' };
  }
}

// ============================================================================
// SYSTEM VERSIONING, BACKUP, RESTORE & UPGRADE SNAPSHOTS (/api/v1/admin/*)
// ============================================================================

export interface SystemMaintenanceStatus {
  ok: boolean;
  releaseVersion: string;
  schemaVersion: string;
  installedVersion: string;
  compatible: boolean;
  counts: {
    products: number;
    posts: number;
    orders: number;
    entitlements: number;
    mediaFiles: number;
    revisions: number;
  };
  snapshots: Array<{
    filename: string;
    sizeBytes: number;
    createdAt: string;
  }>;
}

export async function fetchSystemMaintenanceStatus(): Promise<SystemMaintenanceStatus | null> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/system/status`, {
      credentials: 'same-origin'
    });
    if (!res.ok) return null;
    return (await res.json()) as SystemMaintenanceStatus;
  } catch {
    return null;
  }
}

export async function exportSystemBackup(): Promise<{
  ok: boolean;
  bundle?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/backup/export`, {
      credentials: 'same-origin'
    });
    if (!res.ok) {
      return { ok: false, error: 'خطا در دریافت فایل پشتیبان از سرور.' };
    }
    const bundle = (await res.json()) as Record<string, unknown>;
    return { ok: true, bundle };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور جهت تهیه نسخه پشتیبان.' };
  }
}

export async function createPreUpgradeSnapshot(): Promise<{
  ok: boolean;
  filename?: string;
  sha256?: string;
  sizeBytes?: number;
  error?: string;
}> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/backup/snapshot`, {
      method: 'POST',
      headers,
      credentials: 'same-origin'
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      filename?: string;
      sha256?: string;
      sizeBytes?: number;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'خطا در ایجاد اسنپ‌شات پیش از ارتقا.' };
    }
    return {
      ok: true,
      filename: data.filename,
      sha256: data.sha256,
      sizeBytes: data.sizeBytes
    };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور.' };
  }
}

export async function restoreSystemBackup(
  bundle: Record<string, unknown>
): Promise<{
  ok: boolean;
  restoredCounts?: {
    products: number;
    orders: number;
    entitlements: number;
    publicMediaFiles: number;
    privateDownloadFiles: number;
  };
  error?: string;
}> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(`${API_BASE_URL}/api/v1/admin/backup/restore`, {
      method: 'POST',
      headers,
      credentials: 'same-origin',
      body: JSON.stringify(bundle)
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      restoredCounts?: {
        products: number;
        orders: number;
        entitlements: number;
        publicMediaFiles: number;
        privateDownloadFiles: number;
      };
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'خطا در بازیابی فایل پشتیبان در سرور.' };
    }
    return { ok: true, restoredCounts: data.restoredCounts };
  } catch {
    return { ok: false, error: 'خطا در ارتباط با سرور جهت بازیابی پشتیبان.' };
  }
}

export async function moderatePostCommentOnServer(
  postId: string,
  commentId: string,
  approved: boolean,
  text?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(
      `${API_BASE_URL}/api/v1/admin/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'PATCH',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ approved, ...(text !== undefined ? { text } : {}) })
      }
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'خطا در تغییر وضعیت دیدگاه در سرور.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور.' };
  }
}

export async function deletePostCommentOnServer(
  postId: string,
  commentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (activeCsrfToken) {
      headers['X-CSRF-Token'] = activeCsrfToken;
    }
    const res = await demoFetch(
      `${API_BASE_URL}/api/v1/admin/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'same-origin'
      }
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'خطا در حذف دیدگاه در سرور.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'عدم ارتباط با سرور.' };
  }
}


