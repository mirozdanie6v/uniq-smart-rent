const originalAddEventListener=EventTarget.prototype.addEventListener;
const NativeFormData=window.FormData;
let rootSubmitHandler=null;

const formKey=form=>String(form?.getAttribute?.('id')||'');
const recordControls=form=>form instanceof HTMLFormElement?[...form.querySelectorAll('[name="id"]')]:[];

function renameRecordIds(form){
  const controls=recordControls(form);
  for(const control of controls){
    control.dataset.autoRecordId='1';
    control.name='recordId';
  }
  return controls;
}
function restoreRecordIds(controls=[]){
  for(const control of controls){
    control.name='id';
    delete control.dataset.autoRecordId;
  }
}
function withStableFormId(form,fn){
  const controls=renameRecordIds(form);
  try{return fn()}finally{restoreRecordIds(controls)}
}

function AutoSaleFormData(form,submitter){
  const fd=arguments.length>1?new NativeFormData(form,submitter):arguments.length?new NativeFormData(form):new NativeFormData();
  if(form instanceof HTMLFormElement){
    const record=form.querySelector('[data-auto-record-id="1"]');
    if(record)fd.set('id',String(record.value||''));
  }
  return fd;
}
AutoSaleFormData.prototype=NativeFormData.prototype;
Object.setPrototypeOf(AutoSaleFormData,NativeFormData);
window.FormData=AutoSaleFormData;

EventTarget.prototype.addEventListener=function(type,listener,options){
  if(type==='submit'&&this instanceof Element&&this.getAttribute?.('id')==='app'&&typeof listener==='function'){
    rootSubmitHandler=listener;
    window.__AUTO_SALE_ROOT_SUBMIT__=listener;
  }
  return originalAddEventListener.call(this,type,listener,options);
};

const root=document.querySelector('#app');
if(root){
  originalAddEventListener.call(root,'submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    const controls=renameRecordIds(form);
    // Document-level capture handlers have already run. Keep the record field
    // renamed through the target and root bubble phases, then restore it.
    queueMicrotask(()=>restoreRecordIds(controls));
  },true);
}

window.__AUTO_SALE_INVOKE_ROOT_SUBMIT__=form=>{
  if(!(form instanceof HTMLFormElement)||typeof rootSubmitHandler!=='function')return false;
  const key=formKey(form);
  if(key==='quoteForm')window.__AUTO_SALE_ENSURE_QUOTE_LEAD__?.(form);
  const before=key==='quoteForm'?localStorage.getItem('auto-sale-quotes-v2'):null;
  const saved=withStableFormId(form,()=>{
    rootSubmitHandler.call(document.querySelector('#app'),{target:form,preventDefault(){}});
    return key!=='quoteForm'||!form.isConnected||localStorage.getItem('auto-sale-quotes-v2')!==before;
  });
  window.__AUTO_SALE_LAST_ROOT_SUBMIT__={formId:key,saved,at:Date.now()};
  return saved;
};
