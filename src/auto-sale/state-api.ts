import type { AnyRecord,D1DatabaseLike } from './types.js';
import { bumpRevision,loadState,putLead,putNote,putOrder,putPayment,putQuote } from './storage.js';
import { leadTransitionAllowed,quoteTransitionAllowed,validateLead,validateOrder,validateQuote } from './rules.js';

const arr=(v:unknown):AnyRecord[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object') as AnyRecord[]:[];
const text=(v:unknown)=>String(v??'').trim();
const num=(v:unknown)=>Number(v)||0;
const demoId=(v:unknown)=>/(^|-)DEMO(-|$)/i.test(text(v));
const same=(a:unknown,b:unknown)=>String(a??'')===String(b??'');
const latestQuote=(quotes:AnyRecord[],leadId:string)=>quotes.filter(q=>text(q.leadId)===leadId).sort((a,b)=>num(b.version)-num(a.version))[0];

export async function syncState(db:D1DatabaseLike,input:AnyRecord):Promise<{status:number,data:AnyRecord}>{
  const previous=await loadState(db);
  const current=Number(previous.revision)||0;
  const supplied=input.baseRevision;
  if(supplied!==undefined&&supplied!==null&&Number(supplied)!==current){
    return{status:409,data:{error:'revision_conflict',currentRevision:current,state:previous}};
  }
  const leads=arr(input.leads).filter(x=>!demoId(x.id));
  const quotes=arr(input.quotes).filter(x=>!demoId(x.id)&&!demoId(x.leadId));
  const orders=arr(input.orders).filter(x=>!demoId(x.id)&&!demoId(x.leadId));
  const rawNotes=(input.notes&&typeof input.notes==='object'?input.notes:{}) as Record<string,unknown>;
  const notes=Object.fromEntries(Object.entries(rawNotes).filter(([leadId])=>!demoId(leadId)));
  const previousLeads=new Map(arr(previous.leads).filter(x=>!demoId(x.id)).map(x=>[text(x.id),x]));
  const previousQuotes=new Map(arr(previous.quotes).filter(x=>!demoId(x.id)).map(x=>[text(x.id),x]));
  const previousOrders=new Map(arr(previous.orders).filter(x=>!demoId(x.id)).map(x=>[text(x.id),x]));
  const initialized=Boolean(previous.initialized);

  for(const lead of leads){
    const errors=validateLead(lead);if(errors.length)return{status:400,data:{error:'invalid_lead',id:lead.id,details:errors}};
    const before=previousLeads.get(text(lead.id));
    if(initialized&&before){
      const agreed=quotes.some(q=>text(q.leadId)===text(lead.id)&&text(q.status)==='Согласован');
      if(!leadTransitionAllowed(text(before.status),text(lead.status),{hasAgreedQuote:agreed,deposit:num(lead.deposit)}))return{status:400,data:{error:'invalid_lead_transition',id:lead.id,from:before.status,to:lead.status}};
    }
    await putLead(db,lead);
  }

  for(const quote of quotes){
    const errors=validateQuote(quote);if(errors.length)return{status:400,data:{error:'invalid_quote',id:quote.id,details:errors}};
    const before=previousQuotes.get(text(quote.id));
    if(initialized&&before){
      if(!same(before.leadId,quote.leadId))return{status:400,data:{error:'quote_lead_locked',id:quote.id}};
      if(!quoteTransitionAllowed(text(before.status),text(quote.status)))return{status:400,data:{error:'invalid_quote_transition',id:quote.id,from:before.status,to:quote.status}};
      if(['Согласован','Отказ'].includes(text(before.status))){
        for(const key of ['leadId','model','lot','auction','inland','ocean','customs','repair','service','total','version','validUntil'])if(!same(before[key],quote[key]))return{status:400,data:{error:'locked_quote_changed',id:quote.id,field:key}};
      }
    }else if(initialized&&!quoteTransitionAllowed('',text(quote.status))){
      return{status:400,data:{error:'invalid_initial_quote_status',id:quote.id,status:quote.status}};
    }
    await putQuote(db,quote);
  }

  const seenLeadOrders=new Set<string>();
  for(const order of orders){
    const leadId=text(order.leadId);
    if(seenLeadOrders.has(leadId))return{status:400,data:{error:'duplicate_order_for_lead',leadId}};
    seenLeadOrders.add(leadId);
    const before=previousOrders.get(text(order.id));
    const errors=validateOrder(order,initialized&&before?text(before.stage):'');
    if(errors.length)return{status:400,data:{error:'invalid_order',id:order.id,details:errors}};
    if(initialized&&before){
      for(const key of ['leadId','model','total','cost'])if(!same(before[key],order[key]))return{status:400,data:{error:'locked_order_field_changed',id:order.id,field:key}};
    }else if(initialized){
      if(text(order.stage)!=='Выкуп')return{status:400,data:{error:'new_order_must_start_at_purchase',id:order.id,stage:order.stage}};
      const lead=leads.find(x=>text(x.id)===leadId),quote=latestQuote(quotes,leadId);
      if(!lead||!quote||text(quote.status)!=='Согласован'||num(lead.deposit)<=0)return{status:400,data:{error:'order_prerequisites_missing',id:order.id}};
      const already=[...previousOrders.values()].some(x=>text(x.leadId)===leadId);
      if(already)return{status:400,data:{error:'duplicate_order_for_lead',leadId}};
    }
    await putOrder(db,order);
    for(const payment of arr(order.payments))await putPayment(db,text(order.id),payment);
  }

  for(const [leadId,value] of Object.entries(notes)){
    const list=arr(value);
    for(let i=0;i<list.length;i++)await putNote(db,leadId,list[i]!,i);
  }
  return{status:200,data:{ok:true,revision:await bumpRevision(db)}};
}
