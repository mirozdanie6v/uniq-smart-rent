from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os
root=Path(__file__).resolve().parents[1]
html=(root/'dist/index.html').read_text(encoding='utf-8')
css=(root/'dist/styles.css').read_text(encoding='utf-8')
js=(root/'dist/assets/app.bundle.js').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./styles.css">',f'<style>{css}</style>')
html=html.replace('<script src="./assets/app.bundle.js" defer></script>',f'<script>{js}</script>')
viewports=[(320,568),(375,667),(390,844),(393,852),(430,932),(768,1024),(1024,1366),(1366,768),(1440,900),(1920,1080)]
results=[]
with sync_playwright() as p:
    launch_kwargs={"headless":True,"args":["--no-sandbox"]}
    executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    if executable: launch_kwargs['executable_path']=executable
    browser=p.chromium.launch(**launch_kwargs)
    for w,h in viewports:
        page=browser.new_page(viewport={"width":w,"height":h},locale='en-US')
        errors=[]
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.set_content(html,wait_until='domcontentloaded')
        assert page.locator('text=UNIQ').count()>=1
        assert page.locator('#roleSelect').is_visible()
        assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'),f'horizontal overflow at {w}x{h}'
        page.locator('[data-route="catalog"]').last.click()
        assert page.locator('[data-vehicle="xmax-2024"]').count()>=1
        page.locator('[data-vehicle="xmax-2024"]').first.click()
        assert page.locator('text=X-Max 300').count()>=1
        page.locator('[data-book="xmax-2024"]').click()
        form=page.locator('#bookingForm')
        assert form.count()==1
        form.locator('input[name="client"]').fill('QA Rider')
        form.locator('input[name="contact"]').fill('+84000000000')
        form.locator('input[name="consent"]').check()
        form.locator('button[type="submit"]').click()
        page.wait_for_timeout(50)
        assert page.locator('#bookingModal').count()==0
        assert page.locator('text=QA Rider').count()==0
        assert page.locator('text=X-Max 300').count()>=1
        results.append({"viewport":f"{w}x{h}","console_errors":errors,"ok":not errors})
        page.close()
    page=browser.new_page(viewport={"width":1440,"height":900},locale='en-US')
    errors=[]
    page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
    page.set_content(html,wait_until='domcontentloaded')
    page.locator('#roleSelect').select_option('team')
    assert page.locator('text=Operations layer').count()>=1
    page.locator('#roleSelect').select_option('owner')
    assert page.locator('text=Owner dashboard').count()>=1
    page.locator('[data-lang="ru"]').click(); assert page.locator('text=Owner dashboard').count()>=1
    page.locator('[data-lang="vi"]').click(); assert page.locator('text=Bảng điều khiển chủ').count()>=1
    page.locator('[data-lang="ko"]').click(); assert page.locator('text=Owner dashboard').count()>=1
    results.append({"scenario":"roles+i18n","console_errors":errors,"ok":not errors})
    page.close();browser.close()
(root/'e2e-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
