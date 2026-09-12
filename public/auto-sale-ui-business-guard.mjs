const read=(key,fallback=[])=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const leads=()=>read('auto-sale-leads-v2',[]);
const quotes=()=>read('auto-sale-quotes-v2',[]);
const money=v=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(v)||0);

function errorBox(form,message){let box=form.querySelector('.auto-form-error');if(!box){box=document.createElement('div');box.className='auto-form-error full';form.prepend(box)}box.textContent=message;box.scrollIntoView?.({block:'nearest'})}
function latestQuote(leadId){return quotes().filter(q=>q.leadId===leadId).sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0))[0]}
function hardenQuoteForm(){const form=document.querySelector('#quoteForm');if(!form||form.dataset.businessGuard==='1')return;form.dataset.businessGuard='1';const id=form.querySelector('[name="id"]')?.value||'',select=form.querySelector('select[name="leadId"]');if(!select)return;if(id){const value=select.value,hidden=document.createElement('input');hidden.type='hidden';hidden.name='leadId';hidden.value=value;select.disabled=true;select.setAttribute('aria-disabled','true');select.insertAdjacentElement('afterend',hidden);const hint=document.createElement('small');hint.className='auto-rule-hint good';hint.textContent='Лид зафиксирован для этой версии расчёта.';select.parentElement?.append(hint);return}const closed=new Set(leads().filter(l=>['Сделка','Отказ'].includes(l.status)).map(l=>l.id));for(const option of [...select.options])if(closed.has(option.value))option.remove()}
function harden(){hardenQuoteForm()}

const observer=new MutationObserver(harden);observer.observe(document.documentElement,{childList:true,subtree:true});harden();
document.addEventListener('submit',event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=='leadEditForm')return;const deposit=form.querySelector('[name="deposit"]');if(!deposit)return;const leadId=form.querySelector('[name="id"]')?.value||'',quote=latestQuote(leadId),amount=Number(deposit.value)||0,total=Number(quote?.total)||0;if(total>0&&amount>total){event.preventDefault();event.stopImmediatePropagation();errorBox(form,`Депозит ${money(amount)} превышает согласованную стоимость ${money(total)}.`)}},true);
