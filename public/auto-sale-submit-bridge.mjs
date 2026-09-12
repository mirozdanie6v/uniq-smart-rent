const originalAddEventListener=EventTarget.prototype.addEventListener;
let rootSubmitHandler=null;

EventTarget.prototype.addEventListener=function(type,listener,options){
  if(type==='submit'&&this instanceof Element&&this.id==='app'&&typeof listener==='function'){
    rootSubmitHandler=listener;
    window.__AUTO_SALE_ROOT_SUBMIT__=listener;
  }
  return originalAddEventListener.call(this,type,listener,options);
};

window.__AUTO_SALE_INVOKE_ROOT_SUBMIT__=form=>{
  if(!form||typeof rootSubmitHandler!=='function')return false;
  if(form.id==='quoteForm')window.__AUTO_SALE_ENSURE_QUOTE_LEAD__?.(form);
  const before=form.id==='quoteForm'?localStorage.getItem('auto-sale-quotes-v2'):null;
  rootSubmitHandler.call(document.querySelector('#app'),{target:form,preventDefault(){}});
  const saved=form.id!=='quoteForm'||!form.isConnected||localStorage.getItem('auto-sale-quotes-v2')!==before;
  window.__AUTO_SALE_LAST_ROOT_SUBMIT__={formId:form.id,saved,at:Date.now()};
  return saved;
};
