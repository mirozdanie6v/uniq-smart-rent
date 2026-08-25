import { vehicles, getVehicle } from './domain/catalog.js';
import { calculateRentalTotal, isBookable, makeDemoBooking } from './domain/booking.js';
import { languages, t } from './domain/i18n.js';
import type { Booking, Language, Role, Vehicle, VehicleCategory } from './domain/types.js';
import { icons } from './ui/icons.js';

type Route = 'home' | 'catalog' | 'bookings' | 'profile' | 'vehicle';
interface AppState {
  lang: Language; role: Role; route: Route; selectedVehicleId: string | null; category: VehicleCategory | 'all'; bookings: Booking[];
}

let savedLang: Language | null = null;
let savedRole: Role | null = null;
try { savedLang = localStorage.getItem('uniq-lang') as Language | null; savedRole = localStorage.getItem('uniq-role') as Role | null; } catch {}
const state: AppState = {
  lang: savedLang && ['ru','en','vi','ko'].includes(savedLang) ? savedLang : 'ru',
  role: savedRole && ['client','team','owner'].includes(savedRole) ? savedRole : 'client',
  route: 'home', selectedVehicleId: null, category: 'all', bookings: []
};

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root not found');
const appRoot: HTMLElement = root;

const money = (n: number) => new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : state.lang === 'ko' ? 'ko-KR' : state.lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(n) + ' ₫';
const esc = (s: string) => s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c));
const statusLabel = (v: Vehicle) => ({available:'Свободен', booked:'Бронь', rented:'В аренде', service:'Сервис'}[v.status]);

function vehicleArt(v: Vehicle): string {
  return `<div class="vehicle-art vehicle-art--${v.category}" role="img" aria-label="${esc(v.model)} demo visual">
    <span class="demo-badge">${t(state.lang,'demo')}</span>
    <div class="bike-silhouette" aria-hidden="true"><i></i><b></b><em></em></div>
    <strong>${esc(v.demoVisual)}</strong><small>${v.year} · ${v.category}</small>
  </div>`;
}

function shell(content: string): string {
  const roleLabels: Record<Role,string> = {client:t(state.lang,'client'), team:t(state.lang,'team'), owner:t(state.lang,'owner')};
  return `<div class="app-shell">
    <header class="topbar">
      <button class="brand" data-route="home" aria-label="UNIQ Smart Rent home"><b>UNIQ</b><span>SMART RENT</span><small>${t(state.lang,'brandSub')}</small></button>
      <div class="top-actions">
        <label class="sr-only" for="roleSelect">${t(state.lang,'switchRole')}</label>
        <select id="roleSelect" class="role-select" aria-label="${t(state.lang,'switchRole')}">
          ${(['client','team','owner'] as Role[]).map(r=>`<option value="${r}" ${state.role===r?'selected':''}>${roleLabels[r]}</option>`).join('')}
        </select>
        <div class="langs" aria-label="${t(state.lang,'language')}">${languages.map(l=>`<button data-lang="${l.id}" class="${state.lang===l.id?'is-active':''}" aria-pressed="${state.lang===l.id}">${l.label}</button>`).join('')}</div>
      </div>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <nav class="bottom-nav" aria-label="Primary">
      ${navButton('home', icons.home, t(state.lang,'home'))}
      ${navButton('catalog', icons.catalog, t(state.lang,'catalog'))}
      ${navButton('bookings', icons.calendar, t(state.lang,'bookings'))}
      ${navButton('profile', state.role==='owner'?icons.chart:icons.user, state.role==='owner'?t(state.lang,'owner'):t(state.lang,'profile'))}
    </nav>
  </div>`;
}
function navButton(route: Route, icon: string, label: string): string { return `<button data-route="${route}" class="nav-item ${state.route===route?'is-active':''}">${icon}<span>${label}</span></button>`; }

function clientHome(): string {
  const available = vehicles.filter(v=>v.status==='available').slice(0,3);
  return `<section class="hero">
    <div class="hero-copy"><span class="eyebrow">UNIQ MOTO · NHA TRANG</span><h1>${t(state.lang,'find')}</h1><p>Transport × time. Выберите даты, увидьте подходящие варианты и отправьте понятную заявку.</p></div>
    <form class="date-card" id="quickSearch"><label>${t(state.lang,'from')}<input type="date" name="from" value="2026-08-27" required></label><label>${t(state.lang,'to')}<input type="date" name="to" value="2026-08-30" required></label><button class="primary" type="submit">${t(state.lang,'find')}</button></form>
  </section>
  <section class="section"><div class="section-head"><div><span class="eyebrow">LIVE FLEET</span><h2>${t(state.lang,'available')}</h2></div><button class="text-btn" data-route="catalog">${t(state.lang,'catalog')} →</button></div><div class="vehicle-grid">${available.map(vehicleCard).join('')}</div></section>
  <section class="trust-strip"><div><b>4.9</b><span>public rating*</span></div><div><b>RU / EN / VI / KO</b><span>client path</span></div><div><b>80+</b><span>fleet scale*</span></div></section>
  <p class="source-note">*Публичные показатели взяты из материалов концепции; реальные live-данные подключаются отдельно.</p>`;
}

function teamHome(): string {
  const rented=vehicles.filter(v=>v.status==='rented').length, available=vehicles.filter(v=>v.status==='available').length;
  return `<section class="dashboard-hero"><span class="eyebrow">UNIQ / ${t(state.lang,'fleetToday').toUpperCase()}</span><h1>Одна картина по парку и событиям</h1><div class="metric-grid"><div><b>${rented}</b><span>в аренде · demo</span></div><div><b>${available}</b><span>свободно · demo</span></div><div><b>6</b><span>возвратов · concept</span></div><div><b>9</b><span>запросов · concept</span></div></div></section>
  <section class="section"><div class="section-head"><h2>${t(state.lang,'events')}</h2></div><div class="event-list">${vehicles.slice(0,4).map(v=>`<button data-vehicle="${v.id}"><span class="status status--${v.status}">${statusLabel(v)}</span><b>${esc(v.model)}</b><small>${esc(v.nextEvent)}</small></button>`).join('')}</div></section>
  <section class="section"><div class="section-head"><h2>Быстрый поиск по данным</h2></div><div class="ai-box"><span>AI / approved demo data</span><p>«Покажи свободные ADV на выходные»</p><p>«Кто возвращает сегодня?»</p></div></section>`;
}

function ownerHome(): string {
  return `<section class="dashboard-hero owner"><span class="eyebrow">OWNER VIEW</span><h1>${t(state.lang,'analytics')}</h1><div class="kpi-grid"><div><b>76%</b><span>${t(state.lang,'load')} · concept</span></div><div><b>12</b><span>${t(state.lang,'idle')} · concept</span></div><div><b>31%</b><span>${t(state.lang,'repeat')} · concept</span></div><div><b>4.8</b><span>${t(state.lang,'conversion')} · concept</span></div></div></section>
  <section class="section"><div class="section-head"><h2>Загрузка парка</h2><span class="demo-pill">DEMO DATA</span></div><div class="bars">${[['Scooter',84],['Naked',68],['Cruiser',55],['Adventure',79]].map(([n,p])=>`<div><span>${n}</span><i><b style="width:${p}%"></b></i><strong>${p}%</strong></div>`).join('')}</div></section>
  <section class="section two-col"><div class="panel"><span class="eyebrow">TRANSPORT × TIME</span><h3>Окна, которые можно продать</h3><p>X-MAX #24 · 16 часов между возвратом и следующей бронью.</p></div><div class="panel"><span class="eyebrow">REPEAT CYCLE</span><h3>Следующий спрос</h3><p>После закрытия аренды история клиента остаётся доступной для релевантного follow-up.</p></div></section>`;
}

function vehicleCard(v: Vehicle): string {
  return `<article class="vehicle-card">${vehicleArt(v)}<div class="vehicle-body"><div class="vehicle-title"><div><span class="status status--${v.status}">${statusLabel(v)}</span><h3>${esc(v.model)}</h3><small>${v.year} · ${v.category}</small></div><b>${money(v.pricePerDayVnd)}<small>/день</small></b></div><div class="tags">${v.tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="card-actions"><button class="secondary" data-vehicle="${v.id}">${t(state.lang,'details')}</button><button class="primary" data-book="${v.id}" ${isBookable(v)?'':'disabled'}>${t(state.lang,'book')}</button></div></div></article>`;
}

function catalog(): string {
  const categories: (VehicleCategory|'all')[]=['all','scooter','naked','cruiser','adventure'];
  const list = vehicles.filter(v=>state.category==='all'||v.category===state.category);
  return `<section class="page-head"><span class="eyebrow">UNIQ FLEET</span><h1>${t(state.lang,'catalog')}</h1><p>Каталог prototype-данных. Визуалы помечены как demo и не выдаются за реальные фотографии парка.</p></section><div class="chips">${categories.map(c=>`<button data-category="${c}" class="${state.category===c?'is-active':''}">${c==='all'?t(state.lang,'all'):c}</button>`).join('')}</div><section class="vehicle-grid catalog-grid">${list.map(vehicleCard).join('')}</section>`;
}

function vehicleDetail(): string {
  const v=state.selectedVehicleId?getVehicle(state.selectedVehicleId):undefined; if(!v) return catalog();
  return `<button class="back" data-route="catalog">← ${t(state.lang,'back')}</button><section class="vehicle-detail">${vehicleArt(v)}<div><span class="status status--${v.status}">${statusLabel(v)}</span><h1>${esc(v.model)}</h1><p>${esc(v.description)}</p><div class="detail-price"><b>${money(v.pricePerDayVnd)}</b><span>/ день</span></div><dl><div><dt>${t(state.lang,'deposit')}</dt><dd>$${v.depositUsd}</dd></div><div><dt>${t(state.lang,'status')}</dt><dd>${statusLabel(v)}</dd></div><div><dt>Следующее событие</dt><dd>${esc(v.nextEvent)}</dd></div></dl><div class="tags">${v.tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div><button class="primary wide" data-book="${v.id}" ${isBookable(v)?'':'disabled'}>${t(state.lang,'book')}</button></div></section>`;
}

function bookingsPage(): string {
  return `<section class="page-head"><span class="eyebrow">MY UNIQ</span><h1>${t(state.lang,'yourRental')}</h1></section>${state.bookings.length?`<div class="booking-list">${state.bookings.map(b=>{const v=getVehicle(b.vehicleId);return `<article><span class="status status--booked">${b.status}</span><h3>${esc(v?.model??b.vehicleId)}</h3><p>${b.from} → ${b.to}</p><b>${money(b.totalVnd)}</b></article>`}).join('')}</div>`:`<div class="empty"><b>${t(state.lang,'noBookings')}</b><button class="primary" data-route="catalog">${t(state.lang,'catalog')}</button></div>`}`;
}

function profile(): string {
  if(state.role==='owner') return ownerHome();
  if(state.role==='team') return teamHome();
  return `<section class="profile-card"><div class="avatar">UR</div><span class="eyebrow">MY UNIQ / RIDER</span><h1>Demo Rider</h1><p>${t(state.lang,'clientHistory')}</p><div class="profile-stats"><div><b>3</b><span>аренды · demo</span></div><div><b>2</b><span>любимые модели</span></div><div><b>RU</b><span>язык связи</span></div></div></section><section class="section"><div class="panel"><h3>Предпочтения</h3><div class="tags"><span>Maxi scooter</span><span>ABS</span><span>Delivery</span></div></div></section>`;
}

function bookingModal(v: Vehicle): string {
  return `<div class="modal-backdrop" id="bookingModal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="bookingTitle"><button class="modal-close" data-close aria-label="Close">×</button><span class="eyebrow">SMART BOOKING</span><h2 id="bookingTitle">${esc(v.model)}</h2><form id="bookingForm" data-vehicle-id="${v.id}"><div class="form-grid"><label>${t(state.lang,'from')}<input type="date" name="from" value="2026-08-27" required></label><label>${t(state.lang,'to')}<input type="date" name="to" value="2026-08-30" required></label></div><label>Имя / contact<input name="client" value="Demo Rider" required></label><div class="booking-total"><span>${t(state.lang,'total')}</span><b id="bookingTotal">${money(calculateRentalTotal(v,'2026-08-27','2026-08-30'))}</b></div><button type="submit" class="primary wide">${t(state.lang,'send')}</button><p class="source-note">Demo: финальная доступность и условия подтверждаются менеджером.</p></form></section></div>`;
}

function page(): string {
  if(state.route==='catalog') return catalog();
  if(state.route==='vehicle') return vehicleDetail();
  if(state.route==='bookings') return bookingsPage();
  if(state.route==='profile') return profile();
  if(state.role==='team') return teamHome(); if(state.role==='owner') return ownerHome(); return clientHome();
}

function render(focusMain=false): void {
  document.documentElement.lang=state.lang;
  appRoot.innerHTML=shell(page());
  bind();
  if(focusMain) document.querySelector<HTMLElement>('#main')?.focus({preventScroll:true});
}

function openBooking(id:string): void { const v=getVehicle(id); if(!v||!isBookable(v)) return; document.body.insertAdjacentHTML('beforeend',bookingModal(v)); bindModal(v); }
function bindModal(v:Vehicle): void {
  const modal=document.querySelector<HTMLElement>('#bookingModal'); const form=document.querySelector<HTMLFormElement>('#bookingForm');
  modal?.querySelector('[data-close]')?.addEventListener('click',()=>modal.remove());
  modal?.addEventListener('click',e=>{if(e.target===modal) modal.remove();});
  form?.addEventListener('input',()=>{const fd=new FormData(form); const from=String(fd.get('from')), to=String(fd.get('to')); const out=document.querySelector('#bookingTotal'); if(out) out.textContent=money(calculateRentalTotal(v,from,to));});
  form?.addEventListener('submit',e=>{e.preventDefault(); const fd=new FormData(form); state.bookings.unshift(makeDemoBooking(v,String(fd.get('from')),String(fd.get('to')),String(fd.get('client')))); modal?.remove(); state.route='bookings'; render(true); toast(t(state.lang,'success'));});
  form?.querySelector<HTMLElement>('input')?.focus();
}
function toast(text:string):void { const x=document.createElement('div'); x.className='toast'; x.textContent=text; document.body.append(x); setTimeout(()=>x.remove(),2800); }

function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach(el=>el.addEventListener('click',()=>{state.route=el.dataset.route as Route; if(state.route!=='vehicle')state.selectedVehicleId=null; render(true);}));
  document.querySelectorAll<HTMLElement>('[data-vehicle]').forEach(el=>el.addEventListener('click',()=>{state.selectedVehicleId=el.dataset.vehicle??null; state.route='vehicle'; render(true);}));
  document.querySelectorAll<HTMLElement>('[data-book]').forEach(el=>el.addEventListener('click',()=>openBooking(el.dataset.book??'')));
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach(el=>el.addEventListener('click',()=>{state.lang=el.dataset.lang as Language; try { localStorage.setItem('uniq-lang',state.lang); } catch {} render();}));
  document.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(el=>el.addEventListener('click',()=>{state.category=el.dataset.category as VehicleCategory|'all'; render();}));
  document.querySelector<HTMLSelectElement>('#roleSelect')?.addEventListener('change',e=>{state.role=(e.target as HTMLSelectElement).value as Role; try { localStorage.setItem('uniq-role',state.role); } catch {} state.route='home'; render(true);});
  document.querySelector<HTMLFormElement>('#quickSearch')?.addEventListener('submit',e=>{e.preventDefault(); state.category='all'; state.route='catalog'; render(true);});
}

window.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#bookingModal')?.remove();});
render();
