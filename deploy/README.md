# راهنمای استقرار و بازگشت نسخه اول

## ساخت بسته

```bash
npm ci
npm run lint
npm run build
```

فایل `game-web-v1-production.zip` شامل محتوای پوشه `dist` و آماده آپلود است.

نسخه‌های اصلی و نام‌گذاری‌نشده تصاویر کارفرما در `assets-source/brand` نگهداری می‌شوند و عمداً وارد بسته عمومی سایت نمی‌شوند.

## استقرار پیشنهادی روی VPS

1. بسته را در `/var/www/motefaker-game/releases/v1` استخراج کنید.
2. پیش از تغییر، مقصد فعلی symlink به نام `current` را ثبت کنید.
3. symlink را اتمیک به release جدید تغییر دهید.
4. فایل نمونه `nginx.conf.example` را با دامنه واقعی و مسیر بالا فعال کنید.
5. با `nginx -t` تنظیمات را کنترل و Nginx را reload کنید.
6. صفحه اصلی، `?play=1`، همه assets و refresh مسیرها را smoke test کنید.
7. برای HTTPS از گواهی موجود سرور یا Certbot استفاده کنید.

## Rollback

symlink `current` را به release قبلی برگردانید و Nginx را reload کنید. فایل‌های build دمو اولیه نیز در `archive/demo-before-v1/demo-build` موجودند.

## نکته ذخیره‌سازی

پیشرفت مأموریت در LocalStorage قبلی حفظ می‌شود. V1 فقط کلید مستقل `motefaker:magical-library:intro-seen:v1` را برای وضعیت مشاهده مقدمه اضافه می‌کند.

برای smoke test مستقیم قفسه کتاب‌ها، بدون تغییر LocalStorage، می‌توان از `?library=1` استفاده کرد. مسیر `?play=1` نیز بازی اول را مستقیم باز می‌کند.
