const K={quotes:'auto-sale-quotes-v2',notes:'auto-sale-notes-v2'};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(v)||0);
const dateRu=v=>{if(!v)return'—';const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('ru-RU',{day:'2-digit',month:'long',year:'numeric'})};
const quoteFor=leadId=>read(K.quotes,[]).filter(q=>q.leadId===leadId).sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0))[0];
const rows=[['lot','Цена лота'],['auction','Сбор аукциона'],['inland','Доставка по США'],['ocean','Морская доставка'],['customs','Таможня / оформление'],['repair','Ремонт / подготовка'],['service','Услуга компании']];

function panel(leadId,q){
  if(!q||q.status==='Черновик')return'';
  const actionable=['Отправлен','На согласовании'].includes(q.status);
  const agreed=q.status==='Согласован';
  const changes=q.clientDecision==='changes_requested';
  return `<section class="auto-client-quote" data-client-quote="${esc(q.id)}" data-lead="${esc(leadId)}">
    <div class="auto-client-quote-head"><div><span>РАСЧЁТ · ${esc(q.id)} · V${Number(q.version)||1}</span><h3>${esc(q.model||'Расчёт автомобиля')}</h3></div><b class="auto-status ${agreed?'good':''}">${esc(q.status)}</b></div>
    <div class="auto-client-quote-lines">${rows.map(([key,label])=>`<div><span>${label}</span><strong>${money(q[key])}</strong></div>`).join('')}</div>
    <div class="auto-client-quote-total"><span><b>Итого под ключ</b><small>Расчёт действует до ${dateRu(q.validUntil)}</small></span><strong>${money(q.total)}</strong></div>
    ${agreed?'<div class="auto-client-decision good"><b>Расчёт согласован</b><span>Менеджер получил ваше решение. Следующий шаг — депозит и оформление заказа.</span></div>':''}
    ${changes?`<div class="auto-client-decision warn"><b>Запрошены изменения</b><span>${esc(q.clientComment||'Менеджер получил ваш запрос и подготовит следующую версию расчёта.')}</span></div>`:''}
    ${actionable?`<div class="auto-client-quote-actions"><button type="button" class="auto-btn primary" data-client-quote-agree="${esc(q.id)}">Согласовать расчёт</button><button type="button" class="auto-btn ghost" data-client-quote-change="${esc(q.id)}">Нужны изменения</button></div><div class="auto-client-change" data-client-change-panel hidden><label>Что нужно изменить?<textarea data-client-quote-comment placeholder="Например: другой бюджет, комплектация, сроки доставки…"></textarea></label><div class="auto-actions"><button type="button" class="auto-btn primary" data-client-quote-send-change="${esc(q.id)}">Отправить менеджеру</button><button type="button" class="auto-btn ghost" data-client-quote-cancel-change>Отмена</button></div></div>`:''}
  </section>`;
}

function updateGuide(modal,q){
  const text=modal.querySelector('.auto-guide span');if(!text)return;
  if(q?.status==='Согласован')text.textContent='Расчёт согласован. Следующий шаг — внесение депозита и создание заказа.';
  else if(q?.clientDecision==='changes_requested')text.textContent='Запрос на изменения отправлен. Менеджер подготовит обновлённый расчёт.';
  else if(q&&['Отправлен','На согласовании'].includes(q.status))text.textContent='Проверьте расчёт ниже и нажмите «Согласовать расчёт» или «Нужны изменения».';
}

function enhance(){
  const modal=document.querySelector('[data-client-detail-bg] .auto-tg-modal');if(!modal)return;
  const id=modal.querySelector('[data-tg-manager]')?.dataset.tgManager||'';if(!id)return;
  const q=quoteFor(id);if(!q||q.status==='Черновик')return;
  const current=modal.querySelector('.auto-client-quote');
  if(current?.dataset.clientQuote===q.id&&current.dataset.state===`${q.status}|${q.clientDecision||''}|${q.clientComment||''}`){updateGuide(modal,q);return}
  current?.remove();
  const grid=modal.querySelector('.auto-client-order-grid');
  if(grid){grid.insertAdjacentHTML('afterend',panel(id,q));const node=modal.querySelector('.auto-client-quote');if(node)node.dataset.state=`${q.status}|${q.clientDecision||''}|${q.clientComment||''}`}
  updateGuide(modal,q);
}

function saveDecision(id,decision,comment=''){
  const list=read(K.quotes,[]),index=list.findIndex(q=>q.id===id);if(index<0)return false;
  const q=list[index];if(!['Отправлен','На согласовании'].includes(q.status))return false;
  const now=new Date().toISOString();
  if(decision==='agreed')list[index]={...q,status:'Согласован',clientDecision:'agreed',clientDecisionAt:now,agreedAt:q.agreedAt||now,updatedAt:now};
  else list[index]={...q,status:q.status==='Отправлен'?'На согласовании':q.status,clientDecision:'changes_requested',clientDecisionAt:now,clientComment:comment.trim(),updatedAt:now};
  write(K.quotes,list);
  const notes=read(K.notes,{});notes[q.leadId]=notes[q.leadId]||[];
  notes[q.leadId].push({at:now,text:decision==='agreed'?`Клиент согласовал расчёт ${q.id}.`:`Клиент запросил изменения по расчёту ${q.id}: ${comment.trim()||'без комментария'}.`});
  write(K.notes,notes);
  queueMicrotask(enhance);
  return true;
}

const style=document.createElement('style');style.id='auto-client-quote-style';style.textContent=`
.auto-client-quote{margin:18px 0;padding:18px;border:1px solid rgba(93,169,255,.34);border-radius:20px;background:rgba(40,105,170,.08)}
.auto-client-quote-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.auto-client-quote-head span{font-size:11px;font-weight:800;letter-spacing:.08em;color:#79b9ff}.auto-client-quote-head h3{margin:5px 0 0;font-size:18px}.auto-client-quote-lines{display:grid;gap:0;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden}.auto-client-quote-lines div{display:flex;justify-content:space-between;gap:16px;padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.07)}.auto-client-quote-lines div:last-child{border-bottom:0}.auto-client-quote-lines span{color:#9ea8b8}.auto-client-quote-total{display:flex;justify-content:space-between;gap:16px;align-items:end;padding:16px 2px 4px}.auto-client-quote-total span{display:grid;gap:4px}.auto-client-quote-total small{color:#8f99a8}.auto-client-quote-total strong{font-size:28px;color:#6bb6ff}.auto-client-quote-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.auto-client-decision{display:grid;gap:5px;margin-top:14px;padding:13px 14px;border-radius:14px}.auto-client-decision.good{background:rgba(48,185,120,.11);border:1px solid rgba(48,185,120,.3)}.auto-client-decision.warn{background:rgba(255,179,71,.09);border:1px solid rgba(255,179,71,.3)}.auto-client-decision span{color:#b6bec9;line-height:1.45}.auto-client-change{margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.09)}.auto-client-change label{display:grid;gap:8px;font-weight:700}.auto-client-change textarea{min-height:96px;resize:vertical}.auto-client-change .auto-actions{margin-top:10px}@media(max-width:520px){.auto-client-quote-actions{grid-template-columns:1fr}.auto-client-quote-total{align-items:flex-start}.auto-client-quote-total strong{font-size:24px}}
`;if(!document.getElementById(style.id))document.head.append(style);

new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',event=>{
  const agree=event.target.closest?.('[data-client-quote-agree]');if(agree){event.preventDefault();const q=read(K.quotes,[]).find(x=>x.id===agree.dataset.clientQuoteAgree);if(!q)return;const ok=typeof confirm==='function'?confirm(`Согласовать расчёт на ${money(q.total)}?`):true;if(ok)saveDecision(q.id,'agreed');return}
  const change=event.target.closest?.('[data-client-quote-change]');if(change){event.preventDefault();const p=change.closest('.auto-client-quote')?.querySelector('[data-client-change-panel]');if(p){p.hidden=false;p.querySelector('textarea')?.focus()}return}
  const cancel=event.target.closest?.('[data-client-quote-cancel-change]');if(cancel){event.preventDefault();const p=cancel.closest('[data-client-change-panel]');if(p)p.hidden=true;return}
  const send=event.target.closest?.('[data-client-quote-send-change]');if(send){event.preventDefault();const p=send.closest('[data-client-change-panel]'),comment=String(p?.querySelector('[data-client-quote-comment]')?.value||'').trim();if(!comment){const area=p?.querySelector('[data-client-quote-comment]');area?.focus();area?.setAttribute('placeholder','Напишите, что нужно изменить в расчёте');return}saveDecision(send.dataset.clientQuoteSendChange,'changes_requested',comment);return}
},true);
window.addEventListener('auto-sale-server-rejected',()=>{const box=document.querySelector('.auto-client-quote');if(box&&!box.querySelector('.auto-client-sync-error'))box.insertAdjacentHTML('beforeend','<div class="auto-client-sync-error auto-client-decision warn"><b>Не удалось сохранить решение</b><span>Повторите действие через несколько секунд.</span></div>')});
enhance();
