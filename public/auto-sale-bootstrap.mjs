const DATA_KEYS={leads:'auto-sale-leads-v2',quotes:'auto-sale-quotes-v2',orders:'auto-sale-orders-v2',notes:'auto-sale-notes-v2',team:'auto-sale-team-v1',catalog:'auto-sale-catalog-v1'};
const REVISION_KEY='auto-sale-server-revision-v1';
window.__AUTO_SALE_LEGACY_AUTOSYNC__=false;
const originalSet=Storage.prototype.setItem;
let suppress=false;
let revision=Number(sessionStorage.getItem(REVISION_KEY)||0);
let rowVersions={lead:{},quote:{},order:{},team:{},catalog:{}};

function writeCache(key,value){suppress=true;try{originalSet.call(localStorage,key,JSON.stringify(value))}finally{suppress=false}}
window.__AUTO_SALE_CACHE_WRITE__=writeCache;
window.__AUTO_SALE_ROW_VERSIONS__=rowVersions;
function setRowVersions(next){
  rowVersions={lead:{},quote:{},order:{},team:{},catalog:{},...(next||{})};
  for(const key of ['lead','quote','order','team','catalog'])rowVersions[key]={...(rowVersions[key]||{})};
  window.__AUTO_SALE_ROW_VERSIONS__=rowVersions;
}
function aggregateRef(operation){
  const resource=String(operation?.resource||'');
  if(resource==='note')return{resource:'lead',id:String(operation.leadId||operation.id||'')};
  if(resource==='payment')return{resource:'order',id:String(operation.orderId||operation.id||'')};
  return{resource,id:String(operation?.id||operation?.input?.id||'')};
}
function versionFor(resource,id){const value=Number(rowVersions?.[resource]?.[id]);return Number.isInteger(value)&&value>0?value:null}
function applyReturnedVersions(map={}){
  for(const [key,value] of Object.entries(map||{})){
    const split=key.indexOf(':');if(split<1)continue;
    const resource=key.slice(0,split),id=key.slice(split+1);
    if(!rowVersions[resource])rowVersions[resource]={};
    if(value===null)delete rowVersions[resource][id];
    else rowVersions[resource][id]=Number(value)||0;
  }
  window.__AUTO_SALE_ROW_VERSIONS__=rowVersions;
}
async function ensureEntityVersion(resource,id){
  const known=versionFor(resource,id);if(known!==null)return known;
  const plural=({lead:'leads',quote:'quotes',order:'orders',team:'team',catalog:'catalog'})[resource];
  if(!plural||!id)return null;
  try{
    const response=await fetch('/api/auto-sale/'+plural+'/'+encodeURIComponent(id),{headers:{accept:'application/json'},cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return null;
    const value=Number(data.rowVersion);
    if(Number.isInteger(value)&&value>0){
      if(!rowVersions[resource])rowVersions[resource]={};
      rowVersions[resource][id]=value;
      window.__AUTO_SALE_ROW_VERSIONS__=rowVersions;
      return value;
    }
  }catch{}
  return null;
}

function readCache(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function applyServerState(state){if(!state||!state.initialized)return;writeCache(DATA_KEYS.leads,state.leads||[]);writeCache(DATA_KEYS.quotes,state.quotes||[]);writeCache(DATA_KEYS.orders,state.orders||[]);writeCache(DATA_KEYS.notes,state.notes||{});writeCache(DATA_KEYS.team,state.team||[]);if(Array.isArray(state.catalog))writeCache(DATA_KEYS.catalog,state.catalog)}
async function pullInitialState(){
  try{
    const response=await fetch('/api/auto-sale/state',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const state=await response.json();
    revision=Number(state.revision||0);
    setRowVersions(state._rowVersions||{});
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyServerState(state);
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:Boolean(state.initialized)};
  }catch(error){
    console.warn('AUTO SALE using offline cache',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
  }
}


async function entityBatch(operations){
  const raw=Array.isArray(operations)?operations.map(item=>structuredClone(item)):[];
  if(!raw.length)return{ok:true,revision,rowVersions:{}};
  const created=new Set(raw.filter(item=>item?.operation==='create').map(item=>{const ref=aggregateRef(item);return ref.resource+':'+ref.id}));
  for(const operation of raw){
    const ref=aggregateRef(operation);
    if(!ref.resource||!ref.id||operation.operation==='create'||created.has(ref.resource+':'+ref.id))continue;
    if(operation.baseRowVersion===undefined||operation.baseRowVersion===null){
      const value=await ensureEntityVersion(ref.resource,ref.id);
      if(value===null){
        const error=new Error('row_version_unavailable');error.code='row_version_unavailable';error.data={resource:ref.resource,id:ref.id};throw error;
      }
      operation.baseRowVersion=value;
    }
  }
  try{
    const response=await fetch('/api/auto-sale/entities/batch',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({operations:raw})
    });
    const data=await response.json().catch(()=>({}));
    if(response.status===409&&data.error==='entity_conflict'){
      await pullInitialState();
      window.__AUTO_SALE_SERVER__={online:true,revision,entityConflict:true,...data};
      window.dispatchEvent(new CustomEvent('auto-sale-entity-conflict',{detail:data}));
      const error=new Error('entity_conflict');error.code='entity_conflict';error.data=data;throw error;
    }
    if(!response.ok){
      window.dispatchEvent(new CustomEvent('auto-sale-entity-rejected',{detail:data}));
      const error=new Error(data.error||('http_'+response.status));error.code=data.error||('http_'+response.status);error.data=data;throw error;
    }
    revision=Number(data.revision||revision);
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyReturnedVersions(data.rowVersions||{});
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:true,entityMode:true};
    window.dispatchEvent(new CustomEvent('auto-sale-entity-synced',{detail:{revision,rowVersions:data.rowVersions||{},notifications:data.notifications||null}}));
    return{ok:true,...data};
  }catch(error){
    if(error?.code==='entity_conflict')throw error;
    console.warn('AUTO SALE entity command failed',error);
    window.__AUTO_SALE_SERVER__={online:false,revision,error:error?.code||'entity_command_failed'};
    throw error;
  }
}
window.__AUTO_SALE_ENTITY_BATCH__=entityBatch;
window.__AUTO_SALE_ENTITY_VERSION__=versionFor;
window.__AUTO_SALE_REFRESH_STATE__=pullInitialState;

function normalizeSettledPaymentField(){
  const form=document.querySelector('#orderForm');if(!form)return;
  const amount=form.elements?.paymentAmount,id=form.elements?.id?.value;if(!amount||!id)return;
  const order=readCache(DATA_KEYS.orders,[]).find(x=>x.id===id);if(!order)return;
  const stageId=form.elements?.paymentStage?.value||'',plan=Array.isArray(order.paymentPlan)?order.paymentPlan:[],stage=plan.find(x=>x.id===stageId),stagePaid=stageId?(Array.isArray(order.payments)?order.payments:[]).filter(x=>x.paymentStage===stageId).reduce((sum,x)=>sum+(Number(x.amount)||0),0):0;
  const remaining=stage?Math.max(0,(Number(stage.amount)||0)-stagePaid):Math.max(0,(Number(order.total)||0)-(Number(order.paid)||0));
  if(remaining<=0){
    amount.value='0';
    amount.removeAttribute('max');
    amount.disabled=true;
    amount.setAttribute('aria-disabled','true');
    amount.dataset.paymentSettled='1';
    amount.classList.remove('auto-field-blocked');
    amount.closest('label')?.querySelector('.auto-field-blocker')?.remove();
    return;
  }
  amount.disabled=false;
  amount.removeAttribute('aria-disabled');
  delete amount.dataset.paymentSettled;
  amount.max=String(remaining);
}

await pullInitialState();
await import('./auto-sale-submit-bridge.mjs?v=20260921-live-values-1');
await import('./auto-sale-app-v3.mjs?v=20260929-entity-cutover-1');
await import('./auto-sale-ui-business-guard.mjs?v=20260929-entity-cutover-1');
await import('./auto-sale-quote-lead-serialization.mjs');
await import('./auto-sale-quote-save-fix.mjs?v=20260929-entity-cutover-1');
await import('./auto-sale-lead-status-fix.mjs');
await import('./auto-sale-required-fields.mjs');
await import('./auto-sale-director-team.mjs?v=20260929-entity-cutover-1');
await import('./auto-sale-telegram.mjs?v=20260929-entity-cutover-1');
await import('./auto-sale-telegram-id.mjs?v=20260927-safe-chat-link-v2');
await import('./auto-sale-client-quote.mjs?v=20260929-entity-cutover-1');
normalizeSettledPaymentField();
const appRoot=document.querySelector('#app');
if(appRoot)new MutationObserver(()=>queueMicrotask(normalizeSettledPaymentField)).observe(appRoot,{childList:true,subtree:true});
document.addEventListener('input',event=>{if(event.target?.closest?.('#orderForm'))queueMicrotask(normalizeSettledPaymentField)},true);
