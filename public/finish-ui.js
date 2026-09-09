(() => {
  'use strict';

  const REQUEST_KEY = 'uniq-data-requests-v3';
  const FLEET_STATE_KEY = 'uniq-data-fleet-state-v3';
  const FLEET_READY_MIGRATION = 'uniq-fleet-all-ready-20260909-v1';
  const PAYMENT_KEY = 'uniq-demo-payments-v1';
  const LANG_KEY = 'uniq-language-v1';
  const supported = ['ru','vi','en','ko','zh'];
  const heroCopy = {
    ru:{title:'Весь парк UNIQ — выбирайте и бронируйте онлайн.',text:'Байки, мотоциклы и авто в Нячанге. Выберите технику и даты, оформите бронь и перейдите к оплате прямо в приложении.'},
    vi:{title:'Toàn bộ đội xe UNIQ — chọn và đặt trực tuyến.',text:'Xe máy, mô tô và ô tô tại Nha Trang. Chọn xe và ngày thuê, đặt chỗ và chuyển sang thanh toán ngay trong ứng dụng.'},
    en:{title:'The entire UNIQ fleet — choose and book online.',text:'Bikes, motorcycles and cars in Nha Trang. Choose a vehicle and dates, book it and continue to payment right in the app.'},
    ko:{title:'UNIQ 전체 차량 — 앱에서 선택하고 예약하세요.',text:'나트랑의 스쿠터, 모터사이클, 자동차를 선택하고 날짜를 지정한 뒤 예약과 결제 단계까지 앱에서 진행하세요.'},
    zh:{title:'UNIQ 全部车队——在线选择并预订。',text:'芽庄的踏板车、摩托车和汽车都在这里。选择车辆和日期，完成预订并直接进入支付步骤。'}
  };
  const labels = {
    clients:{ru:'Клиенты',vi:'Khách hàng',en:'Clients',ko:'고객',zh:'客户'},
    profile:{ru:'Профиль клиента',vi:'Hồ sơ khách hàng',en:'Client profile',ko:'고객 프로필',zh:'客户资料'},
    swipe:{ru:'Разделы панели · свайпните ← →',vi:'Các mục bảng điều khiển · vuốt ← →',en:'Dashboard sections · swipe ← →',ko:'대시보드 메뉴 · 스와이프 ← →',zh:'控制台分区 · 滑动 ← →'},
    pay:{ru:'Перейти к оплате',vi:'Tiếp tục thanh toán',en:'Continue to payment',ko:'결제로 이동',zh:'前往支付'},
    paid:{ru:'Оплачено · демо',vi:'Đã thanh toán · demo',en:'Paid · demo',ko:'결제 완료 · 데모',zh:'已支付 · 演示'},
    ready:{ru:'Готова к оплате',vi:'Sẵn sàng thanh toán',en:'Ready for payment',ko:'결제 준비 완료',zh:'可支付'},
    paymentTitle:{ru:'Оплата бронирования',vi:'Thanh toán đặt xe',en:'Booking payment',ko:'예약 결제',zh:'预订支付'},
    paymentDemo:{ru:'Демонстрационный экран. Реальный платёжный шлюз пока не подключён.',vi:'Màn hình demo. Cổng thanh toán thực chưa được kết nối.',en:'Demo screen. A live payment gateway is not connected yet.',ko:'데모 화면입니다. 실제 결제 게이트웨이는 아직 연결되지 않았습니다.',zh:'演示页面。尚未连接真实支付网关。'},
    confirmPay:{ru:'Подтвердить демо-оплату',vi:'Xác nhận thanh toán demo',en:'Confirm demo payment',ko:'데모 결제 확인',zh:'确认演示支付'},
    close:{ru:'Закрыть',vi:'Đóng',en:'Close',ko:'닫기',zh:'关闭'},
    requests:{ru:'Заявки',vi:'Yêu cầu',en:'Requests',ko:'요청',zh:'申请'},
    total:{ru:'Сумма заявок',vi:'Tổng yêu cầu',en:'Request total',ko:'요청 합계',zh:'申请总额'},
    paidTotal:{ru:'Оплачено',vi:'Đã thanh toán',en:'Paid',ko:'결제됨',zh:'已支付'},
    last:{ru:'Последняя активность',vi:'Hoạt động gần nhất',en:'Last activity',ko:'최근 활동',zh:'最近活动'},
    history:{ru:'История заявок',vi:'Lịch sử yêu cầu',en:'Request history',ko:'요청 기록',zh:'申请历史'},
    openProfile:{ru:'Открыть профиль →',vi:'Mở hồ sơ →',en:'Open profile →',ko:'프로필 열기 →',zh:'打开资料 →'},
    paymentMethod:{ru:'Способ оплаты',vi:'Phương thức thanh toán',en:'Payment method',ko:'결제 수단',zh:'支付方式'},
    card:{ru:'Банковская карта',vi:'Thẻ ngân hàng',en:'Bank card',ko:'은행 카드',zh:'银行卡'},
    qr:{ru:'QR / банковский перевод',vi:'QR / chuyển khoản',en:'QR / bank transfer',ko:'QR / 계좌이체',zh:'QR / 银行转账'}
  };

  const lang = () => { const value = localStorage.getItem(LANG_KEY) || 'ru'; return supported.includes(value) ? value : 'ru'; };
  const tr = key => labels[key]?.[lang()] || labels[key]?.ru || key;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = value => Number(value) > 0 ? new Intl.NumberFormat('ru-RU').format(Number(value)) + ' ₫' : '—';
  const activeRole = () => document.querySelector('.role-switch [data-role].active')?.dataset.role || '';
  const fleet = () => Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : [];
  const readJson = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value ?? fallback; } catch { return fallback; } };
  const requests = () => { const value = readJson(REQUEST_KEY, []); return Array.isArray(value) ? value : []; };
  const payments = () => { const value = readJson(PAYMENT_KEY, {}); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
  const savePayments = value => { try { localStorage.setItem(PAYMENT_KEY, JSON.stringify(value)); } catch {} };

  function seedFleetReady() {
    try {
      if (localStorage.getItem(FLEET_READY_MIGRATION)) return;
      const ready = Object.fromEntries(fleet().map(vehicle => [String(vehicle.id), 'available']));
      localStorage.setItem(FLEET_STATE_KEY, JSON.stringify(ready));
      localStorage.setItem(FLEET_READY_MIGRATION, '1');
    } catch {}
  }
  seedFleetReady();

  const customerSourceKey = request => String(request.contact || request.client || request.name || request.id || '').trim().toLowerCase();
  function customerId(request) {
    const source = customerSourceKey(request) || String(request.id || 'client');
    let hash = 2166136261;
    for (let i=0;i<source.length;i++) { hash ^= source.charCodeAt(i); hash = Math.imul(hash,16777619); }
    return `c${(hash>>>0).toString(16)}`;
  }
  function customerSummary() {
    const paymentMap = payments();
    const map = new Map();
    for (const request of requests()) {
      const id = customerId(request);
      const current = map.get(id) || {id,name:request.client||request.name||'Клиент',contact:request.contact||'',count:0,total:0,paid:0,last:request.createdAt||'',requests:[]};
      const amount = Number(request.estimate || request.estimatedTotalVnd) || 0;
      current.count += 1; current.total += amount; current.requests.push(request);
      if (paymentMap[request.id]?.status === 'paid') current.paid += amount;
      if (String(request.createdAt||'') > String(current.last||'')) current.last = request.createdAt;
      if (request.client || request.name) current.name = request.client || request.name;
      if (request.contact) current.contact = request.contact;
      map.set(id,current);
    }
    return [...map.values()].sort((a,b)=>String(b.last).localeCompare(String(a.last)));
  }
  const initials = name => String(name||'К').split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('') || 'К';
  const vehicleTitle = request => fleet().find(vehicle => String(vehicle.id) === String(request.vehicleId))?.title || request.vehicleId || 'UNIQ';
  const formatDate = value => { try { return value ? new Date(value).toLocaleDateString(lang()==='ru'?'ru-RU':'en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'; } catch { return '—'; } };

  function enhanceHero() {
    const homeButton = document.querySelector('.bottom-nav [data-go="home"]');
    if (activeRole() !== 'client' || !homeButton?.classList.contains('active')) return;
    const main = document.querySelector('main');
    const hero = main?.querySelector('.hero');
    if (!hero) return;
    const currentLang = lang();
    const copy = heroCopy[currentLang] || heroCopy.ru;
    const intro = hero.firstElementChild;
    const currentTitle = intro?.querySelector('h1')?.textContent?.trim() || '';
    if (intro && (intro.dataset.finishHero !== currentLang || currentTitle !== copy.title)) {
      intro.innerHTML = `<span class="eyebrow">UNIQ SMART RENT · NHA TRANG</span><h1>${esc(copy.title)}</h1><p>${esc(copy.text)}</p>`;
      intro.dataset.finishHero = currentLang;
    }
    hero.querySelectorAll('.hero-office-maps').forEach(node => node.remove());
    const locations = main.querySelector('.home-locations');
    if (locations && locations !== main.lastElementChild) main.append(locations);
  }

  function ensureOwnerNav() {
    const nav = document.querySelector('.bottom-nav');
    const shell = document.querySelector('.shell');
    document.querySelectorAll('.owner-nav-hint').forEach(node => { if (activeRole() !== 'owner') node.remove(); });
    if (activeRole() !== 'owner' || !nav || !shell) return;
    nav.classList.add('owner-nav','owner-nav-scroll');
    nav.setAttribute('aria-label', tr('swipe'));
    if (!shell.querySelector('.owner-nav-hint')) {
      const hint = document.createElement('div');
      hint.className = 'owner-nav-hint';
      hint.textContent = tr('swipe');
      shell.append(hint);
    } else shell.querySelector('.owner-nav-hint').textContent = tr('swipe');
  }

  function paymentState(requestId) { return payments()[requestId]?.status === 'paid' ? 'paid' : 'pending'; }
  function enhanceRequestCards() {
    const requestsButton = document.querySelector('.bottom-nav [data-go="requests"]');
    if (!requestsButton?.classList.contains('active')) return;
    const main = document.querySelector('main');
    const list = main?.querySelector('.request-list');
    if (!main || !list) return;
    const all = [...requests()].reverse();
    const cards = [...list.querySelectorAll(':scope > .request')];
    if (!cards.length || cards.length > all.length) return;
    const role = activeRole();
    cards.forEach((card,index) => {
      const request = all[index]; if (!request) return;
      const pay = paymentState(request.id);
      const signature = `${lang()}:${role}:${String(request.id)}:${pay}`;
      if (card.dataset.finishRequestSignature === signature) return;
      card.dataset.finishRequestId = String(request.id || '');
      const paragraph = card.querySelector('p');
      const name = request.client || request.name || 'Клиент';
      if (paragraph) {
        const dateText = `${esc(request.from||'')} → ${esc(request.to||'')}`;
        paragraph.innerHTML = role === 'owner'
          ? `${dateText} · <button type="button" class="client-link" data-client-profile="${customerId(request)}">${esc(name)}</button>`
          : `${dateText} · ${esc(name)}`;
      }
      card.querySelector('.finish-payment-state')?.remove();
      const row = document.createElement('div'); row.className = 'finish-payment-state';
      if (role === 'client') {
        const status = card.querySelector('.status');
        if (status) status.textContent = pay === 'paid' ? tr('paid') : tr('ready');
        row.innerHTML = pay === 'paid'
          ? `<span class="payment-badge paid">${esc(tr('paid'))}</span>`
          : `<button type="button" class="payment-button" data-pay-request="${esc(request.id)}">${esc(tr('pay'))}</button>`;
      } else {
        row.innerHTML = `<span class="payment-badge ${pay==='paid'?'paid':'pending'}">${pay==='paid'?esc(tr('paid')):esc(tr('ready'))}</span>`;
      }
      card.append(row);
      card.dataset.finishRequestSignature = signature;
    });
  }

  function enhanceOwnerClients() {
    if (activeRole() !== 'owner') return;
    const main = document.querySelector('main'); if (!main) return;
    const section = main.querySelector('[data-owner-clients-section="true"]') || [...main.querySelectorAll('.section')].find(node => /Последние клиенты|Recent clients|Khách hàng gần đây|최근 고객|最近客户/.test(node.querySelector('h2')?.textContent||''));
    if (!section) return;
    const clients = customerSummary();
    const signature = `${lang()}:${clients.map(client=>`${client.id}:${client.count}:${client.total}:${client.paid}`).join('|')}`;
    if (section.dataset.finishClients === signature) return;
    section.dataset.finishClients = signature;
    const existing = section.querySelector('.request-list,.client-card-grid,.empty');
    if (!clients.length) return;
    const grid = document.createElement('div'); grid.className = 'client-card-grid';
    grid.innerHTML = clients.slice(0,8).map(client => `<article class="client-card">
      <div class="client-card-head"><span class="client-avatar">${esc(initials(client.name))}</span><div><button type="button" class="client-name" data-client-profile="${client.id}">${esc(client.name)}</button><small>${esc(client.contact||'Контакт не указан')}</small></div></div>
      <div class="client-card-metrics"><span><b>${client.count}</b>${esc(tr('requests'))}</span><span><b>${money(client.total)}</b>${esc(tr('total'))}</span><span><b>${money(client.paid)}</b>${esc(tr('paidTotal'))}</span></div>
      <div class="client-card-foot"><small>${esc(tr('last'))}: ${esc(formatDate(client.last))}</small><button type="button" data-client-profile="${client.id}">${esc(tr('openProfile'))}</button></div>
    </article>`).join('');
    existing?.replaceWith(grid);
  }

  function openClientProfile(id) {
    const client = customerSummary().find(item => item.id === id); if (!client) return;
    document.querySelector('#finishClientProfile')?.remove();
    const overlay = document.createElement('div'); overlay.className = 'modal-bg finish-modal-bg'; overlay.id = 'finishClientProfile';
    const history = [...client.requests].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(request => `<article class="profile-history-row"><div><b>${esc(vehicleTitle(request))}</b><small>${esc(request.from||'')} → ${esc(request.to||'')}</small></div><div><b>${money(request.estimate||request.estimatedTotalVnd)}</b><span class="payment-badge ${paymentState(request.id)==='paid'?'paid':'pending'}">${paymentState(request.id)==='paid'?esc(tr('paid')):esc(tr('ready'))}</span></div></article>`).join('');
    overlay.innerHTML = `<section class="modal profile-sheet" role="dialog" aria-modal="true" aria-labelledby="clientProfileTitle"><button class="modal-x" data-finish-close aria-label="${esc(tr('close'))}">×</button>
      <span class="eyebrow">${esc(tr('profile'))}</span><div class="profile-identity"><span class="client-avatar large">${esc(initials(client.name))}</span><div><h2 id="clientProfileTitle">${esc(client.name)}</h2><p>${esc(client.contact||'Контакт не указан')}</p></div></div>
      <div class="profile-metrics"><div><span>${esc(tr('requests'))}</span><b>${client.count}</b></div><div><span>${esc(tr('total'))}</span><b>${money(client.total)}</b></div><div><span>${esc(tr('paidTotal'))}</span><b>${money(client.paid)}</b></div></div>
      <div class="profile-history"><div class="section-head"><div><span class="eyebrow">UNIQ CRM</span><h3>${esc(tr('history'))}</h3></div></div>${history}</div>
    </section>`;
    document.body.append(overlay);
  }

  function openPayment(requestId) {
    const request = requests().find(item => String(item.id) === String(requestId)); if (!request) return;
    document.querySelector('#finishPaymentModal')?.remove();
    const amount = Number(request.estimate || request.estimatedTotalVnd) || 0;
    const overlay = document.createElement('div'); overlay.className = 'modal-bg finish-modal-bg'; overlay.id = 'finishPaymentModal';
    overlay.innerHTML = `<section class="modal payment-sheet" role="dialog" aria-modal="true" aria-labelledby="paymentTitle"><button class="modal-x" data-finish-close aria-label="${esc(tr('close'))}">×</button>
      <span class="eyebrow">UNIQ SMART RENT · DEMO CHECKOUT</span><h2 id="paymentTitle">${esc(tr('paymentTitle'))}</h2><div class="payment-summary"><b>${esc(vehicleTitle(request))}</b><span>${esc(request.from||'')} → ${esc(request.to||'')}</span><strong>${money(amount)}</strong></div>
      <label>${esc(tr('paymentMethod'))}<select id="finishPaymentMethod"><option>${esc(tr('card'))}</option><option>${esc(tr('qr'))}</option></select></label>
      <p class="payment-note">${esc(tr('paymentDemo'))}</p><button type="button" class="primary wide" data-confirm-payment="${esc(request.id)}">${esc(tr('confirmPay'))}</button>
    </section>`;
    document.body.append(overlay);
  }

  function confirmPayment(requestId) {
    const request = requests().find(item => String(item.id) === String(requestId)); if (!request) return;
    const data = payments();
    data[request.id] = {status:'paid',paidAt:new Date().toISOString(),amount:Number(request.estimate||request.estimatedTotalVnd)||0,method:document.querySelector('#finishPaymentMethod')?.value||'demo'};
    savePayments(data); document.querySelector('#finishPaymentModal')?.remove(); refresh();
  }

  let applying = false;
  function refresh() {
    if (applying) return; applying = true;
    try { enhanceHero(); ensureOwnerNav(); enhanceRequestCards(); enhanceOwnerClients(); }
    finally { applying = false; }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest?.('[data-client-profile],[data-pay-request],[data-confirm-payment],[data-finish-close]'); if (!target) return;
    if (target.dataset.clientProfile) { event.preventDefault(); openClientProfile(target.dataset.clientProfile); }
    else if (target.dataset.payRequest) { event.preventDefault(); openPayment(target.dataset.payRequest); }
    else if (target.dataset.confirmPayment) { event.preventDefault(); confirmPayment(target.dataset.confirmPayment); }
    else if (target.hasAttribute('data-finish-close')) target.closest('.modal-bg')?.remove();
  }, true);
  document.addEventListener('click', event => { if (event.target?.classList?.contains('finish-modal-bg')) event.target.remove(); });
  document.addEventListener('change', event => { if (event.target?.id === 'uniqLanguageSelect') setTimeout(refresh,30); }, true);
  const observer = new MutationObserver(() => queueMicrotask(refresh));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',refresh);
  setTimeout(refresh,0);
})();
