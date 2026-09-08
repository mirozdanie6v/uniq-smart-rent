import { useEffect, useMemo, useState } from 'react';
import { createDeposit, createRefund, fetchFinance, FinancePeriod, FinanceSnapshot, FinanceTransaction, FinanceTransactionType } from '../../api/finance';

const money=(value:number)=>`${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₫`;
const typeLabels:Record<FinanceTransactionType,string>={payment:'Оплата',refund:'Возврат',deposit_received:'Депозит принят',deposit_returned:'Депозит возвращён',cash_adjustment:'Корректировка',service_expense:'Расход сервиса'};
const methodLabels:Record<string,string>={cash:'Наличные',bank_transfer:'Перевод',card:'Карта',vietqr:'VietQR',vnpay:'VNPAY',momo:'MoMo',zalopay:'ZaloPay',sbp:'СБП',yookassa:'ЮKassa',tbank:'T‑Bank'};
const signedAmount=(transaction:FinanceTransaction)=>['refund','deposit_returned','service_expense'].includes(transaction.type)?`− ${money(transaction.amountVnd)}`:`+ ${money(transaction.amountVnd)}`;

function Metric({label,value,sub}:{label:string;value:string;sub?:string}){return <div className="metric finance-metric"><span>{label}</span><b>{value}</b>{sub?<small>{sub}</small>:null}</div>}

export function OwnerFinance(){
  const [period,setPeriod]=useState<FinancePeriod>('7d');
  const [branch,setBranch]=useState('all');
  const [snapshot,setSnapshot]=useState<FinanceSnapshot|null>(null);
  const [loading,setLoading]=useState(true);
  const [type,setType]=useState<'all'|FinanceTransactionType>('all');
  const [query,setQuery]=useState('');
  const [depositOpen,setDepositOpen]=useState(false);
  const [depositAction,setDepositAction]=useState<'receive'|'return'>('receive');
  const [depositAmount,setDepositAmount]=useState('3000000');
  const [depositBranch,setDepositBranch]=useState('branch-center');
  const [depositMethod,setDepositMethod]=useState<'cash'|'bank_transfer'|'card'>('cash');
  const [depositNote,setDepositNote]=useState('');
  const [refundSource,setRefundSource]=useState<FinanceTransaction|null>(null);
  const [refundAmount,setRefundAmount]=useState('');
  const [refundReason,setRefundReason]=useState('Возврат клиенту');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  async function reload(nextPeriod=period,nextBranch=branch){
    setLoading(true);
    try{setSnapshot(await fetchFinance(nextPeriod,nextBranch));}finally{setLoading(false)}
  }
  useEffect(()=>{void reload(period,branch)},[period,branch]);

  const transactions=useMemo(()=>{
    if(!snapshot) return [];
    const q=query.trim().toLowerCase();
    return snapshot.transactions.filter((item)=>(type==='all'||item.type===type)&&(!q||`${item.note} ${item.customerName} ${item.vehicleTitle} ${item.method} ${item.branchName}`.toLowerCase().includes(q)));
  },[snapshot,type,query]);

  async function submitDeposit(){
    const amountVnd=Number(depositAmount);
    if(!Number.isFinite(amountVnd)||amountVnd<=0) return;
    setBusy(true);setNotice('');
    try{
      await createDeposit({action:depositAction,amountVnd,branchId:depositBranch,method:depositMethod,note:depositNote});
      setDepositOpen(false);setDepositNote('');setNotice(depositAction==='receive'?'Депозит принят и записан в финансовый журнал.':'Возврат депозита записан в финансовый журнал.');
      await reload();
    }catch{setNotice('Операцию сохранить не удалось. Проверьте данные.')}finally{setBusy(false)}
  }

  async function submitRefund(){
    if(!refundSource) return;
    const amountVnd=Number(refundAmount);
    if(!Number.isFinite(amountVnd)||amountVnd<=0) return;
    setBusy(true);setNotice('');
    try{
      await createRefund({sourceTransactionId:refundSource.id,amountVnd,reason:refundReason});
      setRefundSource(null);setRefundAmount('');setNotice('Возврат проведён. Сумма выручки и история транзакций обновлены.');
      await reload();
    }catch(error){
      const remaining=(error as Error&{remainingVnd?:number}).remainingVnd;
      setNotice(remaining!==undefined?`Доступно к возврату: ${money(remaining)}.`:'Возврат провести не удалось.');
    }finally{setBusy(false)}
  }

  const s=snapshot?.summary;
  return <section className="finance-page" data-stage8-finance>
    <section className="hero finance-hero"><div><span className="eyebrow">ФИНАНСЫ</span><h1>Деньги бизнеса — в одном экране.</h1><p>Выручка, онлайн и наличные оплаты, депозиты, возвраты и ожидающие платежи по двум точкам UNIQ.</p></div><div className="finance-hero-card"><span>Чистая выручка</span><b>{money(s?.netRevenueVnd??0)}</b><small>{snapshot?.demo?'DEMO · демонстрационные операции':'D1 · рабочие операции'}</small></div></section>

    <section className="finance-controls"><div className="finance-periods">{([['today','Сегодня'],['7d','7 дней'],['30d','30 дней'],['all','Всё']] as [FinancePeriod,string][]).map(([id,label])=><button key={id} className={period===id?'active':''} data-finance-period={id} onClick={()=>setPeriod(id)}>{label}</button>)}</div><select data-finance-branch value={branch} onChange={(event)=>setBranch(event.target.value)}><option value="all">Все точки</option>{snapshot?.branches.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><div className="finance-actions"><button className="secondary" data-return-deposit onClick={()=>{setDepositAction('return');setDepositOpen(true)}}>Вернуть депозит</button><button className="primary" data-receive-deposit onClick={()=>{setDepositAction('receive');setDepositOpen(true)}}>+ Принять депозит</button></div></section>

    <section className="metrics finance-metrics">
      <Metric label="Чистая выручка" value={money(s?.netRevenueVnd??0)} sub="оплаты − возвраты − расходы"/>
      <Metric label="Онлайн" value={money(s?.onlineVnd??0)} sub="банки и QR"/>
      <Metric label="Наличные" value={money(s?.cashVnd??0)} sub="принято в офисах"/>
      <Metric label="Ожидают оплаты" value={money(s?.pendingPaymentsVnd??0)} sub={`${s?.pendingPaymentsCount??0} платежей`}/>
      <Metric label="Депозиты на руках" value={money(s?.depositsHeldVnd??0)} sub={`принято ${money(s?.depositsReceivedVnd??0)}`}/>
      <Metric label="Возвраты" value={money(s?.refundsVnd??0)} sub="возвраты клиентам"/>
    </section>

    <section className="finance-strip"><article><span>Валовые оплаты</span><b>{money(s?.grossPaymentsVnd??0)}</b></article><article><span>Возвращено депозитов</span><b>{money(s?.depositsReturnedVnd??0)}</b></article><article><span>Скидки</span><b>{money(s?.discountsVnd??0)}</b></article><article><span>Расходы сервиса</span><b>{money(s?.serviceExpensesVnd??0)}</b></article></section>

    {notice?<div className="finance-notice">{notice}</div>:null}

    <section className="section finance-ledger"><div className="section-head"><div><span className="eyebrow">ЖУРНАЛ</span><h2>Все движения денег</h2></div><span className="finance-count">{transactions.length} операций</span></div><div className="finance-toolbar"><input data-finance-search placeholder="Поиск по операции" value={query} onChange={(event)=>setQuery(event.target.value)}/><select data-finance-type value={type} onChange={(event)=>setType(event.target.value as 'all'|FinanceTransactionType)}><option value="all">Все операции</option><option value="payment">Оплаты</option><option value="refund">Возвраты</option><option value="deposit_received">Депозиты приняты</option><option value="deposit_returned">Депозиты возвращены</option><option value="service_expense">Расходы</option></select></div>
      {loading?<div className="empty">Загрузка финансов…</div>:transactions.length?<div className="finance-table" data-finance-ledger>{transactions.map((item)=><article key={item.id} data-finance-transaction={item.id}>
        <div className={`finance-type ${item.type}`}>{typeLabels[item.type]}</div>
        <div className="finance-main"><b>{item.note||typeLabels[item.type]}</b><span>{item.branchName||'Все точки'} · {methodLabels[item.method]??item.method}</span><small>{new Date(item.occurredAt).toLocaleString('ru-RU')}{item.customerName?` · ${item.customerName}`:''}{item.vehicleTitle?` · ${item.vehicleTitle}`:''}</small></div>
        <b className={`finance-amount ${['refund','deposit_returned','service_expense'].includes(item.type)?'negative':'positive'}`}>{signedAmount(item)}</b>
        {item.type==='payment'?<button className="secondary finance-refund" data-open-refund={item.id} onClick={()=>{setRefundSource(item);setRefundAmount(String(item.amountVnd));setRefundReason('Возврат клиенту')}}>Вернуть</button>:<span className="finance-status">{item.status==='completed'?'Проведено':item.status}</span>}
      </article>)}</div>:<div className="empty"><b>Операций за период нет</b><span>Измените период или филиал.</span></div>}
    </section>

    {depositOpen?<div className="modal-bg" onMouseDown={(event)=>{if(event.currentTarget===event.target)setDepositOpen(false)}}><section className="modal finance-modal" data-deposit-modal><button className="modal-x" onClick={()=>setDepositOpen(false)}>×</button><span className="eyebrow">{depositAction==='receive'?'ДЕПОЗИТ':'ВОЗВРАТ ДЕПОЗИТА'}</span><h2>{depositAction==='receive'?'Принять депозит':'Вернуть депозит'}</h2><div className="form-grid"><label>Сумма<input data-deposit-amount inputMode="numeric" value={depositAmount} onChange={(event)=>setDepositAmount(event.target.value)}/></label><label>Точка<select data-deposit-branch value={depositBranch} onChange={(event)=>setDepositBranch(event.target.value)}>{snapshot?.branches.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Метод<select data-deposit-method value={depositMethod} onChange={(event)=>setDepositMethod(event.target.value as 'cash'|'bank_transfer'|'card')}><option value="cash">Наличные</option><option value="bank_transfer">Перевод</option><option value="card">Карта</option></select></label><label>Комментарий<input data-deposit-note value={depositNote} onChange={(event)=>setDepositNote(event.target.value)} placeholder="Заказ / клиент"/></label></div><button className="primary wide" data-submit-deposit disabled={busy||Number(depositAmount)<=0} onClick={submitDeposit}>{busy?'Проводим…':depositAction==='receive'?'Принять депозит':'Вернуть депозит'}</button><small>Депозит учитывается отдельно от выручки.</small></section></div>:null}

    {refundSource?<div className="modal-bg" onMouseDown={(event)=>{if(event.currentTarget===event.target)setRefundSource(null)}}><section className="modal finance-modal" data-refund-modal><button className="modal-x" onClick={()=>setRefundSource(null)}>×</button><span className="eyebrow">ВОЗВРАТ</span><h2>Вернуть оплату</h2><p>{refundSource.note}<br/><b>Оплачено: {money(refundSource.amountVnd)}</b></p><div className="form-grid"><label>Сумма возврата<input data-refund-amount inputMode="numeric" value={refundAmount} onChange={(event)=>setRefundAmount(event.target.value)}/></label><label>Причина<input data-refund-reason value={refundReason} onChange={(event)=>setRefundReason(event.target.value)}/></label></div><button className="primary wide" data-submit-refund disabled={busy||Number(refundAmount)<=0} onClick={submitRefund}>{busy?'Проводим…':'Провести возврат'}</button><small>Поддерживается полный и частичный возврат. Для реальной интеграции здесь вызывается API платёжного провайдера.</small></section></div>:null}
  </section>
}
