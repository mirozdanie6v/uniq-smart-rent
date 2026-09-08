from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time, os, json

root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8766','--bind','127.0.0.1','--directory',str(root/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

snapshot={
  'promotions':[
    {'id':'promo-test','name':'Повторная аренда −10%','status':'active','discountType':'percent','discountValue':10,'startsAt':'2026-09-01T00:00:00Z','endsAt':'2026-10-31T23:59:59Z','promoCode':'RETURN10','maxUses':80,'usesCount':14,'audienceSegment':'repeat','vehicleKind':'','description':'Для повторных клиентов UNIQ.','branches':['branch-north','branch-center'],'isDemo':True}
  ],
  'campaigns':[
    {'id':'campaign-test','name':'Вернуть повторных клиентов','channel':'telegram','audienceSegment':'repeat','message':'Снова в Нячанге? Для вас −10%.','promotionId':'promo-test','status':'draft','scheduledAt':'','sentAt':'','recipientsCount':0,'openedCount':0,'clickedCount':0,'conversionsCount':0,'attributedRevenueVnd':0,'isDemo':True}
  ],
  'segments':{'all':72,'new':24,'repeat':22,'vip':9,'inactive':17},'persisted':True
}

try:
  time.sleep(.35)
  with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox']}
    executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
    if executable: launch['executable_path']=executable
    browser=p.chromium.launch(**launch)
    for width,height in [(390,844),(1440,900)]:
      ctx=browser.new_context(viewport={'width':width,'height':height},locale='ru-RU')
      page=ctx.new_page()
      page.add_init_script("""
        sessionStorage.setItem('uniq-demo-requests-v2', JSON.stringify([{
          id:'spacing-test',vehicleId:'car-hyundai-elantra',from:'2026-09-09',to:'2026-09-12',client:'Дмитрий',contact:'@demo',status:'new',estimate:5400000,createdAt:'2026-09-09T04:43:19.000Z',paymentStatus:'unpaid'
        }]));
      """)
      def route_api(route):
        req=route.request
        url=req.url
        if url.endswith('/api/fleet-overrides'):
          route.fulfill(status=200,content_type='application/json',body='{"vehicles":[]}'); return
        if url.endswith('/api/owner/marketing'):
          route.fulfill(status=200,content_type='application/json',body=json.dumps(snapshot,ensure_ascii=False)); return
        if url.endswith('/api/owner/promotions') and req.method=='POST':
          promo=json.loads(req.post_data or '{}'); snapshot['promotions'].insert(0,promo)
          route.fulfill(status=201,content_type='application/json',body=json.dumps({'promotion':promo,'persisted':True},ensure_ascii=False)); return
        if url.endswith('/api/owner/campaigns') and req.method=='POST':
          campaign=json.loads(req.post_data or '{}'); snapshot['campaigns'].insert(0,campaign)
          route.fulfill(status=201,content_type='application/json',body=json.dumps({'campaign':campaign,'persisted':True},ensure_ascii=False)); return
        if '/api/owner/campaigns/' in url and url.endswith('/send') and req.method=='PATCH':
          campaign=snapshot['campaigns'][0].copy(); campaign.update({'status':'sent','recipientsCount':22,'openedCount':15,'clickedCount':7,'conversionsCount':2,'attributedRevenueVnd':3600000,'sentAt':'2026-09-09T05:00:00Z'})
          snapshot['campaigns'][0]=campaign
          route.fulfill(status=200,content_type='application/json',body=json.dumps({'campaign':campaign,'persisted':True,'demoDelivery':True},ensure_ascii=False)); return
        route.continue_()
      page.route('**/api/**',route_api)
      page.goto('http://127.0.0.1:8766/',wait_until='networkidle')

      page.locator('[data-go="requests"]').last.click(); page.wait_for_timeout(40)
      payment=page.locator('.request-payment').first
      assert payment.count()==1
      assert payment.evaluate("e=>getComputedStyle(e).display")=='flex'
      assert float(payment.evaluate("e=>parseFloat(getComputedStyle(e).columnGap||getComputedStyle(e).gap)"))>=6
      assert 'Оплата' in payment.inner_text() and 'Ожидает оплаты' in payment.inner_text()

      page.locator('[data-role="owner"]').click(); page.wait_for_timeout(50)
      assert page.locator('.bottom-nav button').count()==9
      page.locator('[data-go="marketing"]').last.click(); page.wait_for_timeout(100)
      assert page.locator('[data-stage10-marketing]').count()==1
      assert page.locator('[data-marketing-segments] > div').count()==5
      assert page.locator('[data-promotion]').count()>=1
      assert page.locator('[data-campaign]').count()>=1
      page.locator('[data-send-campaign]').first.click(); page.wait_for_timeout(80)
      assert page.get_by_text('DEMO-рассылка отправлена, статистика обновлена.',exact=True).count()==1
      assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
      ctx.close()
    browser.close()
finally:
  server.terminate(); server.wait(timeout=5)
