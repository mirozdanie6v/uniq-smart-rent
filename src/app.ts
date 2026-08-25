import { vehicles, getVehicle } from './domain/catalog.js';
import { businessInfo } from './domain/business.js';
import { calculatePriceBreakdown, calculateRentalTotal, canRequestBooking, canTransitionBooking, isValidDateRange, makeBookingRequest } from './domain/booking.js';
import { detectBrowserLanguage, languages, localize, t } from './domain/i18n.js';
import { submitBookingToApi } from './api/client.js';
import type { Booking, BookingStatus, Language, Role, Vehicle, VehicleCategory } from './domain/types.js';
import { icons } from './ui/icons.js';

type Route = 'home' | 'catalog' | 'bookings' | 'profile' | 'vehicle';
interface AppState {
  lang: Language;
  role: Role;
  route: Route;
  selectedVehicleId: string | null;
  category: VehicleCategory | 'all';
  from: string;
  to: string;
  bookings: Booking[];
}

interface TelegramWebAppLike {
  ready?: () => void;
  expand?: () => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (handler: () => void) => void };
}

const telegramWebApp = (window as Window & { Telegram?: { WebApp?: TelegramWebAppLike } }).Telegram?.WebApp;
telegramWebApp?.ready?.();
telegramWebApp?.expand?.();

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);
const today = new Date();
const defaultFrom = new Date(today); defaultFrom.setDate(defaultFrom.getDate() + 1);
const defaultTo = new Date(today); defaultTo.setDate(defaultTo.getDate() + 4);

let savedLang: Language | null = null;
let savedRole: Role | null = null;
try {
  savedLang = localStorage.getItem('uniq-lang') as Language | null;
  savedRole = localStorage.getItem('uniq-demo-role') as Role | null;
} catch {}

const allowedLanguages: Language[] = ['ru','en','vi','ko'];
const allowedRoles: Role[] = ['client','team','owner'];
const state: AppState = {
  lang: savedLang && allowedLanguages.includes(savedLang) ? savedLang : detectBrowserLanguage(navigator.language),
  role: savedRole && allowedRoles.includes(savedRole) ? savedRole : 'client',
  route: 'home',
  selectedVehicleId: null,
  category: 'all',
  from: isoDate(defaultFrom),
  to: isoDate(defaultTo),
  bookings: []
};

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('App root not found');
const appRoot: HTMLElement = root;

const money = (n: number): string => new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : state.lang === 'ko' ? 'ko-KR' : state.lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 0 }).format(n) + ' ₫';
const esc = (s: string): string => s.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c] ?? c));
const statusText = (status: BookingStatus): string => t(state.lang, `status_${status}`);
const managerCheck = (): string => t(state.lang, 'managerConfirmed');

function officialPhoto(v: Vehicle, index = 0, eager = false): string {
  const photo = v.photos[index] ?? v.photos[0];
  if (!photo) return `<div class="photo-fallback"><b>${esc(v.model)}</b><span>${t(state.lang,'realPhotos')}</span></div>`;
  return `<img class="vehicle-photo" src="${esc(photo.src)}" alt="${esc(localize(state.lang, photo.alt))}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" data-photo-fallback="${esc(v.model)}">`;
}

function shell(content: string): string {
  const roleLabels: Record<Role,string> = { client:t(state.lang,'client'), team:t(state.lang,'team'), owner:t(state.lang,'owner') };
  return `<div class="app-shell">
    <header class="topbar">
      <button class="brand" data-route="home" aria-label="UNIQ Smart Rent"><b>UNIQ</b><span>SMART RENT</span><small>${t(state.lang,'brandSub')}</small></button>
      <div class="top-actions">
        <div class="demo-mode"><span>DEMO</span><select id="roleSelect" class="role-select" aria-label="${t(state.lang,'mode')}">${allowedRoles.map(r=>`<option value="${r}" ${state.role===r?'selected':''}>${roleLabels[r]}</option>`).join('')}</select></div>
        <div class="langs" aria-label="Language">${languages.map(l=>`<button data-lang="${l.id}" class="${state.lang===l.id?'is-active':''}" aria-pressed="${state.lang===l.id}">${l.label}</button>`).join('')}</div>
      </div>
    </header>
    <main id="main" tabindex="-1">${content}</main>
    <nav class="bottom-nav" aria-label="Primary">
      ${navButton('home', icons.home, t(state.lang,'home'))}
      ${navButton('catalog', icons.catalog, t(state.lang,'catalog'))}
      ${navButton('bookings', icons.calendar, t(state.lang,'bookings'))}
      ${navButton('profile', icons.user, t(state.lang,'profile'))}
    </nav>
  </div>`;
}

function navButton(route: Route, icon: string, label: string): string {
  return `<button data-route="${route}" class="nav-item ${state.route===route?'is-active':''}">${icon}<span>${label}</span></button>`;
}

function dateForm(): string {
  return `<form class="date-card" id="quickSearch">
    <label>${t(state.lang,'from')}<input type="date" name="from" min="${isoDate(today)}" value="${state.from}" required></label>
    <label>${t(state.lang,'to')}<input type="date" name="to" min="${state.from}" value="${state.to}" required></label>
    <button class="primary" type="submit">${t(state.lang,'search')}</button>
  </form>`;
}

function clientHome(): string {
  return `<section class="hero">
    <div class="hero-copy"><span class="eyebrow">${t(state.lang,'official')}</span><h1>${t(state.lang,'find')}</h1><p>${t(state.lang,'sourceNote')}</p></div>
    ${dateForm()}
  </section>
  <section class="trust-strip">
    <div><b>${businessInfo.publicRating}</b><span>${t(state.lang,'publicRating')} · ${businessInfo.publicReviewCount}</span></div>
    <div><b>${businessInfo.publicFleetCount}</b><span>${t(state.lang,'publicFleet')}</span></div>
    <div><b>2</b><span>${t(state.lang,'twoBranches')}</span></div>
  </section>
  <section class="section"><div class="section-head"><div><span class="eyebrow">${t(state.lang,'realData')}</span><h2>${t(state.lang,'featured')}</h2></div><button class="text-btn" data-route="catalog">${t(state.lang,'catalog')} →</button></div><div class="vehicle-grid">${vehicles.slice(0,3).map(vehicleCard).join('')}</div></section>
  <section class="source-panel"><b>${t(state.lang,'updated')}: ${businessInfo.verifiedAt}</b><span>${t(state.lang,'sourceNote')}</span><a href="${businessInfo.website}" target="_blank" rel="noreferrer">${t(state.lang,'officialSite')} ↗</a></section>`;
}

function vehicleCard(v: Vehicle): string {
  return `<article class="vehicle-card">
    <button class="vehicle-media" data-title="${esc(v.brand)} ${esc(v.model)}" data-vehicle="${v.id}" aria-label="${t(state.lang,'details')} ${esc(v.model)}">${officialPhoto(v)}<span class="verified-badge">${t(state.lang,'verified')} · ${v.verifiedAt}</span></button>
    <div class="vehicle-body">
      <div class="vehicle-title"><div><span class="availability-pill">${managerCheck()}</span><h3>${esc(v.brand)} ${esc(v.model)}</h3><small>${v.year} · ${esc(v.engineLabel)} · ${t(state.lang,v.category)}</small></div><b>${money(v.pricing.dailyVnd)}<small>/${t(state.lang,'daily').toLowerCase()}</small></b></div>
      <div class="tags">${v.tags.map(tag=>`<span>${esc(tag)}</span>`).join('')}</div>
      <div class="rate-row"><span>${t(state.lang,'weekly')} <b>${money(v.pricing.weeklyVnd)}</b></span><span>${t(state.lang,'monthly')} <b>${money(v.pricing.monthlyVnd)}</b></span></div>
      <div class="card-actions"><button class="secondary" data-vehicle="${v.id}">${t(state.lang,'details')}</button><button class="primary" data-book="${v.id}">${t(state.lang,'request')}</button></div>
    </div>
  </article>`;
}

function catalog(): string {
  const categories: Array<VehicleCategory|'all'> = ['all','scooter','naked','cruiser','sport'];
  const list = vehicles.filter(v => state.category === 'all' || v.category === state.category);
  return `<section class="page-head"><span class="eyebrow">${t(state.lang,'realPhotos')} · ${t(state.lang,'publishedRates')}</span><h1>${t(state.lang,'catalog')}</h1><p>${t(state.lang,'sourceNote')}</p>${dateForm()}</section>
    <div class="chips">${categories.map(c=>`<button data-category="${c}" class="${state.category===c?'is-active':''}">${t(state.lang,c)}</button>`).join('')}</div>
    <section class="vehicle-grid catalog-grid">${list.map(vehicleCard).join('')}</section>`;
}

function rateTable(v: Vehicle): string {
  return `<div class="rate-table"><div><span>${t(state.lang,'daily')}</span><b>${money(v.pricing.dailyVnd)}</b></div><div><span>${t(state.lang,'weekly')}</span><b>${money(v.pricing.weeklyVnd)}</b></div><div><span>${t(state.lang,'monthly')}</span><b>${money(v.pricing.monthlyVnd)}</b></div><div><span>${t(state.lang,'deposit')}</span><b>$${v.pricing.depositUsd}</b></div></div>`;
}

function vehicleDetail(): string {
  const v = state.selectedVehicleId ? getVehicle(state.selectedVehicleId) : undefined;
  if (!v) return catalog();
  const gallery = v.photos.map((_, index)=>`<button class="gallery-thumb ${index===0?'is-active':''}" data-gallery="${v.id}" data-gallery-index="${index}">${officialPhoto(v,index,index===0)}</button>`).join('');
  return `<button class="back" data-route="catalog">← ${t(state.lang,'back')}</button>
    <section class="vehicle-detail">
      <div class="detail-gallery"><div class="detail-main-photo">${officialPhoto(v,0,true)}<button class="expand-photo" data-gallery="${v.id}" data-gallery-index="0">↗</button></div>${v.photos.length>1?`<div class="gallery-strip">${gallery}</div>`:''}</div>
      <div class="detail-copy"><span class="availability-pill">${managerCheck()}</span><h1>${esc(v.brand)} ${esc(v.model)}</h1><p>${esc(localize(state.lang,v.descriptions))}</p>${rateTable(v)}
        <h3>${t(state.lang,'specifications')}</h3><dl class="specs"><div><dt>${t(state.lang,'engine')}</dt><dd>${esc(v.engineLabel)}</dd></div><div><dt>${t(state.lang,'weight')}</dt><dd>${v.weightKg} kg</dd></div><div><dt>${t(state.lang,'speed')}</dt><dd>${esc(v.cruiseSpeed)}</dd></div><div><dt>${t(state.lang,'fuel')}</dt><dd>${esc(v.fuelUse)}</dd></div><div><dt>${t(state.lang,'capacity')}</dt><dd>${esc(v.capacity)}</dd></div></dl>
        <div class="detail-lists"><div><h3>${t(state.lang,'included')}</h3><ul>${v.included.map(item=>`<li>${esc(localize(state.lang,item))}</li>`).join('')}</ul></div><div><h3>${t(state.lang,'requirements')}</h3><ul>${v.requirements.map(item=>`<li>${esc(localize(state.lang,item))}</li>`).join('')}</ul></div></div>
        <div class="estimate-box"><span>${t(state.lang,'estimate')} · ${state.from} → ${state.to}</span><b>${money(calculateRentalTotal(v,state.from,state.to))}</b><small>${t(state.lang,'finalPrice')}</small></div>
        <button class="primary wide" data-book="${v.id}" ${canRequestBooking(v)?'':'disabled'}>${t(state.lang,'request')}</button>
        <a class="official-link" href="${v.sourceUrl}" target="_blank" rel="noreferrer">${t(state.lang,'source')}: uniqmoto.com ↗</a>
      </div>
    </section>`;
}

function managerMessage(booking: Booking, v: Vehicle): string {
  return `UNIQ Smart Rent\n${v.brand} ${v.model}\n${booking.from} → ${booking.to}\n${booking.client}\n${booking.contact}\n${booking.deliveryLocation ? `Handover: ${booking.deliveryLocation}\n` : ''}Estimate: ${money(booking.estimatedTotalVnd)}\n${booking.note}`.trim();
}

function bookingActions(booking: Booking, v: Vehicle): string {
  const message = encodeURIComponent(managerMessage(booking,v));
  return `<div class="manager-actions"><a class="primary" href="${businessInfo.whatsappUrl}?text=${message}" target="_blank" rel="noreferrer">${t(state.lang,'whatsapp')}</a><a class="secondary" href="${businessInfo.telegramUrl}" target="_blank" rel="noreferrer">${t(state.lang,'telegram')}</a></div>`;
}

function bookingsPage(): string {
  return `<section class="page-head"><span class="eyebrow">MY UNIQ</span><h1>${t(state.lang,'currentRequests')}</h1><p>${t(state.lang,'sessionOnly')}</p></section>${state.bookings.length ? `<div class="booking-list">${state.bookings.map(b=>{const v=getVehicle(b.vehicleId); if(!v) return ''; return `<article><div class="booking-head"><span class="status-chip">${statusText(b.status)}</span><span>${b.persistence==='d1'?'D1':'SESSION'}</span></div><h3>${esc(v.brand)} ${esc(v.model)}</h3><p>${b.from} → ${b.to}</p><b>${money(b.estimatedTotalVnd)}</b><small>${t(state.lang,'finalPrice')}</small>${bookingActions(b,v)}</article>`;}).join('')}</div>` : `<div class="empty"><b>${t(state.lang,'noBookings')}</b><button class="primary" data-route="catalog">${t(state.lang,'catalog')}</button></div>`}`;
}

function contactsPage(): string {
  return `<section class="page-head"><span class="eyebrow">${t(state.lang,'official')}</span><h1>${t(state.lang,'business')}</h1><p>${t(state.lang,'sourceNote')}</p></section>
    <section class="contact-grid"><div class="contact-card"><span>${t(state.lang,'phone')}</span><a href="tel:${businessInfo.phone}">${businessInfo.phoneDisplay}</a><div class="manager-actions"><a class="primary" href="${businessInfo.whatsappUrl}" target="_blank" rel="noreferrer">${t(state.lang,'whatsapp')}</a><a class="secondary" href="${businessInfo.telegramUrl}" target="_blank" rel="noreferrer">${t(state.lang,'telegram')} ${businessInfo.telegramHandle}</a></div></div>${businessInfo.branches.map(branch=>`<div class="contact-card"><span>${localize(state.lang,branch.name)}</span><b>${esc(branch.address)}</b><a class="official-link" href="${branch.mapsUrl}" target="_blank" rel="noreferrer">${t(state.lang,'directions')} ↗</a></div>`).join('')}</section>
    <section class="review-photo-grid">${['review2.webp','review8.webp','review5.webp'].map((name,index)=>`<img src="https://uniqmoto.com/assets/review/${name}" alt="UNIQ Moto Nha Trang ${index+1}" loading="lazy" decoding="async">`).join('')}</section>`;
}

function teamHome(): string {
  const open = state.bookings.filter(b=>!['cancelled','completed'].includes(b.status));
  return `<section class="dashboard-hero"><span class="eyebrow">${t(state.lang,'team')}</span><h1>${t(state.lang,'operations')}</h1><p>${t(state.lang,'privateDemo')}</p><div class="metric-grid"><div><b>${open.length}</b><span>${t(state.lang,'newRequests')} · session</span></div><div><b>${businessInfo.publicFleetCount}</b><span>${t(state.lang,'publishedFleet')}</span></div><div><b>—</b><span>${t(state.lang,'liveUnavailable')}</span></div></div></section>
    <section class="section"><div class="section-head"><h2>${t(state.lang,'currentRequests')}</h2></div>${open.length?`<div class="event-list">${open.map(b=>teamBookingRow(b)).join('')}</div>`:`<div class="panel"><p>${t(state.lang,'noBookings')}</p></div>`}</section>
    <section class="section"><div class="panel backend-panel"><span class="eyebrow">${t(state.lang,'backendReady')}</span><h3>Worker API + D1 schema</h3><p>${t(state.lang,'backendText')}</p></div></section>`;
}

function teamBookingRow(b: Booking): string {
  const v=getVehicle(b.vehicleId); if(!v) return '';
  const next: BookingStatus | null = b.status==='new'?'contacted':b.status==='contacted'?'awaiting_confirmation':b.status==='awaiting_confirmation'?'confirmed':b.status==='confirmed'?'vehicle_issued':b.status==='vehicle_issued'?'active':b.status==='active'?'returned':b.status==='returned'?'completed':null;
  return `<article class="team-row"><div><span class="status-chip">${statusText(b.status)}</span><h3>${esc(v.model)}</h3><p>${esc(b.client)} · ${b.from} → ${b.to}</p></div>${next&&canTransitionBooking(b.status,next)?`<button class="secondary" data-booking-id="${b.id}" data-next-status="${next}">${statusText(next)} →</button>`:''}</article>`;
}

function ownerHome(): string {
  const total = state.bookings.length;
  const confirmed = state.bookings.filter(b=>['confirmed','vehicle_issued','active','return_due','returned','completed'].includes(b.status)).length;
  return `<section class="dashboard-hero owner"><span class="eyebrow">${t(state.lang,'owner')}</span><h1>${t(state.lang,'analytics')}</h1><p>${t(state.lang,'analyticsPending')}</p><div class="kpi-grid"><div><b>${businessInfo.publicFleetCount}</b><span>${t(state.lang,'publishedFleet')}</span></div><div><b>${total}</b><span>${t(state.lang,'newRequests')} · session</span></div><div><b>${confirmed}</b><span>${t(state.lang,'status_confirmed')} · session</span></div><div><b>—</b><span>${t(state.lang,'noFakeMetrics')}</span></div></div></section>
    <section class="section two-col"><div class="panel"><span class="eyebrow">TRANSPORT × TIME</span><h3>D1 availability</h3><p>${t(state.lang,'backendText')}</p></div><div class="panel"><span class="eyebrow">DATA QUALITY</span><h3>${t(state.lang,'realData')}</h3><p>${t(state.lang,'sourceNote')}</p></div></section>`;
}

function bookingModal(v: Vehicle): string {
  const estimate = calculatePriceBreakdown(v,state.from,state.to);
  return `<div class="modal-backdrop" id="bookingModal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="bookingTitle"><button class="modal-close" data-close aria-label="${t(state.lang,'close')}">×</button><span class="eyebrow">SMART BOOKING · ${managerCheck()}</span><h2 id="bookingTitle">${esc(v.brand)} ${esc(v.model)}</h2><form id="bookingForm" data-vehicle-id="${v.id}">
    <div class="form-grid"><label>${t(state.lang,'from')}<input type="date" name="from" min="${isoDate(today)}" value="${state.from}" required></label><label>${t(state.lang,'to')}<input type="date" name="to" min="${state.from}" value="${state.to}" required></label></div>
    <label>${t(state.lang,'clientName')}<input name="client" autocomplete="name" required></label><label>${t(state.lang,'contact')}<input name="contact" autocomplete="tel" required></label>
    <label>${t(state.lang,'channel')}<select name="channel"><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="phone">${t(state.lang,'call')}</option><option value="other">Other</option></select></label>
    <label>${t(state.lang,'delivery')}<input name="deliveryLocation" autocomplete="street-address"></label><label>${t(state.lang,'note')}<textarea name="note" rows="3"></textarea></label>
    <label class="consent"><input type="checkbox" name="consent" required><span>${t(state.lang,'privacy')}</span></label>
    <div class="booking-total"><div><span>${t(state.lang,'total')}</span><small>${estimate.days} days · ${t(state.lang,'priceEstimate')}</small></div><b id="bookingTotal">${money(estimate.totalVnd)}</b></div>
    <button type="submit" class="primary wide">${t(state.lang,'sendRequest')}</button><p class="source-note">${t(state.lang,'finalPrice')}</p>
  </form></section></div>`;
}

function galleryModal(v: Vehicle, index: number): string {
  const safeIndex = Math.max(0, Math.min(index, v.photos.length - 1));
  const photo = v.photos[safeIndex]; if(!photo) return '';
  return `<div class="modal-backdrop gallery-modal" id="galleryModal"><section class="gallery-view" role="dialog" aria-modal="true"><button class="modal-close" data-gallery-close aria-label="${t(state.lang,'close')}">×</button>${officialPhoto(v,safeIndex,true)}<div class="gallery-caption"><b>${esc(v.brand)} ${esc(v.model)}</b><span>${safeIndex+1}/${v.photos.length}</span></div>${v.photos.length>1?`<div class="gallery-nav"><button data-gallery="${v.id}" data-gallery-index="${(safeIndex-1+v.photos.length)%v.photos.length}">←</button><button data-gallery="${v.id}" data-gallery-index="${(safeIndex+1)%v.photos.length}">→</button></div>`:''}</section></div>`;
}

function page(): string {
  if(state.role==='team' && state.route==='home') return teamHome();
  if(state.role==='owner' && state.route==='home') return ownerHome();
  if(state.route==='catalog') return catalog();
  if(state.route==='vehicle') return vehicleDetail();
  if(state.route==='bookings') return bookingsPage();
  if(state.route==='profile') return contactsPage();
  return clientHome();
}

function render(focusMain=false): void {
  document.documentElement.lang = state.lang;
  appRoot.innerHTML = shell(page());
  bind();
  syncTelegramBackButton();
  if(focusMain) document.querySelector<HTMLElement>('#main')?.focus({preventScroll:true});
}

function showToast(message: string): void {
  document.querySelector('.toast')?.remove();
  document.body.insertAdjacentHTML('beforeend',`<div class="toast" role="status">${esc(message)}</div>`);
  window.setTimeout(()=>document.querySelector('.toast')?.remove(),2600);
}

function openBooking(id: string): void {
  const v=getVehicle(id); if(!v) return;
  document.body.insertAdjacentHTML('beforeend',bookingModal(v));
  bindModal(v);
}

function bindModal(v: Vehicle): void {
  const modal=document.querySelector<HTMLElement>('#bookingModal');
  const form=document.querySelector<HTMLFormElement>('#bookingForm');
  if(!modal||!form) return;
  modal.querySelector('[data-close]')?.addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',event=>{ if(event.target===modal) modal.remove(); });
  const updateEstimate=():void=>{
    const data=new FormData(form), from=String(data.get('from')??''), to=String(data.get('to')??'');
    const out=document.querySelector<HTMLElement>('#bookingTotal');
    if(!out) return;
    out.textContent=isValidDateRange(from,to)?money(calculateRentalTotal(v,from,to)):t(state.lang,'dateError');
  };
  form.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(input=>input.addEventListener('change',updateEstimate));
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const data=new FormData(form), from=String(data.get('from')??''), to=String(data.get('to')??'');
    if(!isValidDateRange(from,to)){ showToast(t(state.lang,'dateError')); return; }
    const booking=makeBookingRequest(v,from,to,{
      client:String(data.get('client')??''), contact:String(data.get('contact')??''), channel:String(data.get('channel')??'other') as Booking['channel'], deliveryLocation:String(data.get('deliveryLocation')??''), note:String(data.get('note')??'')
    });
    const api=await submitBookingToApi({ vehicleId:v.id, from, to, client:booking.client, contact:booking.contact, channel:booking.channel, deliveryLocation:booking.deliveryLocation, note:booking.note });
    if(api.persisted){ booking.persistence='d1'; if(api.bookingId) booking.id=api.bookingId; }
    state.bookings.unshift(booking); state.from=from; state.to=to; state.route='bookings';
    modal.remove(); render(true); showToast(`${t(state.lang,'requestCreated')} · ${api.persisted?'D1':'manager flow'}`);
  });
}

function openGallery(vehicleId: string, index: number): void {
  const existing=document.querySelector('#galleryModal'); existing?.remove();
  const v=getVehicle(vehicleId); if(!v) return;
  document.body.insertAdjacentHTML('beforeend',galleryModal(v,index));
  document.querySelector('[data-gallery-close]')?.addEventListener('click',()=>document.querySelector('#galleryModal')?.remove());
  document.querySelector('#galleryModal')?.addEventListener('click',event=>{ if(event.target===document.querySelector('#galleryModal')) document.querySelector('#galleryModal')?.remove(); });
  document.querySelectorAll<HTMLElement>('#galleryModal [data-gallery]').forEach(button=>button.addEventListener('click',()=>openGallery(button.dataset.gallery??'',Number(button.dataset.galleryIndex??0))));
}

function updateBookingStatus(id:string,status:BookingStatus):void {
  const booking=state.bookings.find(item=>item.id===id); if(!booking||!canTransitionBooking(booking.status,status)) return;
  booking.status=status; render(true);
}

function bind(): void {
  document.querySelectorAll<HTMLElement>('[data-route]').forEach(button=>button.addEventListener('click',()=>{ state.route=button.dataset.route as Route; if(state.route!=='vehicle') state.selectedVehicleId=null; render(true); }));
  document.querySelectorAll<HTMLElement>('[data-vehicle]').forEach(button=>button.addEventListener('click',()=>{ state.selectedVehicleId=button.dataset.vehicle??null; state.route='vehicle'; render(true); }));
  document.querySelectorAll<HTMLElement>('[data-book]').forEach(button=>button.addEventListener('click',()=>openBooking(button.dataset.book??'')));
  document.querySelectorAll<HTMLElement>('[data-category]').forEach(button=>button.addEventListener('click',()=>{ state.category=button.dataset.category as VehicleCategory|'all'; render(); }));
  document.querySelectorAll<HTMLElement>('[data-lang]').forEach(button=>button.addEventListener('click',()=>{ const lang=button.dataset.lang as Language; if(!allowedLanguages.includes(lang))return; state.lang=lang; try{localStorage.setItem('uniq-lang',lang);}catch{} render(); }));
  document.querySelector<HTMLSelectElement>('#roleSelect')?.addEventListener('change',event=>{ const role=(event.currentTarget as HTMLSelectElement).value as Role; if(!allowedRoles.includes(role))return; state.role=role; state.route='home'; try{localStorage.setItem('uniq-demo-role',role);}catch{} render(true); });
  document.querySelectorAll<HTMLElement>('[data-gallery]').forEach(button=>button.addEventListener('click',event=>{ event.preventDefault(); openGallery(button.dataset.gallery??'',Number(button.dataset.galleryIndex??0)); }));
  document.querySelectorAll<HTMLElement>('[data-next-status]').forEach(button=>button.addEventListener('click',()=>updateBookingStatus(button.dataset.bookingId??'',button.dataset.nextStatus as BookingStatus)));
  document.querySelectorAll<HTMLImageElement>('img[data-photo-fallback]').forEach(img=>img.addEventListener('error',()=>{ const parent=img.parentElement; if(!parent)return; img.remove(); parent.insertAdjacentHTML('afterbegin',`<div class="photo-fallback"><b>${esc(img.dataset.photoFallback??'UNIQ')}</b><span>${t(state.lang,'realPhotos')}</span></div>`); },{once:true}));
  const quick=document.querySelector<HTMLFormElement>('#quickSearch'); quick?.addEventListener('submit',event=>{ event.preventDefault(); const data=new FormData(quick), from=String(data.get('from')??''), to=String(data.get('to')??''); if(!isValidDateRange(from,to)){showToast(t(state.lang,'dateError'));return;} state.from=from;state.to=to;state.route='catalog';render(true); });
  quick?.querySelector<HTMLInputElement>('input[name="from"]')?.addEventListener('change',event=>{ const value=(event.currentTarget as HTMLInputElement).value; const to=quick.querySelector<HTMLInputElement>('input[name="to"]'); if(to)to.min=value; });
}

function syncTelegramBackButton(): void {
  if(!telegramWebApp?.BackButton) return;
  if(state.route==='home') telegramWebApp.BackButton.hide(); else telegramWebApp.BackButton.show();
}
telegramWebApp?.BackButton?.onClick(()=>{ if(state.route==='vehicle') state.route='catalog'; else state.route='home'; state.selectedVehicleId=null; render(true); });

render();
