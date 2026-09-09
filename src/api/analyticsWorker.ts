import type { D1DatabaseLike } from '../db/bootstrap.js';

interface AnalyticsEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

type Period = 'today' | '7d' | '30d';
type Branch = 'all' | 'branch-north' | 'branch-center';
type Segment = 'new' | 'repeat' | 'vip' | 'inactive';

const headers = {
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods':'GET,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const int = (value: unknown) => Math.round(num(value));
const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function isOwner(request: Request, env: AnalyticsEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

function periodConfig(raw: string | null) {
  const period: Period = raw === 'today' || raw === '30d' ? raw : '7d';
  const days = period === 'today' ? 1 : period === '30d' ? 30 : 7;
  const end = new Date();
  end.setUTCHours(0,0,0,0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { period, days, start:start.toISOString(), startDay:start.toISOString().slice(0,10), endDay:end.toISOString().slice(0,10) };
}

function branchConfig(raw: string | null): Branch {
  return raw === 'branch-north' || raw === 'branch-center' ? raw : 'all';
}

function bookingBranch(branch: Branch) { return branch === 'all' ? { sql:'', args:[] as string[] } : { sql:' AND b.pickup_branch_id=?', args:[branch] }; }
function transactionBranch(branch: Branch) { return branch === 'all' ? { sql:'', args:[] as string[] } : { sql:' AND t.branch_id=?', args:[branch] }; }
function funnelBranch(branch: Branch) { return branch === 'all' ? { sql:'', args:[] as string[] } : { sql:' AND f.branch_id=?', args:[branch] }; }

function branchLabel(id: string) { return id === 'branch-north' ? 'Северный филиал' : id === 'branch-center' ? 'Центр города' : id; }

async function snapshot(db: D1DatabaseLike, periodRaw: string | null, branchRaw: string | null): Promise<Response> {
  const range = periodConfig(periodRaw);
  const branch = branchConfig(branchRaw);
  const bf = bookingBranch(branch);
  const tf = transactionBranch(branch);
  const ff = funnelBranch(branch);

  const summary = await db.prepare(`SELECT COUNT(*) bookings,
      SUM(CASE WHEN b.payment_status='paid' THEN 1 ELSE 0 END) paid_bookings,
      SUM(CASE WHEN b.status IN ('vehicle_issued','active','return_due') THEN 1 ELSE 0 END) active_rentals
    FROM bookings b WHERE datetime(b.created_at)>=datetime(?)${bf.sql}`)
    .bind(range.start,...bf.args).first<Record<string,unknown>>();

  const finance = await db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount_vnd WHEN t.type='refund' AND t.status='completed' THEN -t.amount_vnd ELSE 0 END),0) revenue_vnd,
      SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN 1 ELSE 0 END) payment_count
    FROM transactions t WHERE datetime(t.occurred_at)>=datetime(?)${tf.sql}`)
    .bind(range.start,...tf.args).first<Record<string,unknown>>();

  const customerRows = await db.prepare(`SELECT COALESCE(c.segment,'new') segment,COUNT(DISTINCT c.id) count
    FROM customers c JOIN bookings b ON b.customer_id=c.id
    WHERE datetime(b.created_at)>=datetime(?)${bf.sql}
    GROUP BY COALESCE(c.segment,'new')`)
    .bind(range.start,...bf.args).all<Record<string,unknown>>();
  const customers: { all:number; new:number; repeat:number; vip:number; inactive:number; repeatSharePercent:number } = { all:0,new:0,repeat:0,vip:0,inactive:0,repeatSharePercent:0 };
  for (const row of customerRows.results ?? []) {
    const raw = String(row.segment ?? 'new');
    const key: Segment = raw === 'repeat' || raw === 'vip' || raw === 'inactive' ? raw : 'new';
    const count = int(row.count);
    customers[key] += count;
    customers.all += count;
  }
  customers.repeatSharePercent = customers.all ? pct((customers.repeat + customers.vip) / customers.all * 100) : 0;

  const newCustomers = await db.prepare(`SELECT COUNT(DISTINCT c.id) count FROM customers c JOIN bookings b ON b.customer_id=c.id
    WHERE datetime(c.created_at)>=datetime(?) AND datetime(b.created_at)>=datetime(?)${bf.sql}`)
    .bind(range.start,range.start,...bf.args).first<Record<string,unknown>>();

  const statusRows = await db.prepare(`SELECT b.status status,COUNT(*) count FROM bookings b
    WHERE datetime(b.created_at)>=datetime(?)${bf.sql} GROUP BY b.status ORDER BY count DESC`)
    .bind(range.start,...bf.args).all<Record<string,unknown>>();
  const statuses = (statusRows.results ?? []).map((row)=>({status:String(row.status ?? ''),count:int(row.count)}));

  const sourceRows = await db.prepare(`SELECT COALESCE(NULLIF(b.source_channel,''),'other') source,COUNT(*) bookings,COALESCE(SUM(b.paid_vnd),0) revenue_vnd
    FROM bookings b WHERE datetime(b.created_at)>=datetime(?)${bf.sql}
    GROUP BY COALESCE(NULLIF(b.source_channel,''),'other') ORDER BY bookings DESC`)
    .bind(range.start,...bf.args).all<Record<string,unknown>>();
  const sourceTotal = (sourceRows.results ?? []).reduce((sum,row)=>sum+int(row.bookings),0);
  const sources = (sourceRows.results ?? []).map((row)=>({
    source:String(row.source ?? 'other'),bookings:int(row.bookings),revenueVnd:int(row.revenue_vnd),sharePercent:sourceTotal?pct(int(row.bookings)/sourceTotal*100):0,
  }));

  const bookingsByDayRows = await db.prepare(`SELECT date(b.created_at) day,COUNT(*) bookings FROM bookings b
    WHERE datetime(b.created_at)>=datetime(?)${bf.sql} GROUP BY date(b.created_at)`)
    .bind(range.start,...bf.args).all<Record<string,unknown>>();
  const revenueByDayRows = await db.prepare(`SELECT date(t.occurred_at) day,
      COALESCE(SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount_vnd WHEN t.type='refund' AND t.status='completed' THEN -t.amount_vnd ELSE 0 END),0) revenue_vnd
    FROM transactions t WHERE datetime(t.occurred_at)>=datetime(?)${tf.sql} GROUP BY date(t.occurred_at)`)
    .bind(range.start,...tf.args).all<Record<string,unknown>>();
  const bookingsByDay = new Map<string,number>((bookingsByDayRows.results ?? []).map((row)=>[String(row.day ?? ''),int(row.bookings)]));
  const revenueByDay = new Map<string,number>((revenueByDayRows.results ?? []).map((row)=>[String(row.day ?? ''),int(row.revenue_vnd)]));
  const trend = Array.from({length:range.days},(_,index)=>{
    const date = new Date(`${range.startDay}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+index);
    const day = date.toISOString().slice(0,10);
    return {day,label:new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'short',timeZone:'UTC'}).format(date),revenueVnd:revenueByDay.get(day)??0,bookings:bookingsByDay.get(day)??0};
  });

  const vehicleRows = await db.prepare(`SELECT b.vehicle_id,
      COALESCE(NULLIF(v.title,''),TRIM(v.brand||' '||v.model),b.vehicle_id) title,
      SUM(CASE WHEN b.status!='cancelled' THEN 1 ELSE 0 END) rentals,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' THEN b.paid_vnd ELSE 0 END),0) revenue_vnd,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' AND julianday(b.to_at)>=julianday(b.from_at) THEN julianday(b.to_at)-julianday(b.from_at)+1 ELSE 0 END),0) rental_days
    FROM bookings b JOIN vehicles v ON v.id=b.vehicle_id
    WHERE datetime(b.created_at)>=datetime(?)${bf.sql}
    GROUP BY b.vehicle_id,title ORDER BY revenue_vnd DESC,rentals DESC LIMIT 10`)
    .bind(range.start,...bf.args).all<Record<string,unknown>>();
  const vehicles = (vehicleRows.results ?? []).map((row)=>{
    const occupied=Math.min(range.days,Math.max(0,num(row.rental_days)));
    return {vehicleId:String(row.vehicle_id ?? ''),title:String(row.title ?? row.vehicle_id ?? ''),rentals:int(row.rentals),revenueVnd:int(row.revenue_vnd),utilizationPercent:pct(occupied/range.days*100),idleDays:Math.max(0,range.days-Math.round(occupied))};
  });

  const occupancyRows = await db.prepare(`SELECT b.from_at,b.to_at FROM bookings b
    WHERE date(b.to_at)>=date(?) AND date(b.from_at)<=date(?) AND b.status IN ('confirmed','vehicle_issued','active','return_due','returned','completed')${bf.sql}`)
    .bind(range.startDay,range.endDay,...bf.args).all<Record<string,unknown>>();
  const startMs=Date.parse(`${range.startDay}T00:00:00Z`),endMs=Date.parse(`${range.endDay}T00:00:00Z`),dayMs=86_400_000;
  let occupiedDays=0;
  for(const row of occupancyRows.results ?? []){
    const from=Math.max(startMs,Date.parse(`${String(row.from_at ?? '').slice(0,10)}T00:00:00Z`));
    const to=Math.min(endMs,Date.parse(`${String(row.to_at ?? '').slice(0,10)}T00:00:00Z`));
    if(Number.isFinite(from)&&Number.isFinite(to)&&to>=from) occupiedDays+=Math.floor((to-from)/dayMs)+1;
  }
  const fleetSql=branch==='all'?'':' AND branch_id=?';
  const fleetRow=await db.prepare(`SELECT COUNT(*) count FROM vehicles WHERE published=1 AND archived_at IS NULL${fleetSql}`)
    .bind(...(branch==='all'?[]:[branch])).first<Record<string,unknown>>();
  const fleetCount=Math.max(1,int(fleetRow?.count));
  const utilizationPercent=pct(occupiedDays/(fleetCount*range.days)*100);

  const branchRows=await db.prepare(`SELECT COALESCE(b.pickup_branch_id,'') branch_id,COUNT(*) bookings,COALESCE(SUM(b.paid_vnd),0) revenue_vnd,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' AND julianday(b.to_at)>=julianday(b.from_at) THEN julianday(b.to_at)-julianday(b.from_at)+1 ELSE 0 END),0) rental_days
    FROM bookings b WHERE datetime(b.created_at)>=datetime(?) GROUP BY COALESCE(b.pickup_branch_id,'')`)
    .bind(range.start).all<Record<string,unknown>>();
  const branches=(branchRows.results ?? []).filter((row)=>['branch-north','branch-center'].includes(String(row.branch_id ?? ''))).map((row)=>{
    const id=String(row.branch_id ?? '');
    return {branchId:id,label:branchLabel(id),bookings:int(row.bookings),revenueVnd:int(row.revenue_vnd),utilizationPercent:pct(num(row.rental_days)/(5*range.days)*100)};
  });

  const funnelRow=await db.prepare(`SELECT COALESCE(SUM(f.views),0) views,COALESCE(SUM(f.vehicle_opens),0) vehicle_opens,
      COALESCE(SUM(f.booking_starts),0) booking_starts,COALESCE(SUM(f.payment_starts),0) payment_starts,COALESCE(SUM(f.paid_bookings),0) paid_bookings
    FROM analytics_daily_funnel f WHERE date(f.day)>=date(?)${ff.sql}`)
    .bind(range.startDay,...ff.args).first<Record<string,unknown>>();
  const rawFunnel = [
    ['views','Просмотры',int(funnelRow?.views)],
    ['vehicle_opens','Карточки техники',int(funnelRow?.vehicle_opens)],
    ['booking_starts','Начали бронь',int(funnelRow?.booking_starts)],
    ['payment_starts','Перешли к оплате',int(funnelRow?.payment_starts)],
    ['paid_bookings','Оплатили',int(funnelRow?.paid_bookings)],
  ] as const;
  const funnelBase=Math.max(1,rawFunnel[0][2]);
  const funnel=rawFunnel.map(([key,label,value])=>({key,label,value,conversionPercent:pct(value/funnelBase*100)}));

  const bookings=int(summary?.bookings),paidBookings=int(summary?.paid_bookings),revenueVnd=int(finance?.revenue_vnd),paymentCount=int(finance?.payment_count);
  return json({
    period:range.period,branch,
    kpis:{revenueVnd,bookings,paidBookings,averageCheckVnd:paymentCount?Math.round(revenueVnd/paymentCount):0,utilizationPercent,repeatSharePercent:customers.repeatSharePercent,newCustomers:int(newCustomers?.count),activeRentals:int(summary?.active_rentals),conversionPercent:bookings?pct(paidBookings/bookings*100):0},
    trend,statuses,sources,branches,vehicles,funnel,customers,persisted:true,demoData:true,generatedAt:new Date().toISOString(),
  });
}

export async function handleAnalyticsRequest(request: Request, env: AnalyticsEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/owner/analytics')) return null;
  if (!isOwner(request,env)) return json({error:'unauthorized'},401);
  if (!env.DB) return json({error:'persistence_not_configured',persisted:false},503);
  if (url.pathname === '/api/owner/analytics' && request.method === 'GET') return snapshot(env.DB,url.searchParams.get('period'),url.searchParams.get('branch'));
  return json({error:'not_found'},404);
}
