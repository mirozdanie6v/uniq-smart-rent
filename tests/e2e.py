from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
html=(root/'dist/index.html').read_text(encoding='utf-8')
css=(root/'dist/styles.css').read_text(encoding='utf-8')
js=(root/'dist/assets/app.bundle.js').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="./styles.css">',f'<style>{css}</style>')
html=html.replace('<script src="./assets/app.bundle.js" defer></script>',f'<script>{js}</script>')
viewports=[(320,568),(375,667),(390,844),(393,852),(430,932),(768,1024),(1024,1366),(1366,768),(1440,900),(1920,1080)]
results=[]
with sync_playwright() as p:
    chromium_path = Path('/usr/bin/chromium')
    launch_args = {'headless': True, 'args': ['--no-sandbox']}
    if chromium_path.exists():
        launch_args['executable_path'] = str(chromium_path)
    browser=p.chromium.launch(**launch_args)
    for w,h in viewports:
        page=browser.new_page(viewport={"width":w,"height":h})
        errors=[]
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.set_content(html, wait_until='load')
        assert page.locator('text=UNIQ').count() >= 1
        assert page.locator('#roleSelect').is_visible()
        overflow=page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
        assert not overflow, f'horizontal overflow at {w}x{h}'
        page.locator('[data-route="catalog"]').last.click()
        assert page.locator('[data-vehicle="adv-18"]').count() >= 1
        page.locator('[data-book="adv-18"]').click()
        assert page.locator('#bookingModal').count()==1
        page.locator('#bookingForm button[type="submit"]').click()
        assert page.locator('text=Honda ADV 160').count() >= 1
        assert page.locator('#bookingModal').count()==0
        results.append({"viewport":f"{w}x{h}","console_errors":errors,"ok":not errors})
        page.close()
    # Role + i18n smoke checks
    page=browser.new_page(viewport={"width":1440,"height":900})
    errors=[]
    page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
    page.set_content(html, wait_until='load')
    page.locator('#roleSelect').select_option('team')
    assert page.locator('text=Парк сегодня').count() >= 1
    page.locator('#roleSelect').select_option('owner')
    assert page.locator('text=Ключевые KPI').count() >= 1
    page.locator('[data-lang="en"]').click()
    assert page.locator('text=Key KPIs').count() >= 1
    page.locator('[data-lang="vi"]').click()
    assert page.locator('text=KPI chính').count() >= 1
    page.locator('[data-lang="ko"]').click()
    assert page.locator('text=핵심 KPI').count() >= 1
    results.append({"scenario":"roles+i18n","console_errors":errors,"ok":not errors})
    page.close(); browser.close()
(root/'e2e-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
