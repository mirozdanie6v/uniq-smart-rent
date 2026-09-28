import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';

const base=String(process.env.STAGING_URL||'').replace(/\/$/,'');
const apiKey=String(process.env.AUTO_SALE_API_KEY||'');
if(!base)throw new Error('STAGING_URL required');
const headers={'content-type':'application/json',...(apiKey?{'x-auto-sale-key':apiKey}:{})};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const receipts=[];
async function req(path,options={}){
  const response=await fetch(base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(55000)});
  return{response,data:await response.json()};
}
async function state(){
  let lastError=null;
  for(let attempt=1;attempt<=4;attempt++){
    try{
      const {response,data}=await req('/api/auto-sale/state');
      if(response.ok)return data;
      lastError=new Error('state read HTTP '+response.status+': '+JSON.stringify(data));
    }catch(error){lastError=error}
    if(attempt<4)await sleep(600*attempt);
  }
  throw lastError||new Error('state read failed');
}
async function delivered(notifications,expected,label){
  assert.equal(notifications?.queued,expected,label+' queued count');
  let rows=notifications.deliveries||[];
  for(let attempt=0;rows.length!==expected||!rows.every(x=>x.status==='sent'&&x.messageId);attempt++){
    if(attempt>=12)throw new Error(label+' deliveries not confirmed: '+JSON.stringify(rows));
    if(!apiKey)throw new Error('Delivery pending; authenticated outbox check required: '+JSON.stringify(rows));
    await sleep(5500);
    const processed=await req('/api/auto-sale/notifications/process',{method:'POST'});
    assert.ok(processed.response.ok,'outbox processor');
    const query=new URLSearchParams();for(const id of notifications.ids)query.append('id',id);
    const checked=await req('/api/auto-sale/notifications/status?'+query);
    assert.ok(checked.response.ok,'delivery receipts');rows=checked.data.deliveries;
  }
  assert.equal(rows.filter(x=>x.target==='client').length,expected/2,label+' client');
  assert.equal(rows.filter(x=>x.target==='manager').length,expected/2,label+' manager');
  receipts.push(...rows.map(x=>({...x,step:label})));
  console.log('TELEGRAM_STEP_OK',JSON.stringify({step:label,deliveries:rows.map(({target,event,messageId})=>({target,event,messageId}))}));
}
async function mutate(label,expected,change){
  for(let attempt=0;attempt<5;attempt++){
    const current=await state();change(current);
    const {response,data}=await req('/api/auto-sale/state',{method:'PUT',body:JSON.stringify({...current,baseRevision:current.revision})});
    if(response.status===409){await sleep(300);continue}
    assert.ok(response.ok,label+': '+JSON.stringify(data));
    await delivered(data.notifications,expected,label);await sleep(1200);return data;
  }
  throw new Error('Concurrent updates: '+label);
}
const initial=await state();
const manager=(initial.team||[]).find(x=>x.active!==false&&String(x.telegramUsername||x.telegram||'').replace(/^@/,'').toLowerCase()==='flyer_flyer'&&/^\d+$/.test(String(x.telegramUserId||'')));
assert.ok(manager,'Flyer_Flyer manager Telegram must be linked');
const telegramUserId=String(manager.telegramUserId),suffix=Date.now().toString(36).toUpperCase();
const leadId='L-QA-'+suffix,quoteId='Q-QA-'+suffix,orderId='O-QA-'+suffix;
const today=new Date().toISOString().slice(0,10),future=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
const model='ТЕСТ · BMW X5 · '+suffix;
const verification={lotNumber:'TEST-'+suffix,vin:'TESTVIN0000000001',year:2022,mileage:1000,damage:'ТЕСТ: вымышленное досье для проверки приложения',photos:[base+'/auto-sale-logo-automir.png'],history:'ТЕСТОВЫЕ ДАННЫЕ. Не реальная проверка автомобиля.',checkedAt:today,result:'Одобрен к покупке'};
const report={leadId,quoteId,orderId,telegram:'@Flyer_Flyer',receipts};
try{
  await mutate('Новый',2,s=>{s.leads.push({id:leadId,name:'ТЕСТ @Flyer_Flyer',contact:'@Flyer_Flyer',model,origin:'США',budget:45000,source:'Mini App',manager:manager.name,status:'Новый',nextAction:today,priority:'Средний',createdAt:new Date().toISOString(),clientCreated:true,isTest:true,telegramUserId,telegramUsername:'Flyer_Flyer',managerTelegramUserId:telegramUserId,deposit:0,note:'Полный тест уведомлений. Не реальная покупка.'});s.notes[leadId]=[]});
  for(const status of ['В работе','Расчёт'])await mutate(status,2,s=>{s.leads.find(x=>x.id===leadId).status=status});
  await mutate('Черновик расчёта',2,s=>{s.quotes.push({id:quoteId,leadId,model,origin:'США',transportMode:'Море',lot:25000,auction:1000,inland:1000,ocean:2500,customs:6500,repair:1500,service:1500,total:39000,status:'Черновик',version:1,validUntil:future,verification,updatedAt:new Date().toISOString()})});
  await mutate('Расчёт отправлен',4,s=>{s.leads.find(x=>x.id===leadId).status='Ожидает клиента';Object.assign(s.quotes.find(x=>x.id===quoteId),{status:'Отправлен',sentAt:new Date().toISOString()})});
  await mutate('На согласовании',2,s=>{s.quotes.find(x=>x.id===quoteId).status='На согласовании'});
  await mutate('Запрос изменений',2,s=>{Object.assign(s.quotes.find(x=>x.id===quoteId),{clientDecision:'changes_requested',clientComment:'ТЕСТ: подтвердите сроки доставки',clientDecisionAt:new Date().toISOString()})});
  await mutate('Расчёт согласован',2,s=>{Object.assign(s.quotes.find(x=>x.id===quoteId),{status:'Согласован',clientDecision:'agreed',clientDecisionAt:new Date().toISOString(),agreedAt:new Date().toISOString()})});
  await mutate('Сделка',2,s=>{Object.assign(s.leads.find(x=>x.id===leadId),{status:'Сделка',deposit:10000,depositDate:today,paymentMethod:'Банк'})});
  const plan=[{id:'auction_deposit',title:'Аукционный аванс',amount:10000},{id:'auction_balance',title:'Автомобиль и аукционные сборы',amount:16000},{id:'logistics_legalization',title:'Логистика',amount:6500},{id:'customs_fts',title:'Таможня',amount:6500}];
  const payment=i=>({id:'PAY-'+suffix+'-'+i,amount:plan[i].amount,date:today,method:'Банк',paymentStage:plan[i].id,note:'ТЕСТ, деньги не переводились'});
  await mutate('Заказ и депозит',4,s=>{s.orders.push({id:orderId,leadId,customer:'ТЕСТ @Flyer_Flyer',model,origin:'США',transportMode:'Море',manager:manager.name,total:39000,cost:37500,paid:10000,stage:'Выкуп',lot:verification.lotNumber,vin:verification.vin,eta:future,location:'ТЕСТ',paymentPlan:plan,payments:[payment(0)]})});
  await mutate('Оплата автомобиля',2,s=>{const o=s.orders.find(x=>x.id===orderId);o.payments.push(payment(1));o.paid=26000});
  for(const stage of ['Подготовка к отправке','В пути','Таможня','Доставка'])await mutate(stage,2,s=>{const o=s.orders.find(x=>x.id===orderId);o.stage=stage;o.location='ТЕСТ · '+stage});
  await mutate('Оплата логистики',2,s=>{const o=s.orders.find(x=>x.id===orderId);o.payments.push(payment(2));o.paid=32500});
  await mutate('Полная оплата',2,s=>{const o=s.orders.find(x=>x.id===orderId);o.payments.push(payment(3));o.paid=39000});
  await mutate('Выдача',2,s=>{s.orders.find(x=>x.id===orderId).stage='Выдача'});
  const final=await state(),order=final.orders.find(x=>x.id===orderId);
  assert.equal(order.stage,'Выдача');assert.equal(order.paid,39000);
  assert.ok(initial.leads.every(old=>final.leads.some(x=>x.id===old.id)),'Existing applications preserved');
  assert.equal(new Set(receipts.map(x=>x.id)).size,receipts.length);
  assert.equal(new Set(receipts.map(x=>x.messageId)).size,receipts.length);
  report.ok=true;report.count=receipts.length;report.perRole={client:receipts.filter(x=>x.target==='client').length,manager:receipts.filter(x=>x.target==='manager').length};
  console.log('AUTOWORLD_FULL_LIFECYCLE_OK',JSON.stringify({...report,receipts:undefined}));
}finally{
  await writeFile('telegram-lifecycle-report.json',JSON.stringify(report,null,2));
}
