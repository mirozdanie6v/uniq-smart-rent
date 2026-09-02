from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time, os, json

root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1','--directory',str(root)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
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
            page=ctx.new_page(); errors=[]
            page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
            page.goto('http://127.0.0.1:8765/preview/v2/index.html',wait_until='networkidle')
            assert page.locator('[data-role="client"]').count()==1
            assert page.locator('[data-role="team"]').count()==1
            assert page.locator('[data-role="owner"]').count()==1
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), f'overflow {width}x{height}'
            page.locator('[data-route="catalog"]').last.click()
            page.wait_for_timeout(100)
            assert page.locator('.vehicle-card').count()==89, page.locator('.vehicle-card').count()
            loaded=page.locator('.vehicle-card img').evaluate_all('(imgs)=>imgs.slice(0,8).every(i=>i.complete&&i.naturalWidth>0)')
            assert loaded, 'first fleet images failed to load locally'
            first=page.locator('[data-open-vehicle]').first
            first.click(); page.wait_for_timeout(80)
            assert page.locator('.vehicle-detail').count()==1
            assert page.locator('.rate-grid').count()==1
            assert page.locator('.main-photo img').count()==1
            page.locator('[data-book]').first.click()
            form=page.locator('#bookingForm'); assert form.count()==1
            form.locator('input[name="name"]').fill('QA Client')
            form.locator('input[name="contact"]').fill('+84000000000')
            form.locator('button[type="submit"]').click(); page.wait_for_timeout(100)
            assert page.locator('text=QA Client').count()>=1
            page.locator('[data-role="team"]').click(); page.wait_for_timeout(100)
            assert page.locator('text=EMPLOYEE · OPERATIONS').count()==1
            page.locator('[data-route="bookings"]').last.click(); page.wait_for_timeout(80)
            status=page.locator('[data-booking-status]').first; assert status.count()==1
            status.select_option('confirmed'); page.wait_for_timeout(80)
            assert page.locator('text=Подтверждена').count()>=1
            page.locator('[data-route="catalog"]').last.click(); page.wait_for_timeout(80)
            fleet_status=page.locator('[data-fleet-status]').first; assert fleet_status.count()==1
            fleet_status.click(); page.wait_for_timeout(80)
            assert page.locator('text=Свободна').count()>=1
            page.locator('[data-role="owner"]').click(); page.wait_for_timeout(80)
            assert page.locator('text=OWNER · CONTROL CENTER').count()==1
            assert page.locator('text=BOOKING PIPELINE').count()==1
            assert page.locator('text=ASSET HEALTH').count()==1
            assert not errors, errors
            results.append({'viewport':f'{width}x{height}','cards':89,'local_images':'ok','client_booking':'ok','employee_status':'ok','employee_fleet':'ok','owner_dashboard':'ok','console_errors':errors})
            ctx.close()
        browser.close()
finally:
    server.terminate(); server.wait(timeout=5)

(root/'preview-v2-e2e-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
