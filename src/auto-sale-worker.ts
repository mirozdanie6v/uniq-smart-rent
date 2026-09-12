import type { AutoSaleEnv,AnyRecord } from './auto-sale/types.js';
import { loadState } from './auto-sale/storage.js';
import { syncState } from './auto-sale/state-api.js';
import { demoLeads,demoQuotes,demoOrders,demoNotes } from './auto-sale/demo-business.js';

const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-headers':'content-type,x-auto-sale-key','access-control-allow-methods':'GET,PUT,OPTIONS'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const allowed=(request:Request,env:AutoSaleEnv)=>env.AUTO_SALE_DEMO_MODE==='1'||Boolean(env.AUTO_SALE_API_KEY&&request.headers.get('x-auto-sale-key')===env.AUTO_SALE_API_KEY);
async function parse(request:Request):Promise<AnyRecord|null>{try{return await request.json() as AnyRecord}catch{return null}}
const mergeById=(base:AnyRecord[]=[],extra:AnyRecord[]=[])=>{const map=new Map(base.map(x=>[String(x.id||''),x]));for(const item of extra)if(!map.has(String(item.id||'')))map.set(String(item.id||''),item);return [...map.values()]};
const withDemoBusiness=(state:AnyRecord):AnyRecord=>{
  const notes={...((state.notes&&typeof state.notes==='object'?state.notes:{}) as Record<string,AnyRecord[]>)};
  for(const [leadId,items] of Object.entries(demoNotes))if(!notes[leadId])notes[leadId]=items;
  return{...state,leads:mergeById(state.leads as AnyRecord[]||[],demoLeads),quotes:mergeById(state.quotes as AnyRecord[]||[],demoQuotes),orders:mergeById(state.orders as AnyRecord[]||[],demoOrders),notes,demoBusiness:true};
};

export default{async fetch(request:Request,env:AutoSaleEnv):Promise<Response>{
  const url=new URL(request.url);
  if(request.method==='OPTIONS'&&url.pathname.startsWith('/api/'))return new Response(null,{status:204,headers});
  if(url.pathname==='/api/health')return json({ok:true,service:'auto-sale-usa',productMode:env.PRODUCT_MODE||'auto-sale-usa',d1:Boolean(env.DB),schemaVersion:7,demoMode:env.AUTO_SALE_DEMO_MODE==='1',demoBusinessOrders:env.AUTO_SALE_DEMO_MODE==='1'?demoOrders.length:0});
  if(url.pathname==='/api/auto-sale/state'&&request.method==='GET'){
    if(!env.DB)return json({error:'persistence_not_configured'},503);
    const state=await loadState(env.DB);
    return json(env.AUTO_SALE_DEMO_MODE==='1'?withDemoBusiness(state):state);
  }
  if(url.pathname==='/api/auto-sale/state'&&request.method==='PUT'){
    if(!env.DB)return json({error:'persistence_not_configured'},503);
    if(!allowed(request,env))return json({error:'unauthorized'},401);
    const input=await parse(request);if(!input)return json({error:'invalid_json'},400);
    const result=await syncState(env.DB,input);return json(result.data,result.status);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'not_found'},404);
  return env.ASSETS.fetch(request);
}};
