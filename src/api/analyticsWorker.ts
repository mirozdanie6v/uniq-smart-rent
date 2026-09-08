import type { D1DatabaseLike } from '../db/bootstrap.js';

interface AnalyticsEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

type Period = 'today' | '7d' | '30d';
type Branch = 'all' | 'branch-north' | 'branch-center';

const responseHeaders = {
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods':'GET,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers:responseHeaders });
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const integer = (value: unknown) => Math.round(number(value));
const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function isOwner(request: Request, env: AnalyticsEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

function resolvePeriod(raw: string | null): { period: Period; days: number; start: string; startDay: string; endDay: string } {
  const period: Period = raw === 'today' || raw === '30d' ? raw : '7d';
  const days = period === 'today' ? 1 : period === '30d' ? 30 : 7;
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { period, days, start:start.toISOString(), startDay:start.toISOString().slice(0,10), endDay:end.toISOString().slice(0,10) };
}

function resolveBranch(raw: string | null): Branch {
  return raw === 'branch-north' || raw === 'branch-center' ? raw : 'all';
}

function branchWhere(alias: string, branch: Branch): { sql: string; args: string[] } {
  return branch === 'all' ? { sql:'', args:[] } : { sql:` AND ${alias}.pickup_branch_id = ?`, args:[branch] };
}

function transactionBranchWhere(alias: string, branch: Branch): { sql: string; args: string[] } {
  return branch === 'all' ? { sql:'', args:[] } : { sql:` AND ${alias}.branch_id = ?`, args:[branch] };
}

function funnelBranchWhere(alias: string, branch: Branch): { sql: string; args: string[] } {
  return branch === 'all' ? { sql:'', args:[] } : { sql:` AND ${alias}.branch_id = ?`, args:[branch] };
}

function sourceLabel(source: string): string {
  return ({ telegram_mini_app:'Telegram Mini App', website:'Сайт', office:'Офис', google:'Google', instagram:'Instagram', partner:'Партнёры', qr:'QR-коды', other:'Другое' } as Record<string,string>)[source] ?? source;
}

function branchLabel(branchId: string): string {
  return branchId === 'branch-north' ? 'Северный филиал' : branchId === 'branch-center' ? 'Центр города' : 'Без филиала';
}

async function analyticsSnapshot(env: AnalyticsEnv, periodRaw: string | null, branchRaw: string | null): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured', persisted:false },503);
  const db = env.DB;
  const window = resolvePeriod(periodRaw);
  const branch = resolveBranch(branchRaw);
  const bookingFilter = branchWhere('b',branch);
  const transactionFilter = transactionBranchWhere('t',branch);
  const funnelFilter = funnelBranchWhere('f',branch);

  const bookingSummary = await db.prepare(`
    SELECT
      COUNT(*) AS bookings,
      SUM(CASE WHEN b.payment_status='paid' THEN 1 ELSE 0 END) AS paid_bookings,
      SUM(CASE WHEN b.status IN ('vehicle_issued','active','return_due') THEN 1 ELSE 0 END) AS active_rentals,
      SUM(CASE WHEN b.status!='cancelled' THEN b.paid_vnd ELSE 0 END) AS paid_vnd
    FROM bookings b
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}`)
    .bind(window.start,...bookingFilter.args).first<Record<string,unknown>>();

  const financeSummary = await db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount_vnd WHEN t.type='refund' AND t.status='completed' THEN -t.amount_vnd ELSE 0 END),0) AS revenue_vnd,
      COALESCE(SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN 1 ELSE 0 END),0) AS payment_count
    FROM transactions t
    WHERE datetime(t.occurred_at) >= datetime(?)${transactionFilter.sql}`)
    .bind(window.start,...transactionFilter.args).first<Record<string,unknown>>();

  const customerRows = await db.prepare(`
    SELECT COALESCE(c.segment,'new') AS segment, COUNT(DISTINCT c.id) AS count
    FROM customers c
    JOIN bookings b ON b.customer_id=c.id
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}
    GROUP BY COALESCE(c.segment,'new')`)
    .bind(window.start,...bookingFilter.args).all<Record<string,unknown>>();
  const customers = { all:0, new:0, repeat:0, vip:0, inactive:0, repeatSharePercent:0 };
  for (const row of customerRows.results ?? []) {
    const key = String(row.segment ?? 'new') as 'new'|'repeat'|'vip'|'inactive';
    const count = integer(row.count);
    if (key in customers && key !== 'all' && key !== 'repeatSharePercent') customers[key] = count;
    customers.all += count;
  }
  customers.repeatSharePercent = customers.all ? clampPercent((customers.repeat + customers.vip) / customers.all * 100) : 0;

  const newCustomerRow = await db.prepare(`
    SELECT COUNT(DISTINCT c.id) AS count
    FROM customers c
    JOIN bookings b ON b.customer_id=c.id
    WHERE datetime(c.created_at) >= datetime(?) AND datetime(b.created_at) >= datetime(?)${bookingFilter.sql}`)
    .bind(window.start,window.start,...bookingFilter.args).first<Record<string,unknown>>();

  const statusRows = await db.prepare(`
    SELECT b.status AS status, COUNT(*) AS count
    FROM bookings b
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}
    GROUP BY b.status ORDER BY count DESC`)
    .bind(window.start,...bookingFilter.args).all<Record<string,unknown>>();
  const statuses = (statusRows.results ?? []).map((row)=>({ status:String(row.status ?? ''), count:integer(row.count) }));

  const sourceRows = await db.prepare(`
    SELECT COALESCE(NULLIF(b.source_channel,''),'other') AS source, COUNT(*) AS bookings, COALESCE(SUM(b.paid_vnd),0) AS revenue_vnd
    FROM bookings b
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}
    GROUP BY COALESCE(NULLIF(b.source_channel,''),'other')
    ORDER BY bookings DESC`)
    .bind(window.start,...bookingFilter.args).all<Record<string,unknown>>();
  const totalSourceBookings = (sourceRows.results ?? []).reduce((sum,row)=>sum + integer(row.bookings),0);
  const sources = (sourceRows.results ?? []).map((row)=>({
    source:String(row.source ?? 'other'),
    label:sourceLabel(String(row.source ?? 'other')),
    bookings:integer(row.bookings),
    revenueVnd:integer(row.revenue_vnd),
    sharePercent:totalSourceBookings ? clampPercent(integer(row.bookings) / totalSourceBookings * 100) : 0,
  }));

  const dailyBookingRows = await db.prepare(`
    SELECT date(b.created_at) AS day, COUNT(*) AS bookings
    FROM bookings b
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}
    GROUP BY date(b.created_at)`)
    .bind(window.start,...bookingFilter.args).all<Record<string,unknown>>();
  const dailyRevenueRows = await db.prepare(`
    SELECT date(t.occurred_at) AS day,
      COALESCE(SUM(CASE WHEN t.type='payment' AND t.status='completed' THEN t.amount_vnd WHEN t.type='refund' AND t.status='completed' THEN -t.amount_vnd ELSE 0 END),0) AS revenue_vnd
    FROM transactions t
    WHERE datetime(t.occurred_at) >= datetime(?)${transactionFilter.sql}
    GROUP BY date(t.occurred_at)`)
    .bind(window.start,...transactionFilter.args).all<Record<string,unknown>>();
  const bookingByDay = new Map((dailyBookingRows.results ?? []).map((row)=>[String(row.day ?? ''),integer(row.bookings)]));
  const revenueByDay = new Map((dailyRevenueRows.results ?? []).map((row)=>[String(row.day ?? ''),integer(row.revenue_vnd)]));
  const trend = [];
  for (let index=0; index<window.days; index++) {
    const date = new Date(`${window.startDay}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+index);
    const day = date.toISOString().slice(0,10);
    trend.push({ day, label:new Intl.DateTimeFormat('ru-RU',{ day:'2-digit', month:'short', timeZone:'UTC' }).format(date), revenueVnd:revenueByDay.get(day) ?? 0, bookings:bookingByDay.get(day) ?? 0 });
  }

  const performanceRows = await db.prepare(`
    SELECT b.vehicle_id,
      COALESCE(NULLIF(v.title,''), TRIM(v.brand || ' ' || v.model), b.vehicle_id) AS title,
      COUNT(*) AS rentals,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' THEN b.paid_vnd ELSE 0 END),0) AS revenue_vnd,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' AND julianday(b.to_at) >= julianday(b.from_at) THEN julianday(b.to_at)-julianday(b.from_at)+1 ELSE 0 END),0) AS rental_days
    FROM bookings b
    JOIN vehicles v ON v.id=b.vehicle_id
    WHERE datetime(b.created_at) >= datetime(?)${bookingFilter.sql}
    GROUP BY b.vehicle_id, title
    ORDER BY revenue_vnd DESC, rentals DESC
    LIMIT 10`)
    .bind(window.start,...bookingFilter.args).all<Record<string,unknown>>();
  const vehicles = (performanceRows.results ?? []).map((row)=>{
    const rentalDays = Math.max(0,number(row.rental_days));
    const occupied = Math.min(window.days,rentalDays);
    return {
      vehicleId:String(row.vehicle_id ?? ''), title:String(row.title ?? row.vehicle_id ?? ''), rentals:integer(row.rentals), revenueVnd:integer(row.revenue_vnd),
      utilizationPercent:clampPercent(occupied / window.days * 100), idleDays:Math.max(0,window.days-Math.round(occupied)),
    };
  });

  const overlapArgs = [window.startDay,window.endDay,...bookingFilter.args];
  const occupancyRows = await db.prepare(`
    SELECT b.vehicle_id,b.from_at,b.to_at,b.status
    FROM bookings b
    WHERE date(b.to_at) >= date(?) AND date(b.from_at) <= date(?)
      AND b.status IN ('confirmed','vehicle_issued','active','return_due','returned','completed')${bookingFilter.sql}`)
    .bind(...overlapArgs).all<Record<string,unknown>>();
  const startMs = Date.parse(`${window.startDay}T00:00:00Z`), endMs = Date.parse(`${window.endDay}T00:00:00Z`);
  let occupiedDays = 0;
  const msDay = 86_400_000;
  for (const row of occupancyRows.results ?? []) {
    const fromMs = Math.max(startMs, Date.parse(`${String(row.from_at).slice(0,10)}T00:00:00Z`));
    const toMs = Math.min(endMs, Date.parse(`${String(row.to_at).slice(0,10)}T00:00:00Z`));
    if (Number.isFinite(fromMs) && Number.isFinite(toMs) && toMs >= fromMs) occupiedDays += Math.floor((toMs-fromMs)/msDay)+1;
  }
  const fleetBranchSql = branch === 'all' ? '' : ' AND branch_id=?';
  const fleetCountRow = await db.prepare(`SELECT COUNT(*) AS count FROM vehicles WHERE published=1 AND archived_at IS NULL${fleetBranchSql}`)
    .bind(...(branch === 'all' ? [] : [branch])).first<Record<string,unknown>>();
  const fleetCount = Math.max(1,integer(fleetCountRow?.count));
  const utilizationPercent = clampPercent(occupiedDays / (fleetCount * window.days) * 100);

  const branchRows = await db.prepare(`
    SELECT COALESCE(b.pickup_branch_id,'unassigned') AS branch_id, COUNT(*) AS bookings,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' THEN b.paid_vnd ELSE 0 END),0) AS revenue_vnd,
      COALESCE(SUM(CASE WHEN b.status!='cancelled' AND julianday(b.to_at)>=julianday(b.from_at) THEN julianday(b.to_at)-julianday(b.from_at)+1 ELSE 0 END),0) AS rental_days
    FROM bookings b
    WHERE datetime(b.created_at) >= datetime(?)
    GROUP BY COALESCE(b.pickup_branch_id,'unassigned')`)
    .bind(window.start).all<Record<string,unknown>>();
  const branches = (branchRows.results ?? []).filter((row)=>String(row.branch_id ?? '') !== 'unassigned').map((row)=>{
    const id = String(row.branch_id ?? '');
    const branchFleet = id === 'branch-north' || id === 'branch-center' ? 5 : Math.max(1,fleetCount);
    return { branchId:id, label:branchLabel(id), bookings:integer(row.bookings), revenueVnd:integer(row.revenue_vnd), utilizationPercent:clampPercent(number(row.rental_days)/(branchFleet*window.days)*100) };
  });

  const funnelRow = await db.prepare(`
    SELECT COALESCE(SUM(f.views),0) AS views, COALESCE(SUM(f.vehicle_opens),0) AS vehicle_opens,
      COALESCE(SUM(f.booking_starts),0) AS booking_starts, COALESCE(SUM(f.payment_starts),0) AS payment_starts,
      COALESCE(SUM(f.paid_bookings),0) AS paid_bookings
    FROM analytics_daily_funnel f
    WHERE date(f.day) >= date(?)${funnelFilter.sql}`)
    .bind(window.startDay,...funnelFilter.args).first<Record<string,unknown>>();
  const funnelValues = [
    ['views','Просмотры',integer(funnelRow?.views)],
    ['vehicle_opens','Карточки техники',integer(funnelRow?.vehicle_opens)],
    ['booking_starts','Начали бронь',integer(funnelRow?.booking_starts)],
    ['payment_starts','Перешли к оплате',integer(funnelRow?.payment_starts)],
    ['paid_bookings','Оплатили',integer(funnelRow?.paid_bookings)],
  ] as const;
  const funnelBase = Math.max(1,funnelValues[0][2]);
  const funnel = funnelValues.map(([key,label,value])=>({ key,label,value,conversionPercent:clampPercent(value/funnelBase*100) }));

  const bookings = integer(bookingSummary?.bookings);
  const paidBookings = integer(bookingSummary?.paid_bookings);
  const revenueVnd = integer(financeSummary?.revenue_vnd);
  const paymentCount = Math.max(0,integer(financeSummary?.payment_count));
  const kpis = {
    revenueVnd,
    bookings,
    paidBookings,
    averageCheckVnd:paymentCount ? Math.round(revenueVnd/paymentCount) : 0,
    utilizationPercent,
    repeatSharePercent:customers.repeatSharePercent,
    newCustomers:integer(newCustomerRow?.count),
    activeRentals:integer(bookingSummary?.active_rentals),
    conversionPercent:bookings ? clampPercent(paidBookings/bookings*100) : 0,
  };

  return json({ period:window.period, branch, kpis, trend, statuses, sources, branches, vehicles, funnel, customers, persisted:true, demoData:true, generatedAt:new Date().toISOString() });
}

export async function handleAnalyticsRequest(request: Request, env: AnalyticsEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/owner/analytics')) return null;
  if (!isOwner(request,env)) return json({ error:'unauthorized' },401);
  if (url.pathname === '/api/owner/analytics' && request.method === 'GET') return analyticsSnapshot(env,url.searchParams.get('period'),url.searchParams.get('branch'));
  return json({ error:'not_found' },404);
}
