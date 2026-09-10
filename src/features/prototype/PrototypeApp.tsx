import { FormEvent, useEffect, useMemo, useState } from 'react';
import { OwnerFleetManager } from '../fleet/OwnerFleetManager';
import { OwnerBookingCalendar } from '../bookings/OwnerBookingCalendar';
import { PaymentCheckout } from '../payments/PaymentCheckout';
import { OwnerCRM } from '../crm/OwnerCRM';
import { OwnerTeamBranches } from '../team/OwnerTeamBranches';
import { OwnerFinance } from '../finance/OwnerFinance';
import { OwnerService } from '../service/OwnerService';
import { OwnerMarketing } from '../marketing/OwnerMarketing';
import { OwnerAnalytics } from '../analytics/OwnerAnalytics';
import { RequestDetailModal } from '../requests/RequestDetailModal';
import { VehicleModelDetails } from '../fleet/VehicleModelDetails';
import { fetchFleetOverrides } from '../../api/ownerFleet';
import { createPersistedBooking, extendPersistedBooking, PaymentProvider, PaymentPurpose, updatePersistedBookingStatus } from '../../api/payments';
import { activeOperationalFleet, FleetState, ManagedFleetVehicle as FleetVehicle, mergeFleetOverrides, normalizeBaseVehicle, publicFleet as selectPublicFleet, VehicleType } from '../fleet/fleetManagement';

type Role = 'client' | 'employee' | 'owner';
type ClientRoute = 'home' | 'catalog' | 'requests' | 'contacts';
type EmployeeRoute = 'dashboard' | 'requests' | 'fleet' | 'calendar' | 'handover';
type OwnerRoute = 'overview' | 'requests' | 'fleet' | 'calendar' | 'customers' | 'team' | 'finance' | 'service' | 'marketing' | 'analytics';
type Route = ClientRoute | EmployeeRoute | OwnerRoute;
type RequestStatus = 'new' | 'contacted' | 'confirmed' | 'issued' | 'active' | 'return_due' | 'returned' | 'completed' | 'cancelled';

interface RentalRequest {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  contact: string;
  status: RequestStatus;
  estimate: number;
  createdAt: string;
  backendBookingId?: string;
  paymentStatus?: 'unpaid' | 'pending' | 'partially_paid' | 'paid';
  paymentId?: string;
  paymentProvider?: PaymentProvider;
  paidVnd?: number;
  branchId?: string;
  sourceChannel?: string;
  demoBusiness?: boolean;
}

declare global {
  interface Window {
    UNIQ_FLEET?: FleetVehicle[];
    Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } };
  }
}

const roleLabels: Record<Role, string> = { client: 'Клиент', employee: 'Сотрудник', owner: 'Владелец' };
const nav: Record<Role, ReadonlyArray<readonly [Route, string]>> = {
  client: [['home','Главная'],['catalog','Каталог'],['requests','MY UNIQ'],['contacts','Контакты']],
  employee: [['dashboard','Рабочий стол'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь'],['handover','Выдачи']],
  owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь'],['customers','Клиенты'],['team','Команда'],['finance','Финансы'],['service','Сервис'],['marketing','Маркетинг'],['analytics','Аналитика']],
};

const requestKey = 'uniq-demo-requests-v4-stage12';
const fleetStateKey = 'uniq-demo-fleet-state-v2';
const roleKey = 'uniq-role-v2';

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistSession<T>(key: string, value: T) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const money = (value?: number) => value ? `${new Intl.NumberFormat('ru-RU').format(value)} ₫` : 'уточнить';
const dateISO = (date: Date) => date.toISOString().slice(0, 10);
const today = new Date();
const fromDefaultDate = new Date(today); fromDefaultDate.setDate(fromDefaultDate.getDate() + 1);
const toDefaultDate = new Date(today); toDefaultDate.setDate(toDefaultDate.getDate() + 4);
const defaultFrom = dateISO(fromDefaultDate);
const defaultTo = dateISO(toDefaultDate);


function shiftedDay(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateISO(date);
}

function shiftedCreated(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
}

function buildDemoBusinessRequests(): RentalRequest[] {
  type DemoRow = {
    id: string; vehicleId: string; from: number; to: number; client: string; contact: string; status: RequestStatus;
    estimate: number; createdHoursAgo: number; paymentStatus: NonNullable<RentalRequest['paymentStatus']>;
    branchId: 'branch-north' | 'branch-center'; sourceChannel: string; provider?: PaymentProvider;
  };
  const rows: DemoRow[] = [
    { id:'demo-ui-01',vehicleId:'hyundai-elantra-2025-74404',from:1,to:3,client:'Анна Крылова',contact:'@anna_demo',status:'new',estimate:4050000,createdHoursAgo:1,paymentStatus:'unpaid',branchId:'branch-center',sourceChannel:'telegram_mini_app' },
    { id:'demo-ui-02',vehicleId:'kia-sorento-2023-74401',from:2,to:5,client:'Nguyễn Minh Anh',contact:'Zalo · demo02',status:'new',estimate:7800000,createdHoursAgo:3,paymentStatus:'unpaid',branchId:'branch-north',sourceChannel:'website' },
    { id:'demo-ui-03',vehicleId:'mazda-cx-5-2022-74405',from:1,to:3,client:'Алексей Морозов',contact:'@alex_demo',status:'new',estimate:4350000,createdHoursAgo:5,paymentStatus:'pending',branchId:'branch-center',sourceChannel:'google' },
    { id:'demo-ui-04',vehicleId:'toyota-yaris-cross-2025-74402',from:3,to:4,client:'Kim Min-ji',contact:'@minji_demo',status:'new',estimate:2800000,createdHoursAgo:7,paymentStatus:'pending',branchId:'branch-north',sourceChannel:'instagram' },
    { id:'demo-ui-05',vehicleId:'yamaha-x-max-2024-76826',from:1,to:4,client:'Chen Wei',contact:'WeChat · demo05',status:'confirmed',estimate:7200000,createdHoursAgo:10,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'telegram_mini_app',provider:'vietqr' },
    { id:'demo-ui-06',vehicleId:'honda-pcx-150cc-2022-73073',from:2,to:5,client:'Мария Лебедева',contact:'@maria_demo',status:'confirmed',estimate:2200000,createdHoursAgo:24,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'qr',provider:'momo' },
    { id:'demo-ui-07',vehicleId:'honda-cb500x-2023-73325',from:0,to:2,client:'Sergey Volkov',contact:'@sergey_demo',status:'issued',estimate:7500000,createdHoursAgo:28,paymentStatus:'paid',branchId:'branch-north',sourceChannel:'office' },
    { id:'demo-ui-08',vehicleId:'honda-cb650r-2022-73228',from:-1,to:3,client:'Olga Petrova',contact:'@olga_demo',status:'active',estimate:12500000,createdHoursAgo:48,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'telegram_mini_app',provider:'vnpay' },
    { id:'demo-ui-09',vehicleId:'honda-cbr-150cc-2021-76481',from:-2,to:1,client:'Park Ji-hoon',contact:'@jihoon_demo',status:'active',estimate:2800000,createdHoursAgo:72,paymentStatus:'paid',branchId:'branch-north',sourceChannel:'partner',provider:'sbp' },
    { id:'demo-ui-10',vehicleId:'honda-pcx-150cc-2022-73073',from:-5,to:0,client:'Trần Thu Hà',contact:'Zalo · demo10',status:'return_due',estimate:3850000,createdHoursAgo:96,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'office',provider:'zalopay' },
    { id:'demo-ui-11',vehicleId:'honda-pcx-125cc-2018-76169',from:-7,to:-1,client:'Dmitry Orlov',contact:'@orlov_demo',status:'returned',estimate:3150000,createdHoursAgo:120,paymentStatus:'paid',branchId:'branch-north',sourceChannel:'qr',provider:'vietqr' },
    { id:'demo-ui-12',vehicleId:'hyundai-elantra-2025-74404',from:-8,to:-5,client:'Emily Carter',contact:'email-demo-12',status:'completed',estimate:5400000,createdHoursAgo:144,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'telegram_mini_app',provider:'yookassa' },
    { id:'demo-ui-13',vehicleId:'mazda-cx-5-2022-74405',from:-10,to:-7,client:'Ирина Соколова',contact:'@irina_demo',status:'completed',estimate:5800000,createdHoursAgo:192,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'website',provider:'vietqr' },
    { id:'demo-ui-14',vehicleId:'kia-sorento-2023-74401',from:-14,to:-11,client:'Lê Quốc Bảo',contact:'Zalo · demo14',status:'completed',estimate:7800000,createdHoursAgo:288,paymentStatus:'paid',branchId:'branch-north',sourceChannel:'google',provider:'tbank' },
    { id:'demo-ui-15',vehicleId:'toyota-yaris-cross-2025-74402',from:1,to:2,client:'Максим Беляев',contact:'@max_demo',status:'cancelled',estimate:2800000,createdHoursAgo:51,paymentStatus:'unpaid',branchId:'branch-north',sourceChannel:'website' },
    { id:'demo-ui-16',vehicleId:'honda-cb500x-2023-73325',from:5,to:9,client:'Sofia Ivanova',contact:'@sofia_demo',status:'new',estimate:12500000,createdHoursAgo:54,paymentStatus:'unpaid',branchId:'branch-north',sourceChannel:'partner' },
    { id:'demo-ui-17',vehicleId:'honda-pcx-150cc-2022-73073',from:3,to:5,client:'Lee Soo-jin',contact:'@soojin_demo',status:'new',estimate:1650000,createdHoursAgo:74,paymentStatus:'pending',branchId:'branch-center',sourceChannel:'qr' },
    { id:'demo-ui-18',vehicleId:'yamaha-x-max-2024-76826',from:2,to:5,client:'Pavel Smirnov',contact:'@pavel_demo',status:'confirmed',estimate:7200000,createdHoursAgo:96,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'telegram_mini_app',provider:'vietqr' },
    { id:'demo-ui-19',vehicleId:'toyota-yaris-cross-2025-74402',from:-3,to:2,client:'Vũ Hoàng Nam',contact:'Zalo · demo19',status:'active',estimate:8400000,createdHoursAgo:144,paymentStatus:'paid',branchId:'branch-north',sourceChannel:'website',provider:'vnpay' },
    { id:'demo-ui-20',vehicleId:'hyundai-elantra-2025-74404',from:-22,to:-18,client:'Елена Кузнецова',contact:'@elena_demo',status:'completed',estimate:6750000,createdHoursAgo:480,paymentStatus:'paid',branchId:'branch-center',sourceChannel:'office' },
  ];
  return rows.map((row) => ({
    id:row.id, vehicleId:row.vehicleId, from:shiftedDay(row.from), to:shiftedDay(row.to), client:row.client, contact:row.contact,
    status:row.status, estimate:row.estimate, createdAt:shiftedCreated(row.createdHoursAgo), paymentStatus:row.paymentStatus,
    branchId:row.branchId, sourceChannel:row.sourceChannel, demoBusiness:true,
    ...(row.provider ? { paymentProvider:row.provider } : {}),
  }));
}

function publishedEstimate(vehicle: FleetVehicle, from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  let days = Math.max(1, Math.floor((b.getTime() - a.getTime()) / 86_400_000));
  let total = 0;
  const month = vehicle.monthlyVnd ?? 0;
  const week = vehicle.weeklyVnd ?? 0;
  const day = vehicle.dailyVnd ?? 0;
  if (month > 0) { const count = Math.floor(days / 30); total += count * month; days -= count * 30; }
  if (week > 0) { const count = Math.floor(days / 7); total += count * week; days -= count * 7; }
  total += days * day;
  return total;
}

const typeLabel = (type: VehicleType) => type === 'car' ? 'Авто' : type === 'scooter' ? 'Скутер' : 'Мотоцикл';
const stateLabel = (state: FleetState) => ({ manager:'Подтверждает менеджер', ready:'Готов к выдаче', service:'В сервисе', hold:'Резерв' })[state];
const statusText = (status: RequestStatus) => ({ new:'Новая', contacted:'Новая', confirmed:'Подтверждена', issued:'Выдана', active:'В аренде', return_due:'Возврат сегодня', returned:'Возвращена', completed:'Завершена', cancelled:'Отменена' })[status];
const paymentStatusText = (status?: RentalRequest['paymentStatus']) => ({ unpaid:'Ожидает оплаты', pending:'Платёж создан', partially_paid:'Предоплата внесена', paid:'Оплачено' } as const)[status ?? 'unpaid'];
const icon = (route: Route) => ({home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉',calendar:'▥',customers:'♙',team:'♟',finance:'₫',service:'⚙',marketing:'✦',analytics:'▥'} as Partial<Record<Route,string>>)[route] ?? '•';

function Hero({ label, title, text, aside }: { label: string; title: string; text: string; aside?: React.ReactNode }) {
  return <section className="hero"><div><span className="eyebrow">{label}</span><h1>{title}</h1><p>{text}</p></div>{aside}</section>;
}

function Metric({ label, value, sub, onClick, target }: { label: string; value: React.ReactNode; sub?: string; onClick?: () => void; target?: string }) {
  const content = <><span>{label}</span><b>{value}</b>{sub ? <small>{sub}</small> : null}</>;
  return onClick ? <button type="button" className="metric metric-link" data-metric-target={target} onClick={onClick}>{content}</button> : <div className="metric">{content}</div>;
}

function VehiclePhoto({ vehicle, index = 0 }: { vehicle: FleetVehicle; index?: number }) {
  const src = vehicle.photos?.[index] ?? vehicle.photos?.[0];
  if (!src) return null;
  return <img src={src} alt={vehicle.title} loading="lazy" decoding="async" onError={(event) => {
    const target = event.currentTarget;
    target.remove();
    target.parentElement?.classList.add('missing');
  }} />;
}

function VehicleCard({ vehicle, fleetState, onOpen, onBook }: { vehicle: FleetVehicle; fleetState: FleetState; onOpen: () => void; onBook: () => void }) {
  return <article className="vehicle-card" data-open={vehicle.id} onClick={onOpen}>
    <div className="media"><VehiclePhoto vehicle={vehicle}/><span>{typeLabel(vehicle.type)}</span></div>
    <div className="vehicle-body">
      <div className="vehicle-top"><div><small>{vehicle.year ?? ''} · {vehicle.engine ?? ''}</small><h3>{vehicle.title}</h3></div><b>{money(vehicle.dailyVnd)}<small>/день</small></b></div>
      <div className="spec-row"><span>{vehicle.weight ?? '—'}</span><span>{vehicle.cruiseSpeed ?? '—'}</span><span>{stateLabel(fleetState)}</span></div>
      <button className="primary" data-book={vehicle.id} onClick={(event) => { event.stopPropagation(); onBook(); }}>Выбрать</button>
    </div>
  </article>;
}

function BookingModal({ vehicle, onClose, onSubmit }: { vehicle: FleetVehicle; onClose: () => void; onSubmit: (request: RentalRequest) => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get('from') ?? '');
    const to = String(data.get('to') ?? '');
    setBusy(true);
    try {
      await onSubmit({
        id: crypto.randomUUID(),
        vehicleId: vehicle.id,
        from,
        to,
        client: String(data.get('client') ?? ''),
        contact: String(data.get('contact') ?? ''),
        status: 'new',
        estimate: publishedEstimate(vehicle, from, to),
        createdAt: new Date().toISOString(),
        paymentStatus: 'unpaid',
      });
    } finally { setBusy(false); }
  }

  return <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="modal">
      <button className="modal-x" onClick={onClose}>×</button>
      <span className="eyebrow">БРОНИРОВАНИЕ</span>
      <h2>{vehicle.title}</h2>
      <p>{money(vehicle.dailyVnd)} / день · финальная доступность подтверждается менеджером.</p>
      <form id="bookForm" onSubmit={submit}>
        <div className="form-grid">
          <label>Получение<input name="from" type="date" defaultValue={defaultFrom} required /></label>
          <label>Возврат<input name="to" type="date" defaultValue={defaultTo} required /></label>
          <label>Имя<input name="client" required placeholder="Ваше имя" /></label>
          <label>Контакт<input name="contact" required placeholder="Телефон / @username" /></label>
        </div>
        <button className="primary wide" type="submit" disabled={busy}>{busy ? 'Создаём бронь…' : 'Перейти к оплате'}</button>
      </form>
      <small>После отправки заявка появится в разделе «Мои заявки» и будет доступна сотруднику и владельцу.</small>
    </section>
  </div>;
}

function ExtensionModal({ request, vehicle, clientMode, onClose, onSubmit }: { request: RentalRequest; vehicle: FleetVehicle; clientMode?: boolean; onClose: () => void; onSubmit: (newTo: string, additional: number) => Promise<void> | void }) {
  const nextDay = new Date(`${request.to}T00:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const minDate = dateISO(nextDay);
  const [newTo, setNewTo] = useState(minDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const additional = newTo >= minDate ? publishedEstimate(vehicle, request.to, newTo) : 0;
  async function submit() {
    if (!newTo || newTo < minDate || busy) return;
    setBusy(true); setError('');
    try { await onSubmit(newTo, additional); }
    catch (cause) {
      const code = cause instanceof Error ? cause.message : '';
      setError(code === 'vehicle_window_conflict' ? 'Эти дополнительные даты уже заняты. Выберите более раннюю дату возврата или свяжитесь с менеджером.' : code === 'booking_not_extendable' ? 'Эту аренду уже нельзя продлить.' : 'Продление сейчас недоступно. Проверьте даты и попробуйте ещё раз.');
    } finally { setBusy(false); }
  }
  return <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}>
    <section className="modal" data-extension-modal><button className="modal-x" disabled={busy} onClick={onClose}>×</button><span className="eyebrow">ПРОДЛЕНИЕ АРЕНДЫ</span><h2>{vehicle.title}</h2><p>Текущий возврат: <b>{request.to}</b></p>
      <label>Новая дата возврата<input data-extension-to type="date" min={minDate} value={newTo} onChange={(event) => setNewTo(event.target.value)} /></label>
      <div className="extension-summary"><b>Предварительная доплата: {money(additional)}</b><span>После подтверждения дат система пересчитает итоговую стоимость и точный остаток.</span></div>
      {error ? <div className="owner-notice" data-extension-error>{error}</div> : null}
      <button className="primary wide" data-extension-submit disabled={busy || !newTo || newTo < minDate} onClick={() => void submit()}>{busy ? 'Проверяем даты…' : clientMode ? 'Продлить и перейти к доплате' : 'Продлить аренду'}</button>
    </section>
  </div>;
}

function ScrollTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const sync = () => setVisible(window.scrollY > 360);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);
  return <button type="button" className={`scroll-top ${visible ? 'is-visible' : ''}`} aria-label="Наверх" title="Наверх" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>;
}

export function PrototypeApp() {
  const baseFleet = useMemo<FleetVehicle[]>(() => (Array.isArray(window.UNIQ_FLEET) ? window.UNIQ_FLEET : []).map(normalizeBaseVehicle), []);
  const [fleet, setFleet] = useState<FleetVehicle[]>(baseFleet);
  const initialRole = (() => {
    try {
      const saved = sessionStorage.getItem(roleKey) as Role | null;
      return saved && saved in nav ? saved : 'client';
    } catch { return 'client'; }
  })();

  const [role, setRole] = useState<Role>(initialRole);
  const [route, setRoute] = useState<Route>(nav[initialRole][0][0]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | VehicleType>('all');
  const [requests, setRequests] = useState<RentalRequest[]>(() => loadSession(requestKey, buildDemoBusinessRequests()));
  const [fleetStates, setFleetStates] = useState<Record<string, FleetState>>(() => loadSession(fleetStateKey, {}));
  const [bookingVehicleId, setBookingVehicleId] = useState<string | null>(null);
  const [extendingRequestId, setExtendingRequestId] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [paymentPurpose, setPaymentPurpose] = useState<PaymentPurpose>('booking');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestDetailFocus, setRequestDetailFocus] = useState<'request' | 'client'>('request');
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);

  useEffect(() => { window.Telegram?.WebApp?.ready?.(); window.Telegram?.WebApp?.expand?.(); }, []);
  useEffect(() => {
    let active = true;
    fetchFleetOverrides().then((overrides) => { if (active) setFleet(mergeFleetOverrides(baseFleet, overrides)); });
    return () => { active = false; };
  }, [baseFleet]);
  useEffect(() => { persistSession(requestKey, requests); }, [requests]);
  useEffect(() => { persistSession(fleetStateKey, fleetStates); }, [fleetStates]);

  const effectiveFleetState = (id: string): FleetState => fleetStates[id] ?? fleet.find((vehicle) => vehicle.id === id)?.status ?? 'manager';
  const go = (next: Route) => { setRoute(next); setSelectedId(null); setMainPhotoIndex(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const switchRole = (next: Role) => {
    setRole(next);
    try { sessionStorage.setItem(roleKey, next); } catch {}
    setRoute(nav[next][0][0]);
    setSelectedId(null);
    setMainPhotoIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!fleet.length) return <div className="fatal"><b>Каталог временно недоступен.</b><span>Обновите страницу или свяжитесь с менеджером UNIQ.</span></div>;

  const clientFleet = selectPublicFleet(fleet);
  const operationalFleet = activeOperationalFleet(fleet);
  const filteredFleet = clientFleet.filter((vehicle) => {
    const q = query.toLowerCase().trim();
    return (type === 'all' || vehicle.type === type) && (!q || `${vehicle.title} ${vehicle.engine ?? ''} ${vehicle.year ?? ''}`.toLowerCase().includes(q));
  });

  const selectedVehicle = selectedId ? fleet.find((item) => item.id === selectedId) : undefined;
  const bookingVehicle = bookingVehicleId ? fleet.find((item) => item.id === bookingVehicleId) : undefined;
  const extendingRequest = extendingRequestId ? requests.find((item) => item.id === extendingRequestId) : undefined;
  const extendingVehicle = extendingRequest ? fleet.find((item) => item.id === extendingRequest.vehicleId) : undefined;
  const paymentRequest = paymentRequestId ? requests.find((item) => item.id === paymentRequestId) : undefined;
  const paymentVehicle = paymentRequest ? fleet.find((item) => item.id === paymentRequest.vehicleId) : undefined;
  const selectedDetailRequest = selectedRequestId ? requests.find((item) => item.id === selectedRequestId) : undefined;
  const selectedDetailVehicle = selectedDetailRequest ? fleet.find((item) => item.id === selectedDetailRequest.vehicleId) : undefined;

  async function ensurePersistedRequest(request: RentalRequest): Promise<RentalRequest> {
    if (request.backendBookingId) return request;
    try {
      const persisted = await createPersistedBooking({ vehicleId: request.vehicleId, from: request.from, to: request.to, client: request.client, contact: request.contact });
      return { ...request, backendBookingId: persisted.bookingId, estimate: persisted.estimatedTotalVnd || request.estimate, paymentStatus: request.paymentStatus ?? 'unpaid' };
    } catch { return request; }
  }

  async function setLifecycleStatus(request: RentalRequest, status: RequestStatus) {
    const synced = status === 'new' ? request : await ensurePersistedRequest(request);
    const backendMap: Partial<Record<RequestStatus,'contacted'|'confirmed'|'vehicle_issued'|'active'|'return_due'|'returned'|'completed'|'cancelled'>> = { contacted:'contacted', confirmed:'confirmed', issued:'vehicle_issued', active:'active', return_due:'return_due', returned:'returned', completed:'completed', cancelled:'cancelled' };
    const backendStatus = backendMap[status];
    if (synced.backendBookingId && backendStatus) {
      try { await updatePersistedBookingStatus(synced.backendBookingId, backendStatus); } catch {}
    }
    setRequests((current) => current.map((item) => {
      if (item.id != request.id) return item;
      const persisted = synced.backendBookingId ? { backendBookingId:synced.backendBookingId, estimate:synced.estimate } : { estimate:synced.estimate };
      return { ...item, ...persisted, status, paymentStatus:item.paymentStatus ?? 'unpaid' };
    }));
    if (status === 'active') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'hold' }));
    if (status === 'returned' || status === 'completed') setFleetStates((current) => ({ ...current, [request.vehicleId]: 'ready' }));
  }

  async function setEmployeeFleetState(vehicle: FleetVehicle, nextState: FleetState) {
    setFleetStates((current) => ({ ...current, [vehicle.id]: nextState }));
    if (nextState !== 'ready') return;
    const candidate = [...requests].reverse().find((item) => item.vehicleId === vehicle.id && ['new','contacted','confirmed'].includes(item.status) && item.paymentStatus !== 'paid');
    if (candidate) await setLifecycleStatus(candidate, 'confirmed');
  }

  async function submitClientBooking(request: RentalRequest) {
    let next: RentalRequest = { ...request, paymentStatus: 'unpaid', paidVnd:0 };
    try {
      const persisted = await createPersistedBooking({ vehicleId: request.vehicleId, from: request.from, to: request.to, client: request.client, contact: request.contact });
      next = { ...next, backendBookingId: persisted.bookingId, estimate: persisted.estimatedTotalVnd || request.estimate };
    } catch {}
    setRequests((current) => [...current, next]);
    setBookingVehicleId(null);
    setSelectedId(null);
    if (next.backendBookingId) { setPaymentPurpose('booking'); setPaymentRequestId(next.id); }
    else { setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }

  async function extendRentalRequest(request: RentalRequest, newTo: string, previewAdditional: number) {
    if (request.backendBookingId) {
      const actor = role === 'owner' ? 'owner' : role === 'employee' ? 'employee' : 'client';
      const result = await extendPersistedBooking(request.backendBookingId,newTo,actor);
      setRequests((current) => current.map((item) => item.id === request.id ? { ...item, to:result.newTo, estimate:result.totalVnd, paidVnd:result.paidVnd, paymentStatus:result.paymentStatus } : item));
      setExtendingRequestId(null);
      if (role === 'client' && result.remainingVnd > 0) { setPaymentPurpose('extension'); setPaymentRequestId(request.id); }
      return;
    }
    if (role === 'client') throw new Error('booking_not_synced');
    setRequests((current) => current.map((item) => item.id === request.id ? { ...item, to:newTo, estimate:item.estimate + previewAdditional, ...(item.paidVnd && item.paidVnd > 0 ? { paymentStatus:'partially_paid' as const } : {}) } : item));
    setExtendingRequestId(null);
  }

  function requestCard(request: RentalRequest) {
    const vehicle = fleet.find((item) => item.id === request.vehicleId);
    return <article className="request request-clickable" key={request.id} data-request-card={request.id} tabIndex={0} onClick={(event) => { if ((event.target as HTMLElement).closest('button,a,input,select,textarea,label')) return; setSelectedRequestId(request.id); setRequestDetailFocus('request'); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedRequestId(request.id); setRequestDetailFocus('request'); } }}>
      <div><span className="status">{statusText(request.status)}</span><small>{new Date(request.createdAt).toLocaleString('ru-RU')}</small></div>
      <h3>{vehicle?.title ?? request.vehicleId}</h3>
      <p>{request.from} → {request.to} · <button type="button" className="request-client-link" data-request-client={request.id} onClick={(event) => { event.stopPropagation(); setSelectedRequestId(request.id); setRequestDetailFocus('client'); }}>{request.client || 'Клиент'}</button></p><small className="request-open-hint">Открыть заявку →</small>
      {role !== 'client' && request.demoBusiness ? <small className="request-business-meta">{request.branchId === 'branch-north' ? 'Северный филиал' : 'Центр города'} · {({telegram_mini_app:'Telegram Mini App',website:'Сайт',office:'Офис',google:'Google',instagram:'Instagram',partner:'Партнёр',qr:'QR-код'} as Record<string,string>)[request.sourceChannel ?? ''] ?? 'Источник'} · DEMO</small> : null}
      <b>{money(request.estimate)}</b>
      <div className={`request-payment ${request.paymentStatus ?? 'unpaid'}`}><span>Оплата</span><b>{paymentStatusText(request.paymentStatus)}</b>{request.paymentProvider ? <small>{request.paymentProvider}</small> : null}</div>
      {request.paidVnd && request.paidVnd > 0 ? <small className="request-paid-progress">Внесено {money(request.paidVnd)} · остаток {money(Math.max(0,request.estimate-request.paidVnd))}</small> : null}
      {role === 'client' && request.backendBookingId && request.paymentStatus !== 'paid' ? <button className="secondary" data-pay-booking={request.id} onClick={() => { setPaymentPurpose(request.paymentStatus === 'partially_paid' ? 'balance' : 'booking'); setPaymentRequestId(request.id); }}>{request.paymentStatus === 'partially_paid' ? 'Доплатить остаток' : 'Оплатить'}</button> : null}
      {role === 'client' && request.backendBookingId && ['confirmed','issued','active','return_due'].includes(request.status) ? <button className="secondary" data-client-extend={request.id} onClick={() => setExtendingRequestId(request.id)}>Продлить аренду</button> : null}
      {role === 'employee' ? <select data-status={request.id} value={request.status} onChange={(event) => { void setLifecycleStatus(request, event.target.value as RequestStatus); }}>
        {(['new','confirmed','issued','active','return_due','returned','completed','cancelled'] as RequestStatus[]).map((status) => <option key={status} value={status}>{statusText(status)}</option>)}
      </select> : null}
      {role !== 'client' ? <div className="request-actions">
        {request.status === 'confirmed' ? <button className="primary" data-issue={request.id} onClick={() => { void setLifecycleStatus(request,'active'); }}>Выдать технику</button> : null}
        {request.status === 'issued' ? <button className="primary" onClick={() => { void setLifecycleStatus(request,'active'); }}>Начать аренду</button> : null}
        {['active','issued','return_due'].includes(request.status) ? <button className="secondary" data-extend={request.id} onClick={() => setExtendingRequestId(request.id)}>Продлить</button> : null}
        {['active','issued','return_due'].includes(request.status) ? <button className="secondary" data-return={request.id} onClick={() => { void setLifecycleStatus(request,'returned'); }}>Принять возврат</button> : null}
        {request.status === 'returned' ? <button className="primary" data-complete={request.id} onClick={() => { void setLifecycleStatus(request,'completed'); }}>Завершить аренду</button> : null}
      </div> : null}
    </article>;
  }

  function clientHome() {
    const featured = clientFleet.filter((vehicle) => (vehicle.photos?.length ?? 0) > 0).slice(0, 6);
    return <>
      <Hero label="UNIQ SMART RENT · NHA TRANG" title="Техника для Нячанга — бронь за пару минут." text="Выберите модель и даты, оплатите бронь, продлевайте аренду и управляйте поездкой прямо в Telegram." aside={
        <div className="hero-card"><b>{clientFleet.length}</b><span>единиц техники</span><div className="hero-office-maps">
          <a className="hero-office-map" href="https://maps.app.goo.gl/qr3FNiVVxAdThVBV6" target="_blank" rel="noreferrer" aria-label="UNIQ Moto, 312 Đ. 2/4 — открыть в Google Maps"><iframe title="UNIQ Moto — 312 Đ. 2/4" src="https://www.google.com/maps?q=UNIQ%20Moto%20312%20%C4%90.%202%2F4%20Nha%20Trang&output=embed" loading="lazy" tabIndex={-1}></iframe><span><b>312 Đ. 2/4</b><small>Северный филиал · Google Maps ↗</small></span></a>
          <a className="hero-office-map" href="https://maps.app.goo.gl/sJdMndLRPz9b228J7" target="_blank" rel="noreferrer" aria-label="UNIQ Moto, 254 Nguyễn Thị Minh Khai — открыть в Google Maps"><iframe title="UNIQ Moto — 254 Nguyễn Thị Minh Khai" src="https://www.google.com/maps?q=UNIQ%20Moto%20254%20Nguyen%20Thi%20Minh%20Khai%20Nha%20Trang&output=embed" loading="lazy" tabIndex={-1}></iframe><span><b>254 Nguyễn Thị Minh Khai</b><small>Центр города · Google Maps ↗</small></span></a>
        </div></div>} />
      <section className="quick"><div><label>Получение<input id="quickFrom" type="date" defaultValue={defaultFrom}/></label><label>Возврат<input id="quickTo" type="date" defaultValue={defaultTo}/></label></div><button className="primary" data-go="catalog" onClick={() => go('catalog')}>Подобрать технику</button></section>
      <section className="section"><div className="section-head"><div><span className="eyebrow">ПАРК</span><h2>Популярная техника</h2></div><button className="text" data-go="catalog" onClick={() => go('catalog')}>Весь каталог →</button></div><div className="grid">{featured.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} fleetState={effectiveFleetState(vehicle.id)} onOpen={() => { setSelectedId(vehicle.id); setMainPhotoIndex(0); }} onBook={() => setBookingVehicleId(vehicle.id)}/>)}</div></section>
      <section className="proof"><b>Актуальный парк UNIQ</b><span>Наличие конкретной единицы и выбранные даты подтверждает менеджер.</span></section>
    </>;
  }

  function catalogPage() {
    return <>
      <Hero label="КАТАЛОГ UNIQ" title="Выберите технику." text="Все позиции из публичного парка клиента с реальными фотографиями и опубликованной дневной ставкой." />
      <section className="filters"><input id="fleetSearch" placeholder="Поиск: Yamaha, Rebel, 50cc…" value={query} onChange={(event) => setQuery(event.target.value)}/><select id="typeFilter" value={type} onChange={(event) => setType(event.target.value as 'all' | VehicleType)}><option value="all">Вся техника</option><option value="motorcycle">Мотоциклы</option><option value="scooter">Скутеры</option><option value="car">Авто</option></select><span>{filteredFleet.length} из {clientFleet.length}</span></section>
      <section className="grid catalog-grid">{filteredFleet.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} fleetState={effectiveFleetState(vehicle.id)} onOpen={() => { setSelectedId(vehicle.id); setMainPhotoIndex(0); }} onBook={() => setBookingVehicleId(vehicle.id)}/>)}</section>
    </>;
  }

  function vehicleDetailPage(vehicle: FleetVehicle) {
    return <>
      <button className="back" data-go="catalog" onClick={() => go('catalog')}>← Каталог</button>
      <section className="detail"><div className="gallery"><div className="main-photo"><VehiclePhoto vehicle={vehicle} index={mainPhotoIndex}/></div>{(vehicle.photos?.length ?? 0) > 1 ? <div className="thumbs">{vehicle.photos!.slice(0,8).map((_, index) => <button key={index} data-photo={index} onClick={() => setMainPhotoIndex(index)}><VehiclePhoto vehicle={vehicle} index={index}/></button>)}</div> : null}</div>
        <div className="detail-copy"><span className="pill">{typeLabel(vehicle.type)}</span><h1>{vehicle.title}</h1><p>{vehicle.year ?? ''} · {vehicle.engine ?? ''} · {vehicle.weight ?? ''} · {vehicle.cruiseSpeed ?? ''}</p><div className="rate-grid"><Metric label="День" value={money(vehicle.dailyVnd)}/><Metric label="Неделя" value={money(vehicle.weeklyVnd)}/><Metric label="Месяц" value={money(vehicle.monthlyVnd)}/><Metric label="Депозит" value={money(vehicle.depositVnd)}/></div><div className="notice"><b>{stateLabel(effectiveFleetState(vehicle.id))}</b><span>Наличие техники и выбранные даты подтверждает менеджер UNIQ.</span></div><button className="primary wide" data-book={vehicle.id} onClick={() => setBookingVehicleId(vehicle.id)}>Запросить бронь</button><VehicleModelDetails vehicle={vehicle} fleetState={effectiveFleetState(vehicle.id)}/></div>
      </section>
    </>;
  }

  function requestsPage() {
    const list = [...(role === 'client' ? requests.filter((item) => !item.demoBusiness) : requests)].reverse();
    const title = role === 'client' ? 'Мои заявки' : role === 'employee' ? 'Заявки клиентов' : 'Все заявки';
    return <><Hero label="ЗАЯВКИ" title={title} text={role === 'client' ? 'Ваши заявки на аренду.' : 'Заявки клиентов и их текущие статусы.'}/>{list.length ? <section className="request-list">{list.map(requestCard)}</section> : <div className="empty"><b>Заявок пока нет</b><span>Создайте заявку из карточки техники в режиме клиента.</span></div>}</>;
  }

  function contactsPage() {
    return <><Hero label="UNIQ MOTO" title="Контакты и выдача." text="Связь с менеджером и две точки UNIQ в Нячанге."/>
      <section className="contact-grid">
        <article className="contact-card"><span>Связь с менеджером</span><a className="contact-phone" href="tel:+84372112370">+84 37 211 2370</a><div className="contact-actions"><a className="primary" href="https://t.me/RikRent1" target="_blank" rel="noreferrer">Telegram · @RikRent1</a><a className="primary secondary-action" href="https://zalo.me/84372112370" target="_blank" rel="noreferrer">Zalo</a><a className="text-link" href="https://wa.me/84372112370" target="_blank" rel="noreferrer">WhatsApp</a></div></article>
        <article><span>Северный филиал</span><b>312 Đ. 2/4, Bắc Nha Trang</b><a className="text-link" href="https://maps.app.goo.gl/qr3FNiVVxAdThVBV6" target="_blank" rel="noreferrer">Открыть в Google Maps ↗</a></article>
        <article><span>Центр города</span><b>254 Nguyễn Thị Minh Khai, Nha Trang</b><a className="text-link" href="https://maps.app.goo.gl/sJdMndLRPz9b228J7" target="_blank" rel="noreferrer">Открыть в Google Maps ↗</a></article>
      </section>
      <section className="map-panel"><div className="section-head"><div><span className="eyebrow">GOOGLE MAPS</span><h2>UNIQ Moto в Нячанге</h2></div></div><iframe title="Google Maps — UNIQ Moto, Nha Trang" src="https://www.google.com/maps?q=UNIQ%20Moto%20312%20%C4%90.%202%2F4%20Nha%20Trang&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></section>
    </>;
  }

  function employeeDashboard() {
    const open = requests.filter((item) => !['completed','cancelled'].includes(item.status));
    const ready = Object.values(fleetStates).filter((item) => item === 'ready').length;
    return <><Hero label="СОТРУДНИК" title="Рабочий стол сотрудника." text="Заявки, парк и выдачи в одном мобильном интерфейсе."/><section className="metrics"><Metric label="Открытые заявки" value={open.length} target="employee-requests" onClick={() => go('requests')}/><Metric label="Парк" value={operationalFleet.length} target="employee-fleet" onClick={() => go('fleet')}/><Metric label="Готовы к выдаче" value={ready} target="employee-handover" onClick={() => go('handover')}/></section><section className="section"><div className="section-head"><div><span className="eyebrow">ОЧЕРЕДЬ</span><h2>Новые заявки</h2></div><button className="text" data-go="requests" onClick={() => go('requests')}>Все →</button></div>{open.length ? <div className="request-list">{open.slice(-5).reverse().map(requestCard)}</div> : <div className="empty">Новых заявок нет</div>}</section></>;
  }

  function employeeFleet() {
    return <><Hero label="ПАРК СОТРУДНИКА" title="Парк техники." text="Сотрудник видит весь каталог. Сотрудник видит весь парк и может быстро обновлять рабочий статус техники."/><section className="fleet-table">{operationalFleet.map((vehicle) => <article key={vehicle.id}><div className="mini-photo"><VehiclePhoto vehicle={vehicle}/></div><div><b>{vehicle.title}</b><small>{vehicle.year ?? ''} · {vehicle.engine ?? ''}</small></div><select data-fleet-state={vehicle.id} value={effectiveFleetState(vehicle.id)} onChange={(event) => { void setEmployeeFleetState(vehicle, event.target.value as FleetState); }}><option value="manager">Подтверждает менеджер</option><option value="ready">Готов к выдаче</option><option value="service">В сервисе</option><option value="hold">Резерв</option></select></article>)}</section></>;
  }

  function handoverPage() {
    const rows = requests.filter((item) => ['confirmed','issued','active','return_due','returned'].includes(item.status));
    return <><Hero label="ВЫДАЧИ" title="Выдачи и возвраты." text="Здесь отображаются только заявки, дошедшие до подтверждения."/>{rows.length ? <section className="request-list">{rows.map(requestCard)}</section> : <div className="empty"><b>Подтверждённых выдач пока нет</b><span>Статус заявки можно изменить в разделе «Заявки».</span></div>}</>;
  }

  function ownerOverview() {
    const confirmed = requests.filter((item) => ['confirmed','issued','active','returned','completed'].includes(item.status)).length;
    const open = requests.filter((item) => !['completed','cancelled'].includes(item.status)).length;
    const estimate = requests.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + (item.estimate || 0), 0);
    const statuses = ['new','confirmed','issued','active','return_due','returned','completed','cancelled'] as RequestStatus[];
    return <><Hero label="ВЛАДЕЛЕЦ" title="Пульс бизнеса — со смартфона." text="Ключевые показатели по парку и заявкам в одном экране."/><section className="metrics owner-metrics"><Metric label="Парк" value={fleet.length} sub="единиц техники" target="owner-fleet" onClick={() => go('fleet')}/><Metric label="Открытые заявки" value={open} target="owner-requests" onClick={() => go('requests')}/><Metric label="Подтверждены" value={confirmed} target="owner-calendar" onClick={() => go('calendar')}/><Metric label="Потенциал заявок" value={money(estimate)} sub="по текущим тарифам" target="owner-analytics" onClick={() => go('analytics')}/></section><section className="panel"><span className="eyebrow">ЗАЯВКИ</span><h2>Статусы заявок</h2><div className="status-bars">{statuses.map((status) => { const count = requests.filter((item) => item.status === status).length; return <div key={status}><span>{statusText(status)}</span><b>{count}</b><i style={{ width: `${requests.length ? Math.max(4, count / requests.length * 100) : 4}%` }}></i></div>; })}</div></section></>;
  }

  function ownerFleet() {
    return <OwnerFleetManager fleet={fleet} baseFleet={baseFleet} fleetStates={fleetStates} setFleet={setFleet} setFleetStates={setFleetStates}/>;
  }

  function ownerCalendar() {
    return <OwnerBookingCalendar fleet={fleet} requests={requests} fleetStates={fleetStates}/>;
  }

  function employeeCalendar() {
    return <OwnerBookingCalendar fleet={fleet} requests={requests} fleetStates={fleetStates}/>;
  }

  function ownerCustomers() {
    return <OwnerCRM requests={requests} fleet={fleet}/>;
  }

  function ownerTeam() {
    return <OwnerTeamBranches fleet={fleet} setFleet={setFleet}/>;
  }

  function ownerFinance() {
    return <OwnerFinance/>;
  }

  function ownerService() {
    return <OwnerService fleet={fleet} setFleetStates={setFleetStates}/>;
  }

  function ownerMarketing() {
    return <OwnerMarketing/>;
  }

  function ownerAnalytics() {
    return <OwnerAnalytics requests={requests} fleet={fleet}/>;
  }

  let content: React.ReactNode;
  if (selectedVehicle) content = vehicleDetailPage(selectedVehicle);
  else if (role === 'client') content = route === 'catalog' ? catalogPage() : route === 'requests' ? requestsPage() : route === 'contacts' ? contactsPage() : clientHome();
  else if (role === 'employee') content = route === 'requests' ? requestsPage() : route === 'fleet' ? employeeFleet() : route === 'calendar' ? employeeCalendar() : route === 'handover' ? handoverPage() : employeeDashboard();
  else content = route === 'requests' ? requestsPage() : route === 'fleet' ? ownerFleet() : route === 'calendar' ? ownerCalendar() : route === 'customers' ? ownerCustomers() : route === 'team' ? ownerTeam() : route === 'finance' ? ownerFinance() : route === 'service' ? ownerService() : route === 'marketing' ? ownerMarketing() : route === 'analytics' ? ownerAnalytics() : ownerOverview();

  return <>
    <div className="shell">
      <header className="topbar">
        <button className="brand" data-go={nav[role][0][0]} onClick={() => go(nav[role][0][0])}><img src="/brand/uniq-logo.svg" alt="UNIQ Nha Trang Rent Bike"/><span>SMART RENT</span></button>
        <div className="role-switch">{(Object.keys(roleLabels) as Role[]).map((item) => <button key={item} data-role={item} className={role === item ? 'active' : ''} onClick={() => switchRole(item)}>{roleLabels[item]}</button>)}</div>
      </header>
      <main>{content}</main>
      <nav className="bottom-nav" data-nav-count={nav[role].length}>{nav[role].map(([id,label]) => <button key={id} data-go={id} className={route === id ? 'active' : ''} onClick={() => go(id)}><span>{icon(id)}</span><b>{label}</b></button>)}</nav>
    </div>
    {bookingVehicle ? <BookingModal vehicle={bookingVehicle} onClose={() => setBookingVehicleId(null)} onSubmit={submitClientBooking}/>: null}
    {paymentRequest && paymentVehicle && paymentRequest.backendBookingId ? <PaymentCheckout bookingId={paymentRequest.backendBookingId} vehicleTitle={paymentVehicle.title} totalVnd={paymentRequest.estimate} paidVnd={paymentRequest.paidVnd ?? 0} purpose={paymentPurpose} onClose={() => { setPaymentRequestId(null); setPaymentPurpose('booking'); setRoute('requests'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onPaid={(result) => { setRequests((current) => current.map((item) => item.id === paymentRequest.id ? { ...item, paymentStatus: result.bookingPaymentStatus === 'paid' ? 'paid' : 'partially_paid', paymentId: result.paymentId, paymentProvider: result.provider, paidVnd:result.bookingPaidVnd, estimate:result.bookingTotalVnd || item.estimate } : item)); }}/>: null}
    {extendingRequest && extendingVehicle ? <ExtensionModal request={extendingRequest} vehicle={extendingVehicle} clientMode={role === 'client'} onClose={() => setExtendingRequestId(null)} onSubmit={(newTo, additional) => extendRentalRequest(extendingRequest,newTo,additional)}/>: null}
    {selectedDetailRequest ? <RequestDetailModal request={selectedDetailRequest} vehicleTitle={selectedDetailVehicle?.title ?? selectedDetailRequest.vehicleId} statusLabel={statusText(selectedDetailRequest.status)} paymentLabel={paymentStatusText(selectedDetailRequest.paymentStatus)} relatedRequests={requests.filter((item) => (item.client && item.client === selectedDetailRequest.client) || (item.contact && item.contact === selectedDetailRequest.contact))} focus={requestDetailFocus} onClose={() => setSelectedRequestId(null)}/>: null}
    <ScrollTop/>
  </>;
}
