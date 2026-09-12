const KEYS={leads:'auto-sale-leads-v2',quotes:'auto-sale-quotes-v2',orders:'auto-sale-orders-v2'};
const tg=window.Telegram?.WebApp;
try{tg?.ready?.()}catch{}

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(value)||0);
const dateRu=value=>{if(!value)return'—';const d=new Date(`${value}T00:00:00`);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString('ru-RU',{day:'2-digit',month:'short',year:'numeric'})};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const leads=()=>read(KEYS.leads,[]);
const quotes=()=>read(KEYS.quotes,[]);
const orders=()=>read(KEYS.orders,[]);

function telegramIdentity(){
  const user=tg?.initDataUnsafe?.user;
  if(!user?.id)return null;
  const firstName=String(user.first_name||'').trim();
  const lastName=String(user.last_name||'').trim();
  const username=String(user.username||'').replace(/^@/,'').trim();
  const displayName=[firstName,lastName].filter(Boolean).join(' ')||username||`Telegram ${user.id}`;
  return{id:String(user.id),username,firstName,lastName,displayName,contact:username?`@${username}`:`Telegram ID ${user.id}`};
}
const currentTelegram=telegramIdentity();
window.__AUTO_SALE_TELEGRAM_USER__=currentTelegram;

function usernameFrom(value){const match=String(value||'').match(/(?:^|\s|\/)(?:@|t\.me\/)?([A-Za-z0-9_]{5,32})(?:$|\s|\?|\/)/i);return match?.[1]||''}
function clientTelegram(lead){return{username:String(lead.telegramUsername||usernameFrom(lead.contact)||'').replace(/^@/,''),id:String(lead.telegramUserId||'')}}
function managerTelegram(lead){return{username:String(lead.managerTelegramUsername||'').replace(/^@/,''),id:String(lead.managerTelegramUserId||'')}}
function hasTelegram(contact){return Boolean(contact.username||contact.id)}
function openTelegram(contact){
  if(contact.username){const url=`https://t.me/${encodeURIComponent(contact.username)}`;try{if(tg?.openTelegramLink)return tg.openTelegramLink(url)}catch{}window.open(url,'_blank','noopener,noreferrer');return}
  if(contact.id){const url=`tg://user?id=${encodeURIComponent(contact.id)}`;try{location.href=url}catch{}}
}

function patchLead(id,patch){
  const rows=leads();const index=rows.findIndex(item=>item.id===id);if(index<0)return false;
  rows[index]={...rows[index],...patch};write(KEYS.leads,rows);return true;
}
function findNewestLead(match){
  return leads().filter(item=>(!match.name||item.name===match.name)&&(!match.contact||item.contact===match.contact)&&(!match.model||item.model===match.model)).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
}

function autofillClientRequest(){
  const form=document.querySelector('#requestForm');if(!form||form.elements.managerMode?.value!=='0'||form.dataset.telegramReady==='1')return;
  form.dataset.telegramReady='1';if(!currentTelegram)return;
  const name=form.elements.name,contact=form.elements.contact;
  if(name&&!name.value.trim()){name.value=currentTelegram.displayName;name.dataset.telegramAutofilled='1'}
  if(contact&&!contact.value.trim()){contact.value=currentTelegram.contact;contact.dataset.telegramAutofilled='1'}
  const note=document.createElement('div');note.className='auto-tg-hint full';note.innerHTML=`<span>Telegram</span><b>${esc(currentTelegram.displayName)}</b><small>${currentTelegram.username?`@${esc(currentTelegram.username)}`:`ID ${esc(currentTelegram.id)}`} · имя и контакт подставлены автоматически</small>`;
  const actions=form.querySelector('.auto-form-actions');actions?.before(note);
}

function enhanceManagerLead(){
  const form=document.querySelector('#leadEditForm');if(!form||form.dataset.telegramReady==='1')return;
  form.dataset.telegramReady='1';const id=form.elements.id?.value;const lead=leads().find(item=>item.id===id);if(!lead)return;
  const managerName=form.elements.manager?.value||lead.manager||'';
  const label=document.createElement('label');label.className='auto-tg-manager-field';label.innerHTML=`Telegram менеджера<input name="managerTelegram" placeholder="@username" value="${esc(lead.managerTelegramUsername?`@${lead.managerTelegramUsername}`:(currentTelegram?.username?`@${currentTelegram.username}`:''))}"><small>Нужен клиенту для кнопки «Написать менеджеру»</small>`;
  const managerLabel=form.elements.manager?.closest('label');managerLabel?.after(label);

  const contact=clientTelegram(lead);const side=document.querySelector('.auto-side-panel .auto-side-actions');
  if(side&&!side.querySelector('[data-tg-client]')){
    const button=document.createElement('button');button.type='button';button.className='auto-btn tg';button.dataset.tgClient=id;button.textContent=hasTelegram(contact)?'Написать клиенту в Telegram':'Telegram клиента не указан';button.disabled=!hasTelegram(contact);side.prepend(button);
  }
  const clientContact=form.elements.contact?.closest('label');
  if(clientContact&&hasTelegram(contact)&&!clientContact.querySelector('.auto-tg-inline')){
    const info=document.createElement('small');info.className='auto-tg-inline';info.textContent=contact.username?`Telegram: @${contact.username}`:`Telegram ID: ${contact.id}`;clientContact.append(info);
  }
  if(managerName&&currentTelegram?.username&&!lead.managerTelegramUsername)label.title=`Текущий Telegram будет сохранён как контакт менеджера ${managerName} после сохранения карточки.`;
}

function clientLeadRows(){return leads().filter(item=>item.clientCreated)}
function enhanceClientOrderCards(){
  const cards=[...document.querySelectorAll('.auto-order-card')];if(!cards.length)return;
  const rows=clientLeadRows();cards.forEach((card,index)=>{
    const lead=rows[index];if(!lead||card.dataset.clientLead)return;
    card.dataset.clientLead=lead.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label',`Открыть заказ ${lead.model||lead.id}`);
    const hint=document.createElement('div');hint.className='auto-order-open-hint';hint.innerHTML='<span>Открыть подробности</span><strong>→</strong>';card.append(hint);
  });
}

function quoteFor(leadId){return quotes().filter(item=>item.leadId===leadId).sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0))[0]}
function orderFor(leadId){return orders().find(item=>item.leadId===leadId)}
function stageSteps(active){
  const steps=['Запрос','Подбор','Расчёт','Согласование','Выкуп','Порт США','В море','Таможня','Доставка','Выдача'];
  const leadMap={'Новый':0,'В работе':1,'Расчёт':2,'Ожидает клиента':3,'Сделка':4,'Отказ':0};
  const idx=typeof active==='number'?active:Math.max(0,steps.indexOf(active));
  return `<div class="auto-client-track">${steps.map((step,i)=>`<span class="${i<=idx?'done':''}"><i>${i+1}</i><b>${step}</b></span>`).join('')}</div>`;
}
function clientDetail(lead){
  const quote=quoteFor(lead.id),order=orderFor(lead.id),manager=managerTelegram(lead);const stage=order?.stage||lead.status;const stageIndex=order?Math.max(0,['Запрос','Подбор','Расчёт','Согласование','Выкуп','Порт США','В море','Таможня','Доставка','Выдача'].indexOf(order.stage)):({'Новый':0,'В работе':1,'Расчёт':2,'Ожидает клиента':3,'Сделка':4,'Отказ':0}[lead.status]??0);
  return `<div class="auto-tg-modal-bg" data-client-detail-bg><div class="auto-tg-modal" role="dialog" aria-modal="true"><div class="auto-modal-head"><div><span class="auto-eyebrow">${esc(order?.id||lead.id)} · МОЙ ЗАКАЗ</span><h2>${esc(order?.model||lead.model||'Автомобиль')}</h2><p class="auto-modal-sub">Менеджер: ${esc(lead.manager||order?.manager||'назначается')} · ${esc(stage)}</p></div><button class="auto-close" type="button" data-client-detail-close>×</button></div>${stageSteps(stageIndex)}<div class="auto-client-order-grid"><div><span>Стоимость</span><b>${quote?.total?money(quote.total):lead.budget?`до ${money(lead.budget)}`:'по расчёту'}</b></div><div><span>Следующий шаг / ETA</span><b>${order?.eta?dateRu(order.eta):dateRu(lead.nextAction)}</b></div><div><span>LOT</span><b>${esc(order?.lot||'ещё не присвоен')}</b></div><div><span>VIN</span><b>${esc(order?.vin||'ещё не присвоен')}</b></div><div><span>Локация</span><b>${esc(order?.location||'—')}</b></div><div><span>Оплачено</span><b>${order?`${money(order.paid)} из ${money(order.total)}`:lead.deposit?money(lead.deposit):'—'}</b></div></div><div class="auto-client-request"><h3>Параметры заявки</h3><p>${esc(lead.yearFrom||'—')}–${esc(lead.yearTo||'—')} · пробег до ${esc(lead.mileageMax||'—')} км · ${esc(lead.engine||'Не важно')} · ${esc(lead.drive||'Не важно')}</p>${lead.note?`<small>${esc(lead.note)}</small>`:''}</div><div class="auto-actions"><button class="auto-btn tg" type="button" data-tg-manager="${esc(lead.id)}" ${hasTelegram(manager)?'':'disabled'}>${hasTelegram(manager)?'Написать менеджеру в Telegram':'Telegram менеджера ещё не указан'}</button><button class="auto-btn ghost" type="button" data-client-detail-close>Закрыть</button></div></div></div>`;
}
function showClientDetail(id){const lead=leads().find(item=>item.id===id);if(!lead)return;document.querySelector('[data-client-detail-bg]')?.remove();document.body.insertAdjacentHTML('beforeend',clientDetail(lead))}
function closeClientDetail(){document.querySelector('[data-client-detail-bg]')?.remove()}

let pendingClient=null;let pendingManager=null;
document.addEventListener('submit',event=>{
  const form=event.target;
  if(form?.id==='requestForm'){
    const managerMode=form.elements.managerMode?.value==='1';
    if(!managerMode&&currentTelegram){
      if(!form.elements.name.value.trim())form.elements.name.value=currentTelegram.displayName;
      if(!form.elements.contact.value.trim())form.elements.contact.value=currentTelegram.contact;
      pendingClient={name:form.elements.name.value.trim(),contact:form.elements.contact.value.trim(),model:form.elements.model.value.trim(),telegram:currentTelegram};
      setTimeout(()=>{if(!pendingClient)return;const lead=findNewestLead(pendingClient);if(lead){patchLead(lead.id,{telegramUserId:pendingClient.telegram.id,telegramUsername:pendingClient.telegram.username,telegramFirstName:pendingClient.telegram.firstName,telegramLastName:pendingClient.telegram.lastName,telegramDisplayName:pendingClient.telegram.displayName,contact:pendingClient.contact});window.dispatchEvent(new CustomEvent('auto-sale-telegram-lead-linked',{detail:{leadId:lead.id}}))}pendingClient=null},0);
    }
    if(managerMode){const managerTelegram=String(form.elements.managerTelegram?.value||'').trim();if(managerTelegram)pendingManager={name:form.elements.name.value.trim(),contact:form.elements.contact.value.trim(),model:form.elements.model.value.trim(),managerTelegram};}
  }
  if(form?.id==='leadEditForm'){
    const id=form.elements.id?.value,raw=String(form.elements.managerTelegram?.value||'').trim();pendingManager={id,managerTelegram:raw,managerName:form.elements.manager?.value||''};
    setTimeout(()=>{if(!pendingManager?.id)return;const username=usernameFrom(pendingManager.managerTelegram)||String(pendingManager.managerTelegram||'').replace(/^@/,'').trim();const useCurrent=currentTelegram&&username===currentTelegram.username;patchLead(pendingManager.id,{managerTelegramUsername:username,managerTelegramUserId:useCurrent?currentTelegram.id:'',managerTelegramName:pendingManager.managerName});pendingManager=null},0);
  }
},true);

document.addEventListener('click',event=>{
  const clientButton=event.target.closest('[data-tg-client]');if(clientButton){event.preventDefault();event.stopPropagation();const lead=leads().find(item=>item.id===clientButton.dataset.tgClient);if(lead)openTelegram(clientTelegram(lead));return}
  const managerButton=event.target.closest('[data-tg-manager]');if(managerButton){event.preventDefault();const lead=leads().find(item=>item.id===managerButton.dataset.tgManager);if(lead)openTelegram(managerTelegram(lead));return}
  const close=event.target.closest('[data-client-detail-close]');if(close){event.preventDefault();closeClientDetail();return}
  if(event.target.matches('[data-client-detail-bg]')){closeClientDetail();return}
  const card=event.target.closest('.auto-order-card[data-client-lead]');if(card&&!event.target.closest('button,a,input,select,textarea')){showClientDetail(card.dataset.clientLead)}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.querySelector('[data-client-detail-bg]')){closeClientDetail();return}
  const card=event.target.closest?.('.auto-order-card[data-client-lead]');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();showClientDetail(card.dataset.clientLead)}
});

function injectStyles(){if(document.getElementById('autoSaleTelegramStyles'))return;const style=document.createElement('style');style.id='autoSaleTelegramStyles';style.textContent=`
.auto-order-card[data-client-lead]{cursor:pointer;transition:transform .16s ease,border-color .16s ease}.auto-order-card[data-client-lead]:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.28)}.auto-order-card[data-client-lead]:focus-visible{outline:2px solid currentColor;outline-offset:3px}.auto-order-open-hint{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);font-size:13px;opacity:.75}.auto-btn.tg{background:#229ED9;color:#fff;border-color:#229ED9}.auto-btn.tg:disabled{opacity:.45;cursor:not-allowed}.auto-tg-hint{display:grid;gap:2px;padding:12px 14px;border:1px solid rgba(34,158,217,.32);border-radius:14px;background:rgba(34,158,217,.08)}.auto-tg-hint span{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7}.auto-tg-hint small,.auto-tg-inline,.auto-tg-manager-field small{font-size:12px;opacity:.68}.auto-tg-modal-bg{position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px}.auto-tg-modal{width:min(760px,100%);max-height:92dvh;overflow:auto;background:#101318;border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.45)}.auto-client-track{display:flex;gap:7px;overflow-x:auto;padding:14px 0 18px;scrollbar-width:none}.auto-client-track span{min-width:84px;display:grid;gap:5px;opacity:.38}.auto-client-track span.done{opacity:1}.auto-client-track i{width:25px;height:25px;border-radius:50%;display:grid;place-items:center;font-style:normal;border:1px solid rgba(255,255,255,.25);font-size:11px}.auto-client-track .done i{background:#fff;color:#0b0d10}.auto-client-track b{font-size:11px;font-weight:600}.auto-client-order-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.auto-client-order-grid>div{padding:13px;border:1px solid rgba(255,255,255,.1);border-radius:14px;display:grid;gap:5px}.auto-client-order-grid span{font-size:11px;opacity:.58}.auto-client-order-grid b{font-size:14px}.auto-client-request{margin-top:14px;padding:15px;border:1px solid rgba(255,255,255,.1);border-radius:14px}.auto-client-request h3{margin:0 0 7px}.auto-client-request p{margin:0}.auto-client-request small{display:block;margin-top:8px;opacity:.68}@media(max-width:720px){.auto-tg-modal-bg{align-items:flex-end;padding:0}.auto-tg-modal{border-radius:22px 22px 0 0;max-height:94dvh;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}.auto-client-order-grid{grid-template-columns:1fr 1fr}}@media(max-width:390px){.auto-client-order-grid{grid-template-columns:1fr}}
`;document.head.append(style)}

let scheduled=false;function enhance(){scheduled=false;injectStyles();autofillClientRequest();enhanceManagerLead();enhanceClientOrderCards()}
function scheduleEnhance(){if(scheduled)return;scheduled=true;queueMicrotask(enhance)}
const observer=new MutationObserver(scheduleEnhance);observer.observe(document.getElementById('app'),{childList:true,subtree:true});
scheduleEnhance();
