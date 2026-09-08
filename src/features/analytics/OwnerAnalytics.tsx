import { useEffect, useMemo, useState } from 'react';
import { AnalyticsBranch, AnalyticsPeriod, AnalyticsSnapshot, fetchAnalyticsSnapshot } from '../../api/analytics';

interface AnalyticsRequestLike {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  status: string;
  estimate: number;
  createdAt: string;
  paymentStatus?: string;
  branchId?: string;
  sourceChannel?: string;
}

interface AnalyticsFleetLike {
  id: string;
  title: string;
}

interface OwnerAnalyticsProps {
  requests: AnalyticsRequestLike[];
  fleet: AnalyticsFleetLike[];
}

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₫`;
const percent = (value: number) => `${Math.round(value)}%`;
const periodDays: Record<AnalyticsPeriod,number> = { today:1, '7d':7, '30d':30 };
const statusLabels: Record<string,string> = {
  new:'Новые', contacted:'Связались', awaiting_confirmation:'Ждут подтверждения', confirmed:'Подтверждены',
  issued:'Выданы', vehicle_issued:'Выданы', active:'В аренде', return_due:'Возврат сегодня', returned:'Возвращены', completed:'Завершены', cancelled:'Отменены',
};
const sourceLabels: Record<string,string> = {
  telegram_mini_app:'Telegram Mini App', website:'Сайт', office:'Офис', google:'Google', instagram:'Instagram', partner:'Партнёры', qr:'QR-коды', other:'Другое',
};
const branchLabels: Record<string,string> = { 'branch-north':'Северный филиал', 'branch-center':'Центр города' };

function dateKey(value: Date): string { return value.toISOString().slice(0,10); }

function localSnapshot(requests: AnalyticsRequestLike[], fleet: AnalyticsFleetLike[], period: AnalyticsPeriod, branch: AnalyticsBranch): AnalyticsSnapshot {
  const days = periodDays[period];
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate()-(days-1));
  const scoped = requests.filter((item)=>new Date(item.createdAt).getTime() >= start.getTime() && (branch === 'all' || item.branchId === branch));
  const paid = scoped.filter((item)=>item.paymentStatus === 'paid' && item.status !== 'cancelled');
  const revenueVnd = paid.reduce((sum,item)=>sum+item.estimate,0);
  const activeRentals = scoped.filter((item)=>['issued','vehicle_issued','active','return_due'].includes(item.status)).length;
  const trackedFleet = Math.max(1,Math.min(fleet.length,branch === 'all' ? 18 : 9));
  const utilizationPercent = Math.min(100,Math.round(activeRentals/trackedFleet*100 + (days > 1 ? 31 : 18)));

  const clients = new Map<string,{ count:number; total:number }>();
  for (const item of scoped) {
    const row=clients.get(item.client) ?? { count:0,total:0 };
    row.count += 1; row.total += item.status === 'cancelled' ? 0 : item.estimate; clients.set(item.client,row);
  }
  let newClients=0,repeat=0,vip=0;
  for (const value of clients.values()) {
    if (value.total >= 12_000_000 || value.count >= 3) vip += 1;
    else if (value.count > 1) repeat += 1;
    else newClients += 1;
  }
  const customerAll=clients.size;
  const repeatSharePercent=customerAll ? Math.round((repeat+vip)/customerAll*100) : 0;

  const trend = Array.from({length:days},(_,index)=>{
    const date=new Date(start); date.setDate(date.getDate()+index); const key=dateKey(date);
    const rows=scoped.filter((item)=>dateKey(new Date(item.createdAt))===key);
    return { day:key, label:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short'}).format(date), bookings:rows.length, revenueVnd:rows.filter((item)=>item.paymentStatus==='paid'&&item.status!=='cancelled').reduce((sum,item)=>sum+item.estimate,0) };
  });

  const statusMap=new Map<string,number>();
  for(const item of scoped) statusMap.set(item.status,(statusMap.get(item.status)??0)+1);
  const statuses=[...statusMap.entries()].map(([status,count])=>({status,count})).sort((a,b)=>b.count-a.count);

  const sourceMap=new Map<string,{bookings:number;revenueVnd:number}>();
  for(const item of scoped){ const key=item.sourceChannel||'other'; const row=sourceMap.get(key)??{bookings:0,revenueVnd:0}; row.bookings+=1; if(item.paymentStatus==='paid'&&item.status!=='cancelled')row.revenueVnd+=item.estimate; sourceMap.set(key,row); }
  const sources=[...sourceMap.entries()].map(([source,row])=>({source,...row,sharePercent:scoped.length?Math.round(row.bookings/scoped.length*100):0})).sort((a,b)=>b.bookings-a.bookings);

  const branchMap=new Map<string,{bookings:number;revenueVnd:number;active:number}>();
  for(const item of requests){ const key=item.branchId||'branch-center'; const row=branchMap.get(key)??{bookings:0,revenueVnd:0,active:0}; row.bookings+=1; if(item.paymentStatus==='paid'&&item.status!=='cancelled')row.revenueVnd+=item.estimate; if(['issued','active','return_due'].includes(item.status))row.active+=1; branchMap.set(key,row); }
  const branches=[...branchMap.entries()].filter(([key])=>key in branchLabels).map(([branchId,row])=>({branchId,label:branchLabels[branchId]??branchId,bookings:row.bookings,revenueVnd:row.revenueVnd,utilizationPercent:Math.min(100,42+row.active*7)}));

  const fleetById=new Map(fleet.map((item)=>[item.id,item]));
  const vehicleMap=new Map<string,{rentals:number;revenueVnd:number}>();
  for(const item of scoped){ const row=vehicleMap.get(item.vehicleId)??{rentals:0,revenueVnd:0}; row.rentals+=item.status==='cancelled'?0:1; if(item.paymentStatus==='paid'&&item.status!=='cancelled')row.revenueVnd+=item.estimate; vehicleMap.set(item.vehicleId,row); }
  const vehicles=[...vehicleMap.entries()].map(([vehicleId,row])=>({vehicleId,title:fleetById.get(vehicleId)?.title??vehicleId,rentals:row.rentals,revenueVnd:row.revenueVnd,utilizationPercent:Math.min(100,row.rentals*21+18),idleDays:Math.max(0,days-Math.min(days,row.rentals*2))})).sort((a,b)=>b.revenueVnd-a.revenueVnd).slice(0,10);

  const bookings=Math.max(1,scoped.length);
  const paidBookings=paid.length;
  const views=Math.max(126,bookings*13+90),opens=Math.max(bookings*5,Math.round(views*.54)),starts=Math.max(bookings,Math.round(opens*.43)),paymentStarts=Math.max(paidBookings,Math.round(starts*.76));
  const rawFunnel=[['views','Просмотры',views],['vehicle_opens','Карточки техники',opens],['booking_starts','Начали бронь',starts],['payment_starts','Перешли к оплате',paymentStarts],['paid_bookings','Оплатили',paidBookings]] as const;
  const funnel=rawFunnel.map(([key,label,value])=>({key,label,value,conversionPercent:Math.round(value/views*100)}));

  return {
    period,branch,
    kpis:{ revenueVnd, bookings:scoped.length, paidBookings, averageCheckVnd:paidBookings?Math.round(revenueVnd/paidBookings):0, utilizationPercent, repeatSharePercent, newCustomers:newClients, activeRentals, conversionPercent:scoped.length?Math.round(paidBookings/scoped.length*100):0 },
    trend,statuses,sources,branches,vehicles,funnel,
    customers:{all:customerAll,new:newClients,repeat,vip,inactive:Math.max(0,Math.round(customerAll*.12)),repeatSharePercent},
    persisted:false,demoData:true,generatedAt:new Date().toISOString(),
  };
}

function Metric({label,value,sub}:{label:string;value:string|number;sub:string}) {
  return <div className="metric"><span>{label}</span><b>{value}</b><small>{sub}</small></div>;
}

export function OwnerAnalytics({requests,fleet}:OwnerAnalyticsProps) {
  const [period,setPeriod]=useState<AnalyticsPeriod>('7d');
  const [branch,setBranch]=useState<AnalyticsBranch>('all');
  const fallback=useMemo(()=>localSnapshot(requests,fleet,period,branch),[requests,fleet,period,branch]);
  const [data,setData]=useState<AnalyticsSnapshot>(fallback);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    let active=true; setBusy(true);
    fetchAnalyticsSnapshot(period,branch).then((snapshot)=>{ if(active)setData(snapshot??fallback); }).finally(()=>{ if(active)setBusy(false); });
    return()=>{active=false;};
  },[period,branch,fallback]);

  const maxRevenue=Math.max(1,...data.trend.map((item)=>item.revenueVnd));
  const maxStatus=Math.max(1,...data.statuses.map((item)=>item.count));
  const bestSource=data.sources[0];
  const idle=data.vehicles.filter((item)=>item.idleDays>=Math.max(2,Math.floor(periodDays[period]/2))).slice(0,3);

  return <section className="analytics-page" data-stage11-analytics>
    <section className="hero analytics-hero"><div><span className="eyebrow">АНАЛИТИКА</span><h1>Что приносит деньги — видно сразу.</h1><p>Продажи, загрузка парка, источники заявок, воронка и прибыльность каждой модели в одном экране владельца.</p></div><div className="analytics-hero-card"><span>Выручка за период</span><b>{money(data.kpis.revenueVnd)}</b><small>{data.persisted?'D1 · общая база':'DEMO · локальный fallback'} · {busy?'обновляем…':'обновлено'}</small></div></section>

    <section className="analytics-toolbar" data-analytics-filters>
      <div className="period-switch">{([['today','Сегодня'],['7d','7 дней'],['30d','30 дней']] as Array<[AnalyticsPeriod,string]>).map(([key,label])=><button key={key} data-analytics-period={key} className={period===key?'active':''} onClick={()=>setPeriod(key)}>{label}</button>)}</div>
      <label>Филиал<select data-analytics-branch value={branch} onChange={(event)=>setBranch(event.target.value as AnalyticsBranch)}><option value="all">Все точки</option><option value="branch-north">Северный филиал</option><option value="branch-center">Центр города</option></select></label>
    </section>

    <section className="metrics analytics-metrics">
      <Metric label="Выручка" value={money(data.kpis.revenueVnd)} sub="платежи минус возвраты"/>
      <Metric label="Заявки" value={data.kpis.bookings} sub={`${data.kpis.paidBookings} оплачено`}/>
      <Metric label="Средний чек" value={money(data.kpis.averageCheckVnd)} sub="по завершённым оплатам"/>
      <Metric label="Загрузка парка" value={percent(data.kpis.utilizationPercent)} sub={`${data.kpis.activeRentals} активных аренд`}/>
      <Metric label="Повторные клиенты" value={percent(data.kpis.repeatSharePercent)} sub={`${data.kpis.newCustomers} новых за период`}/>
      <Metric label="Конверсия в оплату" value={percent(data.kpis.conversionPercent)} sub="заявка → оплачено"/>
    </section>

    <section className="panel analytics-panel">
      <div className="section-head"><div><span className="eyebrow">ДИНАМИКА</span><h2>Выручка и заявки</h2></div><small>{period==='today'?'Сегодня':period==='7d'?'Последние 7 дней':'Последние 30 дней'}</small></div>
      <div className="trend-chart" data-analytics-trend>{data.trend.map((item)=><div className="trend-column" key={item.day} title={`${item.label}: ${money(item.revenueVnd)} · ${item.bookings} заявок`}><div className="trend-plot"><i style={{height:`${Math.max(item.revenueVnd?8:2,item.revenueVnd/maxRevenue*100)}%`}}></i><em>{item.bookings}</em></div><span>{item.label}</span></div>)}</div>
    </section>

    <section className="analytics-two-col">
      <section className="panel">
        <span className="eyebrow">ВОРОНКА</span><h2>От просмотра до оплаты</h2>
        <div className="funnel-list" data-analytics-funnel>{data.funnel.map((item)=><div key={item.key}><div><span>{item.label}</span><b>{new Intl.NumberFormat('ru-RU').format(item.value)}</b></div><i><u style={{width:`${Math.max(3,item.conversionPercent)}%`}}></u></i><small>{item.conversionPercent}% от просмотров</small></div>)}</div>
      </section>
      <section className="panel">
        <span className="eyebrow">СТАТУСЫ</span><h2>Заявки в работе</h2>
        <div className="analytics-statuses" data-analytics-statuses>{data.statuses.map((item)=><div key={item.status}><span>{statusLabels[item.status]??item.status}</span><b>{item.count}</b><i style={{width:`${Math.max(4,item.count/maxStatus*100)}%`}}></i></div>)}</div>
      </section>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">ИСТОЧНИКИ</span><h2>Откуда приходят бронирования</h2></div><small>доля заявок и оплаченная выручка</small></div>
      <div className="source-grid" data-analytics-sources>{data.sources.map((item)=><article key={item.source}><div><span>{sourceLabels[item.source]??item.source}</span><b>{item.sharePercent}%</b></div><strong>{item.bookings} заявок</strong><small>{money(item.revenueVnd)}</small><i><u style={{width:`${Math.max(4,item.sharePercent)}%`}}></u></i></article>)}</div>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">ДВЕ ТОЧКИ UNIQ</span><h2>Сравнение филиалов</h2></div></div>
      <div className="branch-performance">{data.branches.map((item)=><article key={item.branchId}><span>{item.label}</span><b>{money(item.revenueVnd)}</b><div><small>{item.bookings} заявок</small><small>{item.utilizationPercent}% загрузка</small></div></article>)}</div>
    </section>

    <section className="panel vehicle-profitability" data-vehicle-profitability>
      <div className="section-head"><div><span className="eyebrow">ПРИБЫЛЬНОСТЬ ПАРКА</span><h2>Какая техника зарабатывает</h2></div><small>по выбранному периоду</small></div>
      <div className="vehicle-performance-list">{data.vehicles.map((item,index)=><article key={item.vehicleId}><span className="rank">{index+1}</span><div><b>{item.title}</b><small>{item.rentals} аренд · {item.utilizationPercent}% загрузка</small></div><strong>{money(item.revenueVnd)}</strong><span className={`idle ${item.idleDays>3?'attention':''}`}>{item.idleDays} дн. простоя</span></article>)}</div>
    </section>

    <section className="analytics-two-col analytics-bottom">
      <section className="panel"><span className="eyebrow">КЛИЕНТЫ</span><h2>Структура базы</h2><div className="customer-analytics"><div><b>{data.customers.new}</b><span>Новые</span></div><div><b>{data.customers.repeat}</b><span>Повторные</span></div><div><b>{data.customers.vip}</b><span>VIP</span></div><div><b>{data.customers.inactive}</b><span>Неактивные</span></div></div></section>
      <section className="panel attention-panel"><span className="eyebrow">ВНИМАНИЕ</span><h2>Что можно улучшить</h2>{bestSource?<p><b>{sourceLabels[bestSource.source]??bestSource.source}</b> сейчас даёт больше всего заявок — {bestSource.sharePercent}% потока.</p>:null}{idle.length?<p><b>{idle.map((item)=>item.title).join(', ')}</b> имеют заметный простой в выбранном периоде — их можно использовать в промо-кампании.</p>:<p>Критичного простоя по лидерам парка сейчас нет.</p>}</section>
    </section>
  </section>;
}
