# ARASH Fitness — نسخه 2.3.2 Secure Checkout Staging

**تاریخ:** 2026-11-10  
**نسخه مبنا:** `ARASH_FITNESS_ENHANCED_2_3_1_PATCHED_STAGING_2026-11-10.zip`  
**وضعیت:** **STAGING ONLY — انتشار تجاری تأیید نشده**

## تغییرات اعمال‌شده (در سورس واقعی پروژه)

1. **اجباری شدن حساب ورزشکار تأییدشده برای هر خرید:** سه مسیر `/api/checkout`، `/api/v1/checkout` و `/api/v1/athlete/checkout` همگی به `CheckoutController::verifiedStore` و middlewareهای `athlete.auth` و `admin.csrf` وصل شدند. کنترل مستقیم در `CheckoutController::store` هم وجود دارد؛ تغییر `.env` امکان بازکردن خرید مهمان را ندارد.
2. **الزام شماره یکسان:** شماره پرداخت‌کننده باید با شماره موبایل ثبت‌شده و OTP-تأییدشده ورزشکار برابر باشد. رقم‌های فارسی، عربی، قالب `+98` و `0098` به فرم استاندارد تبدیل می‌شوند.
3. **مسیر کاربردی UI:** فایل `public_html/assets/secure-checkout.js`، CSS اختصاصی و ورودی‌های جدید در `spa.html` و `spa-shell.html` افزوده شد. در هنگام خرید، پنجره ورود/ثبت‌نام/تأیید SMS نمایش داده می‌شود؛ خرید فقط پس از دریافت CSRF در نشست همان کاربر انجام می‌شود.
4. **ورود خودکار پس از ثبت‌نام OTP موفق:** `AthleteRegistrationController::register` نشست را پس از ایجاد حساب معتبر برقرار و شناسه نشست را بازتولید می‌کند. UI ثبت‌نام مستقل نیز بعد از ثبت‌نام به صفحه خرید برمی‌گردد.
5. **قفل تکرار سفارش:** کلید `Idempotency-Key` الزامی است، کمبود طول/اختلاف هدر و بدنه رد می‌شود و هش آن به کاربر و درگاه وابسته است. کلید یکتای DB به‌عنوان مرجع معتبر و تراکنش با retry روی deadlock نگه داشته شد.
6. **بازیابی دستور انتقال پرداخت:** تکرار درخواست با همان کلید، حتی بدون کش، آدرس واقعی GET زرین‌پال یا POST بانک سامان (با Token) را از تراکنش ثبت‌شده بازسازی می‌کند. در حالت paid/processing/verification_pending، کاربر به صفحه نتیجه سفارش برمی‌گردد؛ در سفارش لغوشده یا ناموفق اجازه پرداخت مجدد با کلید کهنه داده نمی‌شود.
7. **مدیریت برخورد هم‌زمان:** خطای برخورد یکتایی کلید سفارش هنگام رقابت درخواست‌ها به پاسخ قابل retry تبدیل شد؛ این وضعیت دیگر به‌اشتباه خطای عمومی سرور معرفی نمی‌شود.
8. **Cache busting فرانت‌اند:** فایل جاوااسکریپت تغییر یافته با نام هش‌شده تازه `index-e0f6d038bb.js` ارجاع داده می‌شود تا کاربر نسخه قدیمی و ناسازگار خرید را از کش مرورگر دریافت نکند.
9. **سازگاری بکاپ:** `SystemMaintenanceController::RELEASE_VERSION` به 2.3.2 تغییر یافت، در عین حال خواندن بکاپ‌های تأییدشده نسخه 2.3.1 حفظ شد. برای سازگاری با MySQL 8، Migration اصلاحی `2026_11_22_000001_remove_products_description_text_default` افزوده شده است. روی نصب‌های موجود، پس از بکاپ، `php artisan migrate --force` اجرا شود.

## نتیجه آزمون‌هایی که واقعاً اجرا شدند

| دسته | نتیجه | توضیح |
|---|---:|---|
| PHP lint | **105/105 PASS** | تمام فایل‌های PHP پروژه به‌جز vendor |
| JavaScript syntax | **20/20 PASS** | تمام فایل‌های assets |
| رگرسیون بدون دیتابیس | **37/37 PASS** | امنیت خرید، اعتبارسنجی OTP، منطق redirect و بکاپ |
| تست HTTP با Laravel Kernel | **4/4 PASS** | سه مسیر بدون حساب 401؛ صفحه SPA اسکریپت خرید امن را بارگذاری می‌کند |
| تست محدود JavaScript سمت کلاینت | **4/4 PASS** | شماره یکسان، قالب +98، ارقام فارسی و شماره نامطابق |
| `php artisan route:list --path=checkout` | **PASS** | سه مسیر به verifiedStore متصل شدند |
| Smoke پایگاه داده SQLite | **اجرا نشد** | میزبان ممیزی فاقد `pdo_sqlite` است؛ خطای `could not find driver` |
| MySQL، پرداخت جعلی و هم‌زمانی واقعی | **اجرا نشد** | در این محیط `pdo_mysql` و PHPUnit موجود نیست |
| پیامک واقعی ملی‌پیامک | **اجرا نشد** | نیازمند پنل و اعتبارنامه واقعی Staging |
| مرورگر واقعی / موبایل / cPanel | **اجرا نشد** | نیازمند نصب مستقل و تست تعامل واقعی UI |

**مهم:** ۴۵ تست PASS به معنی تکمیل آزمون یکپارچه یا آماده‌بودن برای داده و پول واقعی نیست. اجرای تست‌های واقعی MySQL و مرورگر هنوز گیت انتشار است.

## تست‌های افزوده‌شده برای اجرا در محیط توسعه

- `laravel_core/tests/Feature/VerifiedCheckoutFlowTest.php`: مهمان/OTP/CSRF، رجیستر با OTP، پرداخت mock، idempotency، پاسخ Callback تکراری.
- `laravel_core/tests/Feature/MySqlConcurrencyTest.php`: دو پردازش مستقل MySQL برای تصاحب یک زمان مشاوره و ایجاد یک سفارش با کلید یکسان. **فقط روی دیتابیس موقت و قابل حذف**.
- `laravel_core/phpunit.mysql.xml` و `laravel_core/tests/run_mysql_staging_suite.sh`: اجرای محافظت‌شده PHPUnit؛ در صورت نبود پیش‌نیاز یا نام نامناسب DB اجرا متوقف می‌شود.
- `laravel_core/tests/static_runtime_regressions.php`، `tests/route_security_smoke.php` و `tests/client_checkout_gate.mjs`: تست‌های مستقل از دیتابیس که اجرا و پاس شده‌اند.

## محدودیت‌ها و تصمیم انتشار

- سورس اولیه React/TypeScript در بسته موجود نیست؛ با فایل‌های Build موجود سازگار‌سازی انجام شد، نه بازسازی کامل فرانت‌اند. قبل از توسعه بلندمدت باید سورس قابل ساخت بازیابی/بازسازی شود.
- تست بازخرید واقعی از بانک، webhookها، قطع ارتباط، خرید هم‌زمان، موجودی و تعارض رزرو هنوز روی دیتابیس واقعی اجرا نشده است.
- **هیچ حساب یا دیتابیس واقعی، اطلاعات پرداخت یا پنل پیامک عملیاتی در جریان این اصلاحات تغییر داده نشده است.**
- نسخه پیشنهادی فقط برای **Staging با دامنه/دیتابیس/درگاه جدا** است، نه سایت مشتری واقعی.

## فایل‌های کلیدی تغییرکرده

- `laravel_core/database/migrations/2026_11_22_000001_remove_products_description_text_default.php`
- `laravel_core/routes/api.php`
- `laravel_core/app/Http/Controllers/Api/V1/CheckoutController.php`
- `laravel_core/app/Http/Controllers/Api/V1/AthleteRegistrationController.php`
- `laravel_core/app/Http/Controllers/Api/V1/SystemMaintenanceController.php`
- `laravel_core/config/services.php` و `.env.example`
- `public_html/assets/secure-checkout.js` و `secure-checkout.css`
- `public_html/assets/index-e0f6d038bb.js`
- `public_html/spa-shell.html` و `laravel_core/resources/views/spa.html`
- فایل‌های تست اشاره‌شده در بالا

لطفاً برای استقرار و آزمون، سند `STAGING_TEST_AND_DEPLOY_FA.md` را دنبال کنید.
