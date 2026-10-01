(() => {
  'use strict';
  const text='Разделы панели · свайпните ← →';
  const activeRole=()=>document.querySelector('.role-switch [data-role].active')?.dataset.role||'';
  window.__UNIQ_OWNER_NAV_STABLE__={loaded:true};
  function ensure(){
    const shell=document.querySelector('.shell');
    const nav=document.querySelector('.bottom-nav');
    const owner=activeRole()==='owner';
    const hints=[...document.querySelectorAll('.owner-nav-hint')];
    if(!owner){hints.forEach(node=>node.remove());return}
    if(!shell||!nav)return;
    nav.classList.add('owner-nav','owner-nav-scroll');
    nav.setAttribute('aria-label',text);
    let hint=hints.find(node=>node.closest('.shell')===shell)||null;
    if(!hint){hint=document.createElement('div');hint.className='owner-nav-hint';shell.append(hint)}
    hint.textContent=text;
    [...document.querySelectorAll('.owner-nav-hint')].forEach(node=>{if(node!==hint)node.remove()});
  }
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(ensure,0)};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-role],[data-go],[data-owner-custom]'))schedule()},true);
  document.addEventListener('DOMContentLoaded',ensure);
  ensure();
})();