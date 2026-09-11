import type { AnyRecord,D1DatabaseLike } from './types.js';
import { bumpRevision,getRevision,loadState,putLead,putNote,putOrder,putPayment,putQuote } from './storage.js';
import { validateLead,validateOrder,validateQuote } from './rules.js';

const arr=(v:unknown):AnyRecord[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object') as AnyRecord[]:[];

export async function syncState(db:D1DatabaseLike,input:AnyRecord):Promise<{status:number,data:AnyRecord}>{
  const current=await getRevision(db);
  const supplied=input.baseRevision;
  if(supplied!==undefined&&supplied!==null&&Number(supplied)!==current){
    return{status:409,data:{error:'revision_conflict',currentRevision:current,state:await loadState(db)}};
  }
  const leads=arr(input.leads),quotes=arr(input.quotes),orders=arr(input.orders);
  const notes=(input.notes&&typeof input.notes==='object'?input.notes:{}) as Record<string,unknown>;
  for(const lead of leads){const errors=validateLead(lead);if(errors.length)return{status:400,data:{error:'invalid_lead',id:lead.id,details:errors}};await putLead(db,lead)}
  for(const quote of quotes){const errors=validateQuote(quote);if(errors.length)return{status:400,data:{error:'invalid_quote',id:quote.id,details:errors}};await putQuote(db,quote)}
  for(const order of orders){
    const errors=validateOrder(order).filter(e=>!['lot_required','vin_required','eta_required','location_required'].includes(e));
    if(errors.length)return{status:400,data:{error:'invalid_order',id:order.id,details:errors}};
    await putOrder(db,order);
    for(const payment of arr(order.payments))await putPayment(db,String(order.id||''),payment);
  }
  for(const [leadId,value] of Object.entries(notes)){
    const list=arr(value);
    for(let i=0;i<list.length;i++)await putNote(db,leadId,list[i]!,i);
  }
  return{status:200,data:{ok:true,revision:await bumpRevision(db)}};
}
