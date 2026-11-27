import React, { useCallback, useEffect, useState } from 'react';
import {
  AppRoute,
  AuditLogEntry,
  BrandConfig,
  CartItem,
  CoachProfile,
  ConsultationRequest,
  CustomerAccount,
  DiscountCode,
  ExplorePost,
  Order,
  PageRevision,
  PaymentGatewayStatusInfo,
  PaymentOrderRecord,
  Product,
  SectionVisualConfig,
  SiteModulesConfig,
  ThemeColorsConfig
} from './types';
import {
  INITIAL_BRAND_CONFIG,
  INITIAL_COACH_PROFILE,
  INITIAL_CONSULTATIONS,
  INITIAL_CUSTOMER,
  INITIAL_DISCOUNTS,
  INITIAL_EXPLORE_POSTS,
  INITIAL_PRODUCTS,
  INITIAL_SECTION_CONFIGS,
  INITIAL_SITE_MODULES
} from './data/initialData';
import { BottomTabBar, TopHeader } from './components/Navigation';
import { SmartCardModal } from './components/SmartCardModal';
import { CustomizableSection } from './components/CustomizableSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import {
  CartView,
  CheckoutView,
  OrderDetailView,
  ProductDetailView,
  ShopView
} from './views/ShopView';
import { PaymentResultView } from './views/PaymentResultView';
import { AccountView, ContactView } from './views/AccountView';
import { InstallWizardView } from './views/InstallWizardView';
import { AdminPortal } from './admin/AdminPortal';
import {
  deletePostCommentOnServer,
  deleteProductOnServer,
  fetchBootstrapFromServer,
  likePostOnServer,
  publishRevisionOnServer,
  resetAdminContentOnServer,
  submitPublicCommentOnServer,
  syncStateToServer
} from './api/mockGateway';
import { syncDocumentHeadSeo } from './utils/seoHead';

function checkIsAdminPath(): boolean {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    hash === '#/admin' ||
    hash.startsWith('#/admin/') ||
    searchParams.get('route') === 'admin'
  );
}

function getInitialRouteFromUrl(): AppRoute {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.toLowerCase();
  if (pathname === '/install' || pathname.startsWith('/install/')) return 'install';
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname === '/payment/result' || pathname.startsWith('/payment/result/')) {
    return 'payment-result';
  }
  if (pathname === '/shop' || pathname.startsWith('/shop/')) return 'shop';
  if (pathname.startsWith('/product/')) return 'product-detail';
  if (pathname === '/explore' || pathname.startsWith('/explore/')) return 'explore';
  if (pathname === '/cart') return 'cart';
  if (pathname === '/checkout') return 'checkout';
  if (pathname === '/account' || pathname === '/profile') return 'account';
  if (pathname === '/contact') return 'contact';
  return 'home';
}

function getRoutePath(route: AppRoute, productId?: string): string {
  switch (route) {
    case 'install':
      return '/install';
    case 'admin':
      return '/admin';
    case 'shop':
      return '/shop';
    case 'product-detail':
      return productId ? `/product/${encodeURIComponent(productId)}` : '/shop';
    case 'explore':
      return '/explore';
    case 'cart':
      return '/cart';
    case 'checkout':
      return '/checkout';
    case 'account':
      return '/account';
    case 'contact':
      return '/contact';
    case 'payment-result':
      return '/payment/result';
    case 'home':
    default:
      return '/';
  }
}

function getPaymentResultOrderIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = searchParams.get('orderId');
  if (
    pathname === '/payment/result' ||
    pathname.startsWith('/payment/result/') ||
    (orderId && orderId.trim().length > 0)
  ) {
    return orderId ? orderId.trim() : '';
  }
  return null;
}

// Security Policy: Commercial and administrative data MUST NOT be stored in localStorage.
// Legacy keys are purged on startup.
const LEGACY_COMMERCIAL_STORAGE_KEYS = [
  'arash_lux_coach_v1',
  'arash_lux_brand_v1',
  'arash_lux_modules_v1',
  'arash_lux_products_v1',
  'arash_lux_posts_v1',
  'arash_lux_orders_v1',
  'arash_lux_customer_v1',
  'arash_lux_sections_v1',
  'arash_lux_theme_v1',
  'arash_lux_cart_v1'
];

const DEFAULT_THEME_COLORS: ThemeColorsConfig = {
  primaryColor: '#C8A66A',
  secondaryColor: '#D6B77D',
  presetName: 'طلایی کلاسیک (Classic Gold)'
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminPath());
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(() =>
    getPaymentResultOrderIdFromUrl()
  );
  const [checkoutInitialStep, setCheckoutInitialStep] = useState<1 | 2 | 3>(1);
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>(() => {
    const initial = getInitialRouteFromUrl();
    return initial === 'home' ? ['home'] : ['home', initial];
  });
  const currentRoute = routeHistory[routeHistory.length - 1] || 'home';

  const isProdBuild = false; // isolated, synthetic source preview; never production

  // Authoritative Server-Backed State (zero localStorage persistence for business data)
  const [brandConfig, setBrandConfig] = useState<BrandConfig>(INITIAL_BRAND_CONFIG);
  const [siteModules, setSiteModules] = useState<SiteModulesConfig>(INITIAL_SITE_MODULES);
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRequest[]>(
    isProdBuild ? [] : INITIAL_CONSULTATIONS
  );
  const [discounts, setDiscounts] = useState<DiscountCode[]>(
    isProdBuild ? [] : INITIAL_DISCOUNTS
  );
  const [gateways, setGateways] = useState<PaymentGatewayStatusInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [coach, setCoach] = useState<CoachProfile>(INITIAL_COACH_PROFILE);
  const [products, setProducts] = useState<Product[]>(isProdBuild ? [] : INITIAL_PRODUCTS);
  const [posts, setPosts] = useState<ExplorePost[]>(isProdBuild ? [] : INITIAL_EXPLORE_POSTS);
  const [cart, setCart] = useState<CartItem[]>(
    isProdBuild ? [] : [{ productId: 'prod-digital-hypertrophy', quantity: 1 }]
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [customer, setCustomer] = useState<CustomerAccount>(
    isProdBuild
      ? {
          name: '',
          phone: '',
          email: '',
          level: '',
          memberSince: '',
          isLoggedInDemo: false
        }
      : INITIAL_CUSTOMER
  );
  const [sectionConfigs, setSectionConfigs] = useState<SectionVisualConfig[]>(
    INITIAL_SECTION_CONFIGS
  );
  const [themeColors, setThemeColors] = useState<ThemeColorsConfig>(DEFAULT_THEME_COLORS);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    (() => {try {const p=window.location.pathname.match(/^\/product\/([^/]+)$/);return p?decodeURIComponent(p[1]):INITIAL_PRODUCTS[0].id;}catch{return INITIAL_PRODUCTS[0].id;}})
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedExplorePostId, setSelectedExplorePostId] = useState<string | null>(null);
  const [, setRecentlyAddedId] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Purge any legacy commercial data from localStorage on startup
  useEffect(() => {
    try {
      LEGACY_COMMERCIAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {}
  }, []);

  const refreshBootstrapData = useCallback(async () => {
    const data = await fetchBootstrapFromServer();
    if (!data) return;
    if (data.brandConfig) setBrandConfig(data.brandConfig);
    if (data.siteModules) setSiteModules(data.siteModules);
    if (data.coach) setCoach(data.coach);
    if (data.themeColors) setThemeColors(data.themeColors);
    if (Array.isArray(data.sectionConfigs) && data.sectionConfigs.length > 0) {
      setSectionConfigs(data.sectionConfigs);
    }
    if (Array.isArray(data.products)) {
      setProducts(data.products);
      if (data.products.length > 0) {
        setSelectedProductId((prev) =>
          data.products.some((p) => p.id === prev) ? prev : data.products[0].id
        );
      }
    }
    if (Array.isArray(data.posts)) {
      setPosts(data.posts);
    }
    if (Array.isArray(data.orders)) {
      setOrders(data.orders);
      if (data.orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(data.orders[0].id);
      }
    }
    if (Array.isArray(data.revisions)) setRevisions(data.revisions);
    if (Array.isArray(data.consultations)) setConsultations(data.consultations);
    if (Array.isArray(data.discounts)) setDiscounts(data.discounts);
    if (Array.isArray(data.gateways)) setGateways(data.gateways);
    if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
    if (isProdBuild && data.installed === false) {
      setRouteHistory((prev) =>
        prev[prev.length - 1] === 'install' ? prev : [...prev, 'install']
      );
    }
  }, [selectedOrderId, isProdBuild]);

  // Hydrate state from persistent backend database (/api/v1/bootstrap)
  useEffect(() => {
    refreshBootstrapData();
  }, [refreshBootstrapData]);

  // Dynamic White-Label SEO & OpenGraph Synchronization
  useEffect(() => {
    syncDocumentHeadSeo(brandConfig, {
      coach,
      route: currentRoute
    });
  }, [brandConfig, coach, currentRoute]);

  // Apply CSS Variables for Theme Tokens
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--accent-gold', themeColors.primaryColor);
      root.style.setProperty('--accent-primary', themeColors.primaryColor);
      root.style.setProperty('--accent-secondary', themeColors.secondaryColor);
      root.style.setProperty('--accent-gold-hover', themeColors.secondaryColor);
      root.style.setProperty(
        '--border-gold',
        `color-mix(in srgb, ${themeColors.primaryColor} 28%, transparent)`
      );
    }
  }, [themeColors]);

  useEffect(() => {
    const syncUrlState = () => {
      setIsAdminRoute(checkIsAdminPath());
      const urlOrderId = getPaymentResultOrderIdFromUrl();
      if (urlOrderId !== null) {
        setPaymentOrderId(urlOrderId);
        setRouteHistory((prev) =>
          prev[prev.length - 1] === 'payment-result' ? prev : [...prev, 'payment-result']
        );
        return;
      }
      const nextFromUrl = getInitialRouteFromUrl();
      setRouteHistory((prev) =>
        prev[prev.length - 1] === nextFromUrl ? prev : [...prev, nextFromUrl]
      );
    };
    window.addEventListener('popstate', syncUrlState);
    window.addEventListener('hashchange', syncUrlState);
    return () => {
      window.removeEventListener('popstate', syncUrlState);
      window.removeEventListener('hashchange', syncUrlState);
    };
  }, []);

  const navigateTo = (nextRoute: AppRoute, targetProductId?: string) => {
    if (nextRoute === 'admin') {
      try {
        window.history.pushState({}, '', '/admin');
      } catch {}
      setIsAdminRoute(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (nextRoute === 'checkout') {
      setCheckoutInitialStep(1);
    }

    try {
      const nextPath = getRoutePath(nextRoute, targetProductId || selectedProductId);
      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath);
      }
    } catch {}

    if (isAdminRoute) {
      setIsAdminRoute(false);
    }

    setRouteHistory((prev) => {
      if (prev[prev.length - 1] === nextRoute) return prev;
      return [...prev, nextRoute];
    });
    if (nextRoute !== 'explore') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setRouteHistory((prev) => {
      if (prev.length <= 1) return ['home'];
      const nextHist = prev.slice(0, -1);
      const target = nextHist[nextHist.length - 1] || 'home';
      try {
        window.history.pushState({}, '', getRoutePath(target, selectedProductId));
      } catch {}
      return nextHist;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart Handlers
  const handleAddToCart = (productId: string, quantity = 1) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        const nextQty =
          targetProduct.type === 'digital' ? 1 : existing.quantity + quantity;
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { productId, quantity }];
    });

    setRecentlyAddedId(productId);
    setTimeout(() => setRecentlyAddedId(null), 1800);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleOrderPaidSuccess = (paidRecord: PaymentOrderRecord) => {
    setOrders((prev) => {
      if (prev.some((o) => o.id === paidRecord.orderId)) {
        return prev;
      }
      const mappedOrder: Order = {
        id: paidRecord.orderId,
        orderNumber: paidRecord.orderNumber,
        trackingCode: paidRecord.trackingCode,
        gateway: paidRecord.gateway,
        createdAt: paidRecord.createdAt,
        customerName: paidRecord.customer.name,
        customerPhone: paidRecord.customer.phone,
        customerCity: paidRecord.customer.city,
        customerAddress: paidRecord.customer.address,
        customerPostalCode: paidRecord.customer.postalCode,
        items: paidRecord.items.map((item) => {
          const matchedProd = products.find((p) => p.id === item.productId);
          return {
            productId: item.productId,
            title: item.title,
            type: item.type,
            price: item.unitPrice,
            quantity: item.qty,
            visualPreset: matchedProd?.visualPreset || 'gold-plates',
            customImageUrl: matchedProd?.customImageUrl,
            downloadToken: item.downloadToken
          };
        }),
        subtotal: paidRecord.subtotal,
        discountAmount: paidRecord.discountAmount,
        discountCode: paidRecord.discountCode,
        shippingCost: paidRecord.shippingCost,
        totalAmount: paidRecord.totalAmount,
        status: 'completed'
      };
      return [mappedOrder, ...prev];
    });

    setProducts((prev) =>
      prev.map((p) => {
        const bought = paidRecord.items.find((i) => i.productId === p.id);
        if (bought && p.type === 'physical' && typeof p.stock === 'number') {
          return { ...p, stock: Math.max(0, p.stock - bought.qty) };
        }
        return p;
      })
    );

    setCustomer((prev) => ({
      ...prev,
      name: paidRecord.customer.name || prev.name || 'ورزشکار',
      phone: paidRecord.customer.phone || prev.phone,
      email: paidRecord.customer.email || prev.email,
      isLoggedInDemo: true
    }));

    setCart([]);
    setSelectedOrderId(paidRecord.orderId);
  };

  // Explore Reels Interactions (Server-Backed)
  const handleToggleLike = (postId: string) => {
    const currentPost = posts.find((p) => p.id === postId);
    const nextLiked = currentPost ? !currentPost.isLiked : true;
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          isLiked: nextLiked,
          likesCount: Math.max(0, post.likesCount + (nextLiked ? 1 : -1))
        };
      })
    );
    void likePostOnServer(postId, nextLiked ? 'like' : 'unlike');
  };

  const handleToggleSave = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, isSaved: !post.isSaved } : post
      )
    );
  };

  const handleAddComment = async (postId: string, authorName: string, text: string) => {
    const res = await submitPublicCommentOnServer(postId, authorName, text);
    if (res.ok && res.comment && !res.moderationRequired) {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: [...post.comments, res.comment!]
          };
        })
      );
    }
  };

  // Authenticated Coach Admin Handlers (Server-Authoritative Persistence)
  const handleAdminUpdateCoach = async (nextCoach: CoachProfile) => {
    const res = await syncStateToServer({ coach: nextCoach });
    if (res.ok) {
      setCoach(nextCoach);
    }
  };

  const handleAdminUpdateBrandConfig = async (nextBrand: BrandConfig) => {
    const res = await syncStateToServer({ brandConfig: nextBrand });
    if (res.ok) {
      setBrandConfig(nextBrand);
    }
  };

  const handleAdminUpdateSiteModules = async (nextModules: SiteModulesConfig) => {
    const res = await syncStateToServer({ siteModules: nextModules });
    if (res.ok) {
      setSiteModules(nextModules);
    }
  };

  const handleAdminUpdateThemeColors = async (nextTheme: ThemeColorsConfig) => {
    setThemeColors(nextTheme);
    await syncStateToServer({ themeColors: nextTheme });
  };

  const handleAdminUpdateSectionConfigs = async (nextSections: SectionVisualConfig[]) => {
    setSectionConfigs(nextSections);
    await syncStateToServer({ sectionConfigs: nextSections });
  };

  const handleSaveProduct = async (product: Product) => {
    const exists = products.some((p) => p.id === product.id);
    const nextProducts = exists
      ? products.map((p) => (p.id === product.id ? product : p))
      : [product, ...products];
    const res = await syncStateToServer({ products: [product] });
    if (res.ok) {
      setProducts(nextProducts);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    const nextProducts = products.filter((p) => p.id !== productId);
    const delRes = await deleteProductOnServer(productId);
    if (delRes.ok) {
      setProducts(nextProducts);
      setCart((prev) => prev.filter((c) => c.productId !== productId));
      return;
    }
    const res = await syncStateToServer({ deletedProductIds: [productId] });
    if (res.ok) {
      setProducts(nextProducts);
      setCart((prev) => prev.filter((c) => c.productId !== productId));
    }
  };

  const handleSavePost = async (post: ExplorePost) => {
    const exists = posts.some((p) => p.id === post.id);
    const nextPosts = exists
      ? posts.map((p) => (p.id === post.id ? post : p))
      : [post, ...posts];
    const res = await syncStateToServer({ posts: [post] });
    if (res.ok) {
      setPosts(nextPosts);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const nextPosts = posts.filter((p) => p.id !== postId);
    const res = await syncStateToServer({ deletedPostIds: [postId] });
    if (res.ok) {
      setPosts(nextPosts);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const res = await deletePostCommentOnServer(postId, commentId);
    if (res.ok) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
            : p
        )
      );
    }
  };

  const handleAddCoachReply = async (postId: string, replyText: string) => {
    const nextPosts = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            comments: [
              ...p.comments,
              {
                id: `reply-${Date.now()}`,
                authorName: coach.name,
                authorRole: 'مربی رسمی',
                text: replyText,
                createdAt: 'هم‌اکنون',
                isCoachReply: true
              }
            ]
          }
        : p
    );
    const res = await syncStateToServer({ posts: nextPosts });
    if (res.ok) {
      setPosts(nextPosts);
    }
  };

  const handleToggleOrderStatus = async (orderId: string) => {
    const nextOrders: Order[] = orders.map((o) =>
      o.id === orderId
        ? { ...o, status: o.status === 'completed' ? 'processing' : 'completed' }
        : o
    );
    const res = await syncStateToServer({ orders: nextOrders });
    if (res.ok) {
      setOrders(nextOrders);
    }
  };

  const handlePublishRevision = async (label: string) => {
    const res = await publishRevisionOnServer(label, sectionConfigs, themeColors);
    if (res.ok && res.revisions) {
      setRevisions(res.revisions);
    }
  };

  const handleRestoreRevision = async (rev: PageRevision) => {
    setSectionConfigs(rev.sectionsSnapshot);
    setThemeColors(rev.themeSnapshot);
    await syncStateToServer({
      sectionConfigs: rev.sectionsSnapshot,
      themeColors: rev.themeSnapshot
    });
  };

  const handleResetDemoData = async () => {
    const res = await resetAdminContentOnServer();
    if (res.ok) {
      await refreshBootstrapData();
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct =
    products.find((p) => p.id === selectedProductId) || products[0];
  const activeOrder =
    orders.find((o) => o.id === selectedOrderId) || orders[0];
  const isPurchasedDigital = orders.some((o) =>
    o.items.some((i) => i.productId === activeProduct?.id)
  );

  const shopHeaderConfig = sectionConfigs.find((s) => s.id === 'shop-header');
  const exploreBannerConfig = sectionConfigs.find((s) => s.id === 'explore-banner');
  const footerBgConfig = sectionConfigs.find((s) => s.id === 'footer-bg');

  const showGlobalFooter =
    currentRoute !== 'explore' &&
    currentRoute !== 'checkout' &&
    currentRoute !== 'install' &&
    Boolean(footerBgConfig && footerBgConfig.enabled);

  if (currentRoute === 'install') {
    return (
      <ErrorBoundary>
        <InstallWizardView
          onInstallCompleted={() => {
            refreshBootstrapData();
          }}
          onGoToAdminLogin={() => navigateTo('admin')}
        />
      </ErrorBoundary>
    );
  }

  // Independent /admin portal wrapped in AdminLayout with isolated workspace
  if (isAdminRoute || currentRoute === 'admin') {
    return (
      <ErrorBoundary>
        <AdminPortal
          coach={coach}
          brandConfig={brandConfig}
          siteModules={siteModules}
          revisions={revisions}
          consultations={consultations}
          discounts={discounts}
          gateways={gateways}
          auditLogs={auditLogs}
          products={products}
          posts={posts}
          orders={orders}
          sectionConfigs={sectionConfigs}
          themeColors={themeColors}
          onUpdateThemeColors={handleAdminUpdateThemeColors}
          onUpdateCoach={handleAdminUpdateCoach}
          onUpdateBrandConfig={handleAdminUpdateBrandConfig}
          onUpdateSiteModules={handleAdminUpdateSiteModules}
          onUpdateConsultations={async (items) => {
            const res = await syncStateToServer({ consultations: items });
            if (res.ok) setConsultations(items);
          }}
          onUpdateDiscounts={async (items) => {
            const res = await syncStateToServer({ discounts: items });
            if (res.ok) setDiscounts(items);
          }}
          onPublishRevision={handlePublishRevision}
          onRestoreRevision={handleRestoreRevision}
          onUpdateSectionConfigs={handleAdminUpdateSectionConfigs}
          onResetSectionConfigs={() => handleAdminUpdateSectionConfigs(INITIAL_SECTION_CONFIGS)}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          onSavePost={handleSavePost}
          onDeletePost={handleDeletePost}
          onDeleteComment={handleDeleteComment}
          onAddCoachReply={handleAddCoachReply}
          onToggleOrderStatus={handleToggleOrderStatus}
          onResetDemoData={handleResetDemoData}
          onAdminAuthenticated={refreshBootstrapData}
          onOpenInstaller={() => navigateTo('install')}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-[100dvh] bg-[#101010] text-[#F5F2EC] flex flex-col">
        <TopHeader
          currentRoute={currentRoute}
          cartCount={totalCartCount}
          coachName={coach.name}
          onNavigate={navigateTo}
          onBack={handleBack}
          onOpenQrCard={() => setIsQrModalOpen(true)}
        />

        <main className="flex-1">
          {currentRoute === 'home' && (
            <HomeView
              coach={coach}
              products={products}
              posts={posts}
              cart={cart}
              sectionConfigs={sectionConfigs}
              onNavigate={navigateTo}
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                navigateTo('product-detail', productId);
              }}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onOpenExplorePost={(postId) => {
                setSelectedExplorePostId(postId);
                navigateTo('explore');
              }}
              onOpenQrCard={() => setIsQrModalOpen(true)}
            />
          )}

          {currentRoute === 'shop' && (
            <ShopView
              products={products}
              cart={cart}
              headerConfig={shopHeaderConfig}
              sectionConfigs={sectionConfigs}
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                navigateTo('product-detail', productId);
              }}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onNavigate={navigateTo}
            />
          )}

          {currentRoute === 'product-detail' && activeProduct && (
            <ProductDetailView
              product={activeProduct}
              cart={cart}
              isPurchasedDigital={isPurchasedDigital}
              onAddToCart={handleAddToCart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onNavigate={navigateTo}
            />
          )}

          {currentRoute === 'cart' && (
            <CartView
              cart={cart}
              products={products}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveFromCart}
              onNavigate={navigateTo}
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                navigateTo('product-detail', productId);
              }}
            />
          )}

          {currentRoute === 'checkout' && (
            <CheckoutView
              cart={cart}
              products={products}
              defaultName={customer.name}
              defaultPhone={customer.phone}
              initialStep={checkoutInitialStep}
              onBackToCart={() => navigateTo('cart')}
              onNavigateToPaymentResult={(orderId) => {
                setPaymentOrderId(orderId);
                setRouteHistory((prev) => [...prev, 'payment-result']);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentRoute === 'payment-result' && (
            <PaymentResultView
              orderId={paymentOrderId}
              onNavigate={navigateTo}
              onRetryPaymentStep2={() => {
                try {
                  window.history.pushState({}, '', '/checkout');
                } catch {}
                setCheckoutInitialStep(2);
                setRouteHistory((prev) => [...prev, 'checkout']);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOrderPaidSuccess={handleOrderPaidSuccess}
            />
          )}

          {currentRoute === 'order-detail' && activeOrder && (
            <OrderDetailView
              order={activeOrder}
              products={products}
              onNavigate={navigateTo}
            />
          )}

          {currentRoute === 'explore' && (
            <ExploreView
              posts={posts}
              products={products}
              coach={coach}
              bannerConfig={exploreBannerConfig}
              initialPostId={selectedExplorePostId}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onAddComment={handleAddComment}
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                navigateTo('product-detail', productId);
              }}
            />
          )}

          {currentRoute === 'account' && (
            <AccountView
              customer={customer}
              orders={orders}
              products={products}
              savedPosts={posts.filter((p) => p.isSaved)}
              onUpdateCustomer={setCustomer}
              onOrderVerified={(verifiedOrder) => {
                setOrders((prev) => {
                  const exists = prev.some((o) => o.id === verifiedOrder.id);
                  return exists
                    ? prev.map((o) => (o.id === verifiedOrder.id ? verifiedOrder : o))
                    : [verifiedOrder, ...prev];
                });
                setSelectedOrderId(verifiedOrder.id);
              }}
              onSelectOrder={(orderId) => {
                setSelectedOrderId(orderId);
                navigateTo('order-detail');
              }}
              onSelectProduct={(productId) => {
                setSelectedProductId(productId);
                navigateTo('product-detail', productId);
              }}
              onOpenExplorePost={(postId) => {
                setSelectedExplorePostId(postId);
                navigateTo('explore');
              }}
              onNavigate={navigateTo}
            />
          )}

          {currentRoute === 'contact' && (
            <ContactView
              coach={coach}
              onConsultationSubmitted={(created) =>
                setConsultations((prev) => [created, ...prev])
              }
            />
          )}
        </main>

        {/* Customizable Global Footer Background Section */}
        {showGlobalFooter && footerBgConfig && (
          <footer className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-24 md:pb-10 pt-4">
            <CustomizableSection config={footerBgConfig}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  {footerBgConfig.kicker && (
                    <div className="text-[11px] font-mono tracking-widest text-[#C8A66A] uppercase">
                      {footerBgConfig.kicker}
                    </div>
                  )}
                  <div className="text-base sm:text-lg font-bold text-[#F5F2EC] mt-0.5">
                    {brandConfig.brandName || footerBgConfig.title}
                  </div>
                  <p className="text-xs text-[#929292] mt-1">
                    {brandConfig.footerCopyright || footerBgConfig.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-[#929292]">
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="hover:text-[#F5F2EC] cursor-pointer"
                  >
                    خانه
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => navigateTo('shop')}
                    className="hover:text-[#F5F2EC] cursor-pointer"
                  >
                    فروشگاه
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => navigateTo('explore')}
                    className="hover:text-[#F5F2EC] cursor-pointer"
                  >
                    اکسپلور
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => navigateTo('contact')}
                    className="hover:text-[#F5F2EC] cursor-pointer"
                  >
                    تماس با ما
                  </button>
                </div>
              </div>
            </CustomizableSection>
          </footer>
        )}

        <BottomTabBar
          currentRoute={currentRoute}
          cartCount={totalCartCount}
          onNavigate={navigateTo}
        />

        <SmartCardModal
          isOpen={isQrModalOpen}
          coach={coach}
          onClose={() => setIsQrModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
