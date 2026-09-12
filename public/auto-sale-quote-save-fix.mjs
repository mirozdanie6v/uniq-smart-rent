function fieldLabel(control){
  const label=control?.closest?.('label');
  if(!label)return 'обязательное поле';
  const text=[...label.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();
  return text||control.name||'обязательное поле';
}

function feedback(form,message,kind='warn'){
  if(!form?.isConnected)return;
  let box=form.querySelector('.auto-save-submit-feedback');
  if(!box){
    box=document.createElement('div');
    box.className='auto-save-submit-feedback full';
    form.querySelector('.auto-form-actions')?.insertAdjacentElement('beforebegin',box);
  }
  box.dataset.kind=kind;
  box.textContent=message;
  box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
}

function buttonFor(form){return form?.querySelector?.('button[type="submit"]')||null}
function startSaving(form){
  const button=buttonFor(form);if(!button)return null;
  button.dataset.originalText=button.dataset.originalText||button.textContent||'';
  button.textContent='Сохраняем…';
  button.setAttribute('aria-busy','true');
  return button;
}
function resetButton(button,text=''){
  if(!button)return;
  button.textContent=text||button.dataset.originalText||button.textContent||'';
  button.removeAttribute('aria-busy');
}
function showSaved(form,label){
  if(!form?.isConnected)return;
  const button=buttonFor(form);if(button){button.dataset.originalText=button.dataset.originalText||label;button.textContent='Сохранено ✓';button.removeAttribute('aria-busy');setTimeout(()=>{if(button.isConnected)resetButton(button,label)},1200)}
  feedback(form,'Изменения сохранены и отправляются в общую базу.','success');
}
function settleLocal(form,button,type){
  queueMicrotask(()=>{
    if(!form.isConnected){
      if(type==='lead')showSaved(document.querySelector('#leadEditForm'),'Сохранить карточку');
      return;
    }
    const error=form.querySelector('.auto-form-error');
    if(error?.textContent?.trim()){
      resetButton(button);
      feedback(form,`Не удалось сохранить: ${error.textContent.trim()}`,'error');
      return;
    }
    resetButton(button);
    feedback(form,'Сохранение не завершилось. Проверьте обязательные поля и повторите.','error');
  });
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
    resetButton(buttonFor(form));
    const control=event.target;
    feedback(form,`Не удалось сохранить расчёт: проверьте поле «${fieldLabel(control)}».`,'error');
  },true);

  form.addEventListener('submit',()=>{
    const button=startSaving(form);
    settleLocal(form,button,'quote');
  },true);
}

function patchLeadForm(){
  const form=document.querySelector('#leadEditForm');
  if(!form||form.dataset.leadSaveFix==='1')return;
  form.dataset.leadSaveFix='1';
  form.addEventListener('invalid',event=>{
    resetButton(buttonFor(form));
    feedback(form,`Не удалось сохранить карточку: проверьте поле «${fieldLabel(event.target)}».`,'error');
  },true);
  form.addEventListener('submit',()=>{
    const button=startSaving(form);
    settleLocal(form,button,'lead');
  },true);
}

function patchForms(){patchQuoteForm();patchLeadForm()}
const observer=new MutationObserver(patchForms);
observer.observe(document.documentElement,{childList:true,subtree:true});
patchForms();

window.addEventListener('auto-sale-server-synced',()=>{
  const form=document.querySelector('#leadEditForm');
  if(form)feedback(form,'Сохранено в общей базе D1.','success');
});
window.addEventListener('auto-sale-server-rejected',event=>{
  const form=document.querySelector('#leadEditForm,#quoteForm');
  if(!form)return;
  resetButton(buttonFor(form));
  const detail=event.detail||{};
  const extra=Array.isArray(detail.details)&&detail.details.length?`: ${detail.details.join(', ')}`:'';
  feedback(form,`Сервер не принял изменения (${detail.error||'ошибка проверки'})${extra}. Исправьте данные и сохраните ещё раз.`,'error');
});
window.addEventListener('auto-sale-server-conflict',()=>{
  const form=document.querySelector('#leadEditForm,#quoteForm');
  if(form){resetButton(buttonFor(form));feedback(form,'Данные были изменены в другой сессии. Загружена актуальная версия; проверьте поля перед повторным сохранением.','warn')}
});

if(!document.getElementById('autoSaleQuoteSaveFixStyles')){
  const style=document.createElement('style');
  style.id='autoSaleQuoteSaveFixStyles';
  style.textContent='.auto-field-locked{pointer-events:none;opacity:.78;background:rgba(255,255,255,.035)}.auto-save-submit-feedback{padding:10px 12px;margin:8px 0;border:1px solid rgba(230,177,71,.35);border-radius:12px;background:rgba(230,177,71,.08);font-size:12px;line-height:1.45;color:#f1d28f}.auto-save-submit-feedback[data-kind="success"]{border-color:rgba(74,190,130,.38);background:rgba(74,190,130,.09);color:#bdebd2}.auto-save-submit-feedback[data-kind="error"]{border-color:rgba(235,102,102,.4);background:rgba(235,102,102,.09);color:#ffc7c7}';
  document.head.append(style);
}
