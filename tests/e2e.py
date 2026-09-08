from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import urlparse
import subprocess, time, json, os

root=Path(__file__).resolve().parents[1]
dist=root/'dist'
assert (dist/'index.html').exists()
assert not (dist/'app-v2.js').exists()
assert list((dist/'assets').glob('index-*.js'))
assert (dist/'assets/fleet-manifest.js').exists()
assert (dist/'brand/uniq-logo.svg').exists()
assert (dist/'i18n.js').exists()
assert (dist/'i18n.css').exists()
assert (dist/'header-language.js').exists()
assert (dist/'header-language.css').exists()

def assert_lazy_images(page, selector, limit=6):
    images=page.locator(selector)
    assert images.count() >= limit
    for i in range(limit):
        img=images.nth(i)
        img.scroll_into_view_if_needed()
        handle=img.element_handle()
        page.wait_for_function('(node)=>node.complete && node.naturalWidth>0', arg=handle, timeout=5000)

def capture_console_error(errors, msg):
    if msg.type != 'error':
        return
    text=msg.text
    google_maps_noise=(
        'maps.googleapis.com' in text or
        ('Failed to load resource: net::ERR_FAILED' in text and 'google' in msg.location.get('url',''))
    )
    if not google_maps_noise:
        errors.append(text)

server=subprocess.Popen(['python','-m','http.server','8764','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
results=[]
try:
    time.sleep(.5)
    with sync_playwright() as p:
        launch={"headless":True,"args":["--no-sandbox"]}
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable: launch['executable_path']=executable
        browser=p.chromium.launch(**launch)
        for w,h in [(320,568),(375,667),(390,844),(430,932),(768,1024),(1024,1366),(1440,900),(1920,1080)]:
            ctx=browser.new_context(viewport={"width":w,"height":h},locale='ru-RU')
            page=ctx.new_page(); errors=[]
            page.on('console',lambda msg: capture_console_error(errors,msg))
            page.goto('http://127.0.0.1:8764/',wait_until='networkidle')
            assert page.locator('#root .shell').count()==1
            assert page.locator('.brand img').count()==1
            assert page.locator('[data-role="client"]').count()==1
            assert page.locator('[data-role="employee"]').count()==1
            assert page.locator('[data-role="owner"]').count()==1
            assert page.locator('#uniqLanguageSelect').count()==1
            assert page.locator('.topbar .header-language-switcher select').count()==1
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),f'horizontal overflow at {w}x{h}'

            if w==375:
                language=page.locator('.topbar .header-language-switcher select')
                checks=[
                    ('vi','Toàn bộ đội xe UNIQ','vi'),
                    ('en','The entire UNIQ fleet','en'),
                    ('ko','UNIQ 전체 차량','ko'),
                    ('zh','UNIQ 全部车队','zh-CN'),
                    ('ru','Весь парк UNIQ','ru'),
                ]
                for code,text,html_lang in checks:
                    language.select_option(code)
                    page.wait_for_timeout(30)
                    assert page.get_by_text(text,exact=False).count()>=1,(code,text)
                    assert page.evaluate('document.documentElement.lang')==html_lang
                results.append({"scenario":"languages","languages":["ru","vi","en","ko","zh"],"switcher":"header","engine":"react"})

            page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(80)
            assert page.locator('.topbar .header-language-switcher select').count()==1
            assert page.locator('.vehicle-card').count()==89
            assert_lazy_images(page,'.vehicle-card img',6)
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),f'catalog overflow at {w}x{h}'
            assert not errors, errors
            results.append({"viewport":f"{w}x{h}","catalog":89,"local_images":"ok","header_language":"ok","overflow":"ok","engine":"react"})
            ctx.close()

        ctx=browser.new_context(viewport={"width":1440,"height":900},locale='ru-RU')
        page=ctx.new_page(); errors=[]
        page.on('console',lambda msg: capture_console_error(errors,msg))
        page.goto('http://127.0.0.1:8764/',wait_until='networkidle')
        page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(80)
        page.locator('.vehicle-card').first.scroll_into_view_if_needed(); page.locator('.vehicle-card').first.click(); page.wait_for_timeout(80)
        assert page.locator('.detail').count()==1
        assert page.locator('.rate-grid').count()==1
        assert page.locator('.topbar .header-language-switcher select').count()==1
        page.locator('.main-photo img').scroll_into_view_if_needed()
        main_handle=page.locator('.main-photo img').element_handle()
        page.wait_for_function('(node)=>node.complete && node.naturalWidth>0',arg=main_handle,timeout=5000)
        page.locator('[data-book]').first.click(); page.wait_for_timeout(50)
        form=page.locator('#bookForm'); assert form.count()==1
        form.locator('input[name="client"]').fill('QA Rider')
        form.locator('input[name="contact"]').fill('+84000000000')
        form.locator('button[type="submit"]').click(); page.wait_for_timeout(80)
        assert page.locator('text=QA Rider').count()>=1

        page.locator('[data-role="employee"]').click(); page.wait_for_timeout(80)
        assert page.locator('text=СОТРУДНИК').count()>=1
        assert page.locator('.topbar .header-language-switcher select').count()==1
        page.locator('[data-go="requests"]').last.click(); page.wait_for_timeout(80)
        status=page.locator('[data-status]').first; assert status.count()==1
        status.select_option('confirmed'); page.wait_for_timeout(80)
        assert page.locator('text=Подтверждена').count()>=1
        page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(80)
        fleet_state=page.locator('[data-fleet-state]').first; assert fleet_state.count()==1
        fleet_state.select_option('ready'); page.wait_for_timeout(80)
        assert page.locator('text=Готов к выдаче').count()>=1
        page.locator('[data-go="handover"]').last.click(); page.wait_for_timeout(80)
        assert page.locator('text=QA Rider').count()>=1

        page.locator('[data-role="client"]').click(); page.wait_for_timeout(80)
        page.locator('[data-go="contacts"]').last.click(); page.wait_for_timeout(120)
        assert page.locator('.topbar .header-language-switcher select').count()==1
        assert page.locator('a[href="https://t.me/RikRent1"]').count()==1
        assert page.locator('a[href="https://zalo.me/84372112370"]').count()==1
        assert page.locator('.map-panel iframe').count()==1
        page.locator('[data-role="owner"]').click(); page.wait_for_timeout(80)
        assert page.locator('text=Пульс бизнеса').count()>=1
        assert page.locator('.topbar .header-language-switcher select').count()==1
        assert page.locator('text=Качество данных').count()==0
        assert page.locator('[data-go="system"]').count()==0
        assert not errors, errors
        results.append({"scenario":"client+employee+owner","booking":"ok","status_flow":"ok","fleet_state":"ok","handover":"ok","contacts":"ok","owner_clean":"ok","header_language":"ok","engine":"react","console_errors":errors})
        ctx.close()

        # Stage 3: owner fleet CRUD with an in-memory API contract.
        api_state={}
        def fleet_api(route):
            request=route.request
            path=urlparse(request.url).path
            method=request.method
            if path=='/api/fleet-overrides' and method=='GET':
                route.fulfill(status=200,content_type='application/json',body=json.dumps({'vehicles':list(api_state.values())}))
                return
            if path=='/api/owner/fleet' and method=='POST':
                vehicle=json.loads(request.post_data or '{}')
                api_state[vehicle['id']]=vehicle
                route.fulfill(status=200,content_type='application/json',body=json.dumps({'vehicle':vehicle,'persisted':True}))
                return
            if path.startswith('/api/owner/fleet/') and method=='PATCH':
                vehicle_id=path.rsplit('/',1)[-1]
                payload=json.loads(request.post_data or '{}')
                vehicle=api_state.get(vehicle_id)
                if vehicle is None:
                    route.fulfill(status=404,content_type='application/json',body='{"error":"vehicle_not_found"}')
                    return
                if payload.get('action')=='archive':
                    vehicle={**vehicle,'archivedAt':'2026-09-08T14:00:00.000Z','published':False,'ownerManaged':True}
                elif payload.get('action')=='restore':
                    vehicle={**vehicle,'archivedAt':None,'ownerManaged':True}
                api_state[vehicle_id]=vehicle
                route.fulfill(status=200,content_type='application/json',body=json.dumps({'vehicle':vehicle,'persisted':True}))
                return
            if path.startswith('/api/owner/fleet/') and method=='DELETE':
                vehicle_id=path.rsplit('/',1)[-1]
                api_state.pop(vehicle_id,None)
                route.fulfill(status=200,content_type='application/json',body='{"removed":true,"persisted":true}')
                return
            route.fulfill(status=404,content_type='application/json',body='{"error":"not_found"}')

        ctx=browser.new_context(viewport={"width":390,"height":844},locale='ru-RU')
        page=ctx.new_page(); errors=[]
        page.route('**/api/**',fleet_api)
        page.on('console',lambda msg: capture_console_error(errors,msg))
        page.goto('http://127.0.0.1:8764/',wait_until='networkidle')
        page.locator('[data-role="owner"]').click(); page.wait_for_timeout(80)
        page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(100)
        assert page.locator('[data-owner-add-vehicle]').count()==1
        assert page.locator('[data-owner-vehicle]').count()==89

        # Edit an existing vehicle and verify the new price reaches the client catalog.
        existing=page.locator('[data-owner-vehicle]').first
        existing_id=existing.get_attribute('data-owner-vehicle')
        assert existing_id
        existing.locator('[data-owner-edit]').click(); page.wait_for_timeout(50)
        assert page.locator('[data-owner-editor]').count()==1
        page.locator('[data-owner-daily]').fill('1234567')
        page.locator('[data-owner-save]').click(); page.wait_for_timeout(100)
        assert page.get_by_text('Изменения сохранены.',exact=True).count()==1
        page.locator('.owner-editor .modal-x').click(); page.wait_for_timeout(40)
        page.locator('[data-role="client"]').click(); page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(100)
        changed_card=page.locator(f'.vehicle-card[data-open="{existing_id}"]')
        assert changed_card.count()==1
        price_digits=''.join(ch for ch in changed_card.locator('.vehicle-top b').inner_text() if ch.isdigit())
        assert price_digits.startswith('1234567'),price_digits

        # Reset the base-vehicle override.
        page.locator('[data-role="owner"]').click(); page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(80)
        existing=page.locator(f'[data-owner-vehicle="{existing_id}"]')
        existing.locator('[data-owner-edit]').click(); page.wait_for_timeout(40)
        assert page.get_by_role('button',name='Сбросить изменения').count()==1
        page.get_by_role('button',name='Сбросить изменения').click(); page.wait_for_timeout(100)
        assert page.locator('[data-owner-editor]').count()==0

        # Add a new published vehicle.
        page.locator('[data-owner-add-vehicle]').click(); page.wait_for_timeout(40)
        editor=page.locator('[data-owner-editor]')
        editor.locator('[data-owner-title]').fill('QA Demo Scooter')
        editor.get_by_label('Марка').fill('QA')
        editor.get_by_label('Модель').fill('Demo 125')
        editor.get_by_label('Двигатель').fill('125 cc')
        editor.locator('[data-owner-daily]').fill('650000')
        editor.locator('[data-owner-save]').click(); page.wait_for_timeout(100)
        assert page.get_by_text('Изменения сохранены.',exact=True).count()==1
        custom_id=editor.locator('[data-owner-save]').evaluate('(button)=>button.closest("form").querySelector("[data-owner-title]").value')
        assert custom_id=='QA Demo Scooter'
        page.locator('.owner-editor .modal-x').click(); page.wait_for_timeout(50)
        custom_row=page.locator('[data-owner-vehicle]').filter(has_text='QA Demo Scooter')
        assert custom_row.count()==1
        created_id=custom_row.get_attribute('data-owner-vehicle')
        assert created_id and created_id.startswith('custom-')

        page.locator('[data-role="client"]').click(); page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(100)
        assert page.get_by_text('QA Demo Scooter',exact=True).count()==1
        assert page.locator('.vehicle-card').count()==90

        # Archive it: it must disappear from the customer catalog immediately.
        page.locator('[data-role="owner"]').click(); page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(80)
        custom_row=page.locator(f'[data-owner-vehicle="{created_id}"]')
        custom_row.locator('[data-owner-edit]').click(); page.wait_for_timeout(40)
        page.get_by_role('button',name='Архивировать').click(); page.wait_for_timeout(100)
        assert page.get_by_text('Техника перемещена в архив.',exact=True).count()==1
        page.locator('.owner-editor .modal-x').click(); page.wait_for_timeout(40)
        page.locator('[data-role="client"]').click(); page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(80)
        assert page.get_by_text('QA Demo Scooter',exact=True).count()==0
        assert page.locator('.vehicle-card').count()==89

        # Remove the temporary QA entry and leave the test state clean.
        page.locator('[data-role="owner"]').click(); page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(80)
        custom_row=page.locator(f'[data-owner-vehicle="{created_id}"]')
        custom_row.locator('[data-owner-edit]').click(); page.wait_for_timeout(40)
        page.get_by_role('button',name='Удалить навсегда').click(); page.wait_for_timeout(100)
        assert page.get_by_text('QA Demo Scooter',exact=True).count()==0
        assert not errors,errors
        results.append({"scenario":"stage3-owner-fleet","edit_existing":"ok","catalog_sync":"ok","add_vehicle":"ok","archive":"ok","delete":"ok","api_contract":"ok","console_errors":errors})
        ctx.close(); browser.close()
finally:
    server.terminate(); server.wait(timeout=5)

(root/'e2e-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))