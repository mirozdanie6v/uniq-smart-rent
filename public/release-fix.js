(() => {
  'use strict';

  const REQUEST_KEY='uniq-data-requests-v3';
  const PAYMENT_KEY='uniq-demo-payments-v1';
  const fleet=()=>Array.isArray(window.UNIQ_FLEET)?window.UNIQ_FLEET:[];
  const activeRole=()=>document.querySelector('.role-switch [data-role].active')?.dataset.role||'';
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=value=>`${new Intl.NumberFormat('ru-RU').format(Math.max(0,Math.round(Number(value)||0)))} ₫`;
  const requests=()=>{const value=read(REQUEST_KEY,[]);return Array.isArray(value)?value:[]};
  const payments=()=>{const value=read(PAYMENT_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}};

  function enhanceFleetCount(){
    if(activeRole()!=='client')return;
    const count=document.querySelector('.hero-fleet-card .showcase-head>div:first-child');
    if(!count)return;
    count.dataset.releaseCatalog='1';
    count.classList.add('fleet-count-link');
    count.tabIndex=0;
    count.setAttribute('role','button');
    count.setAttribute('aria-label','Открыть каталог — 89 единиц техники');
  }

  function decoratePaymentStates(){
    const map=payments();
    document.querySelectorAll('.request[data-finish-request-id]').forEach(card=>{
      const state=map[card.dataset.finishRequestId];
      if(!state||state.bookingPaymentStatus!=='partially_paid')return;
      const status=card.querySelector('.status');
      if(status)status.textContent='Предоплата внесена · демо';
      card.querySelectorAll('.payment-badge').forEach(node=>node.textContent='Предоплата 30% · демо');
    });
  }

  let analyticsOpen=false;
  let analyticsPeriod='7d';

  function scopedRequests(){
    const all=requests();
    const days=analyticsPeriod==='today'?1:analyticsPeriod==='30d'?30:7;
    const cutoff=Date.now()-(days-1)*86400000;
    return all.filter(item=>{
      const time=new Date(item.createdAt||Date.now()).getTime();
      return Number.isNaN(time)||time>=cutoff;
    });
  }

  function analyticsData(){
    const rows=scopedRequests();
    const pay=payments();
    const paid=rows.filter(item=>pay[item.id]?.status==='paid');
    const revenue=paid.reduce((sum,item)=>sum+(Number(pay[item.id]?.amount)||Number(item.estimate||item.estimatedTotalVnd)||0),0);
    const clients=new Set(rows.map(item=>String(item.contact||item.client||item.name||item.id).toLowerCase()));
    const active=rows.filter(item=>['confirmed','vehicle_issued','active','return_due'].includes(item.status)).length;
    const avg=paid.length?Math.round(revenue/paid.length):0;
    const conversion=rows.length?Math.round(paid.length/rows.length*100):0;
    const sources=new Map();
    for(const item of rows){
      const key=item.sourceChannel||item.source||'telegram_mini_app';
      const row=sources.get(key)||{count:0,revenue:0};
      row.count++;
      if(pay[item.id]?.status==='paid')row.revenue+=Number(pay[item.id]?.amount)||0;
      sources.set(key,row);
    }
    const byVehicle=new Map();
    for(const item of rows){
      const row=byVehicle.get(item.vehicleId)||{count:0,revenue:0};
      row.count++;
      if(pay[item.id]?.status==='paid')row.revenue+=Number(pay[item.id]?.amount)||0;
      byVehicle.set(item.vehicleId,row);
    }
    const vehicleRows=[...byVehicle.entries()]
      .map(([id,row])=>({title:fleet().find(v=>v.id===id)?.title||id,...row}))
      .sort((a,b)=>b.revenue-a.revenue||b.count-a.count)
      .slice(0,8);
    return {rows,paid,revenue,clients:clients.size,active,avg,conversion,sources:[...sources.entries()].sort((a,b)=>b[1].count-a[1].count),vehicleRows};
  }

  function analyticsHtml(){
    const d=analyticsData();
    const sourceNames={telegram_mini_app:'Telegram Mini App',website:'Сайт',office:'Офис',google:'Google',instagram:'Instagram',partner:'Партнёры',qr:'QR-коды',other:'Другое'};
    const views=Math.max(126,d.rows.length*13+90);
    const opens=Math.max(d.rows.length*5,Math.round(views*.54));
    const starts=Math.max(d.rows.length,Math.round(opens*.43));
    const paymentStarts=Math.max(d.paid.length,Math.round(starts*.76));
    const funnel=[['Просмотры',views],['Карточки техники',opens],['Начали бронь',starts],['Перешли к оплате',paymentStarts],['Оплатили',d.paid.length]];
    return `<section class="analytics-page" data-release-analytics>
      <section class="hero analytics-hero"><div><span class="eyebrow">АНАЛИТИКА</span><h1>Что приносит деньги — видно сразу.</h1><p>Продажи, загрузка парка, источники заявок, воронка и прибыльность моделей в одном экране владельца.</p></div><div class="analytics-hero-card"><span>Выручка за период</span><b>${money(d.revenue)}</b><small>DEMO / текущие данные интерфейса</small></div></section>
      <section class="analytics-toolbar"><div class="period-switch">${[['today','Сегодня'],['7d','7 дней'],['30d','30 дней']].map(([id,label])=>`<button data-analytics-period="${id}" class="${analyticsPeriod===id?'active':''}">${label}</button>`).join('')}</div></section>
      <section class="metrics analytics-metrics"><div class="metric"><span>Выручка</span><b>${money(d.revenue)}</b><small>зачисленные платежи</small></div><div class="metric"><span>Заявки</span><b>${d.rows.length}</b><small>${d.paid.length} оплачено</small></div><div class="metric"><span>Средний чек</span><b>${money(d.avg)}</b><small>по оплатам</small></div><div class="metric"><span>Активные аренды</span><b>${d.active}</b><small>подтверждены / выданы</small></div><div class="metric"><span>Клиенты</span><b>${d.clients}</b><small>уникальные контакты</small></div><div class="metric"><span>Конверсия в оплату</span><b>${d.conversion}%</b><small>заявка → оплачено</small></div></section>
      <section class="analytics-two-col"><section class="panel"><span class="eyebrow">ВОРОНКА</span><h2>От просмотра до оплаты</h2><div class="funnel-list">${funnel.map(([label,value])=>`<div><div><span>${label}</span><b>${value}</b></div><i><u style="width:${Math.max(3,Math.round(value/views*100))}%"></u></i><small>${Math.round(value/views*100)}% от просмотров</small></div>`).join('')}</div></section><section class="panel"><span class="eyebrow">ИСТОЧНИКИ</span><h2>Откуда приходят заявки</h2><div class="release-source-list">${d.sources.length?d.sources.map(([source,row])=>`<div><span>${esc(sourceNames[source]||source)}</span><b>${row.count}</b><small>${money(row.revenue)}</small></div>`).join(''):'<div><span>Telegram Mini App</span><b>0</b><small>0 ₫</small></div>'}</div></section></section>
      <section class="panel release-profit"><div class="section-head"><div><span class="eyebrow">ПРИБЫЛЬНОСТЬ ПАРКА</span><h2>Какая техника зарабатывает</h2></div></div>${d.vehicleRows.length?d.vehicleRows.map((item,index)=>`<div class="profit-row"><b>${index+1}. ${esc(item.title)}</b><span>${item.count} заявок</span><strong>${money(item.revenue)}</strong></div>`).join(''):'<div class="empty">Данные появятся после заявок и оплат.</div>'}</section>
    </section>`;
  }

  function ensureAnalyticsNav(){
    if(activeRole()!=='owner')return;
    const nav=document.querySelector('.bottom-nav');
    if(!nav)return;
    let button=nav.querySelector('[data-owner-custom="analytics"]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.ownerCustom='analytics';
      button.innerHTML='<span>▥</span><b>Аналитика</b>';
      nav.append(button);
    }
    button.onclick=()=>{analyticsOpen=true;renderAnalytics()};
  }

  function renderAnalytics(){
    if(!analyticsOpen||activeRole()!=='owner')return;
    const main=document.querySelector('main');
    if(!main)return;
    main.innerHTML=analyticsHtml();
    main.dataset.releaseAnalytics='true';
    document.querySelectorAll('.bottom-nav button').forEach(button=>button.classList.remove('active'));
    document.querySelector('.bottom-nav [data-owner-custom="analytics"]')?.classList.add('active');
    main.querySelectorAll('[data-analytics-period]').forEach(button=>button.onclick=()=>{
      analyticsPeriod=button.dataset.analyticsPeriod||'7d';
      renderAnalytics();
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  let timer=0;
  let applying=false;
  function refresh(){
    if(applying)return;
    applying=true;
    try{
      enhanceFleetCount();
      ensureAnalyticsNav();
      decoratePaymentStates();
      if(analyticsOpen&&!document.querySelector('main[data-release-analytics="true"]'))renderAnalytics();
    }finally{applying=false}
  }
  function schedule(delay=16){clearTimeout(timer);timer=setTimeout(refresh,delay)}

  document.addEventListener('click',event=>{
    const fleetCount=event.target.closest?.('[data-release-catalog]');
    if(fleetCount){
      event.preventDefault();
      document.querySelector('.bottom-nav [data-go="catalog"]')?.click();
      return;
    }
    if(event.target.closest?.('[data-go],[data-role]'))analyticsOpen=false;
  },true);
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('[data-release-catalog]')){
      event.preventDefault();
      event.target.click();
    }
  });

  const observer=new MutationObserver(()=>schedule());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>schedule(0));
  schedule(0);
})();