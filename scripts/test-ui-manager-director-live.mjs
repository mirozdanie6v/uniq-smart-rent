import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=String(process.env.STAGING_URL||'').replace(/\/$/,'');
assert.ok(base,'STAGING_URL is required');
const executablePath=process.env.PLAYWRIGHT_CHROME_PATH||'/usr/bin/google-chrome';
const stamp=Date.now();
const testName='PHASE6 UI '+stamp;
const report={
  ok:false,
  base,
  testName,
  manager:{},
  director:{},
  network:{legacyWholeStateWrites:[],entityBatches:[]},
  cleanup:{},
  errors:[]
};
let browser;
let leadId='';

const api=async(path,options={})=>{
  const response=await fetch(base+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  return{response,data};
};

try{
  const health=await fetch(base+'/api/health').then(r=>r.json());
  assert.equal(health.legacyStateWrite,'retired');
  assert.equal(health.normalizedAuthoritative,true);
  report.health=health;

  browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.new_context({viewport:{width:1280,height:900}});
  const page=await context.new_page();
  page.on('request',request=>{
    const u=new URL(request.url());
    if(u.pathname==='/api/auto-sale/state'&&request.method()==='PUT')report.network.legacyWholeStateWrites.push({method:request.method(),url:request.url()});
    if(u.pathname==='/api/auto-sale/entities/batch')report.network.entityBatches.push({method:request.method(),url:request.url()});
  });
  page.on('console',msg=>{if(msg.type()==='error')report.errors.push('console: '+msg.text())});
  page.on('pageerror',error=>report.errors.push('pageerror: '+error.message));

  await page.goto(base+'/',{waitUntil:'networkidle',timeout:60000});
  await page.locator('[data-role="manager"]').click();
  await page.get_by_text('Рабочая панель менеджера',{exact:false}).wait_for({timeout:10000});
  report.manager.roleSwitch=true;

  await page.locator('[data-go="leads"]').click();
  await page.get_by_role('heading',{name:'Лиды и клиенты'}).wait_for();
  await page.locator('[data-manager-new]').first().click();
  const form=page.locator('#requestForm');
  await form.wait_for();
  await form.locator('[name="name"]').fill(testName);
  await form.locator('[name="contact"]').fill('@phase6_ui_e2e');
  await form.locator('[name="model"]').fill('Phase6 Test Car');
  await form.locator('[name="origin"]').select_option({label:'Грузия'});
  await form.locator('[name="budget"]').fill('25000');
  const managerSelect=form.locator('[name="manager"]');
  if(await managerSelect.evaluate(el=>el.tagName==='SELECT')){
    const value=await managerSelect.locator('option').evaluate_all(opts=>opts.map(o=>o.value).find(Boolean)||'');
    assert.ok(value,'Manager list has no selectable manager');
    await managerSelect.select_option(value);
    report.manager.selectedManager=value;
  }else{
    await managerSelect.fill('Phase6 Manager');
    report.manager.selectedManager='Phase6 Manager';
  }
  await form.locator('[name="priority"]').select_option({label:'Высокий'});
  await form.locator('[name="note"]').fill('Phase 6 real UI create scenario');
  const createWait=page.wait_for_response(r=>r.url().includes('/api/auto-sale/entities/batch')&&r.request().method()==='POST',{timeout:30000});
  await form.get_by_role('button',{name:'Создать лид'}).click();
  const createResponse=await createWait;
  assert.ok(createResponse.ok(),'Manager create lead batch failed: '+createResponse.status());
  report.manager.createStatus=createResponse.status();

  const row=page.locator('button[data-lead]').filter({hasText:testName}).first();
  await row.wait_for({timeout:10000});
  leadId=await row.get_attribute('data-lead');
  assert.ok(leadId,'Created lead id missing');
  report.manager.leadId=leadId;

  await row.click();
  const edit=page.locator('#leadEditForm');
  await edit.wait_for();
  await edit.locator('[name="status"]').select_option({label:'В работе'});
  await edit.locator('[name="note"]').fill('Phase 6 real UI status transition');
  const patchWait=page.wait_for_response(r=>r.url().includes('/api/auto-sale/entities/batch')&&r.request().method()==='POST',{timeout:30000});
  await edit.get_by_role('button',{name:'Сохранить карточку'}).click();
  const patchResponse=await patchWait;
  assert.ok(patchResponse.ok(),'Manager lead patch batch failed: '+patchResponse.status());
  report.manager.patchStatus=patchResponse.status();

  const verified=await api('/api/auto-sale/leads/'+encodeURIComponent(leadId));
  assert.ok(verified.response.ok,'Created lead cannot be re-read');
  assert.equal(verified.data.entity.status,'В работе');
  assert.equal(verified.data.entity.name,testName);
  report.manager.persistedStatus=verified.data.entity.status;
  report.manager.rowVersion=verified.data.rowVersion;
  await page.screenshot({path:'phase6-manager.png',fullPage:true});

  await page.locator('[data-role="owner"]').click();
  await page.get_by_text('Панель директора',{exact:false}).wait_for({timeout:10000});
  report.director.roleSwitch=true;

  const routes=[
    ['overview','Бизнес одним экраном'],
    ['pipeline','Воронка и качество лидов'],
    ['finance','Деньги по заказам'],
    ['ordersAdmin','Все сделки и автомобили']
  ];
  report.director.routes={};
  for(const [route,heading] of routes){
    await page.locator('[data-go="'+route+'"]').click();
    await page.get_by_role('heading',{name:heading}).wait_for();
    report.director.routes[route]=true;
  }

  const firstOrder=page.locator('button[data-order]').first();
  if(await firstOrder.count()){
    const orderId=await firstOrder.get_attribute('data-order');
    await firstOrder.click();
    await page.get_by_text('КОНТРОЛЬ',{exact:false}).first().wait_for();
    assert.equal(await page.locator('#orderForm').count(),0,'Director unexpectedly received editable order form');
    assert.equal(await page.locator('[data-order-next]').count(),0,'Director unexpectedly received stage transition control');
    report.director.readOnlyOrder={id:orderId,verified:true};
  }else{
    report.director.readOnlyOrder={verified:false,reason:'no_orders'};
  }
  await page.screenshot({path:'phase6-director.png',fullPage:true});

  assert.equal(report.network.legacyWholeStateWrites.length,0,'UI emitted legacy PUT /api/auto-sale/state');
  assert.ok(report.network.entityBatches.length>=2,'Expected manager entity batch writes were not observed');
  report.ok=true;
}catch(error){
  report.errors.push(error?.stack||String(error));
  throw error;
}finally{
  if(leadId){
    try{
      const current=await api('/api/auto-sale/leads/'+encodeURIComponent(leadId));
      if(current.response.ok){
        const removed=await api('/api/auto-sale/leads/'+encodeURIComponent(leadId),{
          method:'DELETE',
          body:JSON.stringify({baseRowVersion:current.data.rowVersion})
        });
        report.cleanup={leadId,status:removed.response.status,ok:removed.response.ok,data:removed.data};
      }
    }catch(error){report.cleanup={leadId,ok:false,error:String(error)}}
  }
  if(browser)await browser.close();
  await writeFile('phase6-ui-manager-director-report.json',JSON.stringify(report,null,2));
}
