"""Admin account creation in the isolated local application only."""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = 'http://127.0.0.1:5173'
OUT = Path(__file__).resolve().parents[1] / 'tmp' / 'admin-create-ui'
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    context = browser.new_context(viewport={'width': 1366, 'height': 900}, extra_http_headers={'X-Forwarded-For': '127.0.0.22'})
    assert context.request.post(BASE+'/api/admin/login', data={'password': 'change-me'}).ok
    school = context.request.get(BASE+'/api/schools').json()[0]
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(BASE+'/admin'); page.wait_for_load_state('networkidle')
    page.get_by_role('button', name='مدارس، دعوت و حساب‌ها', exact=True).click()
    form = page.locator('section').filter(has=page.get_by_role('heading', name='ایجاد حساب والد یا بازیکن', exact=True)).last.locator('form')
    suffix = str(int(time.time()))
    form.get_by_label('نام و نام خانوادگی والد', exact=True).fill('والد مرورگر '+suffix)
    form.get_by_role('checkbox').check()
    form.locator('[name=firstName]').fill('کودک')
    form.locator('[name=lastName]').fill('مرورگر')
    form.locator('[name=schoolId]').select_option(school['id'])
    form.locator('[name=username]').fill('ui_parent_'+suffix)
    form.locator('[name=password]').fill('ui-account-password')
    form.get_by_role('button', name='ایجاد حساب', exact=True).click()
    expect(page.locator('.one-time-secret textarea')).to_contain_text('ui_parent_'+suffix)
    assert context.request.get(BASE+'/api/session').json()['role'] == 'admin'
    account = next(a for a in context.request.get(BASE+'/api/admin/parents').json() if a['username']=='ui_parent_'+suffix)
    form.get_by_label('نوع حساب', exact=True).select_option('player')
    form.get_by_label('والد کودک', exact=True).select_option(account['id'])
    child = context.request.get(BASE+f"/api/admin/parents/{account['id']}/children").json()[0]
    expect(form.locator('[name=childId] option').last).to_have_attribute('value', child['id'])
    form.locator('[name=childId]').select_option(child['id'])
    form.locator('[name=username]').fill('ui_player_'+suffix)
    form.locator('[name=password]').fill('ui-account-password')
    form.get_by_role('button', name='ایجاد حساب', exact=True).click()
    expect(page.locator('.one-time-secret textarea')).to_contain_text('ui_player_'+suffix)
    expect(page.locator('.parent-management')).to_contain_text('ui_player_'+suffix)
    # A duplicate username must remain an actionable error, preserving admin session.
    form.get_by_label('نوع حساب', exact=True).select_option('parent')
    form.get_by_label('نام و نام خانوادگی والد', exact=True).fill('تکراری')
    form.locator('[name=username]').fill('ui_parent_'+suffix)
    form.locator('[name=password]').fill('ui-account-password')
    form.get_by_role('button', name='ایجاد حساب', exact=True).click()
    expect(page.get_by_role('alert')).to_contain_text('قبلاً ثبت شده')
    page.screenshot(path=str(OUT/'desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT/'mobile.png'), full_page=True)
    player = p.request.new_context(base_url=BASE)
    assert player.post('/api/auth/login', data={'username':'ui_player_'+suffix,'password':'ui-account-password'}).ok
    assert player.get('/api/session').json()['role']=='player'
    assert player.get('/api/parent/report').status==403
    assert not errors, errors
    player.dispose(); browser.close()
print('PASS admin creation UI: parent+child, existing-child player, duplicate, roles, mobile')
