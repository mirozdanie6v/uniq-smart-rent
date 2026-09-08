from pathlib import Path
from playwright.sync_api import sync_playwright
import json,subprocess,time,os
root=Path(__file__).resolve().parents[1];dist=root/'dist'
server=subprocess.Popen(['python','-m','http.server','8768','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.4)
 with sync_playwright() as p:
  launch={'headless':True,'args':['--no-sandbox']};exe=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE');
  if exe: launch['executable_path']=exe
  browser=p.chromium.launch(**launch)
  for width,height in [(390,844),(1440,900)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},locale='ru-RU');page=ctx.new_page();errors=[]
   page.on('console',lambda m: errors.append(m.text) if m.type=='error' and 'maps.googleapis.com' not in m.text else None)
   page.route('**/api/fleet-overrides',lambda r:r.fulfill(status=200,content_type='application/json',body='{"vehicles":[]}'))
   page.route('**/api/payments/providers',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'providers':[{'id':x,'label':x,'market':'Demo','currency':'VND','credentialReady':False,'checkoutMode':'demo'} for x in ['vietqr','vnpay','momo','zalopay','sbp','yookassa','tbank']]})))
   page.route('**/api/bookings',lambda r:r.fulfill(status=201,content_type='application/json',body='{"bookingId":"stage9-booking","estimatedTotalVnd":1800000,"status":"new"}') if r.request.method=='POST' else r.continue_())
   page.route('**/api/bookings/stage9-booking/status',lambda r:r.fulfill(status=200,content_type='application/json',body='{"bookingId":"stage9-booking","status":"confirmed","persisted":true}'))
   service={'records':[{'id':'svc-1','vehicleId':'xmax-2024','vehicleTitle':'Yamaha X-Max 300','branchId':'branch-center','branchName':'Центр города','status':'scheduled','serviceType':'maintenance','mileageKm':12000,'costVnd':700000,'startedAt':'2026-09-09T01:00:00Z','completedAt':'','nextServiceAt':'','nextServiceMileageKm':15000,'note':'Плановое ТО','supplier':'UNIQ Service','inspectionJson':'{}','persisted':True}],'summary':{'inService':0,'scheduled':1,'completed30d':0,'cost30dVnd':0,'dueSoon':1},'persisted':True}
   page.route('**/api/owner/service',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps(service,ensure_ascii=False)) if r.request.method=='GET' else r.continue_())
   page.route('**/api/owner/service/svc-1',lambda r:r.fulfill(status=200,content_type='application/json',body=json.dumps({'record':{**service['records'][0],'status':'in_progress'},'persisted':True},ensure_ascii=False)))
   page.goto('http://127.0.0.1:8768/',wait_until='networkidle')
   vehicle_id=page.locator('[data-fleet-state]').first.get_attribute('data-fleet-state')
   assert vehicle_id
   request={'id':'local-payment-fix','vehicleId':vehicle_id,'from':'2026-09-12','to':'2026-09-15','client':'Test Client','contact':'@test','status':'new','estimate':1800000,'createdAt':'2026-09-09T01:00:00Z','paymentStatus':'unpaid'}
   page.evaluate("r=>sessionStorage.setItem('uniq-demo-requests-v2',JSON.stringify([r]))",request);page.reload(wait_until='networkidle')
   page.locator('[data-role="employee"]').click();page.locator('[data-go="fleet"]').last.click();page.wait_for_timeout(80)
   page.locator(f'[data-fleet-state="{vehicle_id}"]').select_option('ready');page.wait_for_timeout(160)
   page.locator('[data-role="client"]').click();page.locator('[data-go="requests"]').last.click();page.wait_for_timeout(80)
   pay=page.locator('[data-pay-booking="local-payment-fix"]');assert pay.count()==1
   pay.click();page.wait_for_timeout(80);assert page.locator('[data-payment-checkout]').count()==1;assert page.locator('.provider-logo').count()==7
   page.locator('.payment-checkout .modal-x').click();page.locator('[data-role="owner"]').click();page.locator('[data-go="service"]').last.click();page.wait_for_timeout(100)
   assert page.locator('[data-stage9-service]').count()==1;assert page.locator('[data-service-record]').count()>=1
   page.locator('[data-service-start="svc-1"]').click();page.wait_for_timeout(60)
   assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
   assert not errors,errors
   ctx.close()
  browser.close()
finally:
 server.terminate();server.wait(timeout=5)
