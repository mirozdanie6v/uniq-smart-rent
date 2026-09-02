from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time, os, json

root=Path(__file__).resolve().parents[1]
dist=root/'dist'

def assert_lazy_images(page, selector, limit=8):
    images=page.locator(selector)
    assert images.count() >= limit
    for i in range(limit):
        img=images.nth(i)
        img.scroll_into_view_if_needed()
        handle=img.element_handle()
        page.wait_for_function('(node)=>node.complete && node.naturalWidth>0',arg=handle,timeout=5000)

server=subprocess.Popen(['python','-m','http.server','8766','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
results=[]
try:
    time.sleep(0.6)
    with sync_playwright() as p:
        launch={'headless':True,'args':['--no-sandbox']}
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable: launch['executable_path']=executable
        browser=p.chromium.launch(**launch)
        for width,height in [(375,812),(430,932),(768,1024),(1440,900)]:
            ctx=browser.new_context(viewport={'width':width,'height':height},locale='ru-RU')
            page=ctx.new_page(); errors=[]; image_hosts=[]
            page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
            page.on('response',lambda res: image_hosts.append(res.url) if res.request.resource_type=='image' else None)
            page.goto('http://127.0.0.1:8766/',wait_until='networkidle')
            assert page.locator('[data-role="client"]').count()==1
            assert page.locator('[data-role="employee"]').count()==1
            assert page.locator('[data-role="owner"]').count()==1
            assert page.locator('.brand img').evaluate('(i)=>i.complete&&i.naturalWidth>0')
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), f'overflow {width}x{height}'

            page.locator('[data-go="catalog"]').last.click(); page.wait_for_timeout(120)
            assert page.locator('.vehicle-card').count()==89, page.locator('.vehicle-card').count()
            assert_lazy_images(page,'.vehicle-card img',8)
            page.locator('[data-open]').first.scroll_into_view_if_needed(); page.locator('[data-open]').first.click(); page.wait_for_timeout(100)
            assert page.locator('.detail').count()==1
            assert page.locator('.rate-grid').count()==1
            assert page.locator('.main-photo img').count()==1
            page.locator('.main-photo img').scroll_into_view_if_needed()
            main_handle=page.locator('.main-photo img').element_handle()
            page.wait_for_function('(node)=>node.complete && node.naturalWidth>0',arg=main_handle,timeout=5000)
            page.locator('[data-book]').first.click(); page.wait_for_timeout(80)
            form=page.locator('#bookForm'); assert form.count()==1
            form.locator('input[name="client"]').fill('QA Client')
            form.locator('input[name="contact"]').fill('+84000000000')
            form.locator('button[type="submit"]').click(); page.wait_for_timeout(100)
            assert page.locator('text=QA Client').count()>=1

            page.locator('[data-role="employee"]').click(); page.wait_for_timeout(100)
            assert page.locator('text=СОТРУДНИК').count()>=1
            page.locator('[data-go="requests"]').last.click(); page.wait_for_timeout(80)
            status=page.locator('[data-status]').first; assert status.count()==1
            status.select_option('confirmed'); page.wait_for_timeout(80)
            assert page.locator('text=Подтверждена').count()>=1
            page.locator('[data-go="fleet"]').last.click(); page.wait_for_timeout(100)
            fleet_state=page.locator('[data-fleet-state]').first; assert fleet_state.count()==1
            fleet_state.select_option('ready'); page.wait_for_timeout(80)
            assert page.locator('text=Готов к выдаче').count()>=1

            image_hosts.clear()
            page.locator('[data-role="client"]').click(); page.wait_for_timeout(80)
            page.locator('[data-go="contacts"]').last.click(); page.wait_for_timeout(120)
            assert page.locator('a[href="https://t.me/RikRent1"]').count()==1
            assert page.locator('a[href="https://zalo.me/84372112370"]').count()==1
            assert page.locator('.map-panel iframe').count()==1
            page.locator('[data-role="owner"]').click(); page.wait_for_timeout(100)
            assert page.locator('text=ВЛАДЕЛЕЦ').count()>=1
            assert page.locator('.owner-metrics').count()==1
            assert page.locator('text=Качество данных').count()==0
            assert page.locator('[data-go="system"]').count()==0
            assert not errors, errors
            external_images=[u for u in image_hosts if not u.startswith('http://127.0.0.1:8766/')]
            assert not external_images, external_images
            results.append({'viewport':f'{width}x{height}','cards':89,'logo':'local','fleet_images':'local','client_booking':'ok','employee_request_status':'ok','employee_fleet_status':'ok','owner_dashboard':'ok','contacts':'ok','owner_clean':'ok','console_errors':errors})
            ctx.close()
        browser.close()
finally:
    server.terminate(); server.wait(timeout=5)

(root/'candidate-dist-e2e-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
