(() => {
  'use strict';
  const text='Разделы панели · свайпните ← →';
  const activeRole=()=>document.querySelector('.role-switch [data-role].active')?.dataset.role||'';
  function ensure(){
    const shell=document.querySelector('.shell');
    const nav=document.querySelector('.bottom-nav');
    const owner=activeRole()==='owner';
    document.querySelectorAll('.owner-nav-hint').forEach(node=>{if(!owner)node.remove()});
    if(!owner||!shell||!nav)return;
    nav.classList.add('owner-nav','owner-nav-scroll');
    nav.setAttribute('aria-label',text);
    let hint=shell.querySelector('.owner-nav-hint');
    if(!hint){hint=document.createElement('div');hint.className='owner-nav-hint';shell.append(hint)}
    hint.textContent=text;
  }
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(ensure,0)};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-role],[data-go],[data-owner-custom]'))schedule()},true);
  document.addEventListener('DOMContentLoaded',ensure);
  ensure();
})();