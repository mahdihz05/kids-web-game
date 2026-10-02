# Motefaker / کتابفروشی سحرآمیز متفکر

A Persian, RTL story game for children, built with React, TypeScript and a data-driven story engine. The current package is **v2.0.0**: private parent/player accounts, child profiles, server-backed progress and administrator reporting. Four missions are active; six books remain locked for future content. The stories target ages 5–8; the account schema accepts ages 3–18, which is not a claim that the content is suitable for that entire range.

## Current implementation and evidence

- Story packages in `src/data/` define scenes, choices, consequences and scoring; `src/engine/` executes them.
- `src/main.tsx` opens `AccountPortal`. Parents register with an invitation or an administrator creates accounts. A parent can create a separate player login linked to one child.
- `server/accounts.ts` implements account access, child profiles, game runs, ordered events and filtered `.xlsx` reports. `server/index.ts` retains aggregate reporting and `.docx` exports.
- The server reconstructs actions with the game engine rather than trusting a browser-provided score. Gameplay scores and trend charts describe game performance, not a validated developmental assessment.
- The repository has story/contract checks and PostgreSQL account/reporting integration tests. The workflow runs these checks; its badge is CI evidence, not a production-availability or security certification.

## v1 versus v2 data

| Area | Earlier v1 | Current v2 |
| --- | --- | --- |
| Access | Browser-local play | Parent or child-linked player account |
| Progress | LocalStorage | PostgreSQL game runs plus browser-local progress and a per-child event outbox |
| Events | Random device/run identifiers without name or age fields | Authenticated run events linked to a stored child profile |
| Reporting | Aggregate activity and Word export | Individual results, age/school/child-ID filters, parent history and Excel export; aggregate/Word reporting remains |
| Hosting | Static files for local-only play; API for analytics | Static frontend **and** Node.js API **and** PostgreSQL, with `/api/` served through the same origin |

The legacy `analytics_events` table contains device/run identifiers, story/scene/choice identifiers and timestamps, without child-name or age columns. These are the historical "anonymous game events" described in v1, not a blanket anonymity guarantee. Current `POST /api/events` returns `410 upgrade_required`; v2 uses authenticated `POST /api/play/events`. Old events are not attributed to a child profile. The aggregate report combines legacy events with v2 events; an aggregate presentation does not make the underlying v2 records anonymous.

V2 stores parent name, username and password hash, child first/last name, age, school, preset emoji avatar and a `K-…` public identifier. Runs snapshot age, school and scoring version, and events link to the child through the run. Authorized individual reports and Excel exports can contain names and identifiers. Editing a profile does not rewrite the age/school snapshot of a past run. See [accounts and reports](docs/ACCOUNTS-AND-REPORTS.md), [API source](server/accounts.ts) and [SQL migrations](server/migrations/).

### Access, retention and deletion limits

These notes describe the checked-in implementation, not an audit of a live deployment:

- Server checks restrict parent reports to the parent's children, player actions/history to the linked child, and management reports/exports to administrator sessions.
- Account sessions have an eight-hour expiry. Logout deletes the current session row; an administrator password reset deletes that account's sessions. Disabling an account blocks its access and deletes its account sessions, but **does not delete profiles, runs or events**.
- The inspected API and migrations do not implement a child/account erasure endpoint or a timed retention/purge job for profiles, runs or game events. Session expiry is not data erasure. A production retention schedule, deletion process, backup lifetime and handling of exported reports are not established by this repository; the operator must decide and document them before collecting real child data.
- Browser storage includes per-child progress (`motefaker:progress:<childId>:<storyId>`), queued events (`motefaker:outbox:v2:<childId>`), intro state and possibly legacy v1 keys. Conflict recovery can preserve an outbox backup under `motefaker:conflict-backup:…`. Clearing site data removes browser-local copies and may lose unsent events; it does **not** erase data already sent to PostgreSQL. Logout is not a browser-storage purge.

No regulatory-compliance, complete anonymity or guaranteed deletion claim is made here.

## Local development and hosting

Use Node.js 22 and npm; the backend uses PostgreSQL 17. For local development, configure `.env` from `.env.example` with private values (`COOKIE_SECURE=false` only for local HTTP), then:

```bash
npm ci
docker compose up -d --build
npm run dev
```

The root Compose file starts the API and PostgreSQL; Vite serves the frontend at `http://localhost:5173` and proxies `/api` to port `3001`. The account portal requires a working API, even if the frontend itself is served as static files. Do not publish development credentials or `.env`.

```bash
npm run check
# Only with DATABASE_URL pointing to a separate database ending in _test:
npm run test:platform
```

`check` includes contract/story checks, lint, server typechecking and the frontend build; it does not include `test:platform`. Integration tests create data and must never target a real-user database. Browser-test prerequisites are in [accounts and reports](docs/ACCOUNTS-AND-REPORTS.md).

For current full-stack hosting use [the v2 handoff guide](docs/HANDOFF-DEPLOYMENT.md). The frontend build produces `dist/`, not the API or database. Production needs HTTPS, same-origin frontend/API routing, private environment values and a persistent PostgreSQL volume. The handoff Compose path and the root development Compose path are alternatives, not interchangeable upgrades of an existing installation. Preserve the existing database volume and environment when updating; application rollback and database restoration are separate operations. This README does not verify any demo's uptime or current deployment state.

The older PDF and short text guides remain linked below for reference; their static-only/v1 data descriptions do not override the current v2 source or handoff guide. `server/README.md` also retains a v1-only data description; use the v2 accounts guide and source for the current account model.

## Client brand and assets

Motefaker names, logos, characters, stories, illustrations and related visual/narrative assets belong to the client brand. Their presence here does not permit copying, redistribution, resale, model training or reuse in another project without the brand owner's prior written permission. See [BRAND-ASSETS.md](BRAND-ASSETS.md). Dependency licenses are separate; this README grants no new asset or software license. Existing image references are retained below; no new images have been added.

## راهنمای فارسی نسخهٔ فعلی

<div dir="rtl" align="right">

# 📚 کتابفروشی سحرآمیز متفکر

> **نسخهٔ ۲٫۰:** حساب والد و بازیکن، پروفایل کودک، ثبت‌نام دعوتی یا ساخت مستقیم حساب توسط مدیر، پیشرفت سرور و گزارش فردی/Excel در نسخهٔ فعلی وجود دارند. راهنمای داده و حساب‌ها: [حساب‌ها و گزارش عملکرد](docs/ACCOUNTS-AND-REPORTS.md)؛ مرجع استقرار: [راهنمای تحویل نسخهٔ ۲](docs/HANDOFF-DEPLOYMENT.md).

بازی داستانی و آموزشی فارسی برای کودکان ۵ تا ۸ سال؛ کودک با کمک «کوکی متفکر» در چهار مأموریت، مشاهده، تصمیم‌گیری، مقایسه، اندازه‌گیری و اصلاح مسیر را تمرین می‌کند.

## راهنمای تحویل و انتشار آنلاین

- راهنمای کامل تصویری و قدم‌به‌قدم: [`راهنما/راهنمای-کامل-راه‌اندازی-و-تحویل.pdf`](راهنما/راهنمای-کامل-راه‌اندازی-و-تحویل.pdf)
- راهنمای کوتاه متنی: [`راهنما/راهنمای-سریع.txt`](راهنما/راهنمای-سریع.txt)
- کاربر نهایی فقط دامنهٔ سایت را در مرورگر باز می‌کند و نیازی به نصب برنامه ندارد.
- مسئول انتشار با `npm ci`، سپس `npm run check` و `npm run build` پوشهٔ آمادهٔ `dist/` را می‌سازد.
- `dist/` فقط رابط کاربری است؛ نسخهٔ ۲ علاوه بر آن به API با Node.js، PostgreSQL و پراکسی هم‌مبدأ `/api/` نیاز دارد. هاست صرفاً استاتیک برای حساب و بازی فعلی کافی نیست. راهنمای PDF و متن کوتاه ممکن است توضیحات نسخهٔ ۱ داشته باشند؛ برای انتشار فعلی از [`docs/HANDOFF-DEPLOYMENT.md`](docs/HANDOFF-DEPLOYMENT.md) استفاده کنید.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![RTL](https://img.shields.io/badge/UI-Persian%20RTL-1652e8)
![CI](https://github.com/mahdihz05/kids-web-game/actions/workflows/ci.yml/badge.svg)

![نمای مأموریت هدیه تولد مادربزرگ](public/assets/scenes-v3/grandma-gift-v3.png)

## وضعیت نسخه

این مخزن شامل نسخهٔ قابل‌انتشار چهار مأموریت فعال است:

- مقدمه برند و معرفی کوکی متفکر
- قفسه ۱۰ کتاب با چهار مأموریت فعال و ۶ مأموریت قفل
- یک داستان کامل ۱۵ صحنه‌ای در ۶ مرحله آموزشی
- دو مسیر «گردنبند» و «گل»؛ مسیر گل پیامد و امکان اصلاح تصمیم دارد
- نتیجه، نشان «فکرکننده‌ی خوب»، پنج شاخص مهارتی و گزارش والدین
- مأموریت دوم «راه نجات بلوط‌ها» با سه مسیر قابل‌آزمایش، پیامد، اصلاح تصمیم، ساخت تور و بازاندیشی نهایی
- مأموریت سوم «جست‌وجوی تخم گمشده» با بررسی سه سرنخ، انتخاب مسیر ادامه‌دار و ساخت چوب آینه‌ای
- مأموریت چهارم «خانه خیس روباه» با اندازه‌گیری ۵/۳/۱، اولویت‌بندی، ساخت مانع و اندازه‌گیری دوبارهٔ ۱/۳/۱
- گزارش مدیریتی با کنترل نقش در سرور، آمار تجمیعی، گزارش فردی، فیلتر سن/مدرسه/شناسه و خروجی Word و Excel

تولید محتوای ۶ مأموریت قفل‌شدهٔ بعدی در محدوده این نسخه نیست؛ حساب‌های والد، بازیکن و مدیر در نسخهٔ ۲ پیاده‌سازی شده‌اند.

## امکانات اصلی

- رابط کاملاً فارسی، RTL و Responsive برای موبایل، تبلت و دسکتاپ
- تشخیص مشکل، شناخت احساس، مقایسه پیامدها و انتخاب دلیل
- کشف سرنخ‌های تصویری در باغ
- انتخاب چند ابزار صحیح: بلوط، نخ و صبر
- مینی‌تعامل ساخت گردنبند
- شاخه انتخاب گل، واکنش باغبان و بازگشت بدون بن‌بست
- انتخاب اولیهٔ گل مستقیماً باغبان را نشان می‌دهد و سؤال دلیل فقط مسیر گردنبند را همراهی می‌کند
- سؤال خلاف‌واقع و فعالیت «دو ستاره و یک آرزو»
- ذخیره پیشرفت و رویدادها در سرور، همراه نسخهٔ محلی پیشرفت و صف ارسال اختصاصی کودک در LocalStorage
- ادامه بازی پس از Refresh و Replay بدون دوبرابرشدن ستاره‌ها
- دکمهٔ «بشنو» با پشتیبانی از فایل صوتی محلی و گویش فارسی مرورگر به‌عنوان حالت جایگزین
- ورود حساب والد برای گزارش خانواده؛ حساب بازیکن به گزارش والد یا مدیر دسترسی ندارد
- مجموعه تصاویر اختصاصی PNG/WebP بدون fallback یا تکرار میان گزینه‌های یک صفحه
- نمایش کامل تصاویر بدون کشیدگی یا برش مخرب در دسکتاپ، تبلت و موبایل
- ورق‌خوردن ۸۵۰ میلی‌ثانیه‌ای مبتنی بر `animationend` با قفل ورودی
- حالت Reduced Motion با Fade کوتاه

## جریان آموزشی مأموریت اول

```text
کشف مشکل و تولد مادربزرگ
          ↓
شناخت احساس پشمالو
          ↓
کشف گل و بلوط در باغ
          ↓
مقایسه هدیه‌ها و دلیل انتخاب
          ↓
انتخاب نهایی هدیه
       ↙             ↘
  انتخاب گل        انتخاب گردنبند
پیامد باغبان       انتخاب ابزار
اصلاح تصمیم            ↓
بازگشت به انتخاب    ساخت هدیه
       ↘             ↙
       دریافت هدیه توسط مادربزرگ
                    ↓
   سؤال پایانی + دو ستاره و یک آرزو
                    ↓
             نشان و گزارش رشد
```

## تکنولوژی و معماری

| بخش | پیاده‌سازی |
|---|---|
| رابط | React 19 + TypeScript |
| Build | Vite 8 |
| Story Engine | موتور داده‌محور اختصاصی |
| Styling | CSS خالص، RTL و Responsive |
| ذخیره | PostgreSQL برای پیشرفت/رویدادهای نسخهٔ ۲؛ LocalStorage برای پیشرفت محلی و صف ارسال |
| تصویر | PNG/WebP اختصاصی، Manifest مرکزی و Preload صحنه |
| Backend | Fastify + PostgreSQL برای حساب، پروفایل کودک، پیشرفت و گزارش فردی/تجمیعی |

منطق بازی از محتوای داستان جداست. صحنه‌ها، انتخاب‌ها، امتیازها، پیامدها و اتصال مسیرها در فایل‌های `src/data/story.json`، `src/data/oak-rescue.json`، `src/data/missing-egg.json` و `src/data/wet-fox-house.json` تعریف می‌شوند و React فقط Snapshot موتور را نمایش می‌دهد.

```text
GameEngine
├── SceneManager        مدیریت صحنه و مسیر
├── ChoiceSystem        ثبت انتخاب، تلاش مجدد و پیامد
├── InteractionSystem   سرنخ‌ها و ابزارهای چندگانه
├── ScoreSystem         امتیاز و ستاره
├── SaveSystem          ذخیره و بازیابی پیشرفت
└── ProfileSystem       پروفایل، نتیجه و گزارش رشد
```

## ساختار پروژه

```text
kids-web-game/
├── .github/workflows/ci.yml
├── deploy/                    # راهنمای Nginx و Rollback
├── public/assets/
│   ├── brand/                 # نشان، کوکی، دوستان و چوب جادویی
│   ├── characters/            # شخصیت‌های شفاف رابط
│   ├── choices/               # تصاویر مستقل گزینه‌ها و بازاندیشی
│   ├── fonts/                 # فونت فارسی محلی
│   ├── scenes/                # تصاویر اولیه صحنه‌ها
│   ├── scenes-v3/             # صحنه‌های نهایی با هویت ثابت پشمالو
│   └── tools/                 # ابزارهای مستقل و بلوط ساخت
├── scripts/
│   ├── test-story.mjs         # تست گراف هر چهار مأموریت و شاخه‌ها
│   ├── validate-v1.mjs        # اعتبارسنج قرارداد و Assetها
│   └── visual-audit.mjs       # ثبت نماهای Responsive
├── server/                    # API حساب‌ها، پیشرفت و گزارش‌ها
├── src/
│   ├── components/
│   ├── data/story.json
│   ├── data/oak-rescue.json
│   ├── data/missing-egg.json
│   ├── data/wet-fox-house.json
│   ├── engine/
│   ├── game/assets.ts
│   ├── styles/global.css
│   └── types/story.ts
└── package.json
```

## اجرای محلی

پیش‌نیاز: Node.js 22، npm، PostgreSQL 17 و تنظیمات خصوصی `.env.example`. دستورهای زیر فقط رابط توسعه را اجرا می‌کنند؛ پیش از بازی، API و پایگاه داده نیز باید طبق بخش انگلیسی یا راهنمای حساب‌ها اجرا شوند.

```bash
git clone https://github.com/mahdihz05/kids-web-game.git
cd kids-web-game
npm ci
npm run dev
```

آدرس‌های کاربردی:

- صفحه اصلی: `http://localhost:5173/`
- قفسه پس از ورود حساب و انتخاب کودک: `http://localhost:5173/?library=1`
- مأموریت اول پس از ورود حساب و انتخاب کودک: `http://localhost:5173/?play=1`
- مأموریت دوم پس از ورود حساب و انتخاب کودک: `http://localhost:5173/?play=oak-rescue`
- مأموریت سوم پس از ورود حساب و انتخاب کودک: `http://localhost:5173/?play=missing-egg`
- مأموریت چهارم پس از ورود حساب و انتخاب کودک: `http://localhost:5173/?play=wet-fox-house`
- گزارش مدیریت: `http://localhost:5173/admin`

## کنترل کیفیت

```bash
# تست گراف داستان و هر دو مسیر
npm test

# قرارداد رسپانسیو تصاویر در پنج اندازه
npm run test:responsive

# قرارداد رویدادها و گزارش مدیریت
npm run test:analytics

# اعتبارسنج قرارداد، صحنه‌ها و Assetها
npm run validate:v1

# کنترل TypeScript/ESLint
npm run lint

# ساخت Production
npm run build

# اجرای Build نهایی
npm run preview

# کنترل‌های پروژه و Build؛ آزمون یکپارچه test:platform جداست
npm run check
```

تست داستان موارد زیر را پوشش می‌دهد:

- دسترسی‌پذیری هر ۱۵ صحنه
- معتبر بودن تمام مقصدهای `nextScene`
- پایان موفق هر دو شاخه گل و گردنبند
- رفتن مستقیم انتخاب گل به صحنهٔ باغبان، بدون نمایش سؤال دلیل
- باقی‌ماندن پاسخ‌های Retry در همان صحنه
- عبور مسیر گل از پیامد و اصلاح تصمیم
- الزام هم‌زمان سه ابزار صحیح
- وجود سه پاسخ «دو ستاره و یک آرزو»
- محاسبهٔ صحیح سرنخ‌ها در پنج نمای دسکتاپ، تبلت عمودی/افقی و موبایل عمودی/افقی
- یکتا بودن تصاویر گزینه‌ها و ابزارها، وجود فایل‌ها و نبود fallback

## تصاویر و طراحی Responsive

تمام تصاویر داستان از Manifest مرکزی `src/game/assets.ts` خوانده می‌شوند. تصویر اصلی هر صحنه داخل یک قاب انعطاف‌پذیر با `object-fit: contain` نمایش داده می‌شود؛ در نتیجه کل تصویر در هر نسبت صفحه قابل مشاهده است و فضای اضافه با پس‌زمینهٔ محو همان صحنه پر می‌شود.

| نما | رفتار تصاویر و کنترل‌ها |
|---|---|
| دسکتاپ، از ۱۲۰۰px | تصویر تمام‌صفحه و پنل گزینه‌ها در پایین، مطابق رابط اولیه |
| تبلت افقی، ۷۶۸ تا ۱۱۹۹px | تصویر ۵۶٪ و پنل ۴۴٪ در دو ستون مستقل |
| تبلت عمودی، ۷۶۸ تا ۱۱۹۹px | تصویر ۴۴٪ بالا و پنل ۵۶٪ پایین |
| موبایل عمودی، تا ۷۶۷px | تصویر ۴۰٪ بالا و پنل ۶۰٪ پایین، گزینه‌های بدون اسکرول |
| موبایل افقی کوتاه | تصویر ۴۲٪ و پنل ۵۸٪ کنار هم، بدون هم‌پوشانی |

قواعد اصلی تصاویر:

- هیچ تصویر داستانی کشیده نمی‌شود و نسبت اصلی خود را حفظ می‌کند.
- در تبلت و موبایل تصویر و پنل روی هم قرار نمی‌گیرند؛ دسکتاپ عمداً از پنل پایین روی تصویر، مطابق رابط اولیه، استفاده می‌کند.
- تصاویر گزینه‌ها و بازاندیشی با `object-fit: contain` کامل دیده می‌شوند.
- ابزارها و بلوط‌های ساخت روی زمینهٔ شفاف و در قاب مربعی قرار می‌گیرند.
- سرنخ‌های گل و بلوط بر اساس محدودهٔ واقعی تصویر `contain` موقعیت‌گذاری می‌شوند.
- هیچ کامپوننتی برای تصاویر `width` یا `height` ثابت HTML ندارد.

## داده و ذخیره‌سازی

نسخهٔ ۲ نام والد و نام/نام خانوادگی/سن/مدرسه/آواتار انتخابی کودک را در سرور ثبت می‌کند. پیشرفت و رویدادهای بازی به نوبت و کودک متصل‌اند؛ گزارش مجاز می‌تواند هویت و نتیجه را کنار هم نمایش دهد. داده‌های ناشناس قدیمی نسخهٔ ۱ جدا نگهداری می‌شوند و به کودک نسبت داده نمی‌شوند. مسیر قدیمی `/api/events` پاسخ 410 می‌دهد؛ رویداد فعلی از `/api/play/events` ارسال می‌شود. کلید پیشرفت نسخهٔ ۲:

```text
motefaker:progress:<childId>:grandmas-birthday-gift
```

صف ارسال رویداد و وضعیت مقدمه نیز در LocalStorage نگهداری می‌شوند. پاک‌کردن داده‌های سایت فقط نسخه‌های محلی را حذف می‌کند و ممکن است رویدادهای ارسال‌نشده از دست بروند؛ دادهٔ ثبت‌شده در سرور حذف نمی‌شود. غیرفعال‌کردن حساب یا خروج، حذف پروفایل و نتایج نیست. API و مهاجرت‌های بررسی‌شده حذف حساب/کودک یا پاک‌سازی زمان‌بندی‌شدهٔ دادهٔ بازی را پیاده‌سازی نمی‌کنند؛ مدت نگهداری، حذف عملیاتی، عمر پشتیبان و خروجی‌ها باید توسط مسئول استقرار تعیین شوند. جزئیات دسترسی و محدودیت‌ها در بخش انگلیسی بالاست.

## استقرار Production

```bash
npm ci
npm run check
```

خروجی رابط در `dist/` ساخته می‌شود. برای ورود حساب، بازی و گزارش نسخهٔ ۲، سرویس‌های `postgres` و `api` ضروری‌اند؛ `/api/` باید روی همان مبدأ رابط پراکسی شود. مرجع نصب تازه و به‌روزرسانی نسخهٔ فعلی [`docs/HANDOFF-DEPLOYMENT.md`](docs/HANDOFF-DEPLOYMENT.md) است؛ روش سرور موجود و rollback در [`deploy/README.md`](deploy/README.md) آمده است. حفظ volume و تنظیمات موجود ضروری است.

## دسترس‌پذیری

- نواحی لمس مناسب کودک
- Focus قابل مشاهده برای صفحه‌کلید
- `aria-label` و `aria-live` برای کنترل‌ها و بازخوردها
- قفل ورودی هنگام Transition
- پشتیبانی از `prefers-reduced-motion`
- Safe Area موبایل و چیدمان فشرده مسیر شش‌مرحله‌ای

## مالکیت و استفاده از Assetها

شخصیت‌ها، لوگو، نام‌ها، داستان و سایر دارایی‌های برند «متفکر» متعلق به کارفرما هستند. وجود فایل‌ها در این مخزن به معنی اجازه استفاده مجدد، فروش، آموزش مدل یا استفاده در پروژه دیگر نیست. توضیحات کامل در [`BRAND-ASSETS.md`](BRAND-ASSETS.md) آمده است.

## توسعه مأموریت‌های بعدی

برای افزودن مأموریت جدید:

1. یک Story Package مطابق قرارداد `src/types/story.ts` بسازید.
2. صحنه‌ها و مسیرهای بدون بن‌بست را تعریف کنید.
3. تصاویر بهینه را در `public/assets/scenes` قرار دهید.
4. کلید تصاویر را در `src/game/assets.ts` ثبت کنید.
5. مأموریت را به Registry قفسه اضافه کنید.
6. تست گراف داستان و هر دو شاخه را بنویسید.

## مأموریت دوم و گزارش مدیریتی

- مأموریت دوم «راه نجات بلوط‌ها» از قفسه فعال است و ذخیره/Replay مستقل از مأموریت اول دارد.
- صفحه مدیر در `/admin` گزارش تجمیعی شروع، تکمیل، ریزش مرحله، انتخاب‌ها، Replay و میانگین زمان و همچنین گزارش فردی و فیلتر سن/مدرسه/شناسه را نمایش می‌دهد؛ دادهٔ پایهٔ نسخهٔ ۲ به کودک متصل است.
- خروجی Word با همان ساختار جدول‌محور نمونه کارفرما و با فیلتر امروز، ۷ روز، ۳۰ روز یا همه تولید می‌شود.
- رویدادهای فعلی با نشست معتبر و شناسهٔ نوبت ثبت می‌شوند و به پروفایل ذخیره‌شدهٔ کودک متصل‌اند؛ ادعای «نام و سن به API فرستاده نمی‌شود» فقط مربوط به قرارداد قدیمی رویدادهای نسخهٔ ۱ بود.
- چک‌لیست قابل پیگیری توسعه در [`IMPLEMENTATION-CHECKLIST.md`](IMPLEMENTATION-CHECKLIST.md) قرار دارد.

برای اجرای Backend محلی، مقادیر `.env.example` را در `.env` امن تنظیم کنید و سپس اجرا کنید:

```bash
docker compose up --build -d
npm run dev
```

Vite درخواست‌های `/api` را به پورت `3001` می‌فرستد. در Production نیز نمونه Nginx همین مسیر را به API متصل می‌کند.

</div>
