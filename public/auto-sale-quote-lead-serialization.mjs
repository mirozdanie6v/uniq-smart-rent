const LEADS_KEY='auto-sale-leads-v2';
const QUOTES_KEY='auto-sale-quotes-v2';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};

function showError(form,message){
  let box=form.querySelector('.auto-save-submit-feedback');
  if(!box){box=document.createElement('div');box.className='auto-save-submit-feedback full';form.querySelector('.auto-form-actions')?.insertAdjacentElement('beforebegin',box)}
  box.dataset.kind='error';box.textContent=message;box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}

function resolveLeadId(form){
  const quoteId=String(form.querySelector('input[name="id"]')?.value||'').trim();
  if(quoteId){
    const quote=read(QUOTES_KEY,[]).find(x=>String(x?.id||'')===quoteId);
    if(quote?.leadId)return String(quote.leadId);
  }
  const select=form.querySelector('select[name="leadId"]');
  const candidates=[select?.value,select?.dataset?.lockedValue,window.__AUTO_SALE_PENDING_QUOTE_LEAD__]
    .map(x=>String(x||'').trim()).filter(Boolean);
  const leads=read(LEADS_KEY,[]);
  return candidates.find(id=>leads.some(x=>String(x?.id||'')===id))||'';
}

function ensureSerializedLead(form){
  const leadId=resolveLeadId(form);
  form.querySelectorAll('input[data-auto-quote-lead-serialization]').forEach(x=>x.remove());
  if(!leadId)return false;
  const hidden=document.createElement('input');
  hidden.type='hidden';hidden.name='leadId';hidden.value=leadId;hidden.dataset.autoQuoteLeadSerialization='1';
  form.append(hidden);
  return true;
}

document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||form.id!=='quoteForm')return;
  if(ensureSerializedLead(form))return;
  event.preventDefault();event.stopImmediatePropagation();
  const button=form.querySelector('button[type="submit"]');if(button){button.textContent=button.dataset.originalText||'Сохранить расчёт';button.removeAttribute('aria-busy')}
  showError(form,'Не удалось сохранить расчёт: клиент не выбран. Выберите лида и повторите сохранение.');
},true);

window.__AUTO_SALE_ENSURE_QUOTE_LEAD__=ensureSerializedLead;
