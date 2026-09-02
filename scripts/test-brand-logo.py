from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "brand-logo"
OUT.mkdir(parents=True, exist_ok=True)


def assert_logo(page, selector: str) -> None:
    logo = page.locator(selector)
    logo.wait_for(state="visible")
    details = logo.evaluate(
        "element => ({src: element.getAttribute('src'), complete: element.complete, width: element.naturalWidth, height: element.naturalHeight})"
    )
    assert details["src"] == "/assets/brand/client-logo.png", details
    assert details["complete"] is True, details
    assert details["width"] > 0 and details["height"] > 0, details


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    )

    desktop = browser.new_page(viewport={"width": 1440, "height": 1000})
    desktop.goto("http://127.0.0.1:4173/", wait_until="networkidle")
    assert_logo(desktop, ".intro-logo")
    desktop.screenshot(path=str(OUT / "intro-desktop.png"), full_page=True)

    desktop.goto("http://127.0.0.1:4173/?library=1", wait_until="networkidle")
    assert_logo(desktop, ".hub-brand > img")
    desktop.screenshot(path=str(OUT / "hub-desktop.png"), full_page=True)

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto("http://127.0.0.1:4173/?library=1", wait_until="networkidle")
    assert_logo(mobile, ".hub-brand > img")
    mobile.screenshot(path=str(OUT / "hub-mobile.png"), full_page=True)

    browser.close()

print("Brand logo UI checks passed.")
