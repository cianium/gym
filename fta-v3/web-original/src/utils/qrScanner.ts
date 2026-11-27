import jsQR from 'jsqr';
import { CoachProfile, Product } from '../types';

export interface ParsedQrContact {
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  location?: string;
  note?: string;
  nfcSerialCode?: string;
  instagramHandle?: string;
  telegramHandle?: string;
  isCoachMatch: boolean;
}

export type QrScanResult =
  | {
      kind: 'program';
      raw: string;
      product: Product;
    }
  | {
      kind: 'contact';
      raw: string;
      contact: ParsedQrContact;
    }
  | {
      kind: 'external-url';
      raw: string;
      url: string;
    }
  | {
      kind: 'text';
      raw: string;
      text: string;
    };

export interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<Array<{ rawValue?: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeToken(value: string | undefined | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value: string | undefined | null): string {
  return (value || '').replace(/[\s\-().+]/g, '');
}

function findMatchingPublishedProduct(
  identifier: string | undefined | null,
  products: Product[]
): Product | undefined {
  const clean = normalizeToken(identifier);
  if (!clean) return undefined;

  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    decoded = clean;
  }

  return products.find((p) => {
    if (p.status !== 'published') return false;
    return (
      normalizeToken(p.id) === decoded ||
      normalizeToken(p.slug) === decoded ||
      normalizeToken(p.sku) === decoded
    );
  });
}

export function parseVCard(raw: string): Partial<ParsedQrContact> {
  const unfolded = raw.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);
  const result: Partial<ParsedQrContact> = {};

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const keyPart = line.slice(0, colonIdx).toUpperCase();
    const keyName = keyPart.split(';')[0];
    const value = line.slice(colonIdx + 1).trim();
    if (!value) continue;

    switch (keyName) {
      case 'FN':
        result.name = value;
        break;
      case 'N':
        if (!result.name) {
          result.name = value
            .split(';')
            .filter(Boolean)
            .reverse()
            .join(' ')
            .trim();
        }
        break;
      case 'TITLE':
      case 'ROLE':
        result.title = value;
        break;
      case 'TEL':
        if (!result.phone) result.phone = value;
        break;
      case 'EMAIL':
        if (!result.email) result.email = value;
        break;
      case 'ADR':
        if (!result.location) {
          result.location = value.split(';').filter(Boolean).join('، ').trim();
        }
        break;
      case 'NOTE':
        result.note = value;
        break;
      default:
        break;
    }
  }

  return result;
}

export function buildVCardString(contact: ParsedQrContact | CoachProfile): string {
  const isCoachProfile = 'englishName' in contact;
  const fullName = contact.name || (isCoachProfile ? contact.englishName : '') || 'مربی';
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${fullName}`];
  if (contact.title) lines.push(`TITLE:${contact.title}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL:${contact.email}`);
  if (contact.location) lines.push(`ADR;TYPE=WORK:;;${contact.location};;;;`);
  const note = isCoachProfile ? contact.tagline : contact.note;
  if (note) lines.push(`NOTE:${note}`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

function buildCoachContactResult(
  raw: string,
  coach: CoachProfile,
  overrides?: Partial<ParsedQrContact>
): QrScanResult {
  return {
    kind: 'contact',
    raw,
    contact: {
      name: overrides?.name || coach.name,
      title: overrides?.title || coach.title,
      phone: overrides?.phone || coach.phone,
      email: overrides?.email || coach.email,
      location: overrides?.location || coach.location,
      note: overrides?.note || coach.tagline,
      nfcSerialCode: overrides?.nfcSerialCode || coach.nfcSerialCode,
      instagramHandle: coach.instagramHandle,
      telegramHandle: coach.telegramHandle,
      isCoachMatch: true
    }
  };
}

function resolvePathAndParams(
  pathname: string,
  searchParams: URLSearchParams,
  hash: string,
  raw: string,
  products: Product[],
  coach: CoachProfile,
  isKnownAppHost: boolean
): QrScanResult | null {
  const cleanPath = pathname.replace(/\/+$/, '').toLowerCase();
  const cleanHash = hash.replace(/^#\/?/, '').toLowerCase();

  // 1. Query params for program / product
  const queryProductId =
    searchParams.get('program') ||
    searchParams.get('product') ||
    searchParams.get('productId') ||
    searchParams.get('plan');
  if (queryProductId) {
    const matched = findMatchingPublishedProduct(queryProductId, products);
    if (matched) {
      return { kind: 'program', raw, product: matched };
    }
  }

  // 2. Path or hash routes for /product/:id or /program/:id
  const pathSegments = cleanPath.split('/').filter(Boolean);
  if (
    (pathSegments[0] === 'product' || pathSegments[0] === 'program' || pathSegments[0] === 'programs') &&
    pathSegments[1]
  ) {
    const matched = findMatchingPublishedProduct(pathSegments[1], products);
    if (matched) {
      return { kind: 'program', raw, product: matched };
    }
  }

  const hashSegments = cleanHash.split('?')[0].split('/').filter(Boolean);
  if (
    (hashSegments[0] === 'product' || hashSegments[0] === 'program' || hashSegments[0] === 'programs') &&
    hashSegments[1]
  ) {
    const matched = findMatchingPublishedProduct(hashSegments[1], products);
    if (matched) {
      return { kind: 'program', raw, product: matched };
    }
  }

  // 3. Contact routes & query actions
  const routeParam = normalizeToken(searchParams.get('route') || searchParams.get('action'));
  if (
    cleanPath === '/contact' ||
    cleanPath.startsWith('/contact/') ||
    cleanHash === 'contact' ||
    routeParam === 'contact' ||
    routeParam === 'card' ||
    routeParam === 'nfc'
  ) {
    return buildCoachContactResult(raw, coach);
  }

  // 4. Known site root (e.g. SmartCardModal printed QR or NFC link pointing to the coach website)
  if (isKnownAppHost && (cleanPath === '' || cleanPath === '/')) {
    return buildCoachContactResult(raw, coach);
  }

  return null;
}

export function resolveQrPayload(
  rawText: string,
  products: Product[],
  coach: CoachProfile,
  currentOrigin?: string
): QrScanResult {
  const raw = rawText.trim();
  if (!raw) {
    return { kind: 'text', raw: '', text: '' };
  }

  // 1. vCard payload (BEGIN:VCARD)
  if (/BEGIN:VCARD/i.test(raw)) {
    const parsed = parseVCard(raw);
    const coachPhoneNorm = normalizePhone(coach.phone);
    const cardPhoneNorm = normalizePhone(parsed.phone);
    const isCoachMatch = Boolean(
      (coachPhoneNorm && cardPhoneNorm && cardPhoneNorm.endsWith(coachPhoneNorm.slice(-9))) ||
        (parsed.email && normalizeToken(parsed.email) === normalizeToken(coach.email)) ||
        (parsed.name && normalizeToken(parsed.name) === normalizeToken(coach.name))
    );

    if (isCoachMatch) {
      return buildCoachContactResult(raw, coach, parsed);
    }

    return {
      kind: 'contact',
      raw,
      contact: {
        ...parsed,
        isCoachMatch: false
      }
    };
  }

  // 2. Direct tel: or mailto: QR codes
  if (/^tel:/i.test(raw)) {
    const phone = raw.slice(4).trim();
    const isCoachMatch =
      Boolean(phone) &&
      normalizePhone(phone).endsWith(normalizePhone(coach.phone).slice(-9));
    if (isCoachMatch) {
      return buildCoachContactResult(raw, coach, { phone });
    }
    return {
      kind: 'contact',
      raw,
      contact: {
        name: coach.name,
        phone,
        isCoachMatch: false
      }
    };
  }

  if (/^mailto:/i.test(raw)) {
    const email = raw.slice(7).split('?')[0].trim();
    const isCoachMatch = normalizeToken(email) === normalizeToken(coach.email);
    if (isCoachMatch) {
      return buildCoachContactResult(raw, coach, { email });
    }
    return {
      kind: 'contact',
      raw,
      contact: {
        email,
        isCoachMatch: false
      }
    };
  }

  // 3. Coach NFC serial code or contact keyword/prefix
  const lowerRaw = raw.toLowerCase();
  if (
    (coach.nfcSerialCode && lowerRaw === coach.nfcSerialCode.toLowerCase()) ||
    lowerRaw === 'contact' ||
    lowerRaw === '/contact' ||
    lowerRaw === 'coach:contact' ||
    lowerRaw === 'arash://contact' ||
    lowerRaw.startsWith('contact:')
  ) {
    return buildCoachContactResult(raw, coach);
  }

  // 4. Custom program/product prefix or direct product ID/slug/SKU
  const customPrefixMatch = raw.match(/^(?:arash:\/\/)?(?:program|product|plan)[:/](.+)$/i);
  if (customPrefixMatch && customPrefixMatch[1]) {
    const matched = findMatchingPublishedProduct(customPrefixMatch[1], products);
    if (matched) {
      return { kind: 'program', raw, product: matched };
    }
  }

  const directProductMatch = findMatchingPublishedProduct(raw, products);
  if (directProductMatch) {
    return { kind: 'program', raw, product: directProductMatch };
  }

  // 5. Relative app path (/product/... or /contact or ?program=...)
  if (raw.startsWith('/') || raw.startsWith('?') || raw.startsWith('#')) {
    try {
      const dummyUrl = new URL(raw, 'https://local.app');
      const resolved = resolvePathAndParams(
        dummyUrl.pathname,
        dummyUrl.searchParams,
        dummyUrl.hash,
        raw,
        products,
        coach,
        true
      );
      if (resolved) return resolved;
    } catch {
      // Ignore malformed relative string
    }
  }

  // 6. Full HTTP / HTTPS URLs
  if (isSafeHttpUrl(raw)) {
    try {
      const parsed = new URL(raw);
      const originLower = (currentOrigin || '').toLowerCase();
      const hostLower = parsed.hostname.toLowerCase();
      const isKnownHost = Boolean(
        (originLower && parsed.origin.toLowerCase() === originLower) ||
          hostLower.includes('arashathletic') ||
          hostLower.includes('coach-domain') ||
          hostLower === 'localhost' ||
          hostLower === '127.0.0.1'
      );

      const resolved = resolvePathAndParams(
        parsed.pathname,
        parsed.searchParams,
        parsed.hash,
        raw,
        products,
        coach,
        isKnownHost
      );
      if (resolved) return resolved;

      return { kind: 'external-url', raw, url: parsed.toString() };
    } catch {
      // Fall through to plain text
    }
  }

  // 7. Plain text fallback (never execute unsafe schemes like javascript:)
  return { kind: 'text', raw, text: raw };
}

export function extractDeepLinkTargetFromLocation(
  pathname: string,
  search: string
): { route?: 'product-detail' | 'contact'; productIdentifier?: string } {
  const cleanPath = pathname.replace(/\/+$/, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const params = new URLSearchParams(search);

  const queryProd =
    params.get('program') || params.get('product') || params.get('productId');
  if (queryProd && queryProd.trim()) {
    return { route: 'product-detail', productIdentifier: queryProd.trim() };
  }

  if (
    (segments[0]?.toLowerCase() === 'product' || segments[0]?.toLowerCase() === 'program') &&
    segments[1]
  ) {
    try {
      return {
        route: 'product-detail',
        productIdentifier: decodeURIComponent(segments[1])
      };
    } catch {
      return { route: 'product-detail', productIdentifier: segments[1] };
    }
  }

  const action = (params.get('action') || params.get('route') || '').toLowerCase();
  if (cleanPath.toLowerCase() === '/contact' || action === 'contact') {
    return { route: 'contact' };
  }

  return {};
}

export function createQrBarcodeDetector(): BarcodeDetectorLike | null {
  if (typeof window === 'undefined' || !window.BarcodeDetector) return null;
  try {
    return new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });
  return code?.data?.trim() || null;
}

export async function decodeQrFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  detector: BarcodeDetectorLike | null
): Promise<string | null> {
  if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  if (detector) {
    try {
      const results = await detector.detect(video);
      const hit = results.find((item) => item.rawValue && item.rawValue.trim().length > 0);
      if (hit?.rawValue) {
        return hit.rawValue.trim();
      }
    } catch {
      // Fallback to jsQR canvas frame below
    }
  }

  // Scale large video frames down to max 640px wide for fast mobile CPU decoding
  const maxDim = 640;
  const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.round(video.videoWidth * scale));
  const height = Math.max(1, Math.round(video.videoHeight * scale));

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  return decodeQrFromImageData(imageData);
}

export async function decodeQrFromImageFile(
  file: File,
  detector: BarcodeDetectorLike | null
): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
      element.src = objectUrl;
    });

    const maxDim = 1200;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, width, height);

    if (detector) {
      try {
        const results = await detector.detect(canvas);
        const hit = results.find((item) => item.rawValue && item.rawValue.trim().length > 0);
        if (hit?.rawValue) {
          return hit.rawValue.trim();
        }
      } catch {
        // Fallback to jsQR
      }
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    return decodeQrFromImageData(imageData);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
