function fieldLabel(control){
  const label=control?.closest?.('label');
  if(!label)return 'обязательное поле';
  const text=[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
  return text||control.name||'обязательное поле';
}

function feedback(form,message){
  let box=form.querySelector('.auto-quote-submit-feedback');
  if(!box){
    box=document.createElement('div');
    box.className='auto-quote-submit-feedback full';
    form.querySelector('.auto-form-actions')?.insertAdjacentElement('beforebegin',box);
  }
  box.textContent=message;
  box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}

function patchQuoteForm(){
  const form=document.querySelector('#quoteForm');
  if(!form||form.dataset.quoteSaveFix==='1')return;
  form.dataset.quoteSaveFix='1';

  const id=form.querySelector('input[name="id"]')?.value||'';
  const leadSelect=form.querySelector('select[name="leadId"]');
  if(id&&leadSelect){
    const hidden=[...form.querySelectorAll('input[type="hidden"][name="leadId"]')].find(x=>x!==leadSelect);
    const lockedValue=hidden?.value||leadSelect.value;
    hidden?.remove();
    leadSelect.disabled=false;
    leadSelect.value=lockedValue;
    leadSelect.dataset.lockedValue=lockedValue;
    leadSelect.setAttribute('aria-readonly','true');
    leadSelect.classList.add('auto-field-locked');
    leadSelect.tabIndex=-1;
    leadSelect.addEventListener('pointerdown',event=>event.preventDefault());
    leadSelect.addEventListener('keydown',event=>event.preventDefault());
    leadSelect.addEventListener('change',()=>{leadSelect.value=leadSelect.dataset.lockedValue||lockedValue});
  }

  form.addEventListener('invalid',event=>{
    const control=event.target;
    feedback(form,`Не удалось сохранить расчёт: проверьте поле «${fieldLabel(control)}».`);
  },true);

  form.addEventListener('submit',()=>{
    const button=form.querySelector('button[type="submit"]');
    if(button){button.dataset.originalText=button.textContent||'';button.textContent='Сохраняем…'}
  },true);
}

const observer=new MutationObserver(patchQuoteForm);
observer.observe(document.documentElement,{childList:true,subtree:true});
patchQuoteForm();

if(!document.getElementById('autoSaleQuoteSaveFixStyles')){
  const style=document.createElement('style');
  style.id='autoSaleQuoteSaveFixStyles';
  style.textContent='.auto-field-locked{pointer-events:none;opacity:.78;background:rgba(255,255,255,.035)}.auto-quote-submit-feedback{padding:10px 12px;margin:8px 0;border:1px solid rgba(230,177,71,.35);border-radius:12px;background:rgba(230,177,71,.08);font-size:12px;line-height:1.45;color:#f1d28f}';
  document.head.append(style);
}
