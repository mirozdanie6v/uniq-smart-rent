const DATA_KEYS={leads:'auto-sale-leads-v2',quotes:'auto-sale-quotes-v2',orders:'auto-sale-orders-v2',notes:'auto-sale-notes-v2'};
const REVISION_KEY='auto-sale-server-revision-v1';
const originalSet=Storage.prototype.setItem;
let suppress=false;
let revision=Number(sessionStorage.getItem(REVISION_KEY)||0);
let timer=null;
let syncing=false;
let pending=false;

function writeCache(key,value){suppress=true;try{originalSet.call(localStorage,key,JSON.stringify(value))}finally{suppress=false}}
function readCache(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
function applyServerState(state){if(!state||!state.initialized)return;writeCache(DATA_KEYS.leads,state.leads||[]);writeCache(DATA_KEYS.quotes,state.quotes||[]);writeCache(DATA_KEYS.orders,state.orders||[]);writeCache(DATA_KEYS.notes,state.notes||{})}
function payload(){return{baseRevision:revision,leads:readCache(DATA_KEYS.leads,[]),quotes:readCache(DATA_KEYS.quotes,[]),orders:readCache(DATA_KEYS.orders,[]),notes:readCache(DATA_KEYS.notes,{})}}

async function pullInitialState(){
  try{
    const response=await fetch('/api/auto-sale/state',{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok)return;
    const state=await response.json();
    revision=Number(state.revision||0);
    sessionStorage.setItem(REVISION_KEY,String(revision));
    applyServerState(state);
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:Boolean(state.initialized)};
  }catch(error){
    console.warn('AUTO SALE using offline cache',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
  }
}

async function pushState(){
  if(syncing){pending=true;return}
  syncing=true;
  try{
    const response=await fetch('/api/auto-sale/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload())});
    const data=await response.json().catch(()=>({}));
    if(response.status===409){
      const currentRevision=Number(data.currentRevision||data.state?.revision||revision);
      window.__AUTO_SALE_SERVER__={online:true,revision,conflict:true,currentRevision};
      window.dispatchEvent(new CustomEvent('auto-sale-server-conflict',{detail:{revision,currentRevision,state:data.state||null}}));
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
    window.__AUTO_SALE_SERVER__={online:true,revision,initialized:true};
    window.dispatchEvent(new CustomEvent('auto-sale-server-synced',{detail:{revision}}));
  }catch(error){
    console.warn('AUTO SALE server sync deferred',error);
    window.__AUTO_SALE_SERVER__={online:false,revision};
    window.dispatchEvent(new CustomEvent('auto-sale-server-deferred',{detail:{revision}}));
  }finally{
    syncing=false;
    if(pending){pending=false;scheduleSync(40)}
  }
}
function scheduleSync(delay=180){clearTimeout(timer);timer=setTimeout(pushState,delay)}

await pullInitialState();
Storage.prototype.setItem=function(key,value){originalSet.call(this,key,value);if(this===localStorage&&!suppress&&Object.values(DATA_KEYS).includes(String(key)))scheduleSync()};
await import('./auto-sale-app-v3.mjs');
await import('./auto-sale-ui-business-guard.mjs');
await import('./auto-sale-quote-save-fix.mjs');
await import('./auto-sale-catalog-extra.mjs');
scheduleSync(250);
