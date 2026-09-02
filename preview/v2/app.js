(() => {
  'use strict';
  const fleetRaw = Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : [];
  const sync = window.UNIQ_ASSET_SYNC || { vehicleCount: fleetRaw.length, imageCount: 0, failureCount: 0 };
  const root = document.querySelector('#app');
  const modalRoot = document.querySelector('#modalRoot');
  const statusOrder = ['new','contacted','awaiting_confirmation','confirmed','vehicle_issued','active','return_due','returned','completed','cancelled'];
  const statusLabels = {new:'Новая',contacted:'Связались',awaiting_confirmation:'Ждёт подтверждения',confirmed:'Подтверждена',vehicle_issued:'Выдана',active:'В аренде',return_due:'Возврат',returned:'Возвращена',completed:'Завершена',cancelled:'Отменена'};
  const fleetStatusOrder = ['manager_confirmation','available','reserved','service'];
  const fleetStatusLabels = {manager_confirmation:'Менеджер подтверждает',available:'Свободна',reserved:'Бронь',service:'Сервис'};
  const scooterNames = /x-?max|nvx|pcx|vision|janus|latte|candy|velia|shark|espero|venuxs|vespa|priti|evo grand|adv-350|x-adv/i;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = value => Number(value) > 0 ? new Intl.NumberFormat('ru-RU').format(Number(value)) + ' ₫' : 'По запросу';
  const localPhoto = photo => '../../' + String(photo || '').replace(/^\.\//,'');
  const vehicleType = v => v.type === 'car' ? 'car' : (v.type === 'scooter' || scooterNames.test(v.title || '') ? 'scooter' : 'motorcycle');
  const typeLabel = type => ({car:'Авто',scooter:'Скутер',motorcycle:'Мотоцикл'}[type] || 'Техника');
  const safeStore = (key, fallback) => { try { const parsed = JSON.parse(localStorage.getItem(key) || 'null'); return parsed ?? fallback; } catch { return fallback; } };
  const state = {
    role: localStorage.getItem('uniq-v2-role') || 'client',
    route: 'home',
    selectedVehicleId: null,
    photoIndex: 0,
    query: '', type: 'all', price: 'all',
    bookings: safeStore('uniq-v2-bookings', []),
    fleetState: safeStore('uniq-v2-fleet-state', {})
  };
  if (!['client','team','owner'].includes(state.role)) state.role = 'client';
  const fleet = fleetRaw.map(v => ({...v, uiType: vehicleType(v)}));
  const save = () => { localStorage.setItem('uniq-v2-bookings', JSON.stringify(state.bookings)); localStorage.setItem('uniq-v2-fleet-state', JSON.stringify(state.fleetState)); };
  const getVehicle = id => fleet.find(v => v.id === id);
  const scrollTop = () => window.scrollTo({top:0, behavior:'smooth'});
  const flash = message => { const node=document.createElement('div'); node.className='flash'; node.textContent=message; document.body.append(node); setTimeout(()=>node.remove(),1800); };

  function navItems() {
    if (state.role === 'client') return [['home','⌂','Главная'],['catalog','▦','Парк'],['bookings','◷','MY UNIQ'],['contacts','◎','Контакты']];
    if (state.role === 'team') return [['home','⌂','Операции'],['bookings','◷','Заявки'],['catalog','▦','Парк'],['contacts','◎','Контакты']];
    return [['home','⌂','Dashboard'],['bookings','◷','Заявки'],['catalog','▦','Парк'],['contacts','◎','Контакты']];
  }
  function shell(content) {
    return `<div class="app-shell">
      <header class="topbar">
        <button class="brand" data-route="home" aria-label="UNIQ Smart Rent"><img src="../../assets/brand/uniq-logo.svg" alt="UNIQ Nha Trang Rent Bike"></button>
        <div class="role-tabs" aria-label="Режим прототипа">
          ${[['client','Клиент'],['team','Сотрудник'],['owner','Владелец']].map(([id,label])=>`<button data-role="${id}" class="${state.role===id?'is-active':''}"><span>${label}</span>${id==='client'?'CLIENT':id==='team'?'TEAM':'OWNER'}</button>`).join('')}
        </div>
      </header>
      <main>${content}</main>
      <nav class="bottom-nav">${navItems().map(([route,icon,label])=>`<button data-route="${route}" class="${state.route===route?'is-active':''}"><b>${icon}</b>${label}</button>`).join('')}</nav>
    </div>`;
  }
  function heroMetrics() {
    const scooters=fleet.filter(v=>v.uiType==='scooter').length, cars=fleet.filter(v=>v.uiType==='car').length, motos=fleet.filter(v=>v.uiType==='motorcycle').length;
    return `<div class="metrics"><div><b>${fleet.length}</b><span>всего единиц</span></div><div><b>${motos}</b><span>мотоциклы</span></div><div><b>${scooters}</b><span>скутеры</span></div><div><b>${cars}</b><span>автомобили</span></div></div>`;
  }
  function vehiclePhoto(v, index=0, cls='') {
    const photo=v.photos?.[index] || v.photos?.[0];
    if (!photo) return `<div class="fallback"><b>${esc(v.title)}</b><small>UNIQ Moto</small></div>`;
    return `<img class="${cls}" src="${esc(localPhoto(photo))}" alt="${esc(v.title)} — фото ${index+1}" loading="${index===0?'eager':'lazy'}" decoding="async" data-img-fallback="${esc(v.title)}">`;
  }
  function vehicleCard(v) {
    const fs=state.fleetState[v.id] || 'manager_confirmation';
    return `<article class="vehicle-card" data-card="${esc(v.id)}">
      <button class="vehicle-media" data-open-vehicle="${esc(v.id)}" aria-label="Открыть ${esc(v.title)}">
        <div class="fallback"><b>${esc(v.title)}</b><small>Локальное фото UNIQ Moto</small></div>${vehiclePhoto(v,0)}
        <span class="badge">${v.photos?.length||0} фото · LOCAL</span>
      </button>
      <div class="vehicle-body"><div class="vehicle-head"><div><span class="type-pill">${typeLabel(v.uiType)}</span><h3>${esc(v.title)}</h3><small>${v.year||''}${v.engine?' · '+esc(v.engine):''}</small></div><div class="price"><b>${money(v.dailyVnd)}</b><small>/ день</small></div></div>
      <div class="specs-mini"><span>${esc(v.weight||v.capacity||'—')}</span><span>${esc(v.cruiseSpeed||v.fuelUse||'—')}</span><span>${esc(v.capacity||v.engine||'—')}</span></div>
      ${state.role==='client'?'':`<span class="state-pill">${fleetStatusLabels[fs]}</span>`}
      <div class="actions" style="margin-top:12px"><button class="secondary" data-open-vehicle="${esc(v.id)}">Подробнее</button>${state.role==='client'?`<button class="primary" data-book="${esc(v.id)}">Выбрать</button>`:`<button class="primary" data-fleet-status="${esc(v.id)}">Статус</button>`}</div></div>
    </article>`;
  }
  function clientHome() {
    return `<section class="hero"><div class="hero-grid"><div><span class="eyebrow">UNIQ SMART RENT · TELEGRAM MINI APP</span><h1>Весь парк UNIQ — в одном интерфейсе.</h1><p>Клиент выбирает технику и даты, сравнивает опубликованные тарифы, отправляет заявку и видит её в MY UNIQ. Менеджер подтверждает доступность конкретной единицы.</p><div class="actions" style="max-width:430px;margin-top:20px"><button class="primary" data-route="catalog">Открыть парк</button><button class="secondary" data-route="bookings">MY UNIQ</button></div></div><aside class="hero-card"><span class="eyebrow">LOCAL MEDIA</span><b class="big">${sync.imageCount||0}</b><span>фотографий техники сохранено внутри проекта</span>${heroMetrics()}</aside></div></section><section class="section"><div class="section-head"><div><span class="eyebrow">Быстрый выбор</span><h2>Техника UNIQ</h2></div><button class="ghost" data-route="catalog">Весь парк</button></div><div class="vehicle-grid">${fleet.slice(0,6).map(vehicleCard).join('')}</div></section>`;
  }
  function filteredFleet() {
    const q=state.query.trim().toLowerCase(), cap=state.price==='all'?Infinity:Number(state.price);
    return fleet.filter(v => (state.type==='all'||v.uiType===state.type) && (!v.dailyVnd||v.dailyVnd<=cap) && (!q||`${v.title} ${v.year||''} ${v.engine||''}`.toLowerCase().includes(q)));
  }
  function catalogPage() {
    const rows=filteredFleet();
    return `<section class="page-head"><span class="eyebrow">OFFICIAL FLEET · LOCAL ASSETS</span><h1>Парк UNIQ</h1><p>Все карточки сформированы из публичного каталога UNIQ Moto. Фотографии сохранены внутри проекта и открываются без обращения к внешнему CDN.</p></section><div class="toolbar"><input id="fleetSearch" type="search" value="${esc(state.query)}" placeholder="Поиск: Yamaha, Rebel, 50cc…"><select id="fleetType"><option value="all">Вся техника</option><option value="motorcycle" ${state.type==='motorcycle'?'selected':''}>Мотоциклы</option><option value="scooter" ${state.type==='scooter'?'selected':''}>Скутеры</option><option value="car" ${state.type==='car'?'selected':''}>Авто</option></select><select id="fleetPrice"><option value="all">Любая цена</option><option value="500000" ${state.price==='500000'?'selected':''}>до 500.000 ₫</option><option value="1000000" ${state.price==='1000000'?'selected':''}>до 1 млн ₫</option><option value="2000000" ${state.price==='2000000'?'selected':''}>до 2 млн ₫</option><option value="4000000" ${state.price==='4000000'?'selected':''}>до 4 млн ₫</option></select></div><div class="section-head"><div><span class="eyebrow">Каталог</span><h2>${rows.length} из ${fleet.length}</h2></div><small>${sync.imageCount||0} локальных фото</small></div>${rows.length?`<section class="vehicle-grid">${rows.map(vehicleCard).join('')}</section>`:`<div class="empty">Выберите другой фильтр.</div>`}<div class="source-panel">Источник данных: официальный каталог UNIQ Moto. Дневные, недельные и месячные тарифы берутся из карточки конкретной техники; финальную доступность подтверждает менеджер.</div>`;
  }
  function vehiclePage() {
    const v=getVehicle(state.selectedVehicleId); if(!v) { state.route='catalog'; return catalogPage(); }
    const idx=Math.max(0,Math.min(state.photoIndex,(v.photos?.length||1)-1));
    return `<button class="back" data-route="catalog">← К парку</button><section class="vehicle-detail"><div class="gallery"><div class="main-photo">${vehiclePhoto(v,idx)}</div>${(v.photos?.length||0)>1?`<div class="thumbs">${v.photos.map((_,i)=>`<button class="thumb ${i===idx?'is-active':''}" data-photo-index="${i}">${vehiclePhoto(v,i)}</button>`).join('')}</div>`:''}</div><div class="vehicle-copy"><span class="type-pill">${typeLabel(v.uiType)} · ${v.year||''}</span><h1>${esc(v.title)}</h1><p>Карточка собрана из данных официального каталога UNIQ Moto. Выберите даты — менеджер подтвердит наличие и финальные условия выдачи.</p><div class="rate-grid"><div><span>День</span><b>${money(v.dailyVnd)}</b></div><div><span>Неделя</span><b>${money(v.weeklyVnd)}</b></div><div><span>Месяц</span><b>${money(v.monthlyVnd)}</b></div><div><span>Депозит</span><b>${money(v.depositVnd)}</b></div></div><div class="spec-table"><div><span>Двигатель</span><b>${esc(v.engine||'—')}</b></div><div><span>Вес</span><b>${esc(v.weight||'—')}</b></div><div><span>Крейсерская скорость</span><b>${esc(v.cruiseSpeed||'—')}</b></div><div><span>Расход</span><b>${esc(v.fuelUse||'—')}</b></div><div><span>Вместимость</span><b>${esc(v.capacity||'—')}</b></div><div><span>Локальные фото</span><b>${v.photos?.length||0}</b></div></div><div class="actions">${state.role==='client'?`<button class="primary" data-book="${esc(v.id)}">Запросить бронь</button>`:`<button class="primary" data-fleet-status="${esc(v.id)}">${fleetStatusLabels[state.fleetState[v.id]||'manager_confirmation']}</button>`}<a class="secondary" href="${esc(v.sourceUrl)}" target="_blank" rel="noreferrer">Источник ↗</a></div></div></section>`;
  }
  function requestRows(rows, editable) {
    if(!rows.length) return `<div class="empty">Заявки появятся здесь после создания клиентского запроса.</div>`;
    return `<div class="request-list">${rows.map(b=>{const v=getVehicle(b.vehicleId);return `<article class="request-row"><div><span class="state-pill">${statusLabels[b.status]||b.status}</span><h3>${esc(v?.title||b.vehicleId)}</h3><p>${esc(b.name)} · ${esc(b.contact)}</p></div><div><small>Даты</small><b>${esc(b.from)} → ${esc(b.to)}</b></div><div><small>Создана</small><b>${new Date(b.createdAt).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</b></div><div>${editable?`<select data-booking-status="${esc(b.id)}">${statusOrder.map(s=>`<option value="${s}" ${b.status===s?'selected':''}>${statusLabels[s]}</option>`).join('')}</select>`:`<button class="secondary" data-open-vehicle="${esc(b.vehicleId)}">Техника</button>`}</div></article>`}).join('')}</div>`;
  }
  function bookingsPage() {
    const isClient=state.role==='client';
    return `<section class="page-head"><span class="eyebrow">${isClient?'MY UNIQ':'BOOKING DESK'}</span><h1>${isClient?'Мои заявки':'Заявки клиентов'}</h1><p>${isClient?'История запросов этого прототипа сохраняется в браузере.':'Сотрудник управляет статусами, владелец видит общий поток и состояние заявок.'}</p></section>${requestRows(state.bookings,state.role==='team')}`;
  }
  function teamHome() {
    const open=state.bookings.filter(b=>!['completed','cancelled'].includes(b.status));
    const available=Object.values(state.fleetState).filter(x=>x==='available').length;
    const reserved=Object.values(state.fleetState).filter(x=>x==='reserved').length;
    return `<section class="dashboard-hero"><span class="eyebrow">EMPLOYEE · OPERATIONS</span><h1>Заявки и парк — в одном рабочем экране.</h1><p>Сотрудник обрабатывает обращения, переводит заявку по статусам и отмечает состояние техники. Данные прототипа сохраняются локально в браузере.</p><div class="metrics"><div><b>${open.length}</b><span>активные заявки</span></div><div><b>${fleet.length}</b><span>парк в каталоге</span></div><div><b>${available}</b><span>отмечено свободными</span></div><div><b>${reserved}</b><span>отмечено в брони</span></div></div></section><section class="section"><div class="section-head"><div><span class="eyebrow">Очередь</span><h2>Текущие заявки</h2></div><button class="ghost" data-route="bookings">Все заявки</button></div>${requestRows(open.slice(0,8),true)}</section><section class="section owner-grid"><div class="panel"><span class="eyebrow">FLEET CONTROL</span><h3>Операционный статус техники</h3><p>Для каждой единицы доступны состояния: подтверждение менеджером, свободна, бронь, сервис.</p><button class="primary" data-route="catalog">Открыть парк</button></div><div class="panel"><span class="eyebrow">LOCAL MEDIA</span><h3>${sync.imageCount||0} фотографий</h3><p>Фотографии хранятся внутри ветки проекта и связаны с соответствующими карточками техники.</p></div></section>`;
  }
  function ownerHome() {
    const counts=Object.fromEntries(statusOrder.map(s=>[s,state.bookings.filter(b=>b.status===s).length])); const max=Math.max(1,...Object.values(counts));
    const operational=state.bookings.filter(b=>['confirmed','vehicle_issued','active','return_due'].includes(b.status)).length;
    return `<section class="dashboard-hero"><span class="eyebrow">OWNER · CONTROL CENTER</span><h1>Управление бизнесом — прямо со смартфона.</h1><p>Owner Dashboard объединяет заявки, состояние парка и качество каталога. В прототипе отображаются только фактические данные текущей demo-сессии и локальной синхронизации.</p><div class="metrics"><div><b>${fleet.length}</b><span>техника в каталоге</span></div><div><b>${state.bookings.length}</b><span>всего заявок</span></div><div><b>${operational}</b><span>подтверждено / активно</span></div><div><b>${sync.imageCount||0}</b><span>локальных фото</span></div></div></section><section class="section owner-grid"><div class="panel"><span class="eyebrow">BOOKING PIPELINE</span><h3>Статусы заявок</h3><div class="status-stack">${statusOrder.slice(0,9).map(s=>`<div class="status-line"><span>${statusLabels[s]}</span><div class="bar"><span style="width:${counts[s]/max*100}%"></span></div><b>${counts[s]}</b></div>`).join('')}</div></div><div class="panel"><span class="eyebrow">ASSET HEALTH</span><h3>Каталог готов к просмотру</h3><p>Карточек техники: <b>${fleet.length}</b><br>Локальных изображений: <b>${sync.imageCount||0}</b><br>Ошибок последней синхронизации: <b>${sync.failureCount||0}</b></p><div class="actions"><button class="secondary" data-route="catalog">Парк</button><button class="secondary" data-route="bookings">Заявки</button></div></div></section><section class="section"><div class="section-head"><div><span class="eyebrow">Последние обращения</span><h2>Клиенты</h2></div></div>${requestRows(state.bookings.slice().reverse().slice(0,6),false)}</section>`;
  }
  function contactsPage() {
    return `<section class="page-head"><span class="eyebrow">UNIQ MOTO · NHA TRANG</span><h1>Контакты и пункты выдачи</h1><p>Контакты собраны из текущего сайта UNIQ Moto и данных проекта.</p></section><section class="contact-grid"><div class="contact-card"><span>Телефон / WhatsApp</span><a href="https://wa.me/84372112370" target="_blank" rel="noreferrer">+84 37 211 2370 ↗</a></div><div class="contact-card"><span>Telegram</span><a href="https://t.me/RikRent1" target="_blank" rel="noreferrer">@RikRent1 ↗</a></div><div class="contact-card"><span>Официальный сайт</span><a href="https://uniqmoto.com/ru" target="_blank" rel="noreferrer">uniqmoto.com ↗</a></div><div class="contact-card"><span>Северный филиал</span><b>312 Đ. 2/4, Bắc Nha Trang, Khánh Hòa</b></div><div class="contact-card"><span>Центр города</span><b>254 Nguyễn Thị Minh Khai, Nha Trang, Khánh Hòa</b></div><div class="contact-card"><span>Выдача</span><b>Офис или отель в Нячанге</b></div></section>`;
  }
  function page() {
    if(state.route==='catalog') return catalogPage();
    if(state.route==='vehicle') return vehiclePage();
    if(state.route==='bookings') return bookingsPage();
    if(state.route==='contacts') return contactsPage();
    return state.role==='team' ? teamHome() : state.role==='owner' ? ownerHome() : clientHome();
  }
  function render() { root.innerHTML=shell(page()); bind(); }
  function openVehicle(id) { if(!getVehicle(id)) return; state.selectedVehicleId=id; state.photoIndex=0; state.route='vehicle'; render(); scrollTop(); }
  function cycleFleetStatus(id) { const current=state.fleetState[id]||fleetStatusOrder[0]; state.fleetState[id]=fleetStatusOrder[(fleetStatusOrder.indexOf(current)+1)%fleetStatusOrder.length]; save(); render(); flash('Статус техники обновлён'); }
  function bind() {
    document.querySelectorAll('[data-route]').forEach(el=>el.addEventListener('click',()=>{state.route=el.dataset.route; if(state.route!=='vehicle') state.selectedVehicleId=null; render(); scrollTop();}));
    document.querySelectorAll('[data-role]').forEach(el=>el.addEventListener('click',()=>{state.role=el.dataset.role; state.route='home'; localStorage.setItem('uniq-v2-role',state.role); render(); scrollTop();}));
    document.querySelectorAll('[data-open-vehicle]').forEach(el=>el.addEventListener('click',()=>openVehicle(el.dataset.openVehicle)));
    document.querySelectorAll('[data-book]').forEach(el=>el.addEventListener('click',()=>openBooking(el.dataset.book)));
    document.querySelectorAll('[data-fleet-status]').forEach(el=>el.addEventListener('click',()=>cycleFleetStatus(el.dataset.fleetStatus)));
    document.querySelectorAll('[data-photo-index]').forEach(el=>el.addEventListener('click',()=>{state.photoIndex=Number(el.dataset.photoIndex)||0; render();}));
    document.querySelectorAll('[data-booking-status]').forEach(el=>el.addEventListener('change',()=>{const b=state.bookings.find(x=>x.id===el.dataset.bookingStatus); if(!b)return; b.status=el.value; save(); render(); flash('Статус заявки обновлён');}));
    document.querySelectorAll('img[data-img-fallback]').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
    const search=document.querySelector('#fleetSearch'); if(search) search.addEventListener('input',()=>{state.query=search.value; render(); document.querySelector('#fleetSearch')?.focus();});
    const type=document.querySelector('#fleetType'); if(type) type.addEventListener('change',()=>{state.type=type.value; render();});
    const price=document.querySelector('#fleetPrice'); if(price) price.addEventListener('change',()=>{state.price=price.value; render();});
  }
  function openBooking(id) {
    const v=getVehicle(id); if(!v) return;
    const from=new Date(); from.setDate(from.getDate()+1); const to=new Date(); to.setDate(to.getDate()+4);
    modalRoot.innerHTML=`<div class="modal-bg" id="bookingBackdrop"><section class="modal" role="dialog" aria-modal="true"><span class="eyebrow">UNIQ BOOKING</span><h2>${esc(v.title)}</h2><p>${money(v.dailyVnd)} / день · менеджер подтверждает доступность и финальную стоимость.</p><form id="bookingForm"><input type="hidden" name="vehicleId" value="${esc(v.id)}"><div class="form-grid"><label class="field">Получение<input type="date" name="from" value="${from.toISOString().slice(0,10)}" required></label><label class="field">Возврат<input type="date" name="to" value="${to.toISOString().slice(0,10)}" required></label><label class="field wide">Имя<input name="name" required placeholder="Ваше имя"></label><label class="field wide">Телефон / Telegram / WhatsApp<input name="contact" required placeholder="+84… / @username"></label><label class="field wide">Место выдачи<input name="place" placeholder="Офис / отель"></label><label class="field wide">Комментарий<textarea name="note" placeholder="Пожелания по аренде"></textarea></label></div><div class="manager-actions"><button class="secondary" type="button" id="closeBooking">Закрыть</button><button class="primary" type="submit">Создать заявку</button></div></form></section></div>`;
    document.querySelector('#closeBooking')?.addEventListener('click',closeBooking);
    document.querySelector('#bookingBackdrop')?.addEventListener('click',e=>{if(e.target.id==='bookingBackdrop') closeBooking();});
    document.querySelector('#bookingForm')?.addEventListener('submit',e=>{e.preventDefault(); const d=new FormData(e.currentTarget); const start=String(d.get('from')), end=String(d.get('to')); if(!start||!end||end<start){flash('Проверьте даты аренды');return;} state.bookings.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),vehicleId:String(d.get('vehicleId')),from:start,to:end,name:String(d.get('name')),contact:String(d.get('contact')),place:String(d.get('place')||''),note:String(d.get('note')||''),status:'new',createdAt:new Date().toISOString()}); save(); closeBooking(); state.route='bookings'; render(); scrollTop(); flash('Заявка создана');});
  }
  function closeBooking() { modalRoot.innerHTML=''; }
  render();
})();
