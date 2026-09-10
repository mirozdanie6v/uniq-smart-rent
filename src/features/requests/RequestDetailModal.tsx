import './request-detail.css';

export type RequestDetailData = {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  contact: string;
  status: string;
  estimate: number;
  createdAt: string;
  backendBookingId?: string;
  paymentStatus?: string;
  paymentProvider?: string;
  paidVnd?: number;
  branchId?: string;
  sourceChannel?: string;
};

type Props = {
  request: RequestDetailData;
  vehicleTitle: string;
  statusLabel: string;
  paymentLabel: string;
  relatedRequests: RequestDetailData[];
  focus: 'request' | 'client';
  onClose: () => void;
};

const money = (value = 0) => `${new Intl.NumberFormat('ru-RU').format(Math.max(0, value))} ₫`;
const branchName = (id?: string) => id === 'branch-north' ? 'Северный филиал' : id === 'branch-center' ? 'Центр города' : id || 'Точка уточняется';
const sourceName = (source?: string) => ({ telegram_mini_app:'Telegram Mini App', website:'Сайт', office:'Офис', google:'Google', instagram:'Instagram', partner:'Партнёр', qr:'QR-код' } as Record<string,string>)[source ?? ''] ?? source ?? '—';

export function RequestDetailModal({ request, vehicleTitle, statusLabel, paymentLabel, relatedRequests, focus, onClose }: Props) {
  const paid = request.paidVnd ?? 0;
  const balance = Math.max(0, request.estimate - paid);
  return <div className="modal-bg request-detail-bg" data-request-detail-overlay onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="modal request-detail-modal" data-request-detail data-request-detail-focus={focus}>
      <button type="button" className="modal-x" aria-label="Закрыть" onClick={onClose}>×</button>
      <span className="eyebrow">{focus === 'client' ? 'КАРТОЧКА КЛИЕНТА' : 'КАРТОЧКА ЗАЯВКИ'}</span>
      <h2>{focus === 'client' ? request.client || 'Клиент' : vehicleTitle}</h2>
      {focus === 'client' ? <>
        <div className="request-client-profile"><div className="request-client-avatar">{(request.client || 'К').split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase()}</div><div><b>{request.client || 'Клиент'}</b><span>{request.contact || 'Контакт не указан'}</span><small>{relatedRequests.length} {relatedRequests.length === 1 ? 'заявка' : 'заявок'} в системе</small></div></div>
        <h3 className="request-detail-subtitle">Заявки клиента</h3>
        <div className="request-related-list">{relatedRequests.map((item) => <article key={item.id}><div><b>{item.id}</b><span>{item.from} → {item.to}</span></div><strong>{money(item.estimate)}</strong></article>)}</div>
      </> : <>
        <div className="request-detail-status"><span>{statusLabel}</span><b>{paymentLabel}</b></div>
        <div className="request-detail-grid">
          <div><span>Заявка</span><b>{request.id}</b></div>
          <div><span>Клиент</span><b>{request.client || 'Клиент'}</b><small>{request.contact || '—'}</small></div>
          <div><span>Период</span><b>{request.from} → {request.to}</b></div>
          <div><span>Точка</span><b>{branchName(request.branchId)}</b></div>
          <div><span>Источник</span><b>{sourceName(request.sourceChannel)}</b></div>
          <div><span>Создана</span><b>{new Date(request.createdAt).toLocaleString('ru-RU')}</b></div>
        </div>
        <div className="request-detail-money"><span><small>Стоимость</small><b>{money(request.estimate)}</b></span><span><small>Внесено</small><b>{money(paid)}</b></span><span><small>Остаток</small><b>{money(balance)}</b></span></div>
        {request.paymentProvider ? <p className="request-detail-provider">Способ оплаты: <b>{request.paymentProvider}</b></p> : null}
      </>}
    </section>
  </div>;
}
