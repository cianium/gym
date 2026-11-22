/* ARASH Fitness — isolated, browser-only demo adapter.
 * No network writes, database, SMS or payment gateway are used in demo mode.
 */
(function () {
  'use strict';
  if (window.__ARASH_DEMO_API__) return;
  window.__ARASH_DEMO_API__ = true;
  const KEY = 'arash_fitness_demo_state_v1';
  const csrf = 'ARASH-DEMO-CSRF';
  const seed = {
    athlete: { id: 101, name: 'مهدی رضایی', email: 'mehdi@example.test', phone: '09120000001', phone_verified: true },
    loggedIn: true,
    athletes: [
      { id: 101, name: 'مهدی رضایی', email: 'mehdi@example.test', phone: '09120000001' },
      { id: 102, name: 'علی محمدی', email: 'ali@example.test', phone: '09120000002' },
      { id: 103, name: 'پارسا احمدی', email: 'parsa@example.test', phone: '09120000003' }
    ],
    plans: [
      { id: 501, athlete_id: 101, title: 'قدرت و هایپرتروفی — سطح متوسط', description: 'برنامه چهار جلسه‌ای با تمرکز بر قدرت پایه و توسعه عضلانی.', status: 'published', starts_on: '2026-11-01', ends_on: '2026-12-01', sessions: [
        { day: 'شنبه — سینه و پشت بازو', exercises: [{ name: 'پرس سینه هالتر', sets: 4, reps: '۸ تا ۱۰' }, { name: 'پرس بالا سینه دمبل', sets: 3, reps: '۱۰ تا ۱۲' }, { name: 'پشت بازو سیم‌کش', sets: 3, reps: '۱۲' }] },
        { day: 'دوشنبه — زیربغل و جلو بازو', exercises: [{ name: 'لت سیم‌کش', sets: 4, reps: '۱۰' }, { name: 'قایقی', sets: 3, reps: '۱۲' }, { name: 'جلو بازو دمبل', sets: 3, reps: '۱۲' }] },
        { day: 'چهارشنبه — پا', exercises: [{ name: 'اسکوات', sets: 4, reps: '۸' }, { name: 'پرس پا', sets: 3, reps: '۱۲' }, { name: 'پشت پا دستگاه', sets: 3, reps: '۱۲' }] }
      ]},
      { id: 502, athlete_id: 102, title: 'برنامه پایه آمادگی جسمانی', description: 'برنامه مقدماتی سه جلسه‌ای.', status: 'published', starts_on: '2026-11-05', ends_on: '2026-12-05', sessions: [{ day: 'یکشنبه — فول بادی', exercises: [{ name: 'اسکوات جام', sets: 3, reps: '۱۲' }] }] }
    ],
    progress: [
      { id: 1, training_plan_id: 501, performed_on: '2026-11-20', session_day: 'شنبه — سینه و پشت بازو', effort: 7, notes: 'اجرای کامل جلسه' },
      { id: 2, training_plan_id: 501, performed_on: '2026-11-18', session_day: 'دوشنبه — زیربغل و جلو بازو', effort: 8, notes: 'افزایش کنترل‌شده وزنه' }
    ],
    slots: [
      { id: 701, starts_at: '2026-11-24T10:00:00+03:30', ends_at: '2026-11-24T10:45:00+03:30', is_active: true, active_booking: false },
      { id: 702, starts_at: '2026-11-25T16:00:00+03:30', ends_at: '2026-11-25T16:45:00+03:30', is_active: true, active_booking: false },
      { id: 703, starts_at: '2026-11-26T18:00:00+03:30', ends_at: '2026-11-26T18:45:00+03:30', is_active: true, active_booking: true }
    ],
    bookings: [
      { id: 801, athlete: { id: 101, name: 'مهدی رضایی', phone: '09120000001' }, slot: { starts_at: '2026-11-26T18:00:00+03:30' }, starts_at: '2026-11-26T18:00:00+03:30', status: 'requested', athlete_note: 'بررسی روند افزایش قدرت' }
    ],
    leads: [{ id: 901, sender_name: 'امیرحسین کریمی', sender_phone: '09120000004', goal_topic: 'افزایش حجم عضلانی', message: 'برای شروع برنامه اختصاصی مشاوره می‌خواهم.', status: 'new', coach_notes: '' }],
    messages: [{ id: 1, sender_id: 101, body: 'سلام استاد، در حرکت اسکوات زانوهایم به داخل متمایل می‌شوند. چه نکته‌ای را رعایت کنم؟', created_at: '2026-11-21T12:00:00+03:30' }, { id: 2, sender_id: 0, body: 'دامنه حرکت را کنترل کن و فعلاً روی الگوی صحیح و ثبات زانو تمرکز داشته باش.', created_at: '2026-11-21T13:00:00+03:30' }],
    orders: [{ id: 301, number: 'AR-2026-00301', payment_status: 'paid', fulfillment_status: 'completed', amount_toman: 1250000, created_at: '2026-11-17T10:00:00+03:30', items: [{ title: 'برنامه قدرت و هایپرتروفی', qty: 1 }] }]
  };
  function state() {
    try { return Object.assign(structuredClone(seed), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (_) { return structuredClone(seed); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }
  function json(data, status) { return new Response(JSON.stringify(data), { status: status || 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    if (!url.pathname.startsWith('/api/')) return originalFetch(input, init);
    const method = String((init && init.method) || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    let body = {};
    try { body = JSON.parse((init && init.body) || '{}'); } catch (_) {}
    const p = url.pathname.replace(/^\/api\/v1\//, '');
    const s = state();
    if (p === 'auth/session' && method === 'GET') return json({ authenticated: true, username: 'demo-coach', csrfToken: csrf, mustChangePassword: false });
    if (p === 'auth/admin/login' && method === 'POST') return json({ authenticated: true, username: 'demo-coach', csrfToken: csrf, mustChangePassword: false });
    if (p === 'auth/admin/logout' || p === 'auth/admin/password') return json({ ok: true });
    if (p === 'bootstrap' && method === 'GET') {
      const demo = {
        installed: true, version: '2.3.2', installedAt: '2026-11-01T09:00:00+03:30',
        brandConfig: { brandName: 'ARASH Fitness', brandSubtitle: 'پلتفرم اختصاصی مربیگری و برنامه تمرینی', seoTitle: 'ARASH Fitness | مربیگری حرفه‌ای', seoDescription: 'برنامه تمرینی اختصاصی، پیگیری پیشرفت و ارتباط با مربی', ogTitle: 'ARASH Fitness', ogDescription: 'سامانه اختصاصی مربیگری ورزشی', ogImage: '', ogType: 'website', ogSiteName: 'ARASH Fitness', twitterCard: 'summary_large_image', canonicalDomain: '', footerCopyright: '© ARASH Fitness', shippingFlatRateToman: 85000, freeShippingThresholdToman: 3000000 },
        siteModules: { home: true, shop: true, explore: true, contact: true },
        themeColors: { primaryColor: '#C8A66A', secondaryColor: '#D6B77D' },
        coach: { name: 'آرش احمدی', englishName: 'Arash Ahmadi', title: 'مربی تخصصی بدنسازی', tagline: 'تمرین علمی؛ پیشرفت پایدار', bio: 'مربی بدنسازی و طراحی برنامه‌های اختصاصی تمرین.', specialties: ['قدرت', 'عضله‌سازی', 'آمادگی جسمانی'], experienceYears: 8, activeAthletes: 42, programsDelivered: 186, location: 'تهران', phone: '', email: '', instagramHandle: '', telegramHandle: '', youtubeHandle: '', nfcSerialCode: '', visualPreset: 'coach-portrait', customAvatarUrl: null, certifications: [] },
        sectionConfigs: [],
        products: [{ id: 'demo-plan-1', type: 'digital', title: 'برنامه قدرت و هایپرتروفی', subtitle: 'سطح متوسط · چهار هفته', price: 450000, discountPrice: null, description: 'برنامه تمرینی نمونه برای نمایش فروشگاه.', features: ['برنامه چندجلسه‌ای', 'ثبت پیشرفت', 'قابل مشاهده در پنل ورزشکار'], visualPreset: 'training-plan', customImageUrl: null, status: 'published', isArchived: false, level: 'متوسط', duration: '۴ هفته', fileFormat: 'PDF', fileSize: '', fileVersion: 1, modules: [], stock: null, reservedStock: 0, sku: 'DEMO-PLAN-01', material: null, shippingEstimate: null }],
        posts: [],
        orders: s.orders.map(o => ({ id: o.id, orderNumber: o.number, trackingCode: 'DEMO-'+o.id, refId: 'DEMO-'+o.id, gateway: 'demo', createdAt: o.created_at, paidAt: o.created_at, refundType: null, refundReference: null, refundedAt: null, customerName: s.athlete.name, customerPhone: s.athlete.phone, customerEmail: s.athlete.email, customerCity: 'تهران', customerAddress: '', customerPostalCode: '', customerNotes: '', subtotal: o.amount_toman, discountAmount: 0, discountCode: null, shippingCost: 0, totalAmount: o.amount_toman, status: 'completed', fulfillmentStatus: 'completed', items: (o.items || []).map(i => ({ productId: 'demo-plan-1', title: i.title, type: 'digital', price: o.amount_toman, quantity: i.qty, visualPreset: 'training-plan', customImageUrl: null, downloadToken: null })) })),
        revisions: [], consultations: s.leads.map(x => ({ id: x.id, senderName: x.sender_name, senderPhone: x.sender_phone, goalTopic: x.goal_topic, message: x.message, status: x.status, coachNotes: x.coach_notes, createdAt: '2026-11-21T10:00:00+03:30' })),
        discounts: [], gateways: [{ id: 'demo', title: 'درگاه نمایشی (غیرفعال)', enabled: false, merchantConfigured: false, callbackUrl: '' }],
        auditLogs: []
      };
      return json(Object.assign(demo, s.adminDraft || {}));
    }
    if (p === 'admin/state-sync' && method === 'PUT') { s.adminDraft = body; save(s); return json({ ok: true }); }
    if (p === 'athlete/login' && method === 'POST') { s.loggedIn = true; save(s); return json({ authenticated: true, csrfToken: csrf, athlete: { id: s.athlete.id, name: s.athlete.name } }); }
    if (p === 'athlete/otp/request' && method === 'POST') { s.pendingPhone = String(body.phone || ''); save(s); return json({ ok: true, demo_code: '123456', message: 'کد نمایشی: 123456' }); }
    if (p === 'athlete/register' && method === 'POST') {
      s.athlete = { id: Date.now(), name: String(body.name || 'ورزشکار دمو'), email: 'demo-athlete@example.test', phone: String(body.phone || s.pendingPhone || '09120000000'), phone_verified: true };
      s.loggedIn = true; s.athletes.unshift({ id: s.athlete.id, name: s.athlete.name, email: s.athlete.email, phone: s.athlete.phone }); save(s);
      return json({ ok: true, authenticated: true, athlete: s.athlete });
    }
    if (p === 'athlete/me') return s.loggedIn ? json({ athlete: s.athlete, csrfToken: csrf }) : json({ error: 'برای ادامه وارد شوید.' }, 401);
    if (p === 'athlete/logout' && method === 'POST') { s.loggedIn = false; save(s); return json({ ok: true }); }
    if (p === 'athlete/plans') return json({ plans: s.plans.filter(x => x.athlete_id === s.athlete.id && x.status === 'published') });
    if (p === 'athlete/progress' && method === 'GET') return json({ progress: s.progress });
    if (p === 'athlete/progress' && method === 'POST') { s.progress.unshift({ id: Date.now(), ...body }); save(s); return json({ progress: s.progress[0] }); }
    if (p === 'athlete/orders') return json({ orders: s.orders });
    if (p === 'athlete/phone/otp/request' || p === 'athlete/phone/verify') return json({ ok: true, message: 'Demo: شماره به‌صورت نمونه تأیید شده است.' });
    if (p === 'athlete/consultations/slots') return json({ slots: s.slots.filter(x => x.is_active && !x.active_booking) });
    if (p === 'athlete/consultations/bookings' && method === 'GET') return json({ bookings: s.bookings.filter(x => x.athlete?.id === s.athlete.id) });
    if (p === 'athlete/consultations/bookings' && method === 'POST') { s.bookings.unshift({ id: Date.now(), athlete: s.athlete, slot: s.slots.find(x => x.id === Number(body.slot_id)), starts_at: s.slots.find(x => x.id === Number(body.slot_id))?.starts_at, status: 'requested', athlete_note: body.note || '' }); save(s); return json({ ok: true }); }
    if (p.startsWith('athlete/consultations/bookings/') && p.endsWith('/cancel')) { const id = Number(p.split('/')[3]); s.bookings = s.bookings.map(x => x.id === id ? { ...x, status: 'cancelled' } : x); save(s); return json({ ok: true }); }
    if (p === 'athlete/messages' && method === 'GET') return json({ messages: s.messages });
    if (p === 'athlete/messages' && method === 'POST') { s.messages.push({ id: Date.now(), sender_id: s.athlete.id, body: body.body || '', created_at: new Date().toISOString() }); save(s); return json({ ok: true }); }
    if (p === 'athlete/messages/read') return json({ ok: true });
    if (p === 'admin/athletes' && method === 'GET') return json({ athletes: s.athletes });
    if (p === 'admin/athletes' && method === 'POST') { const a = { id: Date.now(), ...body }; s.athletes.push(a); save(s); return json({ athlete: a }); }
    if (p === 'admin/training-plans' && method === 'GET') return json({ plans: { data: s.plans } });
    if (p === 'admin/training-plans' && (method === 'POST' || method === 'PUT')) { const item = { id: Date.now(), ...body }; s.plans.unshift(item); save(s); return json({ plan: item }); }
    if (/^admin\/athletes\/\d+\/progress$/.test(p)) return json({ progress: s.progress });
    if (p === 'admin/consultation-slots' && method === 'GET') return json({ slots: s.slots });
    if (p === 'admin/consultation-slots' && method === 'POST') { s.slots.push({ id: Date.now(), starts_at: body.starts_at, ends_at: body.ends_at, is_active: true, active_booking: false }); save(s); return json({ ok: true }); }
    if (p.startsWith('admin/consultation-slots/') && p.endsWith('/disable')) { const id = Number(p.split('/')[2]); s.slots = s.slots.map(x => x.id === id ? { ...x, is_active: false } : x); save(s); return json({ ok: true }); }
    if (p === 'admin/consultation-bookings') return json({ bookings: s.bookings });
    if (p.startsWith('admin/consultation-bookings/') && p.endsWith('/status')) { const id = Number(p.split('/')[2]); s.bookings = s.bookings.map(x => x.id === id ? { ...x, status: body.status } : x); save(s); return json({ ok: true }); }
    if (p === 'admin/consultation-leads') return json({ leads: s.leads });
    if (p.startsWith('admin/consultation-leads/') && p.endsWith('/status')) { const id = Number(p.split('/')[2]); s.leads = s.leads.map(x => x.id === id ? { ...x, status: body.status } : x); save(s); return json({ ok: true }); }
    if (p === 'admin/consultation-sms-status') return json({ unknown_count: 0, recent: [] });
    const messageMatch = p.match(/^admin\/athletes\/(\d+)\/messages(?:\/read)?$/);
    if (messageMatch && method === 'GET') return json({ messages: s.messages });
    if (messageMatch) { if (method === 'POST' && !p.endsWith('/read')) { s.messages.push({ id: Date.now(), sender_id: 0, body: body.body || '', created_at: new Date().toISOString() }); save(s); } return json({ ok: true }); }
    return json({ error: 'این عملیات در نسخه نمایشی فعال نیست.', demo: true }, 501);
  };
  window.addEventListener('DOMContentLoaded', function () {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:sticky;top:0;z-index:99999;padding:9px 12px;text-align:center;background:#7c5b20;color:#fff;font:12px Tahoma,Arial,sans-serif;display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap';
    const note = document.createElement('span');
    note.textContent = 'حالت نمایشی ARASH Fitness — اطلاعات نمونه است؛ عملیات واقعی، پیامک و پرداخت غیرفعال‌اند.';
    banner.append(note);
    [['ورزشکار','/athlete'],['مربی','/coach/athletes'],['جلسات مربی','/coach/schedule'],['مدیریت','/admin'],['صفحه اصلی','/']].forEach(([label,href]) => {
      const a = document.createElement('a'); a.href = href; a.textContent = label;
      a.style.cssText = 'color:#fff;text-decoration:underline;font-weight:bold;white-space:nowrap';
      banner.append(a);
    });
    document.body.prepend(banner);
  });
})();