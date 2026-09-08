import { useMemo, useState } from 'react';
import type { ManagedFleetVehicle, VehicleType } from '../fleet/fleetManagement';

type CalendarRequestStatus = 'new' | 'contacted' | 'confirmed' | 'issued' | 'active' | 'returned' | 'completed' | 'cancelled';
export interface CalendarRentalRequest {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  status: CalendarRequestStatus;
  estimate: number;
}

type Props = {
  fleet: ManagedFleetVehicle[];
  requests: CalendarRentalRequest[];
  fleetStates: Record<string, 'manager' | 'ready' | 'service' | 'hold'>;
};

type TypeFilter = 'all' | VehicleType;
type BranchFilter = 'all' | 'branch-north' | 'branch-center';

const dayMs = 86_400_000;
const dateISO = (date: Date) => date.toISOString().slice(0, 10);
const atMidnight = (value: string) => new Date(`${value}T00:00:00Z`).getTime();
const overlaps = (fromA: string, toA: string, day: string) => atMidnight(fromA) <= atMidnight(day) && atMidnight(toA) >= atMidnight(day);
const statusClass = (status: CalendarRequestStatus) => status === 'active' || status === 'issued' ? 'active' : status === 'confirmed' ? 'confirmed' : status === 'returned' || status === 'completed' ? 'completed' : 'request';
const statusLabel = (status: CalendarRequestStatus) => ({ new:'Заявка', contacted:'Связались', confirmed:'Бронь', issued:'Выдана', active:'Аренда', returned:'Возврат', completed:'Завершена', cancelled:'Отмена' })[status];
const typeLabel = (type: VehicleType) => type === 'car' ? 'Авто' : type === 'motorcycle' ? 'Мотоцикл' : 'Скутер';

export function OwnerBookingCalendar({ fleet, requests, fleetStates }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [type, setType] = useState<TypeFilter>('all');
  const [branch, setBranch] = useState<BranchFilter>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    date.setUTCDate(date.getUTCDate() + index);
    return dateISO(date);
  }), [anchor]);

  const rows = useMemo(() => fleet.filter((vehicle) => !vehicle.archivedAt && (type === 'all' || vehicle.type === type) && (branch === 'all' || vehicle.branchId === branch)), [fleet, type, branch]);
  const selectedRequest = selectedRequestId ? requests.find((item) => item.id === selectedRequestId) : undefined;
  const selectedVehicle = selectedRequest ? fleet.find((item) => item.id === selectedRequest.vehicleId) : undefined;

  const shift = (delta: number) => setAnchor((current) => new Date(current.getTime() + delta * 7 * dayMs));
  const today = () => setAnchor(new Date());

  return <>
    <section className="hero owner-calendar-hero">
      <div><span className="eyebrow">КАЛЕНДАРЬ ЗАНЯТОСТИ</span><h1>Весь парк по дням.</h1><p>Брони, активные аренды, возвраты и сервис видны на одном экране.</p></div>
      <div className="calendar-period-actions"><button className="secondary" onClick={() => shift(-1)}>← 7 дней</button><button className="primary" onClick={today}>Сегодня</button><button className="secondary" onClick={() => shift(1)}>7 дней →</button></div>
    </section>

    <section className="owner-calendar-toolbar">
      <select data-owner-calendar-type value={type} onChange={(event) => setType(event.target.value as TypeFilter)}><option value="all">Все типы</option><option value="car">Авто</option><option value="motorcycle">Мотоциклы</option><option value="scooter">Скутеры</option></select>
      <select data-owner-calendar-branch value={branch} onChange={(event) => setBranch(event.target.value as BranchFilter)}><option value="all">Все точки</option><option value="branch-north">Север · 312 Đ. 2/4</option><option value="branch-center">Центр · 254 Nguyễn Thị Minh Khai</option></select>
      <span>{rows.length} единиц</span>
    </section>

    <section className="calendar-legend"><span className="legend-request">Заявка</span><span className="legend-confirmed">Бронь</span><span className="legend-active">Аренда</span><span className="legend-service">Сервис</span><span className="legend-free">Свободна</span></section>

    <section className="owner-calendar" data-owner-calendar>
      <div className="calendar-grid calendar-head"><div>Техника</div>{days.map((day) => <div key={day}><b>{new Date(`${day}T00:00:00Z`).toLocaleDateString('ru-RU',{weekday:'short'})}</b><span>{new Date(`${day}T00:00:00Z`).toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}</span></div>)}</div>
      {rows.map((vehicle) => <div className="calendar-grid calendar-row" key={vehicle.id} data-calendar-vehicle={vehicle.id}>
        <div className="calendar-vehicle"><b>{vehicle.title}</b><small>{typeLabel(vehicle.type)}</small></div>
        {days.map((day) => {
          const state = fleetStates[vehicle.id] ?? vehicle.status ?? 'manager';
          const request = requests.find((item) => item.vehicleId === vehicle.id && item.status !== 'cancelled' && overlaps(item.from,item.to,day));
          if (state === 'service') return <div key={day} className="calendar-cell service"><span>Сервис</span></div>;
          if (request) return <button key={day} className={`calendar-cell ${statusClass(request.status)}`} onClick={() => setSelectedRequestId(request.id)} title={`${request.client}: ${request.from} — ${request.to}`}><span>{statusLabel(request.status)}</span></button>;
          return <div key={day} className="calendar-cell free"><span>·</span></div>;
        })}
      </div>)}
    </section>

    {selectedRequest ? <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedRequestId(null); }}><section className="modal calendar-booking-card"><button className="modal-x" onClick={() => setSelectedRequestId(null)}>×</button><span className="eyebrow">БРОНИРОВАНИЕ</span><h2>{selectedVehicle?.title ?? selectedRequest.vehicleId}</h2><p><b>{selectedRequest.client}</b><br/>{selectedRequest.from} → {selectedRequest.to}</p><div className="notice"><b>{statusLabel(selectedRequest.status)}</b><span>Заказ #{selectedRequest.id.slice(0,8)}</span></div></section></div> : null}
  </>;
}
