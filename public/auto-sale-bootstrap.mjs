import {rebaseAutoSaleState,snapshotAutoSaleState} from './auto-sale-sync-merge.mjs?v=20260926-concurrency-1';
const DATA_KEYS={leads:'auto-sale-leads-v2',quotes:'auto-sale-quotes-v2',orders:'auto-sale-orders-v2',notes:'auto-sale-notes-v2',team:'auto-sale-team-v1',catalog:'auto-sale-catalog-v1'};
const REVISION_KEY='auto-sale-server-revision-v1';
const QUERY_PARAMS=new URLSearchParams(location.search);
const QUOTE_AUDIT_MODE=QUERY_PARAMS.has('quoteAudit');
const LEGACY_AUTOSYNC=QUERY_PARAMS.has('legacyAutosync');
window.__AUTO_SALE_LEGACY_AUTOSYNC__=LEGACY_AUTOSYNC;
const originalSet=Storage.prototype.setItem;
let suppress=false;
let revision=Number(sessionStorage.getItem(REVISION_KEY)||0);
let timer=null;
let syncing=false;
let pending=false;
let baselineState=null;
let lastPushedFingerprint='';
let activeSync=null;
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
function readCache(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function applyServerState(state){if(!state||!state.initialized)return;writeCache(DATA_KEYS.leads,state.leads||[]);writeCache(DATA_KEYS.quotes,state.quotes||[]);writeCache(DATA_KEYS.orders,state.orders||[]);writeCache(DATA_KEYS.notes,state.notes||{});writeCache(DATA_KEYS.team,state.team||[]);if(Array.isArray(state.catalog))writeCache(DATA_KEYS.catalog,state.catalog)}
function localState(){return{revision,initialized:true,leads:readCache(DATA_KEYS.leads,[]),quotes:readCache(DATA_KEYS.quotes,[]),orders:readCache(DATA_KEYS.orders,[]),notes:readCache(DATA_KEYS.notes,{}),team:readCache(DATA_KEYS.team,[]),catalog:readCache(DATA_KEYS.catalog,[])}}
function payload(){const state=localState();return{baseRevision:revision,leads:state.leads,quotes:state.quotes,orders:state.orders,notes:state.notes,team:state.team,catalog:state.catalog}}
function fingerprint(state=localState()){return JSON.stringify({leads:state.leads,quotes:state.quotes,orders:state.orders,notes:state.notes,team:state.team,catalog:state.catalog})}

async function pullInitialState(){
  try{
    const response=await fetch('/api/auto-sale/state',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const state=await response.json();
    revision=Number(state.revision||0);
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyServerState(state);
    baselineState=snapshotAutoSaleState(state);
    lastPushedFingerprint=fingerprint();
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:Boolean(state.initialized)};
  }catch(error){
    console.warn('AUTO SALE using offline cache',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
  }
}


async function entityBatch(operations,{allowCompatFallback=false}={}){
  const raw=Array.isArray(operations)?operations.map(item=>structuredClone(item)):[];
  if(!raw.length)return{ok:true,revision,rowVersions:{}};
  const created=new Set(raw.filter(item=>item?.operation==='create').map(item=>{const ref=aggregateRef(item);return ref.resource+':'+ref.id}));
  for(const operation of raw){
    const ref=aggregateRef(operation);
    if(!ref.resource||!ref.id||operation.operation==='create'||created.has(ref.resource+':'+ref.id))continue;
    if(operation.baseRowVersion===undefined||operation.baseRowVersion===null){
      const value=versionFor(ref.resource,ref.id);
      if(value!==null)operation.baseRowVersion=value;
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
      if(allowCompatFallback){
        const result=await pushState();
        if(result?.ok)return{...result,compatFallback:true};
      }
      window.dispatchEvent(new CustomEvent('auto-sale-entity-rejected',{detail:data}));
      const error=new Error(data.error||('http_'+response.status));error.code=data.error||('http_'+response.status);error.data=data;throw error;
    }
    revision=Number(data.revision||revision);
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyReturnedVersions(data.rowVersions||{});
    baselineState=snapshotAutoSaleState({...localState(),revision});
    lastPushedFingerprint=fingerprint();
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

function pushState(){
  if(activeSync){pending=true;return activeSync.then(()=>pushState())}
  activeSync=performPush().finally(()=>{activeSync=null});
  return activeSync;
}
async function performPush(){
  if(QUOTE_AUDIT_MODE)return;
  const currentFingerprint=fingerprint();
  if(currentFingerprint===lastPushedFingerprint)return{ok:true,revision};
  if(syncing){pending=true;return}
  syncing=true;
  try{
    for(let attempt=0;attempt<2;attempt++){
      const sent=payload();
      const response=await fetch('/api/auto-sale/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(sent)});
      const data=await response.json().catch(()=>({}));
      if(response.status===409){
        const serverState=data.state&&data.state.initialized?data.state:null;
        const currentRevision=Number(data.currentRevision||serverState?.revision||revision);
        if(serverState){
          const localBefore=localState();
          const base=baselineState||snapshotAutoSaleState({revision,initialized:true,leads:[],quotes:[],orders:[],notes:{},team:[],catalog:[]});
          const rebased=rebaseAutoSaleState(serverState,base,localBefore);
          revision=currentRevision;
          sessionStorage.setItem(REVISION_KEY,String(revision));
          baselineState=snapshotAutoSaleState(serverState);
          applyServerState(rebased);
        }else{
          revision=currentRevision;
          sessionStorage.setItem(REVISION_KEY,String(revision));
        }
        window.__AUTO_SALE_SERVER__={online:true,revision,conflict:true,currentRevision,retrying:attempt===0};
        window.dispatchEvent(new CustomEvent('auto-sale-server-conflict',{detail:{revision,currentRevision,state:serverState,retrying:attempt===0}}));
        if(attempt===0)continue;
        return{ok:false,error:'revision_conflict'};
      }
      if(!response.ok){
        console.warn('AUTO SALE state rejected by server',data);
        window.__AUTO_SALE_SERVER__={online:true,revision,error:data.error||`http_${response.status}`};
        window.dispatchEvent(new CustomEvent('auto-sale-server-rejected',{detail:data}));
        return{ok:false,error:data.error||`http_${response.status}`};
      }
      revision=Number(data.revision||revision);
      sessionStorage.setItem(REVISION_KEY,String(revision));
      baselineState=snapshotAutoSaleState({...sent,revision,initialized:true});
      lastPushedFingerprint=fingerprint(sent);
      if(fingerprint()!==lastPushedFingerprint)pending=true;
      window.__AUTO_SALE_SERVER__={online:true,revision,initialized:true};
      window.dispatchEvent(new CustomEvent('auto-sale-server-synced',{detail:{revision}}));
      return{ok:true,revision};
    }
  }catch(error){
    console.warn('AUTO SALE server sync deferred',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
    window.dispatchEvent(new CustomEvent('auto-sale-server-deferred',{detail:{revision}}));
    return{ok:false,error:'offline'};
  }finally{
    syncing=false;
    if(pending){pending=false;scheduleSync(40)}
  }
}
function scheduleSync(delay=180){if(QUOTE_AUDIT_MODE)return;clearTimeout(timer);timer=setTimeout(pushState,delay)}
window.__AUTO_SALE_FLUSH__=async()=>{clearTimeout(timer);let result=await pushState();if(result?.ok&&fingerprint()!==lastPushedFingerprint)result=await pushState();return result};

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
Storage.prototype.setItem=function(key,value){const tracked=this===localStorage&&Object.values(DATA_KEYS).includes(String(key));const before=tracked?this.getItem(key):null;originalSet.call(this,key,value);if(tracked&&!suppress&&!QUOTE_AUDIT_MODE&&LEGACY_AUTOSYNC&&before!==String(value))scheduleSync()};
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
