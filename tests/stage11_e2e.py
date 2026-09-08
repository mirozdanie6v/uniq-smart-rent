from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess, time, os, json

root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8767','--bind','127.0.0.1','--directory',str(root/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

snapshot={
  'period':'7d','branch':'all',
  'kpis':{'revenueVnd':54800000,'bookings':18,'paidBookings':11,'averageCheckVnd':4981818,'utilizationPercent':64,'repeatSharePercent':43,'newCustomers':6,'activeRentals':4,'conversionPercent':61},
  'trend':[
    {'day':'2026-09-03','label':'03 сент.','revenueVnd':3200000,'bookings':2},{'day':'2026-09-04','label':'04 сент.','revenueVnd':7100000,'bookings':3},{'day':'2026-09-05','label':'05 сент.','revenueVnd':5900000,'bookings':1},{'day':'2026-09-06','label':'06 сент.','revenueVnd':8400000,'bookings':2},{'day':'2026-09-07','label':'07 сент.','revenueVnd':12500000,'bookings':3},{'day':'2026-09-08','label':'08 сент.','revenueVnd':7700000,'bookings':4},{'day':'2026-09-09','label':'09 сент.','revenueVnd':10000000,'bookings':3}
  ],
  'statuses':[{'status':'new','count':3},{'status':'contacted','count':2},{'status':'confirmed','count':3},{'status':'vehicle_issued','count':1},{'status':'active','count':3},{'status':'return_due','count':1},{'status':'returned','count':1},{'status':'completed','count':3},{'status':'cancelled','count':1}],
  'sources':[{'source':'telegram_mini_app','bookings':6,'revenueVnd':25900000,'sharePercent':33},{'source':'website','bookings':4,'revenueVnd':14200000,'sharePercent':22},{'source':'office','bookings':3,'revenueVnd':11100000,'sharePercent':17},{'source':'google','bookings':2,'revenueVnd':3600000,'sharePercent':11},{'source':'partner','bookings':2,'revenueVnd':0,'sharePercent':11},{'source':'qr','bookings':1,'revenueVnd':0,'sharePercent':6}],
  'branches':[{'branchId':'branch-north','label':'Северный филиал','bookings':9,'revenueVnd':24400000,'utilizationPercent':59},{'branchId':'branch-center','label':'Центр города','bookings':9,'revenueVnd':30400000,'utilizationPercent':68}],
  'vehicles':[{'vehicleId':'yamaha-x-max-2024-76826','title':'Yamaha X-Max','rentals':3,'revenueVnd':14400000,'utilizationPercent':86,'idleDays':1},{'vehicleId':'honda-cb650r-2022-73228','title':'Honda CB650R','rentals':2,'revenueVnd':12500000,'utilizationPercent':71,'idleDays':2},{'vehicleId':'hyundai-elantra-2025-74404','title':'Hyundai Elantra','rentals':2,'revenueVnd':10800000,'utilizationPercent':66,'idleDays':2},{'vehicleId':'toyota-yaris-cross-2025-74402','title':'Toyota Yaris Cross','rentals':2,'revenueVnd':8400000,'utilizationPercent':60,'idleDays':3}],
  'funnel':[{'key':'views','label':'Просмотры','value':1820,'conversionPercent':100},{'key':'vehicle_opens','label':'Карточки техники','value':982,'conversionPercent':54},{'key':'booking_starts','label':'Начали бронь','value':421,'conversionPercent':23},{'key':'payment_starts','label':'Перешли к оплате','value':318,'conversionPercent':17},{'key':'paid_bookings','label':'Оплатили','value':247,'conversionPercent':14}],
  'customers':{'all':28,'new':9,'repeat':10,'vip':6,'inactive':3,'repeatSharePercent':57},
  'persisted':True,'demoData':True,'generatedAt':'2026-09-09T00:00:00Z'
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
      def route_api(route):
        url=route.request.url
        if url.endswith('/api/fleet-overrides'):
          route.fulfill(status=200,content_type='application/json',body='{"vehicles":[]}'); return
        if '/api/owner/analytics?' in url or url.endswith('/api/owner/analytics'):
          route.fulfill(status=200,content_type='application/json',body=json.dumps(snapshot,ensure_ascii=False)); return
        route.continue_()
      page.route('**/api/**',route_api)
      page.goto('http://127.0.0.1:8767/',wait_until='networkidle')

      # Client MY UNIQ must not expose business-wide seeded demo requests.
      page.locator('[data-go="requests"]').last.click(); page.wait_for_timeout(50)
      assert page.locator('.request').count()==0

      # Owner sees the realistic seeded business queue with multiple states.
      page.locator('[data-role="owner"]').click(); page.wait_for_timeout(60)
      assert page.locator('.bottom-nav button').count()==10
      page.locator('[data-go="requests"]').last.click(); page.wait_for_timeout(60)
      assert page.locator('.request').count()>=20
      body=page.locator('body').inner_text()
      for label in ['Новая','Связались','Подтверждена','В аренде','Возврат сегодня','Возвращена','Завершена','Отменена']:
        assert label in body, label

      # Stage 11 analytics dashboard.
      page.locator('[data-go="analytics"]').last.click(); page.wait_for_timeout(100)
      assert page.locator('[data-stage11-analytics]').count()==1
      assert page.locator('[data-analytics-trend] .trend-column').count()==7
      assert page.locator('[data-analytics-funnel] > div').count()==5
      assert page.locator('[data-analytics-sources] article').count()>=4
      assert page.locator('[data-vehicle-profitability] article').count()>=4
      assert page.get_by_text('Yamaha X-Max',exact=True).count()>=1
      page.locator('[data-analytics-period="30d"]').click(); page.wait_for_timeout(70)
      page.locator('[data-analytics-branch]').select_option('branch-center'); page.wait_for_timeout(70)
      assert page.locator('[data-stage11-analytics]').count()==1
      assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
      ctx.close()
    browser.close()
finally:
  server.terminate(); server.wait(timeout=5)
