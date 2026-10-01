from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time

root=Path(__file__).resolve().parents[1]
dist=root/'dist'
for name in ['prod-ui.js','prod-ui.css','finish-ui.js','finish-ui.css','release-fix.js','release-fix.css','payment-stage9-exclusive.js']:
    assert (dist/name).exists(), name

server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    time.sleep(.4)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ru-RU')
        page=ctx.new_page(); errors=[]
        page.route('https://www.google.com/maps**', lambda route: route.fulfill(status=204, body=''))
        page.route('https://telegram.org/js/telegram-web-app.js**', lambda route: route.fulfill(status=204, body=''))
        page.route('https://dashboard.viiversion.com/**', lambda route: route.fulfill(status=204, body=''))
        page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' else None)
        page.goto('http://127.0.0.1:8765/',wait_until='networkidle')
        page.wait_for_timeout(180)

        assert page.get_by_text('Весь парк UNIQ — выбирайте и бронируйте онлайн.',exact=True).count()==1
        assert page.locator('.hero-office-maps').count()==0
        assert page.locator('.hero-fleet-card').count()==1
        assert page.locator('.fleet-count-link').count()==1
        assert '89' in page.locator('.fleet-count-link').inner_text()
        assert page.locator('.featured-slider').count()==1
        assert page.locator('.featured-card').count()>=5
        slider=page.locator('.featured-slider')
        assert slider.evaluate('(el)=>el.scrollWidth > el.clientWidth')
        before=slider.evaluate('(el)=>el.scrollLeft')
        page.locator('[data-slide="next"]').click(); page.wait_for_timeout(450)
        assert slider.evaluate('(el)=>el.scrollLeft') > before
        assert page.locator('.home-locations').count()==1
        assert page.locator('.home-office-card').count()==2
        assert page.locator('main > .home-locations').evaluate('(el)=>el === el.parentElement.lastElementChild')

        # Dates selected on the home screen survive catalog navigation and prefill booking.
        page.locator('#quickFrom').fill('2026-09-15'); page.locator('#quickFrom').dispatch_event('change')
        page.locator('#quickTo').fill('2026-09-18'); page.locator('#quickTo').dispatch_event('change')
        page.locator('.fleet-count-link').click(); page.wait_for_timeout(100)
        assert page.locator('.bottom-nav [data-go="catalog"].active').count()==1
        assert page.locator('.model-details-link').count()>=80
        page.locator('.vehicle-card [data-book]').first.click(); page.wait_for_timeout(60)
        assert page.locator('#bookForm input[name="from"]').input_value()=='2026-09-15'
        assert page.locator('#bookForm input[name="to"]').input_value()=='2026-09-18'
        page.locator('#bookForm').locator('..').locator('.modal-x').click()

        fleet_state=page.evaluate("()=>JSON.parse(localStorage.getItem('uniq-data-fleet-state-v3')||'{}')")
        assert fleet_state and all(value=='available' for value in fleet_state.values())

        vehicle_id=page.evaluate('()=>window.UNIQ_FLEET[0].id')
        page.evaluate("(vehicleId)=>localStorage.setItem('uniq-data-requests-v3',JSON.stringify([{id:'smoke-request-1',vehicleId,from:'2026-09-15',to:'2026-09-18',client:'Анна Смирнова',contact:'@anna',status:'new',estimate:1200000,createdAt:new Date().toISOString(),persistence:'local'}]))",vehicle_id)
        page.reload(wait_until='networkidle'); page.wait_for_timeout(180)

        # Restored Stage 9 payment scenario is the only active checkout.
        assert page.evaluate('()=>Boolean(window.__UNIQ_STAGE9_EXCLUSIVE__?.loaded)')
        page.locator('.bottom-nav [data-go="requests"]').click(); page.wait_for_timeout(140)
        assert page.locator('[data-pay-request="smoke-request-1"]').count()==0
        assert page.locator('[data-stage9-pay-request="smoke-request-1"]').count()==1
        page.locator('[data-stage9-pay-request="smoke-request-1"]').click(); page.wait_for_timeout(60)
        assert page.locator('#finishPaymentModal').count()==0
        assert page.locator('#releasePaymentModal').count()==1, page.evaluate('()=>window.__UNIQ_STAGE9_EXCLUSIVE__')
        assert page.get_by_text('1. Выберите сумму',exact=True).count()==1
        assert page.locator('[data-payment-provider]').count()==0
        assert page.locator('[data-provider]').count()==7
        page.locator('[data-percent="100"]').click()
        page.locator('[data-provider="sbp"]').click()
        page.locator('[data-create-payment]').click(); page.wait_for_timeout(30)
        assert page.locator('.release-demo-qr').count()==1
        assert page.get_by_text('Демо: подтвердить оплату',exact=True).count()==1
        page.locator('[data-confirm-stage9]').click(); page.wait_for_timeout(100)
        payment=page.evaluate("()=>JSON.parse(localStorage.getItem('uniq-demo-payments-v1')||'{}')['smoke-request-1']")
        assert payment['status']=='paid' and payment['prepaymentPercent']==100 and payment['provider']=='sbp'
        assert page.get_by_text('Оплачено · демо',exact=True).count()>=1

        # Owner CRM + analytics navigation are both present and swipeable.
        page.locator('[data-role="owner"]').click(); page.wait_for_timeout(160)
        assert page.locator('.bottom-nav button').count()==5
        assert page.locator('.bottom-nav [data-owner-custom="clients"]').count()==1
        assert page.locator('.bottom-nav [data-owner-custom="analytics"]').count()==1
        assert page.locator('.owner-nav-hint').count()==1
        owner_nav=page.locator('.bottom-nav.owner-nav-scroll')
        assert owner_nav.count()==1 and owner_nav.evaluate('(el)=>el.scrollWidth > el.clientWidth')
        assert page.locator('.client-card').count()>=1
        page.locator('.bottom-nav [data-owner-custom="analytics"]').click(); page.wait_for_timeout(80)
        assert page.locator('[data-release-analytics]').count()==1
        assert page.get_by_text('Что приносит деньги — видно сразу.',exact=True).count()==1
        assert page.locator('[data-analytics-period]').count()==3
        page.locator('[data-analytics-period="30d"]').click(); page.wait_for_timeout(30)
        assert page.locator('[data-analytics-period="30d"].active').count()==1

        assert not errors, errors
        ctx.close(); browser.close()
finally:
    server.terminate(); server.wait(timeout=5)
