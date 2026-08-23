# Backend گزارش مدیریتی

این سرویس فقط رویدادهای ناشناس بازی را دریافت می‌کند؛ نام، سن و پروفایل کودک در قرارداد API وجود ندارد.

## اجرای محلی

1. `.env.example` را با نام `.env` کپی و سه مقدار امن آن را تنظیم کنید.
2. Docker Desktop را اجرا کنید.
3. `docker compose up -d --build` را اجرا کنید.
4. سلامت سرویس را در `http://localhost:3001/api/health` بررسی کنید.
5. رابط را با `npm run dev` اجرا و `/admin` را باز کنید.

Migration به‌صورت idempotent هنگام شروع API اجرا می‌شود. رویدادها با `event_id` یکتا deduplicate می‌شوند.

## پشتیبان‌گیری و بازگردانی

```bash
docker compose exec -T postgres pg_dump -U motefaker -d motefaker -Fc > motefaker-backup.dump
docker compose exec -T postgres pg_restore -U motefaker -d motefaker --clean --if-exists < motefaker-backup.dump
```

قبل از هر به‌روزرسانی Production پشتیبان بگیرید. برای Rollback، نسخه قبلی API را اجرا کنید؛ Migration فعلی فقط جدول/ایندکس اضافه می‌کند و داده موجود را حذف نمی‌کند.

## نکات امنیتی

- مقدار `ADMIN_PASSWORD_SHA256` باید hash شصت‌وچهارکاراکتری SHA-256 رمز قوی باشد.
- `COOKIE_SECRET` حداقل ۳۲ کاراکتر تصادفی داشته باشد.
- `COOKIE_SECURE=false` فقط برای HTTP محلی است؛ در Production و HTTPS آن را `true` کنید.
- PostgreSQL به اینترنت Publish نشده و فقط داخل شبکه Compose در دسترس API است.
- در Production، Nginx مسئول HTTPS و Proxy مسیر `/api` است.
