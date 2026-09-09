(() => {
  'use strict';

  const DATE_KEY='uniq-client-dates-v1';
  const REQUEST_KEY='uniq-data-requests-v3';
  const PAYMENT_KEY='uniq-demo-payments-v1';
  const fleet=()=>Array.isArray(window.UNIQ_FLEET)?window.UNIQ_FLEET:[];
  const activeRole=()=>document.querySelector('.role-switch [data-role].active')?.dataset.role||'';
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=value=>`${new Intl.NumberFormat('ru-RU').format(Math.max(0,Math.round(Number(value)||0)))} ₫`;
  const requests=()=>{const value=read(REQUEST_KEY,[]);return Array.isArray(value)?value:[]};
  const payments=()=>{const value=read(PAYMENT_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}};

  const defaultDates=()=>{
    const a=new Date(),b=new Date();a.setDate(a.getDate()+1);b.setDate(b.getDate()+4);
    return {from:a.toISOString().slice(0,10),to:b.toISOString().slice(0,10)};
  };
  const validDates=value=>value&&/^\d{4}-\d{2}-\d{2}$/.test(value.from||'')&&/^\d{4}-\d{2}-\d{2}$/.test(value.to||'')&&value.to>=value.from;
  const selectedDates=()=>{const saved=read(DATE_KEY,null);return validDates(saved)?saved:defaultDates()};
  function saveDatesFromHome(){
    const from=document.querySelector('#quickFrom')?.value,to=document.querySelector('#quickTo')?.value;
    if(validDates({from,to}))write(DATE_KEY,{from,to});
  }
  function applyDates(){
    const dates=selectedDates();
    const quickFrom=document.querySelector('#quickFrom'),quickTo=document.querySelector('#quickTo');
    if(quickFrom&&quickFrom.value!==dates.from)quickFrom.value=dates.from;
    if(quickTo&&quickTo.value!==dates.to)quickTo.value=dates.to;
    const form=document.querySelector('#bookForm');
    if(form&&!form.dataset.releaseDates){
      const from=form.querySelector('input[name="from"]'),to=form.querySelector('input[name="to"]');
      if(from)from.value=dates.from;if(to)to.value=dates.to;
      form.dataset.releaseDates='1';
    }
  }

  function enhanceFleetCount(){
    if(activeRole()!=='client')return;
    const count=document.querySelector('.hero-fleet-card .showcase-head>div:first-child');
    if(!count||count.dataset.releaseCatalog)return;
    count.dataset.releaseCatalog='1';count.classList.add('fleet-count-link');count.tabIndex=0;count.setAttribute('role','button');count.setAttribute('aria-label','Открыть каталог — 89 единиц техники');
  }
  function enhanceCards(){
    if(activeRole()!=='client')return;
    document.querySelectorAll('.vehicle-card[data-open]').forEach(card=>{
      const body=card.querySelector('.vehicle-body');if(!body||body.querySelector('.model-details-link'))return;
      const button=document.createElement('button');button.type='button';button.className='model-details-link';button.textContent='Подробнее про модель →';
      const book=body.querySelector('[data-book]');body.insertBefore(button,book||null);
    });
  }

  const providers=[
    ['vietqr','VietQR','Vietnam'],['vnpay','VNPAY','Vietnam'],['momo','MoMo','Vietnam'],['zalopay','ZaloPay','Vietnam'],
    ['sbp','СБП','Россия'],['yookassa','ЮKassa','Россия'],['tbank','T‑Bank','Россия']
  ];
  const providerLabel=id=>providers.find(item=>item[0]===id)?.[1]||id;
  const requestById=id=>requests().find(item=>String(item.id)===String(id));
  const vehicleTitle=request=>fleet().find(item=>String(item.id)===String(request?.vehicleId))?.title||request?.vehicleId||'UNIQ';
  const paymentAmount=(total,percent)=>percent===30?Math.ceil((Number(total)||0)*.3):(Number(total)||0);
  function demoQr(reference){
    let seed=0;for(const ch of reference)seed=(seed*31+ch.charCodeAt(0))>>>0;
    const cells=[];for(let y=0;y<21;y++)for(let x=0;x<21;x++){
      const finder=(x<7&&y<7)||(x>13&&y<7)||(x<7&&y>13);
      const edge=finder&&(x%6===0||y%6===0||x%6===6||y%6===6);
      const center=finder&&(x%6>=2&&x%6<=4&&y%6>=2&&y%6<=4);
      seed=(seed*1664525+1013904223)>>>0;
      if(edge||center||(!finder&&(seed&3)===0))cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
    return `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-label="Demo QR"><rect width="21" height="21" fill="white"/><g fill="#07110c">${cells.join('')}</g></svg>`;
  }
  function openPayment(requestId){
    const request=requestById(requestId);if(!request)return;
    document.querySelector('#finishPaymentModal')?.remove();document.querySelector('#releasePaymentModal')?.remove();
    const total=Number(request.estimate||request.estimatedTotalVnd)||0;
    let percent=30,provider='vietqr',stage='choose';
    const overlay=document.createElement('div');overlay.className='modal-bg finish-modal-bg';overlay.id='releasePaymentModal';
    const render=()=>{
      const amount=paymentAmount(total,percent),reference=`UNIQ-${String(request.id).replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase()||'BOOKING'}`;
      overlay.innerHTML=`<section class="modal payment-checkout" role="dialog" aria-modal="true" aria-labelledby="releasePaymentTitle"><button class="modal-x" data-release-close>×</button><span class="eyebrow">ОПЛАТА БРОНИ</span><h2 id="releasePaymentTitle">${esc(vehicleTitle(request))}</h2><p class="payment-total">Стоимость аренды: <b>${money(total)}</b></p>
      ${stage==='choose'?`<div class="payment-section"><h3>1. Выберите сумму</h3><div class="payment-percent-grid"><button type="button" data-percent="30" class="${percent===30?'active':''}"><b>30%</b><span>Предоплата</span><small>${money(paymentAmount(total,30))}</small></button><button type="button" data-percent="100" class="${percent===100?'active':''}"><b>100%</b><span>Полная оплата</span><small>${money(total)}</small></button></div></div><div class="payment-section"><h3>2. Способ оплаты</h3><div class="payment-provider-grid">${providers.map(([id,label,market])=>`<button type="button" data-provider="${id}" class="${provider===id?'active':''}"><span class="provider-logo provider-logo-${id}">${esc(label)}</span><span class="provider-copy"><b>${esc(label)}</b><span>${esc(market)}</span><small>Демо</small></span></button>`).join('')}</div></div><div class="payment-summary"><span>К оплате</span><b>${money(amount)}</b></div><button type="button" class="primary wide" data-create-payment>Получить QR / ссылку</button>`:
      `<div class="payment-ready"><div class="payment-qr release-demo-qr">${demoQr(reference)}<span>DEMO QR</span></div><div class="payment-ready-copy"><span class="provider-logo provider-logo-${provider}">${esc(providerLabel(provider))}</span><span>${esc(providerLabel(provider))}</span><h3>${money(amount)}</h3><p>Назначение: <b>${esc(reference)}</b></p><small>Демонстрационный платёжный intent. Боевой режим включается после подключения merchant-ключей выбранного провайдера.</small><button type="button" class="secondary payment-open-link" data-demo-link>Открыть ссылку оплаты ↗</button></div></div><button type="button" class="primary wide" data-confirm-stage9>Демо: подтвердить оплату</button>`}
      <p class="payment-stage-note">Восстановлен сценарий Stage 9: 30%/100% → провайдер → QR/ссылка → подтверждение оплаты.</p></section>`;
      overlay.querySelector('[data-release-close]')?.addEventListener('click',()=>overlay.remove());
      overlay.querySelectorAll('[data-percent]').forEach(button=>button.addEventListener('click',()=>{percent=Number(button.dataset.percent)===100?100:30;render()}));
      overlay.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',()=>{provider=button.dataset.provider||'vietqr';render()}));
      overlay.querySelector('[data-create-payment]')?.addEventListener('click',()=>{stage='ready';render()});
      overlay.querySelector('[data-demo-link]')?.addEventListener('click',()=>overlay.querySelector('.payment-stage-note').textContent='Демо-ссылка подготовлена. Для реального перехода нужны merchant-ключи провайдера.');
      overlay.querySelector('[data-confirm-stage9]')?.addEventListener('click',()=>{
        const map=payments();map[request.id]={status:'paid',bookingPaymentStatus:percent===100?'paid':'partially_paid',prepaymentPercent:percent,amount:paymentAmount(total,percent),provider,paidAt:new Date().toISOString(),mode:'demo'};write(PAYMENT_KEY,map);overlay.remove();schedule(20);
      });
    };
    overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove()});document.body.append(overlay);render();
  }
  function decoratePaymentStates(){
    const map=payments();document.querySelectorAll('.request[data-finish-request-id]').forEach(card=>{
      const state=map[card.dataset.finishRequestId];if(!state||state.bookingPaymentStatus!=='partially_paid')return;
      card.querySelector('.status')&&(card.querySelector('.status').textContent='Предоплата внесена · демо');
      card.querySelectorAll('.payment-badge').forEach(node=>node.textContent='Предоплата 30% · демо');
    });
  }

  let analyticsOpen=false,analyticsPeriod='7d';
  function scopedRequests(){
    const all=requests(),days=analyticsPeriod==='today'?1:analyticsPeriod==='30d'?30:7;
    const cutoff=Date.now()-(days-1)*86400000;
    return all.filter(item=>{const time=new Date(item.createdAt||Date.now()).getTime();return Number.isNaN(time)||time>=cutoff});
  }
  function analyticsData(){
    const rows=scopedRequests(),pay=payments();
    const paid=rows.filter(item=>pay[item.id]?.status==='paid');
    const revenue=paid.reduce((sum,item)=>sum+(Number(pay[item.id]?.amount)||Number(item.estimate||item.estimatedTotalVnd)||0),0);
    const clients=new Set(rows.map(item=>String(item.contact||item.client||item.name||item.id).toLowerCase()));
    const active=rows.filter(item=>['confirmed','vehicle_issued','active','return_due'].includes(item.status)).length;
    const avg=paid.length?Math.round(revenue/paid.length):0,conversion=rows.length?Math.round(paid.length/rows.length*100):0;
    const sources=new Map();for(const item of rows){const key=item.sourceChannel||item.source||'telegram_mini_app';const row=sources.get(key)||{count:0,revenue:0};row.count++;if(pay[item.id]?.status==='paid')row.revenue+=Number(pay[item.id]?.amount)||0;sources.set(key,row)}
    const byVehicle=new Map();for(const item of rows){const row=byVehicle.get(item.vehicleId)||{count:0,revenue:0};row.count++;if(pay[item.id]?.status==='paid')row.revenue+=Number(pay[item.id]?.amount)||0;byVehicle.set(item.vehicleId,row)}
    const vehicleRows=[...byVehicle.entries()].map(([id,row])=>({title:fleet().find(v=>v.id===id)?.title||id,...row})).sort((a,b)=>b.revenue-a.revenue||b.count-a.count).slice(0,8);
    return {rows,paid,revenue,clients:clients.size,active,avg,conversion,sources:[...sources.entries()].sort((a,b)=>b[1].count-a[1].count),vehicleRows};
  }
  function analyticsHtml(){
    const d=analyticsData();
    const sourceNames={telegram_mini_app:'Telegram Mini App',website:'Сайт',office:'Офис',google:'Google',instagram:'Instagram',partner:'Партнёры',qr:'QR-коды',other:'Другое'};
    const views=Math.max(126,d.rows.length*13+90),opens=Math.max(d.rows.length*5,Math.round(views*.54)),starts=Math.max(d.rows.length,Math.round(opens*.43)),paymentStarts=Math.max(d.paid.length,Math.round(starts*.76));
    const funnel=[['Просмотры',views],['Карточки техники',opens],['Начали бронь',starts],['Перешли к оплате',paymentStarts],['Оплатили',d.paid.length]];
    return `<section class="analytics-page" data-release-analytics><section class="hero analytics-hero"><div><span class="eyebrow">АНАЛИТИКА</span><h1>Что приносит деньги — видно сразу.</h1><p>Продажи, загрузка парка, источники заявок, воронка и прибыльность моделей в одном экране владельца.</p></div><div class="analytics-hero-card"><span>Выручка за период</span><b>${money(d.revenue)}</b><small>DEMO / текущие данные интерфейса</small></div></section>
    <section class="analytics-toolbar"><div class="period-switch">${[['today','Сегодня'],['7d','7 дней'],['30d','30 дней']].map(([id,label])=>`<button data-analytics-period="${id}" class="${analyticsPeriod===id?'active':''}">${label}</button>`).join('')}</div></section>
    <section class="metrics analytics-metrics"><div class="metric"><span>Выручка</span><b>${money(d.revenue)}</b><small>зачисленные платежи</small></div><div class="metric"><span>Заявки</span><b>${d.rows.length}</b><small>${d.paid.length} оплачено</small></div><div class="metric"><span>Средний чек</span><b>${money(d.avg)}</b><small>по оплатам</small></div><div class="metric"><span>Активные аренды</span><b>${d.active}</b><small>подтверждены / выданы</small></div><div class="metric"><span>Клиенты</span><b>${d.clients}</b><small>уникальные контакты</small></div><div class="metric"><span>Конверсия в оплату</span><b>${d.conversion}%</b><small>заявка → оплачено</small></div></section>
    <section class="analytics-two-col"><section class="panel"><span class="eyebrow">ВОРОНКА</span><h2>От просмотра до оплаты</h2><div class="funnel-list">${funnel.map(([label,value])=>`<div><div><span>${label}</span><b>${value}</b></div><i><u style="width:${Math.max(3,Math.round(value/views*100))}%"></u></i><small>${Math.round(value/views*100)}% от просмотров</small></div>`).join('')}</div></section><section class="panel"><span class="eyebrow">ИСТОЧНИКИ</span><h2>Откуда приходят заявки</h2><div class="release-source-list">${d.sources.length?d.sources.map(([source,row])=>`<div><span>${esc(sourceNames[source]||source)}</span><b>${row.count}</b><small>${money(row.revenue)}</small></div>`).join(''):'<div><span>Telegram Mini App</span><b>0</b><small>0 ₫</small></div>'}</div></section></section>
    <section class="panel release-profit"><div class="section-head"><div><span class="eyebrow">ПРИБЫЛЬНОСТЬ ПАРКА</span><h2>Какая техника зарабатывает</h2></div></div>${d.vehicleRows.length?d.vehicleRows.map((item,index)=>`<div class="profit-row"><b>${index+1}. ${esc(item.title)}</b><span>${item.count} заявок</span><strong>${money(item.revenue)}</strong></div>`).join(''):'<div class="empty">Данные появятся после заявок и оплат.</div>'}</section></section>`;
  }
  function ensureAnalyticsNav(){
    if(activeRole()!=='owner')return;
    const nav=document.querySelector('.bottom-nav');if(!nav)return;
    let button=nav.querySelector('[data-owner-custom="analytics"]');
    if(!button){button=document.createElement('button');button.type='button';button.dataset.ownerCustom='analytics';button.innerHTML='<span>▥</span><b>Аналитика</b>';nav.append(button)}
    button.onclick=()=>{analyticsOpen=true;renderAnalytics()};
  }
  function renderAnalytics(){
    if(!analyticsOpen||activeRole()!=='owner')return;
    const main=document.querySelector('main');if(!main)return;
    main.innerHTML=analyticsHtml();main.dataset.releaseAnalytics='true';
    document.querySelectorAll('.bottom-nav button').forEach(button=>button.classList.remove('active'));
    document.querySelector('.bottom-nav [data-owner-custom="analytics"]')?.classList.add('active');
    main.querySelectorAll('[data-analytics-period]').forEach(button=>button.onclick=()=>{analyticsPeriod=button.dataset.analyticsPeriod||'7d';renderAnalytics()});
    window.scrollTo({top:0,behavior:'smooth'});
  }

  let timer=0,applying=false;
  function refresh(){
    if(applying)return;applying=true;
    try{applyDates();enhanceFleetCount();enhanceCards();ensureAnalyticsNav();decoratePaymentStates();if(analyticsOpen&&!document.querySelector('main[data-release-analytics="true"]'))renderAnalytics()}finally{applying=false}
  }
  function schedule(delay=16){clearTimeout(timer);timer=setTimeout(refresh,delay)}

  document.addEventListener('change',event=>{
    if(event.target?.id==='quickFrom'||event.target?.id==='quickTo'){saveDatesFromHome();applyDates()}
  },true);
  document.addEventListener('click',event=>{
    const fleetCount=event.target.closest?.('[data-release-catalog]');
    if(fleetCount){event.preventDefault();saveDatesFromHome();document.querySelector('.bottom-nav [data-go="catalog"]')?.click();return}
    if(event.target.closest?.('[data-go="catalog"]'))saveDatesFromHome();
    if(event.target.closest?.('[data-book]')){saveDatesFromHome();setTimeout(applyDates,0)}
    const pay=event.target.closest?.('[data-pay-request]');if(pay)setTimeout(()=>openPayment(pay.dataset.payRequest),0);
    const baseNav=event.target.closest?.('[data-go]');if(baseNav&&!event.target.closest?.('[data-owner-custom="analytics"]'))analyticsOpen=false;
    if(event.target.closest?.('[data-role]'))analyticsOpen=false;
  },true);
  document.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-release-catalog]')){event.preventDefault();event.target.click()}});
  const observer=new MutationObserver(()=>schedule());observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>schedule(0));schedule(0);
})();