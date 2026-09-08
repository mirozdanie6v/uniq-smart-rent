from pathlib import Path
from playwright.sync_api import sync_playwright
import json, subprocess, time, os, urllib.parse

root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python','-m','http.server','8766','--bind','127.0.0.1','--directory',str(root/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

branches=[{'id':'branch-north','name':'Северный филиал','address':'312 Đ. 2/4'},{'id':'branch-center','name':'Центр города','address':'254 Nguyễn Thị Minh Khai'}]
transactions=[
 {'id':'tx-pay-1','bookingId':'','paymentId':'','branchId':'branch-center','branchName':'Центр города','vehicleId':'','vehicleTitle':'Yamaha X-Max','customerId':'','customerName':'Alex','type':'payment','status':'completed','amountVnd':4800000,'method':'vietqr','occurredAt':'2026-09-09T03:00:00Z','note':'DEMO · аренда X-Max'},
 {'id':'tx-cash-1','bookingId':'','paymentId':'','branchId':'branch-north','branchName':'Северный филиал','vehicleId':'','vehicleTitle':'Honda PCX','customerId':'','customerName':'Minh','type':'payment','status':'completed','amountVnd':2700000,'method':'cash','occurredAt':'2026-09-09T01:00:00Z','note':'DEMO · наличные'},
 {'id':'tx-dep-1','bookingId':'','paymentId':'','branchId':'branch-center','branchName':'Центр города','vehicleId':'','vehicleTitle':'','customerId':'','customerName':'','type':'deposit_received','status':'completed','amountVnd':3000000,'method':'cash','occurredAt':'2026-09-08T23:00:00Z','note':'DEMO · депозит'}
]

def snapshot():
    payments=sum(x['amountVnd'] for x in transactions if x['type']=='payment')
    refunds=sum(x['amountVnd'] for x in transactions if x['type']=='refund')
    cash=sum(x['amountVnd'] for x in transactions if x['type']=='payment' and x['method']=='cash')
    dep_in=sum(x['amountVnd'] for x in transactions if x['type']=='deposit_received')
    dep_out=sum(x['amountVnd'] for x in transactions if x['type']=='deposit_returned')
    return {'period':'7d','branchId':'all','summary':{'grossPaymentsVnd':payments,'netRevenueVnd':payments-refunds,'onlineVnd':payments-cash,'cashVnd':cash,'pendingPaymentsVnd':1600000,'pendingPaymentsCount':1,'depositsHeldVnd':dep_in-dep_out,'depositsReceivedVnd':dep_in,'depositsReturnedVnd':dep_out,'refundsVnd':refunds,'discountsVnd':300000,'serviceExpensesVnd':0},'transactions':transactions,'branches':branches,'demo':True,'persisted':True}

try:
    time.sleep(.4)
    with sync_playwright() as p:
        launch={'headless':True,'args':['--no-sandbox']}
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable: launch['executable_path']=executable
        browser=p.chromium.launch(**launch)
        for width,height in [(390,844),(1440,900)]:
            ctx=browser.new_context(viewport={'width':width,'height':height},locale='ru-RU')
            page=ctx.new_page(); errors=[]
            page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' and 'maps.googleapis.com' not in msg.text else None)
            page.route('**/api/fleet-overrides',lambda route: route.fulfill(status=200,content_type='application/json',body='{"vehicles":[]}'))
            def api(route):
                req=route.request
                url=urllib.parse.urlparse(req.url)
                if url.path=='/api/owner/finance' and req.method=='GET':
                    data=snapshot(); qs=urllib.parse.parse_qs(url.query); data['period']=qs.get('period',['7d'])[0]; data['branchId']=qs.get('branch',['all'])[0]
                    route.fulfill(status=200,content_type='application/json',body=json.dumps(data,ensure_ascii=False)); return
                if url.path=='/api/owner/finance/deposits' and req.method=='POST':
                    body=json.loads(req.post_data or '{}'); tx={'id':'tx-dep-new','bookingId':'','paymentId':'','branchId':body['branchId'],'branchName':'Центр города' if body['branchId']=='branch-center' else 'Северный филиал','vehicleId':'','vehicleTitle':'','customerId':'','customerName':'','type':'deposit_returned' if body['action']=='return' else 'deposit_received','status':'completed','amountVnd':body['amountVnd'],'method':body['method'],'occurredAt':'2026-09-09T05:00:00Z','note':body.get('note') or 'Депозит'}
                    transactions.insert(0,tx); route.fulfill(status=201,content_type='application/json',body=json.dumps({'transaction':tx,'persisted':True},ensure_ascii=False)); return
                if url.path=='/api/owner/finance/refunds' and req.method=='POST':
                    body=json.loads(req.post_data or '{}'); source=next(x for x in transactions if x['id']==body['sourceTransactionId']); tx={'id':'tx-refund-new','bookingId':'','paymentId':'','branchId':source['branchId'],'branchName':source['branchName'],'vehicleId':'','vehicleTitle':source['vehicleTitle'],'customerId':'','customerName':source['customerName'],'type':'refund','status':'completed','amountVnd':body['amountVnd'],'method':source['method'],'occurredAt':'2026-09-09T05:10:00Z','note':body['reason']}; transactions.insert(0,tx)
                    route.fulfill(status=201,content_type='application/json',body=json.dumps({'refund':{'id':'r1','transactionId':tx['id'],'sourceTransactionId':source['id'],'amountVnd':body['amountVnd'],'remainingVnd':source['amountVnd']-body['amountVnd']},'persisted':True},ensure_ascii=False)); return
                route.continue_()
            page.route('**/api/owner/finance**',api)
            page.goto('http://127.0.0.1:8766/',wait_until='networkidle')
            page.locator('[data-role="owner"]').click(); page.wait_for_timeout(50)
            assert page.locator('.bottom-nav button').count()==7
            page.locator('[data-go="finance"]').last.click(); page.wait_for_timeout(120)
            assert page.locator('[data-stage8-finance]').count()==1
            assert page.locator('[data-finance-ledger]').count()==1
            assert page.locator('[data-finance-transaction]').count()>=3
            page.locator('[data-finance-period="today"]').click(); page.wait_for_timeout(50)
            assert page.locator('[data-finance-period="today"]').get_attribute('class')=='active'
            page.locator('[data-finance-branch]').select_option('branch-center'); page.wait_for_timeout(50)
            page.locator('[data-receive-deposit]').click(); page.wait_for_timeout(20)
            assert page.locator('[data-deposit-modal]').count()==1
            page.locator('[data-deposit-amount]').fill('3500000'); page.locator('[data-deposit-note]').fill('Заказ UQ-2048'); page.locator('[data-submit-deposit]').click(); page.wait_for_timeout(100)
            assert page.get_by_text('Депозит принят и записан в финансовый журнал.',exact=True).count()==1
            page.locator('[data-open-refund]').first.click(); page.wait_for_timeout(20)
            assert page.locator('[data-refund-modal]').count()==1
            page.locator('[data-refund-amount]').fill('500000'); page.locator('[data-submit-refund]').click(); page.wait_for_timeout(100)
            assert page.get_by_text('Возврат проведён. Сумма выручки и история транзакций обновлены.',exact=True).count()==1
            nav_font=float(page.locator('.bottom-nav b').first.evaluate("e=>parseFloat(getComputedStyle(e).fontSize)")); assert nav_font>=9.5
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
            assert not errors, errors
            ctx.close()
        browser.close()
finally:
    server.terminate(); server.wait(timeout=5)
