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
  rootSubmitHandler.call(document.querySelector('#app'),{target:form,preventDefault(){}});
  return true;
};
