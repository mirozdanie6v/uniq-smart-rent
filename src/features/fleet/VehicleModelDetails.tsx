import type { FleetState, ManagedFleetVehicle } from './fleetManagement';
import './vehicle-model-details.css';

const money = (value?: number) => value ? `${new Intl.NumberFormat('ru-RU').format(value)} ₫` : 'Уточняется';
const kind = (type: ManagedFleetVehicle['type']) => type === 'car' ? 'автомобиль' : type === 'motorcycle' ? 'мотоцикл' : 'скутер';
const kindTitle = (type: ManagedFleetVehicle['type']) => type === 'car' ? 'Автомобиль' : type === 'motorcycle' ? 'Мотоцикл' : 'Скутер';

function useCase(vehicle: ManagedFleetVehicle): string {
  if (vehicle.description?.trim()) return vehicle.description.trim();
  if (vehicle.type === 'car') return `${vehicle.title} — ${kind(vehicle.type)} для комфортных поездок по Нячангу и окрестностям. Подходит для городских маршрутов, поездок с багажом и путешествий компанией.`;
  if (vehicle.type === 'motorcycle') return `${vehicle.title} — ${kind(vehicle.type)} для тех, кому важны управляемость и запас возможностей за пределами коротких городских поездок. Выбирайте модель с учётом опыта и привычного класса техники.`;
  return `${vehicle.title} — ${kind(vehicle.type)} для ежедневных поездок по Нячангу: между районами, пляжами, кафе и точками выдачи UNIQ. Удобный формат для регулярного городского передвижения.`;
}

function branchLabel(id?: string): string {
  if (id === 'branch-north') return 'Северный филиал · 312 Đ. 2/4';
  if (id === 'branch-center') return 'Центр города · 254 Nguyễn Thị Minh Khai';
  return id ? 'Выбранный филиал UNIQ' : 'Точка получения выбирается при бронировании';
}

function stateLabel(state: FleetState): string {
  return ({ manager:'Наличие подтверждает менеджер', ready:'Готова к выдаче', service:'В сервисе', hold:'Резерв' } as const)[state];
}

export function VehicleModelDetails({ vehicle, fleetState }: { vehicle: ManagedFleetVehicle; fleetState: FleetState }) {
  const attributes = [
    ['Категория', kindTitle(vehicle.type)],
    ['Марка', vehicle.brand || vehicle.title.split(/\s+/)[0] || '—'],
    ['Модель', vehicle.model || vehicle.title.split(/\s+/).slice(1).join(' ') || vehicle.title],
    ['Год', vehicle.year ? String(vehicle.year) : 'Уточняется'],
    ['Двигатель', vehicle.engine || 'Уточняется'],
    ['Вес', vehicle.weight || 'Уточняется'],
    ['Крейсерская скорость', vehicle.cruiseSpeed || 'Уточняется'],
    ['Цвет', vehicle.color || 'Зависит от доступной единицы'],
  ];
  const rates = [
    ['1 день', vehicle.dailyVnd],
    ['3 дня', vehicle.threeDayVnd],
    ['7 дней', vehicle.weeklyVnd],
    ['14 дней', vehicle.fourteenDayVnd],
    ['30 дней', vehicle.monthlyVnd],
  ];
  return <section className="vehicle-dossier" data-vehicle-dossier data-vehicle-type={vehicle.type}>
    <div className="vehicle-dossier-head"><span className="eyebrow">О МОДЕЛИ</span><h2>{vehicle.title}</h2><p>{useCase(vehicle)}</p></div>
    <div className="vehicle-dossier-grid">
      <article><h3>Характеристики</h3><div className="vehicle-spec-list">{attributes.map(([label,value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div></article>
      <article><h3>Тарифы модели</h3><div className="vehicle-spec-list">{rates.map(([label,value]) => <div key={label as string}><span>{label}</span><b>{money(value as number | undefined)}</b></div>)}<div><span>Депозит</span><b>{money(vehicle.depositVnd)}</b></div></div></article>
    </div>
    <div className="vehicle-dossier-note"><div><span>Получение</span><b>{branchLabel(vehicle.branchId)}</b></div><div><span>Текущий статус</span><b>{stateLabel(fleetState)}</b></div></div>
    <div className="vehicle-dossier-service"><h3>Как проходит аренда</h3><p>Выберите даты и точку получения, отправьте заявку, оплатите бронь удобным способом и управляйте арендой в MY UNIQ. Доступность конкретной единицы подтверждается системой и командой UNIQ.</p></div>
  </section>;
}
