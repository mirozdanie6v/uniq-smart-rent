const base=String(process.env.STAGING_URL||'').replace(/\/+$/,'');
const apiKey=String(process.env.AUTO_SALE_API_KEY||'');
if(!base)throw new Error('STAGING_URL is required');
if(!apiKey)throw new Error('AUTO_SALE_API_KEY is required');

const headers={'content-type':'application/json','x-auto-sale-key':apiKey};
const clone=value=>JSON.parse(JSON.stringify(value));
const today=new Date().toISOString().slice(0,10);
const addDays=(days)=>{const d=new Date();d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};

async function request(path,options={}){
  const response=await fetch(base+path,{...options,headers:{...headers,...options.headers}});
  const data=await response.json().catch(()=>({}));
  return{response,data};
}
async function getState(){
  const {response,data}=await request('/api/auto-sale/state',{method:'GET'});
  if(!response.ok)throw new Error(`GET state failed: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function putState(state){
  const payload={...state,baseRevision:Number(state.revision)||0};
  delete payload.revision;
  const {response,data}=await request('/api/auto-sale/state',{method:'PUT',body:JSON.stringify(payload)});
  if(!response.ok)throw new Error(`PUT state failed: ${response.status} ${JSON.stringify(data)}`);
  const next=await getState();
  if(Number(next.revision)!==Number(data.revision))throw new Error('revision_mismatch_after_write');
  return next;
}
async function mutate(mutator){
  const state=await getState();
  mutator(state);
  return putState(state);
}

const publicStateResponse=await fetch(base+'/api/auto-sale/state',{headers:{accept:'application/json'},cache:'no-store'});
const publicState=await publicStateResponse.json().catch(()=>({}));
if(!publicStateResponse.ok||publicState.initialized!==true)throw new Error(`public_demo_state_expected_200_got_${publicStateResponse.status}`);

const original=clone(await getState());
const suffix=Date.now().toString(36).toUpperCase();
const leadId=`L-YDB-${suffix}`;
const quoteId=`Q-YDB-${suffix}`;
const orderId=`O-YDB-${suffix}`;
const payment1=`PAY-YDB-${suffix}-1`;
const payment2=`PAY-YDB-${suffix}-2`;
const total=39000;

try{
  await mutate(state=>{
    state.leads.push({
      id:leadId,name:'Yandex E2E Client',contact:`e2e-${suffix}@example.invalid`,model:'BMW X5 xDrive40i 2022',
      budget:45000,source:'Mini App',manager:'Дмитрий',status:'Новый',priority:'Средний',
      createdAt:new Date().toISOString(),nextAction:today,note:'Yandex staging E2E',clientCreated:true,
      yearFrom:'2021',yearTo:'2023',mileageMax:'50000',engine:'Бензин',drive:'AWD',damage:'Минимальные',
      deliveryCity:'Москва',deposit:0,depositDate:'',paymentMethod:''
    });
    state.notes[leadId]=[{at:new Date().toISOString(),text:'Yandex E2E: лид создан.'}];
  });

  await mutate(state=>{
    const lead=state.leads.find(x=>x.id===leadId);lead.status='В работе';
    state.notes[leadId].push({at:new Date().toISOString(),text:'Yandex E2E: лид взят в работу.'});
  });

  await mutate(state=>{
    const lead=state.leads.find(x=>x.id===leadId);lead.status='Расчёт';
    state.quotes.push({
      id:quoteId,leadId,model:'BMW X5 xDrive40i 2022',lot:25000,auction:1000,inland:1000,ocean:2500,
      customs:6500,repair:1500,service:1500,total,status:'Черновик',version:1,validUntil:addDays(7),
      updatedAt:new Date().toISOString()
    });
  });

  await mutate(state=>{
    const lead=state.leads.find(x=>x.id===leadId);lead.status='Ожидает клиента';
    const quote=state.quotes.find(x=>x.id===quoteId);quote.status='Отправлен';quote.sentAt=new Date().toISOString();quote.updatedAt=quote.sentAt;
  });

  await mutate(state=>{
    const quote=state.quotes.find(x=>x.id===quoteId);quote.status='Согласован';quote.agreedAt=new Date().toISOString();quote.updatedAt=quote.agreedAt;
  });

  await mutate(state=>{
    const lead=state.leads.find(x=>x.id===leadId);
    lead.status='Сделка';lead.deposit=5000;lead.depositDate=today;lead.paymentMethod='Банк';
  });

  await mutate(state=>{
    state.orders.push({
      id:orderId,leadId,customer:'Yandex E2E Client',model:'BMW X5 xDrive40i 2022',manager:'Дмитрий',source:'Mini App',
      total,cost:37500,paid:5000,stage:'Выкуп',eta:addDays(45),lot:'',vin:'',location:'',risk:'Нет',riskType:'Нет',riskNote:'',
      updatedAt:new Date().toISOString(),
      payments:[{id:payment1,amount:5000,date:today,method:'Банк',note:'Депозит',createdAt:new Date().toISOString()}]
    });
  });

  for(const stage of ['Порт США','В море','Таможня','Доставка']){
    await mutate(state=>{
      const order=state.orders.find(x=>x.id===orderId);
      order.stage=stage;order.lot='E2E-LOT-001';order.vin='E2E-VIN-00000000001';order.eta=addDays(30);order.location=stage;order.updatedAt=new Date().toISOString();
    });
  }

  await mutate(state=>{
    const order=state.orders.find(x=>x.id===orderId);
    order.payments.push({id:payment2,amount:34000,date:today,method:'Банк',note:'Финальная оплата',createdAt:new Date().toISOString()});
    order.paid=total;order.stage='Выдача';order.location='Пункт выдачи';order.updatedAt=new Date().toISOString();
  });

  const finalState=await getState();
  const lead=finalState.leads.find(x=>x.id===leadId);
  const quote=finalState.quotes.find(x=>x.id===quoteId);
  const order=finalState.orders.find(x=>x.id===orderId);
  if(lead?.status!=='Сделка')throw new Error('e2e_lead_not_deal');
  if(quote?.status!=='Согласован')throw new Error('e2e_quote_not_agreed');
  if(order?.stage!=='Выдача'||Number(order?.paid)!==total)throw new Error('e2e_order_not_handed_off');
  console.log('AUTO_SALE_YANDEX_E2E_OK',JSON.stringify({leadId,quoteId,orderId,revision:finalState.revision,stage:order.stage,paid:order.paid}));
}finally{
  const latest=await getState();
  const restore={...clone(original),baseRevision:Number(latest.revision)||0};
  delete restore.revision;
  const {response,data}=await request('/api/auto-sale/state',{method:'PUT',body:JSON.stringify(restore)});
  if(!response.ok)throw new Error(`restore_failed: ${response.status} ${JSON.stringify(data)}`);
  const restored=await getState();
  const counts={
    leads:restored.leads?.length||0,quotes:restored.quotes?.length||0,orders:restored.orders?.length||0,
    notes:Object.values(restored.notes||{}).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0),
    team:restored.team?.length||0
  };
  const originalCounts={
    leads:original.leads?.length||0,quotes:original.quotes?.length||0,orders:original.orders?.length||0,
    notes:Object.values(original.notes||{}).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0),
    team:original.team?.length||0
  };
  if(JSON.stringify(counts)!==JSON.stringify(originalCounts))throw new Error(`restore_count_mismatch ${JSON.stringify({counts,originalCounts})}`);
  console.log('AUTO_SALE_YANDEX_E2E_RESTORED',JSON.stringify({revision:restored.revision,counts}));
}
