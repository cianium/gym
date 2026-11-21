> **یادداشت نسخه 2.3.2:** این سند مربوط به نسخه‌های پیشین است و بعضی فلگ‌ها و مسیرهای خرید را با وضعیت قدیمی توضیح می‌دهد. مرجع معتبر نسخه جدید: `RELEASE_2_3_2_FA.md` و `STAGING_TEST_AND_DEPLOY_FA.md`.

# ARASH Fitness — نسخه اصلاحی Staging 2.3.1

تاریخ: 2026-11-10
مبنا: ARASH_FITNESS_ENHANCED_2_3_0_STAGING_2026-11-10.zip
**وضعیت: STAGING ONLY — هنوز Production Ready نیست.**

## اصلاحاتی که واقعاً در سورس اعمال شد

1. پاسخ ارسال پیامک ملی‌پیامک در `MeliPayamakReceipt` متمرکز شد. تنها پاسخ HTTP موفق + `recId` مثبت، تأیید پذیرش پیامک است. پاسخ مبهم یا خطای اتصال، اشتباهاً موفق تلقی نمی‌شود و درخواست خودکار تکراری هم ایجاد نمی‌کند.
2. ارسال OTP ثبت‌نام و اعلان رزرو هر دو از قرارداد یکسان provider استفاده می‌کنند. فیک تست OTP از `status=success` به `recId` معتبر اصلاح شد.
3. نصب‌کننده دیگر متغیرهای خارج از کنترل خودش را در `.env` پاک نمی‌کند؛ متغیرهای قدیمی SMTP/SMS/Cron/Feature Flags را نگه می‌دارد. جایگزینی `.env` اتمی، با permission 0600 و تهیه کپی محافظت‌شده در `storage/app/installer_env_backups` انجام می‌شود. در تکرار نصب، کلید معتبر APP_KEY و کلید بکاپ حفظ می‌شوند؛ کلید نامعتبر خودکار تعویض نمی‌شود.
4. فایل‌های Snapshot جدید با AES-256-GCM و کلید مستقل `BACKUP_ENCRYPTION_KEY` در `storage/app/backups/*.vault` ذخیره می‌شوند. پیش از بازیابی، اگر فایل رمزگذاری‌شده ساخته نشود هیچ تغییری در DB انجام نمی‌شود.
5. برای API خروجی بکاپ، پارامتر اختیاری `/api/v1/admin/backup/export?encrypted=1` اضافه شد. فرمت رمزگذاری‌شده قابل ارسال به endpoint موجود Restore است؛ نسخه قدیمی JSON بدون رمز همچنان برای سازگاری فعال است و **هنوز مخاطره امنیتی باقی‌مانده** محسوب می‌شود.
6. ابزار فقط-CLI `php installer/decrypt_snapshot.php FILENAME.vault` برای رمزگشایی فایل بکاپ محلی به دایرکتوری محدود `storage/app/decrypted_restore_exports` اضافه شد. فایل خروجی به صورت 0600 ذخیره می‌شود و بعد از بازیابی باید حذف امن شود.
7. `FITNESS_REQUIRE_IDEMPOTENCY_KEY` اضافه شد؛ با true، خرید بدون کلید مناسب قبل از تغییر DB با خطای 422 رد می‌شود. این فلگ پیش‌فرض false است چون frontend قدیمی هنوز کلید تضمین‌شده نمی‌فرستد.
8. شناسه نسخه API و نصب‌کننده به ثابت 2.3.1 متصل شد. فرمت import بکاپ‌های 2.2.0 همچنان برای سازگاری حفظ شده است.
9. تست‌های جدید شامل طبقه‌بندی پاسخ SMS، صحت و محرمانگی رمزگذاری، تشخیص دستکاری، امنیت فایل روی دیسک، حفظ متغیرهای .env، و کلید اجباری خرید است.

## نتایج تست این بسته در محیط فعلی

| آزمایش | نتیجه |
| --- | --- |
| PHP lint | 98 از 98 موفق |
| JavaScript `node --check` | 19 از 19 موفق |
| `php artisan route:list --json` | 98 مسیر ثبت شد |
| `php artisan schedule:list` | دو وظیفه پنج‌دقیقه‌ای حاضر است |
| `php tests/static_runtime_regressions.php` | 29 از 29 PASS |
| `php tests/smoke.php` | قابل اجرا نشد: PDO driver روی میزبان تست موجود نیست |
| Installer Preflight | NO-GO برای این محیط: پسوندهای PHP/DB و `.env` سرور تعریف نشده |
| PHPUnit Feature / MySQL / callback درگاه / SMS واقعی / Browser | اجرا نشد و تأیید نشده |
| Composer audit | ابزار Composer در این محیط نصب نیست |

## هشدار برای ارتقای نصب موجود

**صرفاً فایل‌های این ZIP را مستقیم روی سایت زنده جایگزین نکنید.** ابتدا از DB، فایل‌ها و `.env` بکاپ خارج از webroot تهیه و در staging جداگانه بازیابی کنید. لازم است `BACKUP_ENCRYPTION_KEY` را در فایل `.env` قدیمی یک بار بسازید؛ برای نصب‌های جدید جادوگر نصب آن را تولید می‌کند. کلید را در هیچ گفتگو یا لاگی ارسال نکنید و در محفظه امنی خارج از سرور نگه دارید.

یک کلید استاندارد (در خط فرمان محلی امن):

```sh
php -r 'echo "base64:" . base64_encode(random_bytes(32)) . PHP_EOL;'
```

مقدار خروجی را فقط در `.env` به عنوان `BACKUP_ENCRYPTION_KEY` بگذارید و پس از تغییر پیکربندی، در صورت استفاده از config cache آن را با `php artisan config:clear` روی staging تازه‌سازی کنید.

برای تست دستی رمزگشایی Snapshot (CLI روی staging):

```sh
cd laravel_core
php installer/decrypt_snapshot.php pre_upgrade_v2.3.1_TIMESTAMP_RANDOM.vault
```

نام فایل باید دقیقاً از لیست فایل‌های واقعی در `storage/app/backups` انتخاب شود. فایل JSON رمزگشایی‌شده حساس است و نباید در public_html یا سامانه‌های اشتراک فایل عمومی قرار گیرد.

## موارد مهم که هنوز باقی‌اند

- شرط verified mobile برای **تمام خریدها** برقرار نیست: `FITNESS_REQUIRE_VERIFIED_CHECKOUT=false` تا زمان بازسازی مسیر Checkout در React. برای فعال‌سازی باید ابتدا فرانت کامل و تست end-to-end وجود داشته باشد.
- React فعلی فاقد سورس و lockfile است؛ فقط خروجی کامپایل‌شده وجود دارد.
- پرداخت واقعی زرین‌پال/SEP، تست تکرار Callback و رقابت هم‌زمان رزرو و سفارش روی MySQL اجرا نشده است.
- خروجی قدیمی backup/export به‌صورت پیش‌فرض JSON خواناست و Snapshotهای قبلی `*.json` خودکار رمزگذاری/پاک نشده‌اند. برای خروجی رمزگذاری‌شده از `?encrypted=1` استفاده کنید.
- بکاپ‌ها هنوز در حافظه PHP ساخته می‌شوند؛ بار حافظه در سایت‌های بزرگ باید بازطراحی و تست شود.
- فرایند بازیابی حساب/MFA ادمین، ویدیوی مستقیم، زمان‌بندی timezone، تست UI موبایل و Cron واقعی cPanel هنوز تکمیل نشده‌اند.
- اگر `FITNESS_REQUIRE_IDEMPOTENCY_KEY=true` را پیش از تغییر درخواست‌های frontend فعال کنید، checkout قدیمی 422 خواهد داد. تا ارتقای UI آن را false بگذارید.
- پیامک طبق نمونه API رسـید `recId` دارد، اما تعامل با حساب و الگوهای واقعی مشتری باید روی staging مستقل آزمایش شود.

## فرمان‌های راستی‌آزمایی برای هاست آزمایشی

```sh
cd laravel_core
php installer/release_preflight.php
php artisan route:list
php artisan schedule:list
php tests/static_runtime_regressions.php
# بعد از نصب PHP extensions و ابزار PHPUnit برای staging:
php vendor/bin/phpunit
composer audit
```

هیچ Migration، Restore، Callback بانکی یا درخواست واقعی SMS در جریان آماده‌سازی این بسته روی سرویس عملیاتی کاربر اجرا نشده است.
