# راهنمای استقرار و بازگشت نسخه Production

## ساخت بسته

```bash
npm ci
npm run check
```

پوشه `dist` تنها شامل Assetهای مصرفی و بهینه‌شده است و آماده انتشار است.

نسخه‌های اصلی و نام‌گذاری‌نشده تصاویر کارفرما در `assets-source/brand` نگهداری می‌شوند و عمداً وارد بسته عمومی سایت نمی‌شوند.

## استقرار پیشنهادی روی VPS

1. خروجی را در یک پوشه release جدید استخراج کنید.
2. پیش از تغییر، مقصد فعلی symlink به نام `current` را ثبت کنید.
3. symlink را اتمیک به release جدید تغییر دهید.
4. فایل نمونه `nginx.conf.example` را با دامنه واقعی و مسیر بالا فعال کنید.
5. با `nginx -t` تنظیمات را کنترل و Nginx را reload کنید.
6. سرویس‌های API و PostgreSQL را با `docker compose up --build -d` اجرا کنید و `http://127.0.0.1:3001/api/health` را کنترل کنید.
7. صفحه اصلی، `?play=1`، `?play=oak-rescue`، `/admin`، همه assets و refresh مسیرها را smoke test کنید.
8. برای HTTPS از گواهی موجود سرور یا Certbot استفاده کنید.

## سرور فعلی Demo

نسخه Demo روی سرور در `/opt/kids-web-game/dist` قرار دارد و با کانتینر `kids-web-game-demo` روی پورت `8397` سرو می‌شود. این مسیر به‌صورت read-only داخل کانتینر Nginx mount شده است.

روند امن انتشار:

1. از `dist` فعلی در `/opt/kids-web-game-backups/<timestamp>` پشتیبان بگیرید.
2. نسخه جدید را ابتدا در `dist-next` بسازید و `index.html` و پوشه `assets` را کنترل کنید.
3. `dist` و `dist-next` را جابه‌جا کنید.
4. کانتینر `kids-web-game-demo` را restart کنید تا Bind Mount دوباره resolve شود.
5. سرویس API را با `docker compose up -d --build api` به‌روزرسانی کنید.
6. برای کانتینر demo روی پورت `8397`، فایل `deploy/nginx.demo.conf` را به `/etc/nginx/conf.d/default.conf` mount کنید تا `/api/` به سرویس `api` پراکسی شود.
7. آدرس `http://SERVER_IP:8397/`، `?library=1`، `?play=1`، `?play=oak-rescue` و `/admin` را Smoke Test کنید.

## Rollback

پوشه `dist` را با نسخه ذخیره‌شده در `/opt/kids-web-game-backups/<timestamp>/dist` جایگزین و کانتینر `kids-web-game-demo` را restart کنید.

## نکته ذخیره‌سازی

پیشرفت مأموریت در LocalStorage حفظ می‌شود. رخدادهای گزارش مدیریت با شناسه‌های ناشناس در PostgreSQL ذخیره می‌شوند. فایل `.env` شامل رمز دیتابیس، هش رمز مدیر و Cookie Secret است و نباید وارد مخزن شود.

برای smoke test مستقیم قفسه کتاب‌ها، بدون تغییر LocalStorage، می‌توان از `?library=1` استفاده کرد. مسیرهای `?play=1` و `?play=oak-rescue` به‌ترتیب بازی اول و دوم را مستقیم باز می‌کنند.
