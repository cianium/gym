# مرحله دوم — ثبت‌نام OTP ورزشکار

- صفحه ثبت‌نام: `/athlete/register`
- API: `POST /api/v1/athlete/otp/request` و `POST /api/v1/athlete/register`
- مهاجرت دیتابیس: `2026_11_09_000005_create_athlete_phone_verifications.php`
- تنظیمات لازم: `ATHLETE_MELIPAYAMAK_TOKEN` و `ATHLETE_MELIPAYAMAK_BODY_ID` در `.env`
- قبل از استفاده: قالب و ترتیب آرگومان و پاسخ واقعی سرویس ملی پیامک را در محیط آزمایشی بررسی کنید. کد ارسال‌شده به لاگ وارد نمی‌شود. در صورت پاسخ تأییدنشده، ثبت‌نام متوقف می‌شود.
- تست اجراشده: بررسی Syntax PHP. تست واقعی پیامک، دیتابیس و مرورگر انجام نشده است.
- این نسخه آماده انتشار نهایی نیست.
