from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "راهنما"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT = OUT_DIR / "راهنمای-کامل-راه‌اندازی-و-تحویل.pdf"

FONT_REGULAR = ROOT / "public/assets/fonts/Vazirmatn-Regular.ttf"
FONT_BOLD = ROOT / "public/assets/fonts/Vazirmatn-Bold.ttf"
pdfmetrics.registerFont(TTFont("Vazir", str(FONT_REGULAR)))
pdfmetrics.registerFont(TTFont("VazirBold", str(FONT_BOLD)))

BLUE = colors.HexColor("#1652E8")
CYAN = colors.HexColor("#35BDF2")
ORANGE = colors.HexColor("#FF6A00")
PURPLE = colors.HexColor("#6841AB")
INK = colors.HexColor("#302746")
MUTED = colors.HexColor("#71677D")
CREAM = colors.HexColor("#FFF9EC")
PALE_BLUE = colors.HexColor("#ECF8FF")
PALE_PURPLE = colors.HexColor("#F2ECFF")
GREEN = colors.HexColor("#4E9B55")

def fa(text):
    return get_display(arabic_reshaper.reshape(str(text)))

styles = {
    "title": ParagraphStyle("title", fontName="VazirBold", fontSize=23, leading=36, textColor=colors.white, alignment=TA_CENTER, spaceAfter=8),
    "subtitle": ParagraphStyle("subtitle", fontName="Vazir", fontSize=11, leading=22, textColor=colors.white, alignment=TA_CENTER),
    "h1": ParagraphStyle("h1", fontName="VazirBold", fontSize=18, leading=29, textColor=BLUE, alignment=TA_RIGHT, spaceBefore=4, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="VazirBold", fontSize=13, leading=23, textColor=PURPLE, alignment=TA_RIGHT, spaceBefore=8, spaceAfter=6),
    "body": ParagraphStyle("body", fontName="Vazir", fontSize=9.5, leading=19, textColor=INK, alignment=TA_RIGHT, spaceAfter=6),
    "bullet": ParagraphStyle("bullet", fontName="Vazir", fontSize=9.2, leading=18, textColor=INK, alignment=TA_RIGHT, rightIndent=6, spaceAfter=3),
    "note": ParagraphStyle("note", fontName="Vazir", fontSize=9, leading=17, textColor=INK, alignment=TA_RIGHT),
    "code": ParagraphStyle("code", fontName="Courier", fontSize=8.5, leading=14, textColor=colors.HexColor("#17345C"), alignment=TA_LEFT),
    "small": ParagraphStyle("small", fontName="Vazir", fontSize=7.5, leading=13, textColor=MUTED, alignment=TA_RIGHT),
}

def P(text, style="body"):
    return Paragraph(fa(text), styles[style])

def bullet(text):
    return Paragraph(fa("• " + text), styles["bullet"])

def code(text):
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
    return Table([[Paragraph(safe, styles["code"])]], colWidths=[165*mm], style=TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#F2F7FC")),
        ("BOX", (0,0), (-1,-1), 0.7, colors.HexColor("#BCD5EA")),
        ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))

def callout(title, text, color=PALE_BLUE):
    return Table([[P(title, "h2")], [P(text, "note")]], colWidths=[165*mm], style=TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), color), ("BOX", (0,0), (-1,-1), 1, CYAN),
        ("LEFTPADDING", (0,0), (-1,-1), 10), ("RIGHTPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))

def page_decor(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setFillColor(BLUE)
        canvas.rect(0, height-12*mm, width, 12*mm, fill=1, stroke=0)
        canvas.setFont("VazirBold", 8)
        canvas.setFillColor(colors.white)
        canvas.drawRightString(width-16*mm, height-8*mm, fa("کتابفروشی سحرآمیز متفکر - راهنمای تحویل"))
        canvas.setFillColor(PURPLE)
        canvas.rect(0, 0, width, 10*mm, fill=1, stroke=0)
        canvas.setFont("Vazir", 8)
        canvas.setFillColor(colors.white)
        canvas.drawCentredString(width/2, 4*mm, fa(f"صفحه {doc.page}"))
    canvas.restoreState()

doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=20*mm, bottomMargin=16*mm,
                        title="Kids Web Game Delivery Guide", author="Motefaker Kids Web Game")
story = []

# Cover
cover_img = ROOT / "public/assets/scenes-v3/grandma-gift-v3.png"
logo = ROOT / "public/assets/brand/client-logo.png"
story.append(Spacer(1, 7*mm))
story.append(Table([[P("راهنمای کامل انتشار آنلاین و تحویل", "title")], [P("بازی آموزشی هدیه تولد مادربزرگ", "subtitle")]],
                   colWidths=[174*mm], style=TableStyle([("BACKGROUND", (0,0), (-1,-1), BLUE), ("BOX", (0,0), (-1,-1), 0, BLUE),
                   ("TOPPADDING", (0,0), (-1,0), 18), ("BOTTOMPADDING", (0,-1), (-1,-1), 15)])))
story.append(Spacer(1, 8*mm))
img = Image(str(cover_img), width=174*mm, height=101*mm, kind="proportional")
story.append(Table([[img]], colWidths=[174*mm], style=TableStyle([("BOX", (0,0), (-1,-1), 3, CYAN), ("BACKGROUND", (0,0), (-1,-1), CREAM), ("ALIGN", (0,0), (-1,-1), "CENTER")])) )
story.append(Spacer(1, 9*mm))
story.append(callout("این فایل برای چه کسی است؟", "این راهنما برای کارفرما، مدیر مجموعه یا مسئول هاست نوشته شده است تا پروژه را با دستورهای مشخص بسازد، روی اینترنت منتشر کند و بعداً با روش امن به‌روزرسانی کند.", PALE_PURPLE))
story.append(Spacer(1, 7*mm))
story.append(P("نسخه نهایی - شامل ساخت پروژه، انتشار آنلاین، دامنه، به‌روزرسانی، rollback و چک‌لیست تحویل", "small"))
story.append(PageBreak())

# 1
story += [P("۱. این پروژه چیست؟", "h1"),
          P("این پروژه یک بازی داستانی فارسی برای کودکان ۵ تا ۸ سال است. کودک به پشمالو کمک می‌کند برای تولد مادربزرگ هدیه انتخاب کند، نتیجه انتخاب گل را ببیند، ابزارهای لازم را پیدا کند و گردنبند بلوط بسازد."),
          P("کارهای انجام‌شده", "h2"),
          bullet("بازطراحی مأموریت اول در ۱۵ صحنه و ۶ مرحله آموزشی."),
          bullet("ساخت تصاویر اختصاصی و هماهنگ برای احساسات، گزینه‌ها، ابزارها و پایان داستان."),
          bullet("اصلاح مسیر گل: انتخاب گل مستقیم به باغبان می‌رود و کودک سپس راه دیگری انتخاب می‌کند."),
          bullet("حفظ کتاب داستان، دکمه شنیدن، ذخیره خودکار و گزارش والدین."),
          bullet("چیدمان مستقل برای دسکتاپ، تبلت عمودی و افقی، موبایل عمودی و افقی."),
          bullet("تست گراف داستان، فایل‌های تصویری، Responsive، lint و build نهایی."),
          Spacer(1, 4*mm),
          callout("نسخه آنلاین آماده", "برای مشاهده فوری، مرورگر را باز کنید و این نشانی را وارد کنید:  http://141.11.1.223:8397/", PALE_BLUE),
          P("اجزای بسته تحویل", "h2")]
data = [[P("فایل یا پوشه", "note"), P("کاربرد", "note")],
        [Paragraph("dist/", styles["code"]), P("نسخه آماده اجرا و انتشار")],
        [Paragraph("src/", styles["code"]), P("کد اصلی برنامه برای توسعه")],
        [Paragraph("public/assets/", styles["code"]), P("تصاویر، فونت‌ها و دارایی‌های بازی")],
        [Paragraph("deploy/", styles["code"]), P("نمونه تنظیم Nginx و روش انتشار امن")],
        [Paragraph("راهنما/", styles["code"]), P("PDF و راهنمای سریع")]]
story.append(Table(data, colWidths=[55*mm,110*mm], style=TableStyle([("BACKGROUND",(0,0),(-1,0),PURPLE),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#D8CFE9")),("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])))
story.append(PageBreak())

# 2 workflow
story += [P("۲. مسیر انتشار آنلاین در یک نگاه", "h1"),
          callout("هدف نهایی", "کاربر نهایی هیچ فایلی نصب نمی‌کند؛ فقط نشانی سایت را در مرورگر باز می‌کند. دستورهای این راهنما فقط یک بار توسط مسئول انتشار در Terminal یا SSH اجرا می‌شوند.", CREAM),
          P("پنج قدم اصلی", "h2"),
          bullet("فایل ZIP یا مخزن GitHub را روی سیستم انتشار یا سرور دریافت کنید."),
          bullet("با npm وابستگی‌ها را نصب و تست‌های پروژه را اجرا کنید."),
          bullet("فرمان build را اجرا کنید تا پوشه dist ساخته شود."),
          bullet("محتوای dist را روی هاست استاتیک، Nginx یا سرویس ابری منتشر کنید."),
          bullet("دامنه، HTTPS، صفحه اصلی و مسیرهای بازی را کنترل کنید."),
          P("چه چیزی روی سرور قرار می‌گیرد؟", "h2"),
          P("فقط فایل‌های داخل پوشه dist برای نمایش سایت لازم‌اند. پوشه‌های src و node_modules، فایل ZIP، رمزها و کلیدهای SSH نباید داخل پوشه عمومی سایت قرار بگیرند."),
          code("PROJECT SOURCE  -- npm run build -->  dist/  -- upload -->  ONLINE WEBSITE"),
          Spacer(1,5*mm),
          callout("دو انتخاب میزبانی", "اگر هاست معمولی دارید، محتوای dist را در public_html قرار دهید. اگر VPS دارید، روش Nginx صفحه ۵ را اجرا کنید. سرویس‌هایی مانند Netlify و Cloudflare Pages نیز می‌توانند مستقیماً از GitHub build بگیرند.", PALE_BLUE)]
story.append(PageBreak())

# 3 commands
story += [P("۳. ساخت نسخه آماده انتشار با Command Line", "h1"),
          P("پیش‌نیاز", "h2"),
          P("روی دستگاهی که build را انجام می‌دهد، Node.js نسخه ۲۰ یا جدیدتر و npm لازم است. با دو فرمان زیر آماده‌بودن محیط را کنترل کنید."),
          code("node --version\nnpm --version"),
          P("دریافت پروژه از ZIP", "h2"),
          P("ZIP را Extract کنید، Terminal را داخل پوشه اصلی پروژه باز کنید و سپس دستورها را به‌ترتیب اجرا کنید."),
          code("cd kids-web-game\nnpm ci\nnpm run check\nnpm run build"),
          P("دریافت پروژه از GitHub", "h2"),
          code("git clone https://github.com/mahdihz05/kids-web-game.git\ncd kids-web-game\nnpm ci\nnpm run check\nnpm run build"),
          callout("نشانه موفقیت", "در پایان باید پیام build موفق نمایش داده شود و پوشه dist شامل index.html و پوشه assets باشد. اگر npm run check خطا داد، انتشار را متوقف کنید و ابتدا خطا را برطرف کنید.", PALE_BLUE),
          P("بازبینی موقت پیش از انتشار", "h2"),
          code("npm run preview -- --host 0.0.0.0"),
          P("این فرمان فقط برای بازبینی است و روش دائمی انتشار نیست. برای سایت آنلاین از هاست استاتیک یا Nginx استفاده کنید.")]
story.append(PageBreak())

# 4 shared hosting
story += [P("۴. انتشار روی هاست معمولی یا کنترل‌پنل", "h1"),
          P("اگر هاست پوشه‌ای مانند public_html یا www دارد، محتوای داخل dist باید در همان پوشه قرار گیرد؛ خود پوشه dist را یک لایه اضافه آپلود نکنید."),
          P("آپلود با SSH از Command Line", "h2"),
          P("مقادیر USER، HOST و مسیر مقصد را از شرکت هاست بگیرید و جایگزین کنید."),
          code("scp -r dist/* USER@HOST:/home/USER/public_html/"),
          P("آپلود سریع‌تر با rsync", "h2"),
          code("rsync -avz dist/ USER@HOST:/home/USER/public_html/"),
          P("کنترل فایل‌های مقصد", "h2"),
          code("ssh USER@HOST\nls -lah /home/USER/public_html/\nexit"),
          P("تنظیم دامنه", "h2"),
          bullet("دامنه را در کنترل‌پنل به همین پوشه متصل کنید."),
          bullet("رکورد DNS دامنه را طبق IP یا CNAME اعلام‌شده توسط هاست تنظیم کنید."),
          bullet("گواهی رایگان HTTPS را از بخش SSL کنترل‌پنل فعال کنید."),
          bullet("پس از انتشار، آدرس اصلی، ?library=1 و ?play=1 را باز کنید."),
          callout("نکته SPA", "اگر هاست برای مسیرهای ناشناخته خطای 404 می‌دهد، از پشتیبانی بخواهید fallback همه مسیرها به index.html را فعال کند. فایل نمونه Nginx داخل پوشه deploy قرار دارد.", CREAM)]
story.append(PageBreak())

# 5 VPS
story += [P("۵. انتشار آنلاین روی VPS با Nginx", "h1"),
          P("این روش برای سروری است که دسترسی SSH و Nginx دارد. ابتدا build صفحه ۳ را بسازید و یک نام نسخه تاریخ‌دار انتخاب کنید."),
          P("۱ - ارسال خروجی به سرور", "h2"),
          code("scp -r dist USER@SERVER:/tmp/kids-web-game-dist"),
          P("۲ - ساخت release روی سرور", "h2"),
          code("ssh USER@SERVER\nsudo mkdir -p /var/www/kids-web-game/releases/20260816\nsudo cp -a /tmp/kids-web-game-dist/. /var/www/kids-web-game/releases/20260816/\nsudo ln -sfn /var/www/kids-web-game/releases/20260816 /var/www/kids-web-game/current"),
          P("۳ - فعال‌سازی تنظیم Nginx", "h2"),
          P("فایل deploy/nginx.conf.example را کپی کنید و example.com را با دامنه واقعی عوض کنید. سپس:"),
          code("sudo nginx -t\nsudo systemctl reload nginx"),
          P("۴ - فعال‌سازی HTTPS", "h2"),
          code("sudo certbot --nginx -d example.com -d www.example.com"),
          P("۵ - کنترل نهایی", "h2"),
          code("curl -I https://example.com/\ncurl -I 'https://example.com/?play=1'"),
          callout("نکته امنیتی", "USER، SERVER و example.com فقط نمونه‌اند. رمز، کلید SSH و اطلاعات سرور را داخل PDF، ZIP یا GitHub قرار ندهید و دسترسی را جداگانه تحویل دهید.", CREAM)]
story.append(PageBreak())

# 6 updates
story += [P("۶. به‌روزرسانی امن و بازگشت به نسخه قبل", "h1"),
          P("به‌روزرسانی کد", "h2"),
          code("git pull\nnpm ci\nnpm run check\nnpm run build"),
          P("انتشار بدون دست‌زدن به نسخه فعال", "h2"),
          bullet("نسخه جدید را ابتدا در یک release تاریخ‌دار یا پوشه dist-next آپلود کنید."),
          bullet("وجود index.html و assets را کنترل کنید."),
          bullet("نسخه فعلی را پاک نکنید؛ نام یا مسیر آن را برای rollback نگه دارید."),
          bullet("پس از کنترل، symlink یا مسیر فعال وب‌سرور را به release جدید تغییر دهید."),
          bullet("صفحه اصلی، قفسه، بازی و refresh را smoke test کنید."),
          P("Rollback روی VPS", "h2"),
          code("sudo ln -sfn /var/www/kids-web-game/releases/PREVIOUS /var/www/kids-web-game/current\nsudo nginx -t\nsudo systemctl reload nginx"),
          P("Rollback روی هاست معمولی", "h2"),
          P("پوشه public_html فعلی را قبل از انتشار به نامی تاریخ‌دار بکاپ بگیرید. در صورت خطا، محتوای نسخه جدید را کنار بگذارید و محتویات بکاپ را به public_html برگردانید."),
          callout("قاعده مهم", "تا زمانی که نسخه جدید کامل تست نشده، نسخه آنلاین سالم را حذف یا overwrite نکنید. همیشه یک نسخه قبلی قابل‌بازگشت نگه دارید.", PALE_PURPLE)]
story.append(PageBreak())

# 7 data
story += [P("۷. داده‌ها، حریم خصوصی و نگهداری", "h1"),
          P("ذخیره پیشرفت کودک", "h2"),
          P("پیشرفت بازی در LocalStorage همان مرورگر ذخیره می‌شود. اطلاعات به سرور دیگری ارسال نمی‌شود. اگر داده‌های سایت یا مرورگر پاک شود، پیشرفت محلی نیز حذف خواهد شد."),
          code("magical-library:progress:grandmas-birthday-gift"),
          P("صدا", "h2"),
          P("دکمه بشنو از فایل صوتی محلی پشتیبانی می‌کند. اگر فایل صوتی تعریف نشده باشد، برنامه از صدای فارسی مرورگر استفاده می‌کند. کیفیت و در دسترس بودن صدای جایگزین به دستگاه و مرورگر وابسته است."),
          P("مرورگر پیشنهادی", "h2"),
          bullet("نسخه جدید Google Chrome، Microsoft Edge، Firefox یا Safari."),
          bullet("JavaScript و پخش صدا در مرورگر فعال باشد."),
          bullet("برای موبایل، حالت عمودی و افقی هر دو پشتیبانی می‌شوند."),
          P("پشتیبان‌گیری", "h2"),
          bullet("قبل از هر انتشار از dist فعلی یک نسخه تاریخ‌دار نگه دارید."),
          bullet("نسخه منبع را در Git نگه دارید و تغییرات را با commit مشخص ثبت کنید."),
          bullet("پوشه node_modules را داخل ZIP تحویل قرار ندهید؛ با npm ci دوباره ساخته می‌شود."),
          callout("مالکیت تصاویر", "شخصیت‌ها، نام‌ها، داستان و تصاویر برند متفکر متعلق به کارفرما هستند و نباید بدون اجازه در پروژه دیگری استفاده شوند.", PALE_PURPLE)]
story.append(PageBreak())

# 8 Troubleshooting
story += [P("۸. رفع خطاهای رایج در انتشار آنلاین", "h1")]
issues = [
    ("صفحه سفید است", "Console مرورگر و Network را بررسی کنید؛ معمولاً فایل‌های assets ناقص آپلود شده‌اند یا base URL درست نیست."),
    ("npm ci خطا می‌دهد", "نسخه Node.js را با node --version کنترل کنید و از نسخه ۲۰ یا جدیدتر استفاده کنید."),
    ("دامنه باز نمی‌شود", "DNS را کنترل کنید؛ انتشار تغییرات DNS ممکن است چند ساعت زمان ببرد."),
    ("Refresh خطای 404 می‌دهد", "fallback وب‌سرور به index.html فعال نیست؛ تنظیم try_files نمونه Nginx را اعمال کنید."),
    ("صدا پخش نمی‌شود", "یک بار روی صفحه کلیک کنید، صدای دستگاه را بررسی کنید و مرورگر جدیدتری امتحان کنید."),
    ("پیشرفت قبلی دیده نمی‌شود", "پیشرفت به همان مرورگر و همان نشانی وابسته است. مرورگر یا آدرس متفاوت، فضای ذخیره جدا دارد."),
    ("تصاویر قدیمی دیده می‌شوند", "صفحه را با Ctrl+F5 تازه‌سازی کنید یا Cache سایت را پاک کنید."),
]
rows = [[P("مشکل", "note"), P("راه‌حل", "note")]] + [[P(a,"note"), P(b,"note")] for a,b in issues]
story.append(Table(rows, colWidths=[48*mm,117*mm], repeatRows=1, style=TableStyle([("BACKGROUND",(0,0),(-1,0),BLUE),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.5,colors.HexColor("#C9DDF0")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)])))
story += [Spacer(1,5*mm), P("اطلاعاتی که برای پشتیبانی آماده کنید", "h2"), bullet("نشانی دقیق سایت و زمان بروز خطا."), bullet("خروجی npm run check یا nginx -t."), bullet("نام و نسخه مرورگر."), bullet("تصویر صفحه و متن خطای Console مرورگر.")]
story.append(PageBreak())

# 9 checklist
story += [P("۹. چک‌لیست نهایی انتشار و تحویل", "h1"),
          P("پیش از آنلاین‌کردن", "h2"),
          bullet("دستورهای npm ci، npm run check و npm run build بدون خطا تمام شوند."),
          bullet("پوشه dist شامل index.html و assets باشد."),
          bullet("PDF و راهنمای سریع داخل پوشه راهنما باشند."),
          bullet("نسخه قبلی سایت با نام تاریخ‌دار بکاپ گرفته شود."),
          P("پس از آنلاین‌شدن", "h2"),
          bullet("مسیر گل، باغبان، انتخاب مجدد، ابزار و ساخت هدیه بررسی شوند."),
          bullet("دسکتاپ، تبلت و موبایل بررسی شوند."),
          bullet("صفحه اصلی، ?library=1 و ?play=1 باز شوند."),
          bullet("HTTPS فعال باشد و refresh صفحه خطای 404 ندهد."),
          P("فایل‌ها و اطلاعاتی که جداگانه تحویل داده می‌شوند", "h2"),
          bullet("ZIP پروژه."), bullet("نشانی نسخه آنلاین."), bullet("نشانی مخزن GitHub و commit نهایی."), bullet("دسترسی سرور فقط از مسیر امن و جداگانه."),
          Spacer(1,5*mm),
          callout("وضعیت این نسخه", "نسخه تحویلی شامل مأموریت اول کامل است. ۹ کتاب بعدی در رابط نمایش داده می‌شوند اما محتوای آن‌ها هنوز تولید نشده است. Backend و حساب کاربری آنلاین نیز جزو این نسخه نیستند.", CREAM),
          Spacer(1,7*mm),
          Table([[P("انتشار موفق", "h1")], [P("پس از این مراحل، کاربر نهایی فقط با بازکردن دامنه در مرورگر از بازی استفاده می‌کند و به نصب هیچ فایل یا برنامه‌ای نیاز ندارد.", "body")]], colWidths=[165*mm], style=TableStyle([("BACKGROUND",(0,0),(-1,-1),PALE_BLUE),("BOX",(0,0),(-1,-1),2,GREEN),("LEFTPADDING",(0,0),(-1,-1),12),("RIGHTPADDING",(0,0),(-1,-1),12),("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8)]))]

doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)
print("PDF guide generated successfully.")
