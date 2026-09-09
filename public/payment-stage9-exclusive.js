(() => {
  'use strict';

  const REQUEST_KEY='uniq-data-requests-v3';
  const PAYMENT_KEY='uniq-demo-payments-v1';
  const read=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money=value=>`${new Intl.NumberFormat('ru-RU').format(Math.max(0,Math.round(Number(value)||0)))} ₫`;
  const fleet=()=>Array.isArray(window.UNIQ_FLEET)?window.UNIQ_FLEET:[];
  const requests=()=>{const value=read(REQUEST_KEY,[]);return Array.isArray(value)?value:[]};
  const payments=()=>{const value=read(PAYMENT_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}};
  const providers=[
    ['vietqr','VietQR','Vietnam'],['vnpay','VNPAY','Vietnam'],['momo','MoMo','Vietnam'],['zalopay','ZaloPay','Vietnam'],
    ['sbp','СБП','Россия'],['yookassa','ЮKassa','Россия'],['tbank','T‑Bank','Россия']
  ];
  const providerLabel=id=>providers.find(item=>item[0]===id)?.[1]||id;
  const requestById=id=>requests().find(item=>String(item.id)===String(id));
  const vehicleTitle=request=>fleet().find(item=>String(item.id)===String(request?.vehicleId))?.title||request?.vehicleId||'UNIQ';
  const paymentAmount=(total,percent)=>percent===30?Math.ceil((Number(total)||0)*.3):(Number(total)||0;

  function demoQr(reference){
    let seed=0;
    for(const ch of reference)seed=(seed*31+ch.charCodeAt(0))>>>0;
    const cells=[];
    for(let y=0;y<21;y++)for(let x=0;x<21;x++){
      const finder=(x<7&&y<7)||(x>13&&y<7)||(x<7&&y>13);
      const edge=finder&&(x%6===0||y%6===0||x%6===5||y%6===5);
      const center=finder&&(x%6>=2&&x%6<=4&&y%6>=2&&y%6<=4);
      seed=(seed*1664525+1013904223)>>>0;
      if(edge||center||(!finder&&(seed&3)===0))cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
    return `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" aria-label="Demo QR"><rect width="21" height="21" fill="white"/><g fill="#07110c">${cells.join('')}</g></svg>`;
  }

  function refreshRequestUi(){
    setTimeout(()=>{
      const requestsButton=document.querySelector('.bottom-nav [data-go="requests"]');
      if(requestsButton?.classList.contains('active')) requestsButton.click();
    },20);
  }

  function openPayment(requestId){
    const request=requestById(requestId);if(!request)return;
    document.querySelector('#finishPaymentModal')?.remove();
    document.querySelector('#releasePaymentModal')?.remove();
    const total=Number(request.estimate||request.estimatedTotalVnd)||0;
    let percent=30,provider='vietqr',stage='choose';
    const overlay=document.createElement('div');
    overlay.className='modal-bg finish-modal-bg';
    overlay.id='releasePaymentModal';

    const render=()=>{
      const amount=paymentAmount(total,percent);
      const reference=`UNIQ-${String(request.id).replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase()||'BOOKING'}`;
      overlay.innerHTML=`<section class="modal payment-checkout" role="dialog" aria-modal="true" aria-labelledby="releasePaymentTitle">
        <button class="modal-x" data-release-close>×</button>
        <span class="eyebrow">ОПЛАТА БРОНИ</span><h2 id="releasePaymentTitle">${esc(vehicleTitle(request))}</h2>
        <p class="payment-total">Стоимость аренды: <b>${money(total)}</b></p>
        ${stage==='choose'?`
          <div class="payment-section"><h3>1. Выберите сумму</h3><div class="payment-percent-grid">
            <button type="button" data-percent="30" class="${percent===30?'active':''}"><b>30%</b><span>Предоплата</span><small>${money(paymentAmount(total,30))}</small></button>
            <button type="button" data-percent="100" class="${percent===100?'active':''}"><b>100%</b><span>Полная оплата</span><small>${money(total)}</small></button>
          </div></div>
          <div class="payment-section"><h3>2. Способ оплаты</h3><div class="payment-provider-grid">${providers.map(([id,label,market])=>`<button type="button" data-provider="${id}" class="${provider===id?'active':''}"><span class="provider-logo provider-logo-${id}">${esc(label)}</span><span class="provider-copy"><b>${esc(label)}</b><span>${esc(market)}</span><small>Демо</small></span></button>`).join('')}</div></div>
          <div class="payment-summary"><span>К оплате</span><b>${money(amount)}</b></div>
          <button type="button" class="primary wide" data-create-payment>Получить QR / ссылку</button>`:`
          <div class="payment-ready"><div class="payment-qr release-demo-qr">${demoQr(reference)}<span>DEMO QR</span></div><div class="payment-ready-copy">
            <span class="provider-logo provider-logo-${provider}">${esc(providerLabel(provider))}</span><span>${esc(providerLabel(provider))}</span><h3>${money(amount)}</h3>
            <p>Назначение: <b>${esc(reference)}</b></p>
            <small>Демонстрационный платёжный intent. Боевой режим включается после подключения merchant-ключей выбранного провайдера.</small>
            <button type="button" class="secondary payment-open-link" data-demo-link>Открыть ссылку оплаты ↗</button>
          </div></div><button type="button" class="primary wide" data-confirm-stage9>Демо: подтвердить оплату</button>`}
        <p class="payment-stage-note">Сценарий Stage 9: 30%/100% → провайдер → QR/ссылка → подтверждение оплаты.</p>
      </section>`;
      overlay.querySelector('[data-release-close]')?.addEventListener('click',()=>overlay.remove());
      overlay.querySelectorAll('[data-percent]').forEach(button=>button.addEventListener('click',()=>{percent=Number(button.dataset.percent)===100?100:30;render()}));
      overlay.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',()=>{provider=button.dataset.provider||'vietqr';render()}));
      overlay.querySelector('[data-create-payment]')?.addEventListener('click',()=>{stage='ready';render()});
      overlay.querySelector('[data-demo-link]')?.addEventListener('click',()=>{const note=overlay.querySelector('.payment-stage-note');if(note)note.textContent='Демо-ссылка подготовлена. Для реального перехода нужны merchant-ключи провайдера.'});
      overlay.querySelector('[data-confirm-stage9]')?.addEventListener('click',()=>{
        const map=payments();
        map[request.id]={status:'paid',bookingPaymentStatus:percent===100?'paid':'partially_paid',prepaymentPercent:percent,amount:paymentAmount(total,percent),provider,paidAt:new Date().toISOString(),mode:'demo'};
        write(PAYMENT_KEY,map);
        overlay.remove();
        refreshRequestUi();
      });
    };
    overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove()});
    document.body.append(overlay);
    render();
  }

  window.addEventListener('click',event=>{
    const pay=event.target.closest?.('[data-pay-request]');
    if(!pay)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPayment(pay.dataset.payRequest);
  },true);
})();