import type { AnyRecord } from './types.js';

export const LEAD_STATUSES=['Новый','В работе','Расчёт','Ожидает клиента','Сделка','Отказ'];
export const QUOTE_STATUSES=['Черновик','Отправлен','На согласовании','Согласован','Отказ'];
export const ORDER_STAGES=['Запрос','Подбор','Расчёт','Согласование','Выкуп','Порт США','В море','Таможня','Доставка','Выдача'];
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const num=(v:unknown)=>Number(v)||0;

export function validateLead(lead:AnyRecord):string[]{
  const errors:string[]=[];
  if(!text(lead.name))errors.push('name_required');
  if(!text(lead.contact))errors.push('contact_required');
  if(!text(lead.model))errors.push('model_required');
  if(!LEAD_STATUSES.includes(text(lead.status)||'Новый'))errors.push('invalid_lead_status');
  return errors;
}
export function validateQuote(quote:AnyRecord):string[]{
  const errors:string[]=[];
  if(!text(quote.leadId))errors.push('lead_required');
  if(!text(quote.model))errors.push('model_required');
  if(!QUOTE_STATUSES.includes(text(quote.status)||'Черновик'))errors.push('invalid_quote_status');
  if(text(quote.status)!=='Черновик'&&num(quote.total)<=0)errors.push('positive_total_required');
  if(text(quote.status)!=='Черновик'&&!text(quote.validUntil))errors.push('valid_until_required');
  return errors;
}
export function validateOrder(order:AnyRecord,previousStage=''):string[]{
  const errors:string[]=[];
  const stage=text(order.stage);
  if(!text(order.leadId))errors.push('lead_required');
  if(!ORDER_STAGES.includes(stage))errors.push('invalid_order_stage');
  if(previousStage){const from=ORDER_STAGES.indexOf(previousStage),to=ORDER_STAGES.indexOf(stage);if(to>from+1||to<from)errors.push('invalid_stage_transition')}
  if(ORDER_STAGES.indexOf(stage)>=ORDER_STAGES.indexOf('Порт США')){
    if(!text(order.lot))errors.push('lot_required');
    if(!text(order.vin))errors.push('vin_required');
    if(!text(order.eta))errors.push('eta_required');
    if(!text(order.location))errors.push('location_required');
  }
  if(text(order.riskType)&&text(order.riskType)!=='Нет'&&!text(order.riskNote))errors.push('risk_note_required');
  return errors;
}
export function nextStageAllowed(from:string,to:string):boolean{
  const a=ORDER_STAGES.indexOf(from),b=ORDER_STAGES.indexOf(to);
  return a>=0&&b>=0&&(b===a||b===a+1);
}
