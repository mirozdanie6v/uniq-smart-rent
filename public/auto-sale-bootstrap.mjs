import {rebaseAutoSaleState,snapshotAutoSaleState} from './auto-sale-sync-merge.mjs?v=20260926-concurrency-1';
const DATA_KEYS={leads:'auto-sale-leads-v2',quotes:'auto-sale-quotes-v2',orders:'auto-sale-orders-v2',notes:'auto-sale-notes-v2',team:'auto-sale-team-v1',catalog:'auto-sale-catalog-v1'};
const REVISION_KEY='auto-sale-server-revision-v1';
const QUOTE_AUDIT_MODE=new URLSearchParams(location.search).has('quoteAudit');
const originalSet=Storage.prototype.setItem;
let suppress=false;
let revision=Number(sessionStorage.getItem(REVISION_KEY)||0);
let timer=null;
let syncing=false;
let pending=false;
let baselineState=null;

function writeCache(key,value){suppress=true;try{originalSet.call(localStorage,key,JSON.stringify(value))}finally{suppress=false}}
function readCache(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function applyServerState(state){if(!state||!state.initialized)return;writeCache(DATA_KEYS.leads,state.leads||[]);writeCache(DATA_KEYS.quotes,state.quotes||[]);writeCache(DATA_KEYS.orders,state.orders||[]);writeCache(DATA_KEYS.notes,state.notes||{});writeCache(DATA_KEYS.team,state.team||[]);if(Array.isArray(state.catalog))writeCache(DATA_KEYS.catalog,state.catalog)}
function localState(){return{revision,initialized:true,leads:readCache(DATA_KEYS.leads,[]),quotes:readCache(DATA_KEYS.quotes,[]),orders:readCache(DATA_KEYS.orders,[]),notes:readCache(DATA_KEYS.notes,{}),team:readCache(DATA_KEYS.team,[]),catalog:readCache(DATA_KEYS.catalog,[])}}
function payload(){const state=localState();return{baseRevision:revision,leads:state.leads,quotes:state.quotes,orders:state.orders,notes:state.notes,team:state.team,catalog:state.catalog}}

async function pullInitialState(){
  try{
    const response=await fetch('/api/auto-sale/state',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const state=await response.json();
    revision=Number(state.revision||0);
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyServerState(state);
    baselineState=snapshotAutoSaleState(state);
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:Boolean(state.initialized)};
  }catch(error){
    console.warn('AUTO SALE using offline cache',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
  }
}

async function pushState(){
  if(QUOTE_AUDIT_MODE)return;
  if(syncing){pending=true;return}
  syncing=true;
  try{
    for(let attempt=0;attempt<2;attempt++){
      const response=await fetch('/api/auto-sale/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload())});
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
        return;
      }
      if(!response.ok){
        console.warn('AUTO SALE state rejected by server',data);
        window.__AUTO_SALE_SERVER__={online:true,revision,error:data.error||`http_${response.status}`};
        window.dispatchEvent(new CustomEvent('auto-sale-server-rejected',{detail:data}));
        return;
      }
      revision=Number(data.revision||revision);
      sessionStorage.setItem(REVISION_KEY,String(revision));
      baselineState=snapshotAutoSaleState({...localState(),revision,initialized:true});
      window.__AUTO_SALE_SERVER__={online:true,revision,initialized:true};
      window.dispatchEvent(new CustomEvent('auto-sale-server-synced',{detail:{revision}}));
      return;
    }
  }catch(error){
    console.warn('AUTO SALE server sync deferred',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
    window.dispatchEvent(new CustomEvent('auto-sale-server-deferred',{detail:{revision}}));
  }finally{
    syncing=false;
    if(pending){pending=false;scheduleSync(40)}
  }
}
function scheduleSync(delay=180){if(QUOTE_AUDIT_MODE)return;clearTimeout(timer);timer=setTimeout(pushState,delay)}

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
Storage.prototype.setItem=function(key,value){const tracked=this===localStorage&&Object.values(DATA_KEYS).includes(String(key));const before=tracked?this.getItem(key):null;originalSet.call(this,key,value);if(tracked&&!suppress&&!QUOTE_AUDIT_MODE&&before!==String(value))scheduleSync()};
await import('./auto-sale-submit-bridge.mjs?v=20260921-live-values-1');
await import('./auto-sale-app-v3.mjs?v=20260926-responsive-manager-v1');
await import('./auto-sale-ui-business-guard.mjs');
await import('./auto-sale-quote-lead-serialization.mjs');
await import('./auto-sale-quote-save-fix.mjs');
await import('./auto-sale-lead-status-fix.mjs');
await import('./auto-sale-required-fields.mjs');
await import('./auto-sale-director-team.mjs?v=20260926-responsive-manager-v1');
await import('./auto-sale-telegram.mjs?v=20260925-bot-messaging-v1');
await import('./auto-sale-telegram-id.mjs?v=20260924-no-demo-1');
await import('./auto-sale-client-quote.mjs');
normalizeSettledPaymentField();
const appRoot=document.querySelector('#app');
if(appRoot)new MutationObserver(()=>queueMicrotask(normalizeSettledPaymentField)).observe(appRoot,{childList:true,subtree:true});
document.addEventListener('input',event=>{if(event.target?.closest?.('#orderForm'))queueMicrotask(normalizeSettledPaymentField)},true);
