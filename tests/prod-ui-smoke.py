from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time

root=Path(__file__).resolve().parents[1]
dist=root/'dist'
assert (dist/'prod-ui.js').exists()
assert (dist/'prod-ui.css').exists()

server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    time.sleep(.4)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ru-RU')
        page=ctx.new_page(); errors=[]
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.goto('http://127.0.0.1:8765/',wait_until='networkidle')

        assert page.get_by_text('Аренда байков и авто в Нячанге — за пару минут.',exact=True).count()==1
        assert page.locator('.hero-fleet-card').count()==1
        assert page.locator('.featured-slider').count()==1
        assert page.locator('.featured-card').count()>=5
        assert page.locator('[data-slide="prev"]').count()==1
        assert page.locator('[data-slide="next"]').count()==1
        slider=page.locator('.featured-slider')
        assert slider.evaluate('(el)=>el.scrollWidth > el.clientWidth')
        before=slider.evaluate('(el)=>el.scrollLeft')
        page.locator('[data-slide="next"]').click(); page.wait_for_timeout(450)
        after=slider.evaluate('(el)=>el.scrollLeft')
        assert after > before
        assert page.locator('.home-locations').count()==1
        assert page.locator('.home-office-card').count()==2
        old_grid=page.locator('.section').filter(has=page.get_by_role('heading',name='Популярная техника',exact=True))
        assert old_grid.count()==0

        page.locator('[data-role="owner"]').click(); page.wait_for_timeout(100)
        assert page.locator('.bottom-nav button').count()==4
        assert page.locator('.bottom-nav [data-owner-custom="clients"]').count()==1
        page.locator('.bottom-nav [data-owner-custom="clients"]').click(); page.wait_for_timeout(180)
        assert page.locator('[data-owner-clients-section="true"]').count()==1
        assert not errors, errors
        ctx.close(); browser.close()
finally:
    server.terminate(); server.wait(timeout=5)
