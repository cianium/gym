> **به‌روزرسانی مهم نسخه 2.3.0:** برای قابلیت‌های رزرو، پیام خصوصی و پیامک، ابتدا فایل `ENHANCEMENT_README_FA.md` را بخوانید. دستورالعمل زیر برای معماری پایه نسخه قبلی نوشته شده است. نصب نسخه جدید بدون migration و cron مخصوص آن ناقص است.

# راهنمای گام‌به‌گام نصب و راه‌اندازی روی هاست واقعی (INSTALL_GUIDE_FA.md)

**محصول:** پلتفرم فروشگاهی و مربیگری White-Label Fitness — نسخه `2.2.0-single-tenant`  
**معماری:** تک‌مستاجره (Single-Tenant)، خودمیزبان (Self-Hosted)، بدون نیاز به Node.js روی هاست مشتری  
**بسته آماده استقرار:** `ARASH_PRODUCTION_RELEASE.zip`

---

## ۱. پیش‌نیازهای سرور و هاست (Hosting Requirements)

برای نصب پایدار و امن هر نسخه مستقل برای یک مربی، هاست اشتراکی (cPanel / DirectAdmin) یا سرور مجازی (VPS) باید دارای مشخصات زیر باشد:

1. **نسخه PHP:** نسخه **PHP 8.3** یا بالاتر (پیشنهادی: `PHP 8.3`).
2. **افزونه‌های الزامی PHP:**
   - `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `fileinfo`, `curl`, `zip`
3. **دیتابیس:** `MySQL 8.0+` یا `MariaDB 10.6+` (با انکودینگ `utf8mb4_unicode_ci`).
4. **وب‌سرور:** `Apache 2.4+` یا `LiteSpeed` (دارای `mod_rewrite` فعال جهت پردازش فایل `.htaccess`) یا `Nginx`.
5. **گواهی امنیتی SSL (HTTPS):** فعال بودن HTTPS روی دامنه اصلی مربی جهت عملکرد صحیح کوکی‌های امن `HttpOnly` و بازگشت از درگاه شاپرک الزامی است.
6. **عدم نیاز به Node.js / npm:** تمامی فایل‌های فرانت‌اند (`React 19 + TypeScript + Vite`) از پیش کامپایل و بهینه‌سازی شده‌اند و داخل پوشه `public_html/assets/` قرار دارند.

---

## ۲. ساختار امن دایرکتوری‌ها روی هاست (جداسازی هسته از `public_html`)

برای جلوگیری از دسترسی مستقیم کاربران به فایل `.env`، کدهای هسته لاراول و فایل‌های خصوصی برنامه‌های تمرینی (`PDF`)، ساختار بسته `ARASH_PRODUCTION.zip` به دو پوشه مجزا تقسیم شده است:

```text
/home/username/                      <-- ریشه هاست شما (خارج از دسترس عموم وب)
├── laravel_core/                    <-- هسته Laravel 13، فایل .env و مخزن فایل‌های خصوصی
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── storage/
│   │   ├── app/private_downloads/   <-- محل نگهداری امن فایل‌های PDF برنامه‌های تمرینی
│   │   ├── app/public/media/        <-- محل ذخیره تصاویر آپلودشده محصولات و مربی
│   │   ├── app/backups/             <-- محل ذخیره بسته‌های پشتیبان (Backup ZIP)
│   │   └── logs/
│   ├── vendor/                      <-- وابستگی‌های PHP
│   ├── .env                         <-- فایل تنظیمات محرمانه (سطح دسترسی 0600)
│   └── artisan
│
└── public_html/                     <-- ریشه عمومی وب (Document Root دامنه)
    ├── assets/                      <-- باندل‌های کامپایل‌شده فرانت‌اند (JS/CSS)
    ├── media/                       <-- سیم‌لینک یا مسیر عمومی تصاویر رسانه
    ├── index.php                    <-- نقطه ورود که به ../laravel_core اشاره می‌کند
    ├── index.html                   <-- قالب پایه SPA با متاتگ‌های پویا
    └── .htaccess                    <-- قوانین مسیریابی، کش و هدرهای امنیتی
```

> **هشدار امنیتی مهم:** هرگز پوشه `laravel_core` یا فایل `.env` را در داخل `public_html` قرار ندهید. سرویس نصب‌کننده (`InstallerService`) به صورت خودکار امن بودن مسیر `DOCUMENT_ROOT` را بررسی کرده و در صورت قرارگیری `storage` یا `.env` در داخل `public_html`، عملیات نصب را با خطای `UNSAFE_DOCUMENT_ROOT` متوقف می‌کند.

---

## ۳. مراحل نصب در هاست اشتراکی (cPanel / DirectAdmin)

### گام اول: ساخت دیتابیس MySQL
1. وارد پنل هاست (**cPanel -> MySQL Database Wizard** یا **DirectAdmin -> MySQL Management**) شوید.
2. یک دیتابیس جدید (مثلاً `cpaneluser_fitness`) بسازید.
3. یک کاربر دیتابیس (مثلاً `cpaneluser_fituser`) با رمز عبور قوی بسازید.
4. تمامی دسترسی‌ها (**ALL PRIVILEGES**) را به این کاربر روی دیتابیس اختصاص دهید و مشخصات را یادداشت کنید.

### گام دوم: آپلود و استخراج بسته `ARASH_PRODUCTION.zip`
1. وارد **File Manager** هاست شده و به مسیر ریشه اکانت خود (`/home/username/`) بروید (یک سطح بالاتر از `public_html`).
2. فایل `ARASH_PRODUCTION.zip` را آپلود و **Extract** کنید.
3. محتویات پوشه `laravel_core` در مسیر `/home/username/laravel_core` قرار می‌گیرد.
4. محتویات پوشه `public_html` موجود در بسته را داخل `/home/username/public_html` کپی کنید.

### گام سوم: بررسی وابستگی‌های PHP (`vendor/`)
- اگر روی سرور به SSH یا **Terminal** در cPanel دسترسی دارید، در مسیر `laravel_core` دستور زیر را اجرا کنید:
  ```bash
  cd ~/laravel_core
  composer install --no-dev --optimize-autoloader --no-interaction
  ```
- اگر روی هاست اشتراکی به Composer دسترسی ندارید، قبل از آپلود فایل روی هاست، در کامپیوتر خود دستور `composer install --no-dev --optimize-autoloader` را داخل پوشه `laravel_core` اجرا کنید تا پوشه `vendor/` کامل شود و سپس آپلود نمایید.

### گام چهارم: تنظیم سطوح دسترسی (Permissions)
در File Manager هاست، سطوح دسترسی زیر را تنظیم کنید:
- پوشه `laravel_core/storage` و تمامی زیرپوشه‌های آن: **`0750`** یا **`0755`** (قابل نوشتن توسط وب‌سرور).
- پوشه `laravel_core/bootstrap/cache`: **`0750`** یا **`0755`**.
- فایل `laravel_core/.env` (پس از ایجاد): **`0600`**.

---

## ۴. تکمیل نصب و ساخت حساب مالک (دو روش به انتخاب شما)

### روش الف: استفاده از ویزارد نصب تحت وب (`/install`)
1. در مسیر `laravel_core/storage/` یک فایل متنی به نام `installer_setup.token` بسازید و یک عبارت رمزی دلخواه (مثلاً `MyCoachSetupToken2025`) داخل آن بنویسید و ذخیره کنید.
2. آدرس سایت خود را در مرورگر باز کنید و به مسیر زیر بروید:
   ```text
   https://your-coach-domain.ir/install
   ```
3. فرم نصب را تکمیل کنید:
   - **توکن امنیتی نصب (`Setup Token`):** همان عبارتی که در `installer_setup.token` قرار دادید.
   - **اطلاعات برند و مربی:** نام برند، عنوان سئو، نام مربی و دامنه رسمی.
   - **اطلاعات دیتابیس MySQL:** نام دیتابیس، نام کاربری، رمز عبور و هاست (`127.0.0.1` یا `localhost`).
   - **حساب مالک (Admin):** نام کاربری، ایمیل و رمز عبور قوی (حداقل ۸ کاراکتر؛ رمزهای ضعیف یا پیش‌فرض مسدود می‌شوند).
4. روی دکمه **«اجرای نصب و قفل‌گذاری امنیتی»** کلیک کنید.
5. سیستم به صورت خودکار:
   - کلید رمزنگاری یکتا (`APP_KEY`) تولید می‌کند.
   - فایل `.env` را با سطح دسترسی `0600` ذخیره می‌کند.
   - جداول دیتابیس را از طریق Migration ایجاد می‌کند.
   - حساب مدیر را با هش امن رمزنگاری می‌کند.
   - فایل قفل `storage/installed.lock` را ایجاد کرده و فایل `installer_setup.token` را حذف می‌کند تا اجرای مجدد نصب‌کننده برای همیشه مسدود شود (`403 ALREADY_INSTALLED`).

### روش ب: آماده‌سازی دستی `.env` و تکمیل نصب با ویزارد (مناسب VPS یا SSH)
1. در پوشه `laravel_core`، فایل `.env.example` را به `.env` کپی کنید:
   ```bash
   cd ~/laravel_core
   cp .env.example .env
   chmod 600 .env
   ```
2. مقادیر `APP_URL`، `DB_DATABASE`، `DB_USERNAME`، `DB_PASSWORD` و کلید درگاه پرداخت (`ZARINPAL_MERCHANT_ID` یا `SEP_TERMINAL_ID`) را در `.env` وارد کنید.
3. فقط برای کنترل اتصال و پیش‌نیازها می‌توانید دستورات زیر را اجرا کنید:
   ```bash
   php artisan about
   php artisan migrate:status
   ```
4. سپس فایل `storage/installer_setup.token` را بسازید و نصب را از `/install` تکمیل کنید. اجرای migration و ساخت دستی `installed.lock` به‌تنهایی حساب مالک و تنظیمات برند را ایجاد نمی‌کند و نصب کامل محسوب نمی‌شود.
5. پس از نصب موفق، دستور `php artisan config:cache` را اجرا کنید. فقط زمانی `route:cache` را اجرا کنید که خروجی آن روی نسخهٔ PHP هاست بدون خطا باشد.

---

## ۵. تنظیم درگاه‌های پرداخت بانکی (زرین‌پال و سامان SEP)

1. در فایل `laravel_core/.env` مطمئن شوید که در محیط عملیاتی مقادیر زیر تنظیم شده‌اند:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   PAYMENT_SANDBOX=false
   ```
2. **برای زرین‌پال:** کد ۳۶ کاراکتری پذیرنده را در `ZARINPAL_MERCHANT_ID` قرار دهید:
   ```env
   ZARINPAL_MERCHANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ZARINPAL_SANDBOX=false
   ```
   آدرس بازگشت (Callback) که در پنل زرین‌پال ثبت می‌شود:
   `https://your-coach-domain.ir/api/v1/payments/callback/zarinpal`

3. **برای درگاه سامان (SEP شاپرک):** شماره ترمینال خود را در `SEP_TERMINAL_ID` قرار دهید:
   ```env
   SEP_TERMINAL_ID=12345678
   SEP_SANDBOX=false
   ```
   آدرس بازگشت (Callback) سامان:
   `https://your-coach-domain.ir/api/v1/payments/callback/sep`

4. پس از هرگونه تغییر در فایل `.env`، در صورت فعال بودن کش کانفیگ، دستور `php artisan config:clear && php artisan config:cache` را اجرا نمایید.

---

## ۶. چک‌لیست تست سلامت پس از نصب (Post-Install Verification)

پس از اتمام نصب، موارد زیر را به ترتیب بررسی کنید:

1. **بررسی قفل شدن نصب‌کننده:** به آدرس `/api/v1/install/status` مراجعه کنید؛ مقدار `"installed": true` و `"lockFileExists": true` باید برگردانده شود و ارسال درخواست `POST` به `/api/v1/install/run` باید کد `403 ALREADY_INSTALLED` برگرداند.
2. **ورود به پنل مدیریت:** از منوی سایت وارد بخش «مدیریت» شده و با ایمیل/نام کاربری و رمز عبوری که در زمان نصب ساختید وارد شوید.
3. **تست آپلود تصویر و فایل PDF خصوصی:** در پنل مدیریت یک تصویر محصول آپلود کنید (مطمئن شوید تصویر در `/media/...` نمایش داده می‌شود) و برای یک محصول دیجیتال یک فایل PDF آپلود نمایید.
4. **تست ثبت سفارش و پرداخت:** یک سفارش آزمایشی ثبت کرده و فرآیند انتقال به درگاه، بازگشت به `/payment/result`، صدور کد رهگیری شاپرک (`refId`) و دانلود فایل PDF برنامه تمرینی را بررسی نمایید.
5. **اجرای تست خودکار بسته:** در مسیر `laravel_core` دستور `composer test` را اجرا کنید؛ هر هفت تست باید با پیام `OK 7 smoke tests passed` تمام شوند. این تست از دیتابیس SQLite موقت استفاده می‌کند و دیتابیس عملیاتی را تغییر نمی‌دهد.
6. **بررسی dependencyها:** روی سیستمی که به Packagist دسترسی دارد `composer audit --locked` را اجرا کنید و پیش از تحویل، هر advisory بحرانی یا سطح بالا را رفع کنید.
