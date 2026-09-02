(() => {
  'use strict';
  const fleet = Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : [];
  const sync = window.UNIQ_ASSET_SYNC || {};
  const root = document.querySelector('#app');
  if (!root) return;

  const roleLabels = { client: 'Клиент', employee: 'Сотрудник', owner: 'Владелец' };
  const nav = {
    client: [['home','Главная'],['catalog','Каталог'],['requests','MY UNIQ'],['contacts','Контакты']],
    employee: [['dashboard','Рабочий стол'],['requests','Заявки'],['fleet','Парк'],['handover','Выдачи']],
    owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['system','Система']]
  };
  const state = {
    role: sessionStorage.getItem('uniq-role-v2') || 'client',
    route: 'home',
    selectedId: null,
    query: '',
    type: 'all'
  };
  if (!nav[state.role]) state.role = 'client';
  state.route = nav[state.role][0][0];

  const requestKey = 'uniq-demo-requests-v2';
  const fleetStateKey = 'uniq-demo-fleet-state-v2';
  const load = (key, fallback) => { try { return JSON.parse(sessionStorage.getItem(key) || '') || fallback; } catch { return fallback; } };
  const save = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
  const requests = load(requestKey, []);
  const fleetState = load(fleetStateKey, {});
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => n ? new Intl.NumberFormat('ru-RU').format(n) + ' ₫' : 'уточнить';
  const dateISO = d => d.toISOString().slice(0,10);
  const today = new Date();
  const fromDefault = new Date(today); fromDefault.setDate(fromDefault.getDate()+1);
  const toDefault = new Date(today); toDefault.setDate(toDefault.getDate()+4);
  const telegram = window.Telegram?.WebApp; telegram?.ready?.(); telegram?.expand?.();

  function publishedEstimate(v, from, to) {
    const a = new Date(from+'T00:00:00'); const b = new Date(to+'T00:00:00');
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
    let days = Math.max(1, Math.floor((b-a)/86400000)+1), total = 0;
    const month = v.monthlyVnd > 0 ? v.monthlyVnd : 0;
    const week = v.weeklyVnd > 0 ? v.weeklyVnd : 0;
    const day = v.dailyVnd > 0 ? v.dailyVnd : 0;
    if (month) { const c = Math.floor(days/30); total += c*month; days -= c*30; }
    if (week) { const c = Math.floor(days/7); total += c*week; days -= c*7; }
    total += days*day;
    return total;
  }
  const typeLabel = t => t === 'car' ? 'Авто' : t === 'scooter' ? 'Скутер' : 'Мотоцикл';
  const effectiveFleetState = id => fleetState[id] || 'manager';
  const stateLabel = s => ({manager:'Подтверждает менеджер',ready:'Готов к выдаче · DEMO',service:'Сервис · DEMO',hold:'Резерв · DEMO'}[s] || s);

  function brand() {
    return `<button class="brand" data-go="${nav[state.role][0][0]}"><img src="./brand/uniq-logo.svg" alt="UNIQ Nha Trang Rent Bike"><span>SMART RENT</span></button>`;
  }
  function shell(content) {
    return `<div class="shell">
      <header class="topbar">${brand()}<div class="role-switch">${Object.entries(roleLabels).map(([id,label])=>`<button data-role="${id}" class="${state.role===id?'active':''}">${label}</button>`).join('')}</div></header>
      <main>${content}</main>
      <nav class="bottom-nav">${nav[state.role].map(([id,label])=>`<button data-go="${id}" class="${state.route===id?'active':''}"><span>${icon(id)}</span><b>${label}</b></button>`).join('')}</nav>
    </div>`;
  }
  function icon(id) {
    const map={home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉',system:'⚙'}; return map[id]||'•';
  }
  function hero(label,title,text,aside='') {
    return `<section class="hero"><div><span class="eyebrow">${label}</span><h1>${title}</h1><p>${text}</p></div>${aside}</section>`;
  }
  function metric(label,value,sub='') { return `<div class="metric"><span>${label}</span><b>${value}</b>${sub?`<small>${sub}</small>`:''}</div>`; }
  function photo(v, index=0) {
    const src = v.photos?.[index] || v.photos?.[0];
    return src ? `<img src="${esc(src)}" alt="${esc(v.title)}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.add('missing')">` : '';
  }
  function card(v) {
    return `<article class="vehicle-card" data-open="${esc(v.id)}"><div class="media">${photo(v)}<span>${typeLabel(v.type)}</span></div><div class="vehicle-body"><div class="vehicle-top"><div><small>${v.year||''} · ${esc(v.engine||'')}</small><h3>${esc(v.title)}</h3></div><b>${money(v.dailyVnd)}<small>/день</small></b></div><div class="spec-row"><span>${esc(v.weight||'—')}</span><span>${esc(v.cruiseSpeed||'—')}</span><span>${stateLabel(effectiveFleetState(v.id))}</span></div><button class="primary" data-book="${esc(v.id)}">Выбрать</button></div></article>`;
  }
  function filteredFleet() {
    const q = state.query.toLowerCase().trim();
    return fleet.filter(v => (state.type==='all'||v.type===state.type) && (!q || `${v.title} ${v.engine} ${v.year}`.toLowerCase().includes(q)));
  }

  function clientHome() {
    const featured = fleet.filter(v=>v.photos?.length).slice(0,6);
    return hero('UNIQ SMART RENT · NHA TRANG','Весь парк UNIQ — прямо в Telegram.','Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.',`<div class="hero-card"><b>${fleet.length}</b><span>единиц техники</span><div>${metric('Фото локально',sync.imageCount||'405','без внешних зависимостей')}${metric('Роли','3','клиент · сотрудник · владелец')}</div></div>`) +
      `<section class="quick"><div><label>Получение<input id="quickFrom" type="date" value="${dateISO(fromDefault)}"></label><label>Возврат<input id="quickTo" type="date" value="${dateISO(toDefault)}"></label></div><button class="primary" data-go="catalog">Подобрать технику</button></section>`+
      `<section class="section"><div class="section-head"><div><span class="eyebrow">ПАРК</span><h2>Популярная техника</h2></div><button class="text" data-go="catalog">Весь каталог →</button></div><div class="grid">${featured.map(card).join('')}</div></section>`+
      `<section class="proof"><b>Источник: uniqmoto.com</b><span>Каталог и фотографии синхронизированы ${sync.generatedAt?new Date(sync.generatedAt).toLocaleString('ru-RU'):'02.09.2026'}. Наличие конкретной единицы подтверждает менеджер.</span></section>`;
  }

  function catalog() {
    const rows = filteredFleet();
    return hero('КАТАЛОГ UNIQ','Выберите технику.','Все позиции из публичного парка клиента с локальными фотографиями и опубликованной дневной ставкой.')+
      `<section class="filters"><input id="fleetSearch" placeholder="Поиск: Yamaha, Rebel, 50cc…" value="${esc(state.query)}"><select id="typeFilter"><option value="all">Вся техника</option><option value="motorcycle" ${state.type==='motorcycle'?'selected':''}>Мотоциклы</option><option value="scooter" ${state.type==='scooter'?'selected':''}>Скутеры</option><option value="car" ${state.type==='car'?'selected':''}>Авто</option></select><span>${rows.length} из ${fleet.length}</span></section>`+
      `<section class="grid catalog-grid">${rows.map(card).join('')}</section>`;
  }

  function vehicleDetail() {
    const v=fleet.find(x=>x.id===state.selectedId); if(!v) return catalog();
    return `<button class="back" data-go="catalog">← Каталог</button><section class="detail"><div class="gallery"><div class="main-photo">${photo(v)}</div>${(v.photos||[]).length>1?`<div class="thumbs">${v.photos.slice(0,8).map((_,i)=>`<button data-photo="${i}">${photo(v,i)}</button>`).join('')}</div>`:''}</div><div class="detail-copy"><span class="pill">${typeLabel(v.type)}</span><h1>${esc(v.title)}</h1><p>${v.year||''} · ${esc(v.engine||'')} · ${esc(v.weight||'')} · ${esc(v.cruiseSpeed||'')}</p><div class="rate-grid">${metric('День',money(v.dailyVnd))}${metric('Неделя',money(v.weeklyVnd))}${metric('Месяц',money(v.monthlyVnd))}${metric('Депозит',money(v.depositVnd))}</div><div class="notice"><b>${stateLabel(effectiveFleetState(v.id))}</b><span>Live-доступность пока не подключена к backend. Финальное подтверждение делает менеджер UNIQ.</span></div><button class="primary wide" data-book="${esc(v.id)}">Запросить бронь</button><a class="source-link" href="${esc(v.sourceUrl)}" target="_blank" rel="noreferrer">Открыть источник ↗</a></div></section>`;
  }

  function requestsPage() {
    const list=[...requests].reverse();
    const title=state.role==='client'?'Мои заявки':state.role==='employee'?'Заявки клиентов':'Все заявки';
    return hero('REQUEST FLOW',title,state.role==='client'?'Заявки этого демонстрационного сеанса.':'Один список заявок используется всеми ролями прототипа.') +
      (list.length?`<section class="request-list">${list.map(requestCard).join('')}</section>`:`<div class="empty"><b>Заявок пока нет</b><span>Создайте заявку из карточки техники в режиме клиента.</span></div>`);
  }
  function requestCard(r) {
    const v=fleet.find(x=>x.id===r.vehicleId);
    const actions=state.role==='employee'?`<select data-status="${r.id}">${['new','contacted','confirmed','issued','active','returned','completed','cancelled'].map(s=>`<option value="${s}" ${r.status===s?'selected':''}>${statusText(s)}</option>`).join('')}</select>`:'';
    return `<article class="request"><div><span class="status">${statusText(r.status)}</span><small>${new Date(r.createdAt).toLocaleString('ru-RU')}</small></div><h3>${esc(v?.title||r.vehicleId)}</h3><p>${esc(r.from)} → ${esc(r.to)} · ${esc(r.client||'Клиент')}</p><b>${money(r.estimate)}</b>${actions}</article>`;
  }
  function statusText(s){return ({new:'Новая',contacted:'Связались',confirmed:'Подтверждена',issued:'Выдана',active:'В аренде',returned:'Возвращена',completed:'Завершена',cancelled:'Отменена'}[s]||s);}

  function contacts() {
    return hero('UNIQ MOTO','Контакты и выдача.','Два пункта в Нячанге и связь с менеджером.')+`<section class="contact-grid"><article><span>Телефон / Zalo</span><a href="tel:+84372112370">+84 37 211 2370</a><a class="primary" href="https://wa.me/84372112370" target="_blank" rel="noreferrer">WhatsApp</a></article><article><span>Северный филиал</span><b>312 Đ. 2/4, Bắc Nha Trang</b></article><article><span>Центр города</span><b>254 Nguyễn Thị Minh Khai, Nha Trang</b></article></section>`;
  }

  function employeeDashboard() {
    const open=requests.filter(r=>!['completed','cancelled'].includes(r.status));
    const demoReady=Object.values(fleetState).filter(x=>x==='ready').length;
    return hero('EMPLOYEE','Рабочий стол сотрудника.','Заявки, парк и выдачи в одном мобильном интерфейсе.')+
      `<section class="metrics">${metric('Открытые заявки',open.length)}${metric('Парк',fleet.length)}${metric('Готовы · DEMO',demoReady)}${metric('Фото',sync.imageCount||405)}</section>`+
      `<section class="section"><div class="section-head"><div><span class="eyebrow">ОЧЕРЕДЬ</span><h2>Новые заявки</h2></div><button class="text" data-go="requests">Все →</button></div>${open.length?`<div class="request-list">${open.slice(-5).reverse().map(requestCard).join('')}</div>`:`<div class="empty">Новых заявок нет</div>`}</section>`;
  }

  function employeeFleet() {
    return hero('EMPLOYEE · FLEET','Парк техники.','Сотрудник видит весь каталог. Статусы ниже демонстрационные и хранятся только в текущем сеансе.')+
      `<section class="fleet-table">${fleet.map(v=>`<article><div class="mini-photo">${photo(v)}</div><div><b>${esc(v.title)}</b><small>${v.year||''} · ${esc(v.engine||'')}</small></div><select data-fleet-state="${esc(v.id)}"><option value="manager" ${effectiveFleetState(v.id)==='manager'?'selected':''}>Подтверждает менеджер</option><option value="ready" ${effectiveFleetState(v.id)==='ready'?'selected':''}>Готов к выдаче · DEMO</option><option value="service" ${effectiveFleetState(v.id)==='service'?'selected':''}>Сервис · DEMO</option><option value="hold" ${effectiveFleetState(v.id)==='hold'?'selected':''}>Резерв · DEMO</option></select></article>`).join('')}</section>`;
  }

  function handover() {
    const rows=requests.filter(r=>['confirmed','issued','active','returned'].includes(r.status));
    return hero('EMPLOYEE · HANDOVER','Выдачи и возвраты.','Здесь отображаются только заявки, дошедшие до подтверждения.')+(rows.length?`<section class="request-list">${rows.map(requestCard).join('')}</section>`:`<div class="empty"><b>Подтверждённых выдач пока нет</b><span>Статус заявки можно изменить в разделе «Заявки».</span></div>`);
  }

  function ownerOverview() {
    const confirmed=requests.filter(r=>['confirmed','issued','active','returned','completed'].includes(r.status)).length;
    const open=requests.filter(r=>!['completed','cancelled'].includes(r.status)).length;
    const estimate=requests.filter(r=>r.status!=='cancelled').reduce((s,r)=>s+(r.estimate||0),0);
    return hero('OWNER','Пульс бизнеса — со смартфона.','Только показатели, которые реально следуют из текущего каталога и заявок прототипа.')+
      `<section class="metrics owner-metrics">${metric('Парк',fleet.length,'позиции из источника')}${metric('Открытые заявки',open)}${metric('Подтверждены',confirmed)}${metric('Потенциал заявок',money(estimate),'сумма опубликованных тарифов')}</section>`+
      `<section class="two-col"><article class="panel"><span class="eyebrow">FUNNEL</span><h2>Статусы заявок</h2>${statusBreakdown()}</article><article class="panel"><span class="eyebrow">DATA</span><h2>Качество данных</h2><div class="data-lines"><span><b>${fleet.length}</b> позиций</span><span><b>${sync.imageCount||405}</b> локальных фото</span><span><b>${sync.failureCount??0}</b> ошибок синхронизации</span><span><b>2</b> точки выдачи</span></div></article></section>`;
  }
  function statusBreakdown(){const statuses=['new','contacted','confirmed','issued','active','returned','completed','cancelled'];return `<div class="status-bars">${statuses.map(s=>{const n=requests.filter(r=>r.status===s).length;return `<div><span>${statusText(s)}</span><b>${n}</b><i style="width:${requests.length?Math.max(4,n/requests.length*100):4}%"></i></div>`}).join('')}</div>`;}

  function ownerFleet() {
    const counts={manager:0,ready:0,service:0,hold:0}; fleet.forEach(v=>counts[effectiveFleetState(v.id)]++);
    return hero('OWNER · FLEET','Парк и состояние.','Каталог — реальный; оперативные статусы остаются DEMO до подключения live-базы.')+`<section class="metrics">${metric('Всего',fleet.length)}${metric('Менеджер',counts.manager)}${metric('Готовы · DEMO',counts.ready)}${metric('Сервис · DEMO',counts.service)}</section>`+`<section class="grid">${fleet.slice(0,18).map(card).join('')}</section><div class="proof">Полный каталог доступен сотруднику и клиенту; Owner показывает агрегированный оперативный срез.</div>`;
  }
  function systemPage() {
    return hero('OWNER · SYSTEM','Система готова к backend.','Текущий прототип сохраняет демо-операции только в sessionStorage. Production API/D1 уже присутствуют в основном проекте.')+`<section class="system-grid"><article><b>Cloudflare Worker</b><span>API-слой проекта сохранён</span></article><article><b>D1 schema</b><span>Миграции и lifecycle присутствуют</span></article><article><b>Local assets</b><span>${fleet.length} позиций · ${sync.imageCount||405} фото</span></article><article><b>Telegram WebApp</b><span>ready() + expand() подключены</span></article></section>`;
  }

  function page() {
    if (state.selectedId) return vehicleDetail();
    if (state.role==='client') return state.route==='catalog'?catalog():state.route==='requests'?requestsPage():state.route==='contacts'?contacts():clientHome();
    if (state.role==='employee') return state.route==='requests'?requestsPage():state.route==='fleet'?employeeFleet():state.route==='handover'?handover():employeeDashboard();
    return state.route==='requests'?requestsPage():state.route==='fleet'?ownerFleet():state.route==='system'?systemPage():ownerOverview();
  }

  function render(scroll=false) {
    root.innerHTML=shell(page()); bind(); if(scroll) window.scrollTo({top:0,behavior:'smooth'});
  }
  function bind() {
    document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{state.role=b.dataset.role;sessionStorage.setItem('uniq-role-v2',state.role);state.route=nav[state.role][0][0];state.selectedId=null;render(true)});
    document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.route=b.dataset.go;state.selectedId=null;render(true)});
    document.querySelectorAll('[data-open]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-book]'))return;state.selectedId=el.dataset.open;render(true)});
    document.querySelectorAll('[data-book]').forEach(b=>b.onclick=e=>{e.stopPropagation();openBooking(b.dataset.book)});
    document.querySelector('#fleetSearch')?.addEventListener('input',e=>{state.query=e.target.value;render()});
    document.querySelector('#typeFilter')?.addEventListener('change',e=>{state.type=e.target.value;render()});
    document.querySelectorAll('[data-status]').forEach(s=>s.onchange=()=>{const r=requests.find(x=>x.id===s.dataset.status);if(r){r.status=s.value;save(requestKey,requests);render()}});
    document.querySelectorAll('[data-fleet-state]').forEach(s=>s.onchange=()=>{fleetState[s.dataset.fleetState]=s.value;save(fleetStateKey,fleetState);render()});
    document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{const v=fleet.find(x=>x.id===state.selectedId);const main=document.querySelector('.main-photo');if(v&&main)main.innerHTML=photo(v,Number(b.dataset.photo));});
  }

  function openBooking(id) {
    const v=fleet.find(x=>x.id===id); if(!v)return;
    const overlay=document.createElement('div');overlay.className='modal-bg';overlay.innerHTML=`<section class="modal"><button class="modal-x">×</button><span class="eyebrow">BOOKING DEMO</span><h2>${esc(v.title)}</h2><p>${money(v.dailyVnd)} / день · финальная доступность подтверждается менеджером.</p><form id="bookForm"><div class="form-grid"><label>Получение<input name="from" type="date" value="${dateISO(fromDefault)}" required></label><label>Возврат<input name="to" type="date" value="${dateISO(toDefault)}" required></label><label>Имя<input name="client" required placeholder="Ваше имя"></label><label>Контакт<input name="contact" required placeholder="Телефон / @username"></label></div><button class="primary wide" type="submit">Создать демо-заявку</button></form><small>Демо-заявка хранится только в текущем сеансе и сразу становится видна сотруднику и владельцу.</small></section>`;document.body.append(overlay);overlay.querySelector('.modal-x').onclick=()=>overlay.remove();overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};overlay.querySelector('form').onsubmit=e=>{e.preventDefault();const d=new FormData(e.target);const from=String(d.get('from')),to=String(d.get('to'));const r={id:crypto.randomUUID(),vehicleId:id,from,to,client:String(d.get('client')),contact:String(d.get('contact')),status:'new',estimate:publishedEstimate(v,from,to),createdAt:new Date().toISOString()};requests.push(r);save(requestKey,requests);overlay.remove();state.route='requests';state.selectedId=null;render(true)};
  }

  if (!fleet.length) root.innerHTML='<div class="fatal"><b>Каталог ещё не синхронизирован.</b><span>Ожидается локальный assets/fleet-manifest.js.</span></div>'; else render();
})();
