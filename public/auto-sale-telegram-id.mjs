const KEY='auto-sale-leads-v2';
const rows=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-tg-client]');
  if(!button)return;
  const lead=rows().find(item=>item.id===button.dataset.tgClient);
  if(!lead?.telegramUserId||lead.telegramUsername)return;
  event.preventDefault();event.stopImmediatePropagation();
  window.location.assign('tg://user?id='+encodeURIComponent(String(lead.telegramUserId)));
},true);
