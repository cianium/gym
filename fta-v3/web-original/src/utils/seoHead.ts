import { AppRoute, BrandConfig, CoachProfile, Product } from '../types';

export interface SeoHeadSyncOptions {
  coach?: CoachProfile;
  route?: AppRoute;
  product?: Product | null;
}

function upsertMetaTag(
  attrKey: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector(
    `meta[${attrKey}="${attrValue}"]`
  ) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrKey, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkTag(rel: string, href: string): void {
  if (typeof document === 'undefined' || !document.head || !href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLdScript(id: string, data: Record<string, unknown>): void {
  if (typeof document === 'undefined' || !document.head) return;
  let el = document.head.querySelector(`script#${id}`) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function resolveEffectiveSeoMetadata(
  brandConfig: BrandConfig,
  options?: SeoHeadSyncOptions
) {
  const brandName =
    brandConfig.brandName?.trim() || 'پلتفرم جامع مربی فیتنس | سیستم اختصاصی مربیگری';
  const seoTitle =
    brandConfig.seoTitle?.trim() ||
    brandName ||
    'پلتفرم جامع مربی فیتنس | سیستم اختصاصی مربیگری و برنامه تمرینی';
  const seoDescription =
    brandConfig.seoDescription?.trim() ||
    brandConfig.brandSubtitle?.trim() ||
    'پلتفرم مستقل برندینگ مربی ورزشی، فروشگاه برنامه تمرینی و تجهیزات ورزشی و کارت ویزیت هوشمند QR/NFC';

  const canonicalBase = (
    brandConfig.canonicalDomain?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://example.test')
  ).replace(/\/+$/, '');

  const ogTitle = brandConfig.ogTitle?.trim() || seoTitle;
  const ogDescription = brandConfig.ogDescription?.trim() || seoDescription;
  const ogSiteName = brandConfig.ogSiteName?.trim() || brandName;
  const ogType = brandConfig.ogType || 'website';
  const twitterCard = brandConfig.twitterCard || 'summary_large_image';

  const rawOgImage =
    brandConfig.ogImage?.trim() ||
    brandConfig.shareImageUrl?.trim() ||
    options?.coach?.customAvatarUrl?.trim() ||
    `${canonicalBase}/media/default-og-cover.jpg`;

  const ogImage =
    rawOgImage.startsWith('http://') || rawOgImage.startsWith('https://') || rawOgImage.startsWith('/')
      ? rawOgImage
      : `${canonicalBase}/${rawOgImage.replace(/^\/+/, '')}`;

  const routePath =
    typeof window !== 'undefined' && window.location.pathname
      ? window.location.pathname
      : '/';
  const canonicalUrl = `${canonicalBase}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;

  return {
    brandName,
    seoTitle,
    seoDescription,
    ogTitle,
    ogDescription,
    ogSiteName,
    ogType,
    ogImage,
    twitterCard,
    canonicalBase,
    canonicalUrl
  };
}

/**
 * Dynamically synchronizes the active document <head> with the global SEO title,
 * meta description, OpenGraph tags, Twitter Card tags, canonical link, and JSON-LD schema.
 */
export function syncDocumentHeadSeo(
  brandConfig: BrandConfig,
  options?: SeoHeadSyncOptions
): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveEffectiveSeoMetadata(brandConfig, options);

  // 1. Update Document Title
  document.title = resolved.seoTitle;

  // 2. Standard SEO Meta Description
  upsertMetaTag('name', 'description', resolved.seoDescription);

  // 3. OpenGraph Tags
  upsertMetaTag('property', 'og:title', resolved.ogTitle);
  upsertMetaTag('property', 'og:description', resolved.ogDescription);
  upsertMetaTag('property', 'og:type', resolved.ogType);
  upsertMetaTag('property', 'og:site_name', resolved.ogSiteName);
  upsertMetaTag('property', 'og:url', resolved.canonicalUrl);
  upsertMetaTag('property', 'og:image', resolved.ogImage);

  // 4. Twitter Card Tags
  upsertMetaTag('name', 'twitter:card', resolved.twitterCard);
  upsertMetaTag('name', 'twitter:title', resolved.ogTitle);
  upsertMetaTag('name', 'twitter:description', resolved.ogDescription);
  upsertMetaTag('name', 'twitter:image', resolved.ogImage);

  // 5. Canonical Link & Favicon
  upsertLinkTag('canonical', resolved.canonicalUrl);
  if (brandConfig.faviconUrl?.trim()) {
    upsertLinkTag('icon', brandConfig.faviconUrl.trim());
  }

  // 6. Schema.org JSON-LD Structured Data
  const schemaPayload: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: resolved.brandName,
    description: resolved.seoDescription,
    url: resolved.canonicalUrl,
    image: resolved.ogImage,
    ...(options?.coach?.name
      ? {
          founder: {
            '@type': 'Person',
            name: options.coach.name,
            jobTitle: options.coach.title || 'Coach'
          }
        }
      : {})
  };
  upsertJsonLdScript('wl-brand-schema-jsonld', schemaPayload);
}
