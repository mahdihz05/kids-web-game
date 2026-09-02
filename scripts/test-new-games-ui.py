from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "new-games-ui"
OUT.mkdir(parents=True, exist_ok=True)
BASE_URL = "http://127.0.0.1:5173"


def wait_turn(page):
    page.wait_for_timeout(50)
    page.wait_for_function("() => document.querySelector('.game-app')?.getAttribute('aria-busy') === 'false'", timeout=8000)


def click_text(page, text):
    page.get_by_text(text, exact=True).first.click()
    wait_turn(page)


def assert_in_view(page):
    stage = page.locator(".game-stage").bounding_box()
    panel = page.locator(".story-panel").bounding_box()
    assert stage and panel
    assert panel["x"] >= -2 and panel["y"] >= -2
    assert panel["x"] + panel["width"] <= page.viewport_size["width"] + 2
    assert panel["y"] + panel["height"] <= page.viewport_size["height"] + 2


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    page = browser.new_page(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    page.route("**/api/events", lambda route: route.fulfill(status=202, content_type="application/json", body='{"accepted":1}'))
    page.goto(f"{BASE_URL}/?play=missing-egg", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    page.evaluate("localStorage.removeItem('magical-library:progress:missing-egg')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    if page.get_by_text("مشکل خانم لاک‌پشت را پیدا کنیم", exact=False).count() < 1:
        raise AssertionError(page.locator("body").inner_text())
    assert_in_view(page)
    page.screenshot(path=str(OUT / "missing-egg-desktop.png"), full_page=True)

    click_text(page, "مشکل خانم لاک‌پشت را پیدا کنیم ←")
    click_text(page, "تخم گم شده")
    assert "درسته! یکی از تخم‌ها نیست" in page.locator(".scene-prompt").inner_text()
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "missing-egg-feelings.png"), full_page=True)
    click_text(page, "خیلی نگران")
    assert "خیلی نگران تخمش" in page.locator(".scene-prompt").inner_text()
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "missing-egg-clues-v2.png"), full_page=True)
    for label in ["ردپا", "برگ‌های خم‌شده", "جای قل خوردن"]:
        page.get_by_role("button", name=label, exact=True).click()
    click_text(page, "چرا هر سه را بررسی کنیم؟")
    page.screenshot(path=str(OUT / "missing-egg-why-all-v2.png"), full_page=True)
    click_text(page, "هنوز نمی‌دانند")
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "missing-egg-clue-results-v2.png"), full_page=True)
    for label in ["ردپا", "برگ‌های خم‌شده", "جای قل خوردن"]:
        page.get_by_role("button", name=label, exact=True).click()
    click_text(page, "نشانهٔ ادامه‌دار را انتخاب کنیم")
    page.screenshot(path=str(OUT / "missing-egg-paths-v2.png"), full_page=True)
    click_text(page, "رد قل خوردن")
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "missing-egg-tools-v2.png"), full_page=True)
    for label in ["چرخ", "دو آینه", "چوب بلند", "طناب"]:
        page.locator(".drag-item", has_text=label).click()
    click_text(page, "بریم بسازیم ←")
    page.screenshot(path=str(OUT / "missing-egg-craft-v2.png"), full_page=True)
    for index in range(4):
        item = page.locator(".craft-item").nth(index)
        item.wait_for(state="visible")
        assert item.is_enabled()
        item.evaluate("element => element.click()")
        page.wait_for_function("expected => document.querySelector('.craft-counter')?.textContent?.includes(expected)", arg=str(index + 1))
    click_text(page, "چوب آینه‌ای آماده شد! ←")
    if "تخم را از پشت برگ‌ها بیرون بیاوریم" not in page.locator(".story-panel").inner_text():
        raise AssertionError(page.locator(".story-panel").inner_text())
    page.screenshot(path=str(OUT / "missing-egg-discovery-v2.png"), full_page=True)
    click_text(page, "تخم را از پشت برگ‌ها بیرون بیاوریم ←")
    if "ببینیم چطور به تخم رسیدیم" not in page.locator(".story-panel").inner_text():
        raise AssertionError(page.locator(".story-panel").inner_text())
    page.screenshot(path=str(OUT / "missing-egg-celebration-v2.png"), full_page=True)
    click_text(page, "ببینیم چطور به تخم رسیدیم ←")
    page.screenshot(path=str(OUT / "missing-egg-final-question-v2.png"), full_page=True)
    click_text(page, "سرنخ و ابزار")
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "missing-egg-reflection-v2.png"), full_page=True)

    page.goto(f"{BASE_URL}/?play=wet-fox-house", wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    page.evaluate("localStorage.removeItem('magical-library:progress:wet-fox-house')")
    page.reload(wait_until="domcontentloaded")
    page.wait_for_load_state("domcontentloaded")
    assert page.get_by_text("مشکل اصلی روبی را پیدا کنیم", exact=False).count() >= 1
    assert_in_view(page)
    page.screenshot(path=str(OUT / "wet-fox-desktop.png"), full_page=True)
    click_text(page, "مشکل اصلی روبی را پیدا کنیم ←")
    click_text(page, "چند راه ورود آب")
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "wet-fox-feelings.png"), full_page=True)
    click_text(page, "نگران")
    click_text(page, "ادامه ←")
    for label in ["زیر در", "پنجره", "سقف"]:
        page.get_by_role("button", name=label, exact=True).click()
    page.screenshot(path=str(OUT / "wet-fox-clues-v2.png"), full_page=True)
    click_text(page, "راه مقایسه را پیدا کنیم")
    page.screenshot(path=str(OUT / "wet-fox-measure-method-v2.png"), full_page=True)
    click_text(page, "ظرف و پیمانهٔ یکسان")
    click_text(page, "ادامه ←")
    assert "۶ قسمت پیمانه" in page.locator(".scene-prompt").inner_text()
    page.screenshot(path=str(OUT / "wet-fox-measurement-v3.png"), full_page=True)
    click_text(page, "مهم‌ترین مشکل را انتخاب کنیم ←")
    click_text(page, "زیر در")
    click_text(page, "ادامه ←")
    for label in ["حوله", "کیسهٔ پلاستیکی", "کاموا"]:
        page.locator(".drag-item", has_text=label).click()
    page.screenshot(path=str(OUT / "wet-fox-tools-v2.png"), full_page=True)
    click_text(page, "بریم بسازیم ←")
    for index in range(3):
        item = page.locator(".craft-item").nth(index)
        item.wait_for(state="visible")
        assert item.is_enabled()
        item.evaluate("element => element.click()")
        page.wait_for_function("expected => document.querySelector('.craft-counter')?.textContent?.includes(expected)", arg=str(index + 1))
    click_text(page, "مانع آماده شد! ←")
    assert "هنوز آب وارد خانه می‌شود" in page.locator(".scene-prompt").inner_text()
    page.screenshot(path=str(OUT / "wet-fox-after-barrier-v3.png"), full_page=True)
    click_text(page, "اولویت تازه را پیدا کنیم ←")
    click_text(page, "پنجره")
    click_text(page, "ادامه ←")
    page.screenshot(path=str(OUT / "wet-fox-relief-v1.png"), full_page=True)
    click_text(page, "حالا جشن بگیریم ←")
    assert "ببینیم چرا اولویت عوض شد" in page.locator(".story-panel").inner_text()

    for story_id, width, height, name in [
        ("missing-egg", 390, 844, "missing-egg-mobile"),
        ("wet-fox-house", 768, 1024, "wet-fox-tablet"),
    ]:
        page.set_viewport_size({"width": width, "height": height})
        page.goto(f"{BASE_URL}/?play={story_id}", wait_until="domcontentloaded")
        page.wait_for_load_state("domcontentloaded")
        assert_in_view(page)
        page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)

    browser.close()

print("PASS: New games UI paths passed on desktop, tablet and mobile.")
