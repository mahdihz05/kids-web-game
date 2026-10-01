"""Full account and game smoke test against the isolated local test API."""
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE='http://127.0.0.1:5173'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tmp'/'platform-ui'
OUT.mkdir(parents=True,exist_ok=True)

def wait_turn(page):
    page.wait_for_function("() => document.querySelector('.game-app')?.getAttribute('aria-busy') === 'false'",timeout=10000)

def play_story(page,story,child_id):
    key=f'motefaker:progress:{child_id}:{story["id"]}'
    scenes={s['id']:s for s in story['scenes']}
    steps=0
    while True:
        wait_turn(page)
        progress=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
        if progress['completed']: break
        steps+=1
        assert steps<150,story['id']
        scene=scenes[progress['currentSceneId']]
        kind=scene['type']
        if progress.get('pendingConsequence'):
            page.locator('.story-panel > .primary-button').click()
        elif kind=='choice':
            best=max((c for c in scene['choices'] if not c.get('retry')),key=lambda c:c['score'])
            index=next(i for i,c in enumerate(scene['choices']) if c['id']==best['id'])
            page.locator('.choice-card').nth(index).click()
            if page.locator('.choice-confirm').count():page.locator('.choice-confirm').click()
        elif kind=='hotspot':
            for item in scene['hotspots']:
                if item['id'] not in progress['discoveries'].get(scene['id'],[]):page.get_by_role('button',name=item['label'],exact=True).click()
            page.locator('.progress-action > button').click()
        elif kind=='dragDrop':
            for i,item in enumerate(scene['dragItems']):
                if item['correct'] and item['id'] not in progress['selectedTools'].get(scene['id'],[]):page.locator('.drag-item').nth(i).click()
            page.locator('.story-panel > .primary-button').click()
        elif kind=='craft':
            for i,item in enumerate(scene['craftItems']):
                if item['id'] not in progress['craftProgress'].get(scene['id'],[]):page.locator('.craft-item').nth(i).click()
            page.locator('.story-panel > .primary-button').click()
        elif kind=='reflection':
            for i,prompt in enumerate(scene['reflectionPrompts']):
                best=max(range(len(prompt['options'])),key=lambda n:prompt['options'][n]['score'])
                page.locator('.reflection-prompt').nth(i).locator('button').nth(best).click()
            page.locator('.story-panel > .primary-button').click()
        else:page.locator('.story-panel > .primary-button').click()
    expect(page.locator('.result-panel')).to_be_visible()

with sync_playwright() as p:
    admin=p.request.new_context(base_url=BASE)
    assert admin.post('/api/admin/login',data={'password':'change-me'}).ok
    suffix=str(int(time.time()))
    school=admin.post('/api/admin/schools',data={'name':'مدرسه مرورگر '+suffix}).json()
    invite=admin.post('/api/admin/invites',data={'label':'مرورگر '+suffix,'uses':1,'days':1}).json()
    browser=p.chromium.launch(headless=True,channel='chrome')
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE);page.wait_for_load_state('networkidle')
    page.get_by_role('button',name='کد دعوت دارید؟ ثبت‌نام کنید').click()
    page.locator('[name=fullName]').fill('والد مرورگر')
    page.locator('[name=username]').fill('browser_'+suffix)
    page.locator('[name=password]').fill('browser-parent-test-password')
    page.locator('[name=inviteCode]').fill(invite['code'])
    page.get_by_role('button',name='ثبت‌نام',exact=True).click()
    expect(page.get_by_role('heading',name='امروز چه کسی بازی می‌کند؟')).to_be_visible()
    page.locator('[name=firstName]').fill('آزمایش')
    page.locator('[name=lastName]').fill('کودک')
    page.locator('[name=schoolId]').select_option(school['id'])
    page.get_by_role('button',name='ساخت پروفایل کودک').click()
    expect(page.get_by_role('button',name='ورود به کتاب‌ها')).to_be_visible()
    child=context.request.get(BASE+'/api/children').json()[0]
    page.evaluate("localStorage.setItem('motefaker:magical-library:intro-seen:v1','true')")
    page.screenshot(path=str(OUT/'children-desktop.png'),full_page=True)
    page.get_by_role('button',name='ورود به کتاب‌ها').click()
    expect(page.locator('.mission-card')).to_have_count(10)
    stories=[json.loads((ROOT/'src'/'data'/f'{name}.json').read_text(encoding='utf8')) for name in ['story','oak-rescue','missing-egg','wet-fox-house']]
    for n,story in enumerate(stories):
        page.locator('.mission-card').nth(n).locator('.wake-book').click()
        wait_turn(page)
        if n==0:
            # A failed event delivery must remain durable and later reach the server.
            page.route('**/api/play/events',lambda route:route.abort())
            page.locator('.story-panel > .primary-button').click();wait_turn(page)
            assert page.evaluate('(id)=>JSON.parse(localStorage.getItem("motefaker:outbox:v2:"+id)||"[]").length',child['id'])>0
            page.unroute('**/api/play/events');page.evaluate("window.dispatchEvent(new Event('online'))")
            page.wait_for_function('(id)=>JSON.parse(localStorage.getItem("motefaker:outbox:v2:"+id)||"[]").length===0',arg=child['id'])
        play_story(page,story,child['id'])
        for name,w,h in [('desktop',1440,1000),('mobile',390,844),('mobile-landscape',844,390),('tablet',768,1024)]:
            page.set_viewport_size({'width':w,'height':h});page.screenshot(path=str(OUT/f'{story["id"]}-result-{name}.png'),full_page=True)
            button=page.locator('.result-actions .primary-button');assert button.is_visible();button.scroll_into_view_if_needed();box=button.bounding_box();assert box and box['width']>50
            assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2')
        page.set_viewport_size({'width':1440,'height':1000})
        page.locator('.result-actions .primary-button').click()
        expect(page.locator('.mission-card')).to_have_count(10)
    # A second complete attempt is necessary for a growth line.
    page.locator('.mission-card').first.locator('.wake-book').click();play_story(page,stories[0],child['id'])
    page.locator('.result-actions .primary-button').click()
    page.get_by_role('button',name='گزارش رشد',exact=True).click()
    expect(page.locator('.growth-plot')).to_be_visible(timeout=15000)
    page.screenshot(path=str(OUT/'parent-growth-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});page.screenshot(path=str(OUT/'parent-growth-mobile.png'),full_page=True)
    assert not errors,errors
    page.goto(BASE+'/admin');page.wait_for_load_state('networkidle')
    page.locator('input[type=password]').fill('change-me');page.get_by_role('button',name='ورود امن').click()
    expect(page.get_by_role('heading',name='کاربران',exact=True)).to_be_visible()
    page.get_by_label('شناسه کاربر').fill(child['publicId'])
    expect(page.get_by_role('button',name='مشاهده عملکرد')).to_have_count(1)
    page.get_by_role('button',name='مشاهده عملکرد').click()
    expect(page.get_by_role('heading',name='عملکرد در هر مرحله')).to_be_visible()
    page.screenshot(path=str(OUT/'admin-user-mobile.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1000});page.screenshot(path=str(OUT/'admin-user-desktop.png'),full_page=True)
    with page.expect_download() as download:page.get_by_role('link',name='دریافت Excel با همین فیلترها').click()
    download.value.save_as(str(OUT/'ui-export.xlsx'))
    assert not errors,errors
    browser.close();admin.dispose()
print('PASS browser: registration, child creation, four missions, offline retry, replay, growth chart, responsive reports and XLSX download')
