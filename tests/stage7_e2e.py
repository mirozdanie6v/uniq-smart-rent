from pathlib import Path
from playwright.sync_api import sync_playwright
import json, subprocess, time, os

root=Path(__file__).resolve().parents[1]
dist=root/'dist'
server=subprocess.Popen(['python','-m','http.server','8765','--bind','127.0.0.1','--directory',str(dist)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

branches=[
    {'id':'branch-north','code':'north','name':'Северный филиал','address':'312 Đ. 2/4, Bắc Nha Trang','mapsUrl':'https://maps.app.goo.gl/qr3FNiVVxAdThVBV6','phone':'+84 37 211 2370','status':'active'},
    {'id':'branch-center','code':'center','name':'Центр города','address':'254 Nguyễn Thị Minh Khai, Nha Trang','mapsUrl':'https://maps.app.goo.gl/sJdMndLRPz9b228J7','phone':'+84 37 211 2370','status':'active'},
]
employees=[
    {'id':'employee-demo-admin','branchId':'branch-center','name':'Алексей Морозов','role':'admin','phone':'+84 37 211 2370','telegram':'@uniq_admin','zalo':'','status':'active','permissions':['bookings.view','bookings.manage','customers.view','fleet.status','fleet.pricing','payments.manage','finance.view','team.manage','transfers.manage']},
    {'id':'employee-demo-linh','branchId':'branch-center','name':'Linh Nguyễn','role':'manager','phone':'','telegram':'@uniq_linh','zalo':'','status':'active','permissions':['bookings.view','bookings.manage','customers.view','fleet.status','payments.manage','transfers.manage']},
    {'id':'employee-demo-minh','branchId':'branch-north','name':'Minh Trần','role':'manager','phone':'','telegram':'@uniq_minh','zalo':'','status':'active','permissions':['bookings.view','bookings.manage','customers.view','fleet.status','payments.manage','transfers.manage']},
    {'id':'employee-demo-anh','branchId':'branch-north','name':'Anh Phạm','role':'branch_staff','phone':'','telegram':'','zalo':'','status':'active','permissions':['bookings.view','fleet.status','transfers.manage']},
    {'id':'employee-demo-huong','branchId':'branch-center','name':'Hương Lê','role':'branch_staff','phone':'','telegram':'','zalo':'','status':'active','permissions':['bookings.view','fleet.status','transfers.manage']},
]
transfers=[]

try:
    time.sleep(.4)
    with sync_playwright() as p:
        launch={'headless':True,'args':['--no-sandbox']}
        executable=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE')
        if executable: launch['executable_path']=executable
        browser=p.chromium.launch(**launch)
        for width,height in [(390,844),(1440,900)]:
            ctx=browser.new_context(viewport={'width':width,'height':height},locale='ru-RU')
            page=ctx.new_page()
            errors=[]
            page.on('console',lambda msg: errors.append(msg.text) if msg.type=='error' and 'maps.googleapis.com' not in msg.text else None)
            page.route('**/api/fleet-overrides',lambda route: route.fulfill(status=200,content_type='application/json',body='{"vehicles":[]}'))
            def api(route):
                req=route.request
                if req.url.endswith('/api/owner/team'):
                    route.fulfill(status=200,content_type='application/json',body=json.dumps({'branches':branches,'employees':employees,'transfers':transfers,'persisted':True},ensure_ascii=False)); return
                if req.url.endswith('/api/owner/employees') and req.method=='POST':
                    employee=json.loads(req.post_data or '{}'); employees[:] = [x for x in employees if x['id']!=employee['id']] + [employee]
                    route.fulfill(status=200,content_type='application/json',body=json.dumps({'employee':employee,'persisted':True},ensure_ascii=False)); return
                if req.url.endswith('/api/owner/transfers') and req.method=='POST':
                    transfer=json.loads(req.post_data or '{}'); transfer['persisted']=True; transfers.insert(0,transfer)
                    route.fulfill(status=200,content_type='application/json',body=json.dumps({'transfer':transfer,'persisted':True},ensure_ascii=False)); return
                if '/api/owner/transfers/' in req.url and req.method=='PATCH':
                    transfer_id=req.url.rsplit('/',1)[-1]; payload=json.loads(req.post_data or '{}')
                    transfer=next(x for x in transfers if x['id']==transfer_id); transfer['status']=payload['status']
                    if payload['status']=='completed': transfer['completedAt']='2026-09-09T05:00:00.000Z'
                    route.fulfill(status=200,content_type='application/json',body=json.dumps({'transfer':transfer,'persisted':True},ensure_ascii=False)); return
                route.continue_()
            page.route('**/api/owner/**',api)
            page.goto('http://127.0.0.1:8765/',wait_until='networkidle')
            page.locator('[data-role="owner"]').click(); page.wait_for_timeout(60)
            assert page.locator('.bottom-nav button').count()==6
            nav_font=float(page.locator('.bottom-nav b').first.evaluate("e=>parseFloat(getComputedStyle(e).fontSize)"))
            assert nav_font>=9.5
            page.locator('[data-go="team"]').last.click(); page.wait_for_timeout(120)
            assert page.locator('[data-stage7-team]').count()==1
            assert page.locator('[data-team-branch]').count()==2
            assert page.locator('[data-employee]').count()>=5
            page.locator('[data-team-search]').fill('Linh'); page.wait_for_timeout(30)
            assert page.locator('[data-employee]').count()==1
            page.locator('[data-team-search]').fill('')
            page.locator('[data-edit-employee="employee-demo-linh"]').click(); page.wait_for_timeout(40)
            assert page.locator('[data-employee-editor]').count()==1
            assert page.locator('[data-permission-grid] input[type="checkbox"]').count()>=9
            page.locator('.employee-editor .modal-x').click(); page.wait_for_timeout(20)
            vehicle=page.locator('[data-transfer-vehicle]')
            assert vehicle.locator('option').count()>2
            vehicle.select_option(index=1); page.wait_for_timeout(20)
            page.locator('[data-create-transfer]').click(); page.wait_for_timeout(80)
            assert page.locator('[data-transfer]').count()>=1
            page.locator('[data-transfer-complete]').first.click(); page.wait_for_timeout(60)
            assert page.get_by_text('Техника перемещена на новую точку.',exact=True).count()==1

            page.locator('[data-role="employee"]').click(); page.wait_for_timeout(50)
            assert page.locator('.bottom-nav button').count()==5
            page.locator('[data-go="calendar"]').last.click(); page.wait_for_timeout(100)
            assert page.locator('[data-owner-calendar]').count()==1
            assert page.locator('[data-owner-calendar-branch]').count()==1
            assert not page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
            assert not errors, errors
            ctx.close()
        browser.close()
finally:
    server.terminate(); server.wait(timeout=5)
