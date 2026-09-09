import { useEffect, useMemo, useState } from 'react';
import * as QRCode from 'qrcode';
import { confirmDemoPayment, createPaymentIntent, fetchPaymentProviders, PaymentIntent, PaymentProvider, PaymentProviderInfo, PaymentPurpose } from '../../api/payments';
import { ProviderLogo } from './ProviderLogo';

const fallbackProviders: PaymentProviderInfo[] = [
  { id:'vietqr', label:'VietQR', market:'Vietnam', currency:'VND', credentialReady:false, checkoutMode:'demo' },
  { id:'vnpay', label:'VNPAY', market:'Vietnam', currency:'VND', credentialReady:false, checkoutMode:'demo' },
  { id:'momo', label:'MoMo', market:'Vietnam', currency:'VND', credentialReady:false, checkoutMode:'demo' },
  { id:'zalopay', label:'ZaloPay', market:'Vietnam', currency:'VND', credentialReady:false, checkoutMode:'demo' },
  { id:'sbp', label:'СБП', market:'Russia', currency:'RUB', credentialReady:false, checkoutMode:'demo' },
  { id:'yookassa', label:'ЮKassa', market:'Russia', currency:'RUB', credentialReady:false, checkoutMode:'demo' },
  { id:'tbank', label:'T‑Bank', market:'Russia', currency:'RUB', credentialReady:false, checkoutMode:'demo' },
];

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(Math.max(0,value))} ₫`;

export function PaymentCheckout({ bookingId, vehicleTitle, totalVnd, paidVnd = 0, purpose = 'booking', onClose, onPaid }: {
  bookingId: string;
  vehicleTitle: string;
  totalVnd: number;
  paidVnd?: number;
  purpose?: PaymentPurpose;
  onClose: () => void;
  onPaid: (result: { paymentId: string; provider: PaymentProvider; bookingPaymentStatus: string; bookingPaidVnd: number; bookingTotalVnd: number; amountVnd: number }) => void;
}) {
  const [providers, setProviders] = useState<PaymentProviderInfo[]>(fallbackProviders);
  const [provider, setProvider] = useState<PaymentProvider>('vietqr');
  const settlementMode = purpose !== 'booking' || paidVnd > 0;
  const [percent, setPercent] = useState<30 | 100>(settlementMode ? 100 : 30);
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { fetchPaymentProviders().then(setProviders).catch(() => setProviders(fallbackProviders)); }, []);
  useEffect(() => {
    setIntent(null);
    setNotice('');
    setPercent(purpose !== 'booking' || paidVnd > 0 ? 100 : 30);
    // Do not reset on paidVnd changes: parent updates paidVnd immediately after a
    // successful payment and the success state must remain visible to the client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, purpose]);
  useEffect(() => {
    let alive = true;
    if (!intent?.qrPayload) { setQr(''); return; }
    QRCode.toDataURL(intent.qrPayload, { width: 280, margin: 1, errorCorrectionLevel: 'M' }).then((data) => { if (alive) setQr(data); }).catch(() => { if (alive) setQr(''); });
    return () => { alive = false; };
  }, [intent]);

  const remainingVnd = Math.max(0,totalVnd-paidVnd);
  const estimated = useMemo(() => {
    const target = percent === 30 ? Math.ceil(totalVnd * 0.3) : totalVnd;
    return Math.max(0,target-paidVnd);
  }, [percent, totalVnd, paidVnd]);
  const title = purpose === 'extension' ? 'ДОПЛАТА ЗА ПРОДЛЕНИЕ' : purpose === 'balance' || paidVnd > 0 ? 'ОСТАТОК ПО БРОНИ' : 'ОПЛАТА БРОНИ';

  async function createIntent() {
    if (!estimated) { setNotice('По этой брони уже всё оплачено.'); return; }
    setBusy(true); setNotice('');
    try { setIntent(await createPaymentIntent({ bookingId, provider, prepaymentPercent: percent, purpose })); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось создать платёж.'); }
    finally { setBusy(false); }
  }

  async function confirmDemo() {
    if (!intent) return;
    setBusy(true); setNotice('');
    try {
      const result = await confirmDemoPayment(intent.id);
      setIntent({ ...intent, status: 'paid' });
      setNotice(result.bookingPaymentStatus === 'paid' ? 'Аренда оплачена полностью.' : 'Предоплата успешно зачислена.');
      onPaid({ paymentId:intent.id, provider:intent.provider, bookingPaymentStatus:result.bookingPaymentStatus, bookingPaidVnd:result.bookingPaidVnd, bookingTotalVnd:result.bookingTotalVnd, amountVnd:result.amountVnd });
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось подтвердить платёж.'); }
    finally { setBusy(false); }
  }

  return <div className="modal-bg payment-checkout-bg" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) onClose(); }}>
    <section className="modal payment-checkout" data-payment-checkout data-payment-purpose={purpose}>
      <button className="modal-x" disabled={busy} onClick={onClose}>×</button>
      <span className="eyebrow">{title}</span><h2>{vehicleTitle}</h2>
      <div className="payment-balance-summary" data-payment-balance-summary>
        <span><small>Стоимость</small><b>{money(totalVnd)}</b></span>
        <span><small>Внесено</small><b>{money(paidVnd)}</b></span>
        <span><small>Остаток</small><b>{money(remainingVnd)}</b></span>
      </div>
      {!intent ? <>
        {!settlementMode ? <div className="payment-section"><h3>1. Выберите сумму</h3><div className="payment-percent-grid"><button type="button" data-payment-percent="30" className={percent === 30 ? 'active' : ''} onClick={() => setPercent(30)}><b>30%</b><span>Предоплата</span><small>{money(Math.ceil(totalVnd * .3))}</small></button><button type="button" data-payment-percent="100" className={percent === 100 ? 'active' : ''} onClick={() => setPercent(100)}><b>100%</b><span>Полная оплата</span><small>{money(totalVnd)}</small></button></div></div> : <div className="payment-settlement-callout" data-balance-settlement><b>{purpose === 'extension' ? 'Продление подтверждается после доплаты' : 'Закройте остаток одним платежом'}</b><span>К оплате осталось {money(remainingVnd)}. Система не даст зачислить сумму сверх остатка.</span></div>}
        <div className="payment-section"><h3>{settlementMode ? '1' : '2'}. Способ оплаты</h3><div className="payment-provider-grid">{providers.map((item) => <button type="button" key={item.id} data-payment-provider={item.id} className={provider === item.id ? 'active' : ''} onClick={() => setProvider(item.id)}><ProviderLogo provider={item.id}/><div className="provider-copy"><b>{item.label}</b><span>{item.market}</span><small>{item.checkoutMode === 'demo' ? 'Демо' : 'Подключено'}</small></div></button>)}</div></div>
        <div className="payment-summary"><span>К оплате</span><b>{money(estimated)}</b></div><button type="button" className="primary wide" data-create-payment disabled={busy || estimated <= 0} onClick={createIntent}>{busy ? 'Создаём…' : 'Получить QR / ссылку'}</button>
      </> : <>
        <div className="payment-ready" data-payment-ready><div className="payment-qr">{qr ? <img src={qr} alt={`QR для оплаты ${intent.paymentReference}`} /> : <div className="qr-loading">QR</div>}</div><div className="payment-ready-copy"><ProviderLogo provider={intent.provider}/><span>{intent.providerLabel}</span><h3>{money(intent.amountVnd)}</h3><p>Назначение: <b>{intent.paymentReference}</b></p><small>{intent.mode === 'demo' ? 'Демонстрационный платёжный intent. Боевой режим включается merchant-ключами провайдера.' : 'Провайдер настроен для боевого подключения.'}</small><a className="secondary payment-open-link" href={intent.paymentUrl} target="_blank" rel="noreferrer">Открыть ссылку оплаты ↗</a></div></div>
        {intent.mode === 'demo' && intent.status !== 'paid' ? <button type="button" className="primary wide" data-demo-confirm-payment disabled={busy} onClick={confirmDemo}>{busy ? 'Проверяем…' : 'Демо: подтвердить оплату'}</button> : null}
        {intent.status === 'paid' ? <div className="payment-success" data-payment-success><b>Оплата зачислена</b><span>{notice}</span></div> : null}
      </>}
      {notice && intent?.status !== 'paid' ? <div className="owner-notice">{notice}</div> : null}
    </section>
  </div>;
}
