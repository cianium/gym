# گزارش نهایی ممیزی فنی، امنیتی و کنترل کیفیت (FINAL_QA_REPORT_FA.md)

**نام پروژه:** پلتفرم فروشگاهی و مربیگری White-Label Fitness  
**نسخه:** `2.2.0-single-tenant`  
**تاریخ ممیزی نهایی:** ۱۴۰۵/۰۸/۱۳  
**وضعیت کلی کدبیس و بیلد تولید:** آماده استقرار مشتری (`READY FOR CUSTOMER DEPLOYMENT`)

---

## ۱. خلاصه مشکلات فنی و امنیتی برطرف‌شده در این نسخه

تمامی باگ‌های بحرانی و موارد ممیزی قبلی به صورت واقعی در کدهای بک‌اند لاراول (`backend/app/...`)، مهاجرت‌های دیتابیس (`backend/database/migrations/...`) و سرور پیش‌نمایش (`server.ts`) اصلاح شدند:

1. **اصلاح کامل اتمیک بودن تراکنش Checkout (جلوگیری از رزرو بدون سفارش):**
   - در `CheckoutController.php` و `server.ts`، منطق ثبت سفارش به دو فاز مجزا (**Pass 1: اعتبارسنجی کامل بدون نوشتن در دیتابیس** و **Pass 2: رزرو موجودی و ساخت سفارش**) تفکیک شد.
   - پیش از این، در سبدهای چنداقلامی اگر قلم اول موجود بود ولی قلم دوم ناموجود/آرشیو بود یا کد تخفیف نامعتبر بود، موجودی قلم اول رزرو می‌شد بدون آنکه سفارشی ثبت شود. اکنون هیچ تغییری روی `reserved_stock` یا `used_count` تا پیش از تایید ۱۰۰٪ تمامی اقلام، آدرس پستی و کد تخفیف اعمال نمی‌شود.
   - همچنین کل فرآیند ارتباط با درگاه بانکی (`initiatePayment`) و ثبت تراکنش (`PaymentTransaction::create`) در بلوک `try / catch (Throwable)` قرار گرفت تا در صورت بروز هرگونه خطا، متد `releaseReservedInventory($order)` فراخوانی شده و هیچ رزرو بلاتکلیفی باقی نماند.

2. **هماهنگی کامل Models، Controllers و Migrations (به‌ویژه `paid_at` و `ref_id`):**
   - ستون‌های `ref_id`، `idempotency_key`، `discount_reserved`، `paid_at`، `refund_type`، `refund_reference` و `refunded_at` به جدول `orders` در فایل مهاجرت اصلی (`2025_01_01_000001_create_white_label_schema.php`) و همچنین مهاجرت ارتقای غیرمخرب (`2025_01_01_000002_align_orders_discounts_and_brand_columns.php`) و مدل `Order.php` اضافه شدند.
   - ستون‌های `min_order_amount_toman` و `max_discount_amount_toman` به جدول `discount_codes` و مدل `DiscountCode.php` اضافه شدند.
   - ستون‌های `logo_url`، `favicon_url` و `share_image_url` به جدول `brand_settings` اضافه شدند.
   - ویژگی `$timestamps = true` در مدل‌های `OrderItem` و `PageRevision` با ساختار واقعی جداول هماهنگ شد.

3. **اصلاح چرخه پرداخت، Callback تکراری، پرداخت دیرهنگام (`پرداخت دیرهنگام`) و بازیابی تراکنش ناموفق:**
   - در `PaymentCallbackController.php` و `server.ts`، علاوه بر مسدودسازی Callback تکراری (`409 TRANSACTION_REPLAY_BLOCKED`)، پشتیبانی کامل از **پرداخت دیرهنگام (`Late Payment Recovery`)** پیاده‌سازی شد: اگر سفارشی به علت گذشت بیش از ۳۰ دقیقه توسط `expireStalePendingOrders` به وضعیت `cancelled` درآمده باشد و سپس بانک Callback موفق (`Status=OK` در زرین‌پال یا `State=OK` + `RefNum` در سامان) ارسال کند، تراکنش وارد وضعیت `processing` شده و از بانک استعلام می‌شود:
     - **حالت الف (موجودی آزاد در انبار کافی است):** موجودی کسر شده، سفارش `paid` و `pending`/`delivered` می‌شود و `paid_at` و `ref_id` ثبت می‌گردد.
     - **حالت ب (موجودی در زمان انقضا توسط مشتری دیگری خریداری شده است):** موجودی مشتری دیگر دست‌نخورده باقی می‌ماند (`hasEnoughStock`) و سفارش با وضعیت `payment_status = 'paid'` و `fulfillment_status = 'reconciliation_required'` ثبت می‌شود تا هرگز وجه تاییدشده بانکی مشتری از دست نرود.

4. **پیاده‌سازی Idempotency اتمیک و اعتبارسنجی کامل کدهای تخفیف:**
   - کلید یکتایی (`Idempotency-Key` یا `idempotencyKey`) هم در سطح دیتابیس (`orders.idempotency_key` با قفل ردیفی `lockForUpdate()`) و هم در سطح قفل حافظه/کش بررسی می‌شود تا درخواست‌های همزمان یا تکراری هرگز منجر به ثبت دو سفارش یا کسر دوبرابر موجودی نشوند.
   - کدهای تخفیف از نظر فعال بودن (`active`)، تاریخ انقضا (`expires_at` -> `422 DISCOUNT_CODE_EXPIRED`)، سقف تعداد استفاده (`used_count < max_uses` -> `409 DISCOUNT_LIMIT_EXCEEDED`)، حداقل مبلغ سفارش (`min_order_amount_toman` -> `422 DISCOUNT_MIN_AMOUNT_NOT_MET`)، سقف مبلغ تخفیف (`max_discount_amount_toman`) و بازه درصد (`1..100`) در سرور اعتبارسنجی می‌شوند.

5. **حذف نشت پیام‌های خطای داخلی و تفکیک بازگشت وجه بانکی از ثبت دستی بازگشت وجه:**
   - در `CheckoutController.php`، `PaymentCallbackController.php` و `InstallController.php`، جزئیات خام استثناها (`$e->getMessage()`) در پاسخ‌های خطای سرور (`500`/`502`/`503`) حذف و به `Log::error` منتقل شدند.
   - در `OrderController::reconcile` و `server.ts`، عملیات `gateway_refund` با کد وضعیت `501 GATEWAY_REFUND_NOT_SUPPORTED` و پیام شفاف متمایز شد و عملیات `manual_refund` / `refunded` به عنوان **ثبت استرداد وجه دستی (آفلاین/پایا/شبا)** همراه با ذخیره `refund_type = 'manual'`، `refund_reference`، `refunded_at`، ابطال توکن‌های دانلود دیجیتال و ثبت رویداد `MANUAL_REFUND_RECORDED` پیاده‌سازی گردید.

---

## ۲. جدول نتایج واقعی تست‌ها (PASS / FAIL / BLOCKED)

| ردیف | بخش / سناریوی تست | ابزار / محیط اجرا | وضعیت | توضیحات فنی و شواهد |
| :---: | :--- | :--- | :---: | :--- |
| ۱ | کامپایل TypeScript و بررسی نوع‌ها (`npm run lint`) | `tsc --noEmit` | **PASS** | بدون هیچ‌گونه خطای نوع‌دهی در فرانت‌اند و سرور (`0 errors`). |
| ۲ | بیلد نهایی فرانت‌اند (`npm run build`) | `Vite 8.3.5` | **PASS** | تولید موفقیت‌آمیز باندل‌های تولید در `dist/` و کپی در `ARASH_PRODUCTION.zip`. |
| ۳ | امنیت احراز هویت ادمین، نشست `HttpOnly` و محافظت `CSRF` | `tests/security.test.ts` (Gates 1, 4) | **PASS** | رد درخواست‌های بدون نشست با `401` و بدون توکن CSRF با `403 CSRF_TOKEN_MISMATCH`. |
| ۴ | نصب‌کننده یکپارچه (`/api/v1/install/run`) و قفل `installed.lock` | `tests/security.test.ts` (Gates 2, 3) | **PASS** | بررسی توکن نصب، امنیت `DOCUMENT_ROOT`، تولید `APP_KEY`، ذخیره `.env` با سطح دسترسی `0600` و مسدودسازی نصب مجدد با `403 ALREADY_INSTALLED`. |
| ۵ | آپلود رسانه عمومی (`/api/v1/admin/media`) و فایل خصوصی PDF | `tests/security.test.ts` (Gate 4) | **PASS** | بررسی Magic Bytes تصاویر، مسدودسازی `data:image/` Base64 با کد `422` و ذخیره امن PDF خارج از ریشه وب. |
| ۶ | اتمیک بودن تراکنش Checkout در سبد چنداقلامی | `tests/security.test.ts` (Gate 14) | **PASS** | در صورت نامعتبر بودن قلم دوم یا کد تخفیف، موجودی قلم اول (`stock=2, reservedStock=0`) کاملاً دست‌نخورده باقی می‌ماند. |
| ۷ | اعتبارسنجی تاریخ انقضا، حداقل خرید و سقف کد تخفیف | `tests/security.test.ts` (Gate 14) | **PASS** | مسدودسازی کد منقضی (`422 DISCOUNT_CODE_EXPIRED`)، بررسی حداقل خرید (`422 DISCOUNT_MIN_AMOUNT_NOT_MET`) و اعمال سقف تخفیف (`maxDiscountAmount`). |
| ۸ | ادغام اقلام تکراری سبد، هزینه ارسال پویا و ارسال رایگان | `tests/security.test.ts` (Gate 13) | **PASS** | محاسبه دقیق قیمت از دیتابیس، اعمال نرخ ارسال و سقف ارسال رایگان از `BrandSetting`. |
| ۹ | امنیت Callback بانکی، جلوگیری از Replay و عدم نشت توکن | `tests/security.test.ts` (Gate 6, 8) | **PASS** | هیچ کوکی یا توکنی روی Callback عمومی صادر نمی‌شود؛ تکرار Callback با `409 TRANSACTION_REPLAY_BLOCKED` مسدود می‌شود. |
| ۱۰ | مدیریت پرداخت دیرهنگام (`پرداخت دیرهنگام`) پس از انقضای سفارش | `tests/security.test.ts` (Gate 14) | **PASS** | بازیابی خودکار سفارش منقضی‌شده در صورت ارسال `Status=OK` از بانک؛ کسر موجودی در صورت وجود انبار یا انتقال به `reconciliation_required` در صورت اتمام موجودی. |
| ۱۱ | تفکیک استرداد بانکی (`gateway_refund`) و ثبت دستی (`manual_refund`) | `tests/security.test.ts` (Gate 14) | **PASS** | بازگشت کد `501 GATEWAY_REFUND_NOT_SUPPORTED` برای استرداد خودکار و ثبت دقیق `refundType='manual'`، `refundReference` و ابطال لینک دانلود در استرداد دستی. |
| ۱۲ | محافظت دانلود فایل‌های دیجیتال (`/api/v1/downloads/:token`) | `tests/security.test.ts` (Gate 7, 13) | **PASS** | الزام به کوکی `HttpOnly` یا هدر `X-Order-Token`، رد توکن در URL (`400`)، بررسی سقف ۵ دانلود و مهلت ۷۲ ساعت. |
| ۱۳ | ایزولاسیون کامل چند نصب مستقل (Single-Tenant Multi-Instance) | `tests/security.test.ts` (Gate 10) | **PASS** | اجرای دو نمونه مستقل با دیتابیس، کلید، سفارش‌ها و متاتگ‌های سئو کاملاً مجزا بدون هیچ‌گونه اشتراک داده. |
| ۱۴ | پشتیبان‌گیری کامل (`Backup ZIP`) و بازیابی با بررسی Checksum | `tests/security.test.ts` (Gate 12) | **PASS** | تایید صحت `SHA-256`، تهیه Snapshot پیش از بازیابی و بازگردانی کامل اطلاعات در نمونه جدید. |
| ۱۵ | اجرای زنده Laravel، migration و PHPUnit روی PHP 8.3 و دیتابیس واقعی | Docker: `PHP 8.3.36` + `MariaDB 11.4` | **PASS** | نصب Composer با lockfile، اجرای موفق ۲ migration، ثبت ۵۸ route و عبور `13/13` تست Feature با `163` assertion. پروژه MariaDB 10.6+ را رسماً پشتیبانی می‌کند. |
| ۱۶ | بهینه‌سازی باندل و بارگذاری مرحله‌ای صفحات | Vite production build | **PASS** | chunk اصلی از حدود `700KB` به `341KB` کاهش یافت؛ Admin، Shop، Account، Explore، Installer و Payment Result به‌صورت lazy-load جدا شدند. |

---

## ۳. اقلام تحویلی و وضعیت بسته‌های خروجی

تمامی ۶ خروجی الزامی تولید و صحت‌سنجی شده‌اند:

1. **`ARASH_FINAL_SOURCE.zip`** (در ریشه پروژه و `release/ARASH_FINAL_SOURCE.zip`): شامل کل سورس اصلاح‌شده فرانت‌اند، بک‌اند لاراول ۱۳، تست‌ها و مستندات.
2. **`ARASH_PRODUCTION.zip`** (در ریشه پروژه و `release/ARASH_PRODUCTION.zip`): بسته آماده نصب روی هاست شامل `public_html/` (فایل‌های کامپایل‌شده فرانت‌اند + `index.php` + `.htaccess`) و `laravel_core/` (هسته لاراول، مهاجرت‌ها، مدل‌ها، کنترلرها و دایرکتوری‌های `storage`).
3. **`.env.example`** (در ریشه پروژه و `backend/.env.example`): قالب کامل تنظیمات بدون هیچ‌گونه کلید یا رمز واقعی.
4. **`INSTALL_GUIDE_FA.md`**: راهنمای گام‌به‌گام نصب روی هاست اشتراکی (cPanel / DirectAdmin) و سرور مجازی (VPS).
5. **`FINAL_QA_REPORT_FA.md`**: همین گزارش شامل نتایج واقعی تست‌ها.
6. **`ADMIN_GUIDE_FA.md`**: راهنمای مختصر مالک/مربی برای مدیریت روزمره سایت، محصولات، سفارش‌ها و پشتیبان‌گیری.

---

## ۴. موارد باقی‌مانده برای مرحله استقرار روی هاست مشتری

1. پوشه `laravel_core/vendor/` به‌صورت بهینه و بدون dependencyهای توسعه داخل بسته Production قرار دارد؛ اجرای Composer روی هاست مشتری لازم نیست.
2. کلید واقعی درگاه بانکی (`ZARINPAL_MERCHANT_ID` یا `SEP_TERMINAL_ID`) باید در فایل `laravel_core/.env` وارد و یک تراکنش کم‌مبلغ واقعی در شاپرک انجام شود؛ این مرحله بدون اطلاعات پذیرنده مشتری قابل اجرا نیست.
