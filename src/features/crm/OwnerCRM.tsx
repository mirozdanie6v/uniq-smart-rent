import { useMemo, useState } from 'react';

export type CrmSegment = 'new' | 'repeat' | 'vip' | 'inactive';

type RequestLike = {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  contact: string;
  status: string;
  estimate: number;
  createdAt: string;
  paymentStatus?: string;
  paymentProvider?: string;
};

type FleetLike = {
  id: string;
  title: string;
  type?: string;
};

type Customer = {
  id: string;
  name: string;
  country: string;
  language: 'RU' | 'VI' | 'EN' | 'KO' | 'ZH';
  phone: string;
  telegram?: string | undefined;
  zalo?: string | undefined;
  preferredChannel: 'Telegram' | 'Zalo' | 'WhatsApp' | 'Телефон';
  segment: CrmSegment;
  tags: string[];
  note: string;
  firstContact: string;
  lastRental?: string | undefined;
  rentalCount: number;
  lifetimeValueVnd: number;
  preferredVehicle: string;
  source: string;
};

type TimelineItem = {
  id: string;
  date: string;
  title: string;
  text: string;
  amount?: number;
  tone: 'neutral' | 'success' | 'accent' | 'warning';
};

const STORAGE_KEY = 'uniq-stage6-crm-overrides-v1';

const names = [
  'Алексей Морозов', 'Анна Волкова', 'Максим Соколов', 'Елена Петрова', 'Илья Кузнецов', 'Мария Орлова',
  'Денис Фролов', 'Наталья Белова', 'Артём Киселёв', 'Дарья Семёнова', 'Сергей Лебедев', 'Оксана Павлова',
  'Nguyễn Minh Anh', 'Trần Quốc Huy', 'Lê Hoàng Nam', 'Phạm Thu Trang', 'Võ Minh Khang', 'Đỗ Ngọc Mai',
  'Min-jun Park', 'Ji-woo Kim', 'Seo-jun Lee', 'Soo-ah Choi', 'Jun-ho Kang', 'Hye-jin Yoon',
  'Wei Chen', 'Yuting Zhang', 'Jiahao Wang', 'Xinyi Liu', 'Ming Li', 'Yuxin Zhao',
  'Michael Brown', 'Emily Carter', 'Daniel Wilson', 'Sophie Turner', 'Thomas Miller', 'Olivia Scott',
];

const countryByLanguage = {
  RU: ['Россия', 'Казахстан', 'Беларусь'],
  VI: ['Вьетнам'],
  EN: ['Великобритания', 'Австралия', 'США'],
  KO: ['Южная Корея'],
  ZH: ['Китай', 'Тайвань'],
} as const;

const sourceList = ['Telegram Mini App', 'Офис', 'Сайт', 'Google', 'Партнёр', 'QR-код', 'Instagram'];
const preferredVehicles = ['Скутеры', 'Макси-скутеры', 'Мотоциклы', 'Автомобили'];

function formatMoney(value: number) {
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₫`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function languageForIndex(index: number): Customer['language'] {
  if (index < 30) return 'RU';
  if (index < 44) return 'VI';
  if (index < 54) return 'KO';
  if (index < 64) return 'ZH';
  return 'EN';
}

function segmentForIndex(index: number): CrmSegment {
  if (index % 13 === 0 || index % 17 === 0) return 'vip';
  if (index % 7 === 0 || index % 11 === 0) return 'inactive';
  if (index % 3 === 0 || index % 4 === 0) return 'repeat';
  return 'new';
}

function makeDemoCustomers(): Customer[] {
  return Array.from({ length: 72 }, (_, index) => {
    const language = languageForIndex(index);
    const segment = segmentForIndex(index);
    const name = names[index % names.length];
    const baseRentals = segment === 'vip' ? 7 + (index % 6) : segment === 'repeat' ? 2 + (index % 4) : segment === 'inactive' ? 1 + (index % 3) : 1;
    const average = 1_250_000 + (index % 9) * 420_000;
    const lifetime = baseRentals * average;
    const countryPool = countryByLanguage[language];
    const country = countryPool[index % countryPool.length];
    const firstDays = 18 + index * 8;
    const lastDays = segment === 'inactive' ? 75 + (index % 70) : 2 + (index % 24);
    const international = language !== 'RU';
    return {
      id: `crm-${String(index + 1).padStart(3, '0')}`,
      name,
      country,
      language,
      phone: language === 'VI' ? `+84 9${String(12000000 + index * 731).slice(-8)}` : language === 'RU' ? `+7 9${String(210000000 + index * 11731).slice(-9)}` : `+${language === 'KO' ? '82' : language === 'ZH' ? '86' : '44'} ${String(7300000000 + index * 9817).slice(-10)}`,
      telegram: language === 'RU' || language === 'EN' ? `@${name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '_').replace(/[а-яё]/gi, '').replace(/^_+|_+$/g, '') || `uniq_guest_${index + 1}`}` : undefined,
      zalo: language === 'VI' ? `Zalo · ${String(903000000 + index * 137)}` : undefined,
      preferredChannel: language === 'VI' ? 'Zalo' : language === 'RU' ? 'Telegram' : international ? 'WhatsApp' : 'Телефон',
      segment,
      tags: [language, preferredVehicles[index % preferredVehicles.length], index % 5 === 0 ? 'Онлайн' : 'Повторный контакт'].filter(Boolean),
      note: segment === 'vip' ? 'Ценит быстрый ответ и подтверждение конкретной модели.' : segment === 'inactive' ? 'Подходит для мягкой реактивации перед следующим отпуском.' : index % 4 === 0 ? 'Интересуется длительной арендой.' : '',
      firstContact: dateDaysAgo(firstDays),
      lastRental: dateDaysAgo(lastDays),
      rentalCount: baseRentals,
      lifetimeValueVnd: lifetime,
      preferredVehicle: preferredVehicles[index % preferredVehicles.length],
      source: sourceList[index % sourceList.length],
    };
  });
}

function requestCustomer(request: RequestLike, index: number): Customer {
  const paid = request.paymentStatus === 'paid' || request.paymentStatus === 'partially_paid';
  const completed = request.status === 'completed' || request.status === 'returned';
  const contact = request.contact || '';
  const isTelegram = contact.includes('@');
  const rentalCount = completed ? 2 : 1;
  return {
    id: `request-${request.id}`,
    name: request.client || `Клиент ${index + 1}`,
    country: 'Россия',
    language: 'RU',
    phone: isTelegram ? '+84 · контакт в Telegram' : contact || '+84 · контакт указан в заявке',
    telegram: isTelegram ? contact : undefined,
    preferredChannel: isTelegram ? 'Telegram' : 'Телефон',
    segment: completed ? 'repeat' : 'new',
    tags: ['RU', 'Mini App', paid ? 'Оплачивал онлайн' : 'Новая заявка'],
    note: '',
    firstContact: request.createdAt,
    lastRental: request.to,
    rentalCount,
    lifetimeValueVnd: paid || completed ? request.estimate : 0,
    preferredVehicle: 'Техника из текущей заявки',
    source: 'Telegram Mini App',
  };
}

function loadOverrides(): Record<string, Partial<Customer>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, Partial<Customer>> : {};
  } catch {
    return {};
  }
}

function persistOverrides(value: Record<string, Partial<Customer>>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
}

function segmentTitle(segment: CrmSegment) {
  return ({ new: 'Новый', repeat: 'Повторный', vip: 'VIP', inactive: 'Неактивный' } as const)[segment];
}

function timelineForCustomer(customer: Customer, requests: RequestLike[], fleet: FleetLike[]): TimelineItem[] {
  const matched = requests.filter((request) => request.client.trim().toLowerCase() === customer.name.trim().toLowerCase() || (customer.telegram && request.contact === customer.telegram) || request.contact === customer.phone);
  if (matched.length) {
    return matched.flatMap((request) => {
      const vehicle = fleet.find((item) => item.id === request.vehicleId)?.title ?? 'Техника UNIQ';
      const result: TimelineItem[] = [
        { id: `${request.id}-lead`, date: request.createdAt, title: 'Заявка создана', text: `${vehicle} · ${request.from} → ${request.to}`, amount: request.estimate, tone: 'accent' },
      ];
      if (request.paymentStatus && request.paymentStatus !== 'unpaid') result.push({ id: `${request.id}-pay`, date: request.createdAt, title: request.paymentStatus === 'paid' ? 'Оплата получена' : 'Платёж создан', text: request.paymentProvider ? `Способ оплаты: ${request.paymentProvider}` : 'Онлайн-оплата', amount: request.estimate, tone: request.paymentStatus === 'paid' ? 'success' : 'warning' });
      if (['confirmed','issued','active','returned','completed'].includes(request.status)) result.push({ id: `${request.id}-status`, date: request.to, title: request.status === 'completed' ? 'Аренда завершена' : 'Статус аренды обновлён', text: vehicle, tone: request.status === 'completed' ? 'success' : 'neutral' });
      return result;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const items: TimelineItem[] = [
    { id: `${customer.id}-contact`, date: customer.firstContact, title: 'Первый контакт', text: `${customer.source} · язык ${customer.language}`, tone: 'neutral' },
  ];
  const maxRows = Math.min(customer.rentalCount, 5);
  for (let index = 0; index < maxRows; index += 1) {
    const days = 5 + index * 37 + Number(customer.id.replace(/\D/g, '').slice(-2) || 0);
    const amount = Math.max(700_000, Math.round(customer.lifetimeValueVnd / Math.max(1, customer.rentalCount)));
    items.push({ id: `${customer.id}-rent-${index}`, date: dateDaysAgo(days), title: index === 0 ? 'Аренда завершена' : 'Повторная аренда', text: `${customer.preferredVehicle} · ${2 + (index % 6)} дней`, amount, tone: 'success' });
  }
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function OwnerCRM({ requests, fleet }: { requests: RequestLike[]; fleet: FleetLike[] }) {
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | CrmSegment>('all');
  const [language, setLanguage] = useState<'all' | Customer['language']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, Partial<Customer>>>(() => loadOverrides());

  const customers = useMemo(() => {
    const demo = makeDemoCustomers();
    const dynamic = requests.map(requestCustomer);
    const keys = new Set(dynamic.map((item) => `${item.name.toLowerCase()}|${item.telegram ?? item.phone}`));
    const merged = [...dynamic, ...demo.filter((item) => !keys.has(`${item.name.toLowerCase()}|${item.telegram ?? item.phone}`))];
    return merged.map((item) => ({ ...item, ...(overrides[item.id] ?? {}) }));
  }, [requests, overrides]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (segment !== 'all' && customer.segment !== segment) return false;
      if (language !== 'all' && customer.language !== language) return false;
      if (!normalized) return true;
      return [customer.name, customer.phone, customer.telegram, customer.zalo, customer.country, customer.tags.join(' ')].filter(Boolean).join(' ').toLowerCase().includes(normalized);
    }).sort((a, b) => b.lifetimeValueVnd - a.lifetimeValueVnd);
  }, [customers, query, segment, language]);

  const selected = customers.find((item) => item.id === selectedId) ?? null;
  const totals = {
    all: customers.length,
    repeat: customers.filter((item) => item.segment === 'repeat').length,
    vip: customers.filter((item) => item.segment === 'vip').length,
    inactive: customers.filter((item) => item.segment === 'inactive').length,
    value: customers.reduce((sum, item) => sum + item.lifetimeValueVnd, 0),
  };

  function patchCustomer(id: string, patch: Partial<Customer>) {
    setOverrides((current) => {
      const next = { ...current, [id]: { ...(current[id] ?? {}), ...patch } };
      persistOverrides(next);
      return next;
    });
  }

  const timeline = selected ? timelineForCustomer(selected, requests, fleet) : [];

  return <div className="crm-page">
    <section className="crm-hero">
      <div><span className="eyebrow">CRM · КЛИЕНТЫ</span><h1>Клиентская база UNIQ.</h1><p>История обращений и аренд, сегменты и ценность клиента — в одном мобильном экране владельца.</p></div>
      <div className="crm-hero-value"><span>База клиентов</span><b>{totals.all}</b><small>актуальных контактов</small></div>
    </section>

    <section className="crm-metrics">
      <article><span>Клиенты</span><b>{totals.all}</b><small>единая база</small></article>
      <article><span>Повторные</span><b>{totals.repeat}</b><small>вернулись снова</small></article>
      <article><span>VIP</span><b>{totals.vip}</b><small>высокая ценность</small></article>
      <article><span>Неактивные</span><b>{totals.inactive}</b><small>для реактивации</small></article>
      <article><span>LTV базы</span><b>{formatMoney(totals.value)}</b><small>накопленная выручка</small></article>
    </section>

    <section className="crm-toolbar">
      <input aria-label="Поиск клиентов" placeholder="Имя, телефон, Telegram, страна…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="crm-segments" aria-label="Сегменты клиентов">
        {([['all','Все'],['new','Новые'],['repeat','Повторные'],['vip','VIP'],['inactive','Неактивные']] as const).map(([id, label]) => <button key={id} className={segment === id ? 'active' : ''} onClick={() => setSegment(id)}>{label}</button>)}
      </div>
      <select aria-label="Язык клиента" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
        <option value="all">Все языки</option><option value="RU">RU</option><option value="VI">VI</option><option value="EN">EN</option><option value="KO">KO</option><option value="ZH">中文</option>
      </select>
      <span className="crm-result-count">{filtered.length} клиентов</span>
    </section>

    <section className="crm-layout">
      <div className="crm-list">
        {filtered.map((customer) => <button className={`crm-row ${selectedId === customer.id ? 'selected' : ''}`} key={customer.id} onClick={() => setSelectedId(customer.id)}>
          <div className="crm-avatar">{customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
          <div className="crm-main"><div><b>{customer.name}</b><span className={`crm-segment ${customer.segment}`}>{segmentTitle(customer.segment)}</span></div><small>{customer.country} · {customer.language} · {customer.source}</small><div className="crm-tags">{customer.tags.slice(0, 3).map((tag) => <i key={tag}>{tag}</i>)}</div></div>
          <div className="crm-value"><b>{formatMoney(customer.lifetimeValueVnd)}</b><small>{customer.rentalCount} {customer.rentalCount === 1 ? 'аренда' : 'аренд'}</small></div>
          <span className="crm-arrow">›</span>
        </button>)}
      </div>

      <aside className={`crm-detail ${selected ? 'open' : ''}`}>
        {selected ? <>
          <button className="crm-close" aria-label="Закрыть карточку клиента" onClick={() => setSelectedId(null)}>×</button>
          <div className="crm-profile-head"><div className="crm-avatar large">{selected.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div><div><span className="eyebrow">КАРТОЧКА КЛИЕНТА</span><h2>{selected.name}</h2><p>{selected.country} · {selected.language}</p></div></div>
          <div className="crm-profile-stats"><article><span>Аренд</span><b>{selected.rentalCount}</b></article><article><span>Выручка</span><b>{formatMoney(selected.lifetimeValueVnd)}</b></article><article><span>Последняя</span><b>{formatDate(selected.lastRental)}</b></article></div>
          <div className="crm-contact-grid"><div><span>Телефон</span><b>{selected.phone}</b></div><div><span>Telegram</span><b>{selected.telegram ?? '—'}</b></div><div><span>Zalo</span><b>{selected.zalo ?? '—'}</b></div><div><span>Канал</span><b>{selected.preferredChannel}</b></div><div><span>Источник</span><b>{selected.source}</b></div><div><span>Интерес</span><b>{selected.preferredVehicle}</b></div></div>
          <label className="crm-edit-field">Сегмент<select value={selected.segment} onChange={(event) => patchCustomer(selected.id, { segment: event.target.value as CrmSegment })}><option value="new">Новый</option><option value="repeat">Повторный</option><option value="vip">VIP</option><option value="inactive">Неактивный</option></select></label>
          <label className="crm-edit-field">Заметка<textarea value={selected.note} placeholder="Комментарий владельца или менеджера" onChange={(event) => patchCustomer(selected.id, { note: event.target.value })}/></label>
          <div className="crm-timeline-head"><span className="eyebrow">ИСТОРИЯ</span><h3>Контакты и аренды</h3></div>
          <div className="crm-timeline">{timeline.map((item) => <article key={item.id} className={item.tone}><i></i><div><span>{formatDate(item.date)}</span><b>{item.title}</b><p>{item.text}</p>{item.amount ? <strong>{formatMoney(item.amount)}</strong> : null}</div></article>)}</div>
        </> : <div className="crm-detail-empty"><span>CRM</span><b>Выберите клиента</b><p>Откроется карточка с контактами, сегментом, выручкой и историей.</p></div>}
      </aside>
    </section>
  </div>;
}
