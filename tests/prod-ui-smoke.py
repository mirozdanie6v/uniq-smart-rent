from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time

root=Path(__file__).resolve().parents[1]
dist=root/'dist'
assert (dist/'prod-ui.js').exists()
assert (dist/'prod-ui.css').exists()
assert (dist/'finish-ui.js').exists()
assert (dist/'finish-ui.css').exists()

server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    time.sleep(.4)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ru-RU')
        page=ctx.new_page(); errors=[]
        page.route('https://www.google.com/maps**', lambda route: route.fulfill(status=204, body=''))
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.goto('http://127.0.0.1:8765/',wait_until='networkidle')
        page.wait_for_timeout(120)

        assert page.get_by_text('Весь парк UNIQ — выбирайте и бронируйте онлайн.',exact=True).count()==1
        assert page.locator('.hero-office-maps').count()==0
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
        assert page.locator('main > .home-locations').count()==1
        assert page.locator('main > .home-locations').evaluate('(el)=>el === el.parentElement.lastElementChild')
        old_grid=page.locator('.section').filter(has=page.get_by_role('heading',name='Популярная техника',exact=True))
        assert old_grid.count()==0

        fleet_state=page.evaluate("()=>JSON.parse(localStorage.getItem('uniq-data-fleet-state-v3')||'{}')")
        assert fleet_state and all(value=='available' for value in fleet_state.values())

        vehicle_id=page.evaluate('()=>window.UNIQ_FLEET[0].id')
        page.evaluate("(vehicleId)=>localStorage.setItem('uniq-data-requests-v3',JSON.stringify([{id:'smoke-request-1',vehicleId,from:'2026-09-10',to:'2026-09-13',client:'Анна Смирнова',contact:'@anna',status:'new',estimate:1200000,createdAt:'2026-09-09T10:00:00.000Z',persistence:'local'}]))",vehicle_id)
        page.reload(wait_until='networkidle'); page.wait_for_timeout(120)

        page.locator('.bottom-nav [data-go="requests"]').click(); page.wait_for_timeout(80)
        assert page.get_by_text('Готова к оплате',exact=True).count()>=1
        assert page.locator('[data-pay-request="smoke-request-1"]').count()==1
        page.locator('[data-pay-request="smoke-request-1"]').click()
        assert page.locator('#finishPaymentModal').count()==1
        assert page.get_by_text('Демонстрационный экран. Реальный платёжный шлюз пока не подключён.',exact=True).count()==1
        page.locator('[data-confirm-payment="smoke-request-1"]').click(); page.wait_for_timeout(50)
        assert page.get_by_text('Оплачено · демо',exact=True).count()>=1

        page.locator('[data-role="owner"]').click(); page.wait_for_timeout(120)
        assert page.locator('.bottom-nav button').count()==4
        assert page.locator('.bottom-nav [data-owner-custom="clients"]').count()==1
        assert page.locator('.owner-nav-hint').count()==1
        owner_nav=page.locator('.bottom-nav.owner-nav-scroll')
        assert owner_nav.count()==1
        assert owner_nav.evaluate('(el)=>el.scrollWidth > el.clientWidth')
        assert page.locator('.client-card').count()>=1
        page.locator('.client-card [data-client-profile]').first.click()
        assert page.locator('#finishClientProfile').count()==1
        assert page.get_by_text('Анна Смирнова',exact=True).count()>=1
        page.locator('#finishClientProfile [data-finish-close]').click()

        page.locator('.bottom-nav [data-go="requests"]').click(); page.wait_for_timeout(80)
        assert page.locator('.client-link').count()>=1
        page.locator('.client-link').first.click()
        assert page.locator('#finishClientProfile').count()==1
        assert page.get_by_text('Анна Смирнова',exact=True).count()>=1
        assert not errors, errors
        ctx.close(); browser.close()
finally:
    server.terminate(); server.wait(timeout=5)
