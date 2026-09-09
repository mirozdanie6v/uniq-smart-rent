import type { D1DatabaseLike } from '../db/bootstrap.js';

type FinanceEnv = { DB?: D1DatabaseLike; STAFF_API_KEY?: string; DEMO_MODE?: string };
type Period = 'today' | '7d' | '30d' | 'all';
type FinanceTransactionType = 'payment' | 'refund' | 'deposit_received' | 'deposit_returned' | 'cash_adjustment' | 'service_expense';

const headers = {
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods':'GET,POST,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const int = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

function isOwner(request: Request, env: FinanceEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function periodStart(period: Period): string | null {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'today') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return start.toISOString();
  }
  const days = period === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function financeWhere(period: Period, branchId: string) {
  const clauses = ["t.status='completed'"];
  const binds: unknown[] = [];
  const start = periodStart(period);
  if (start) { clauses.push('datetime(t.occurred_at) >= datetime(?)'); binds.push(start); }
  if (branchId && branchId !== 'all') { clauses.push('t.branch_id = ?'); binds.push(branchId); }
  return { sql: clauses.join(' AND '), binds };
}

async function snapshot(env: FinanceEnv, period: Period, branchId: string): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const { sql, binds } = financeWhere(period, branchId);
  const rows = await env.DB.prepare(`SELECT t.id,t.booking_id,t.payment_id,t.branch_id,t.vehicle_id,t.customer_id,t.type,t.status,t.amount_vnd,t.method,t.occurred_at,t.note,COALESCE(b.name,'Все точки') branch_name,COALESCE(c.name,'') customer_name,COALESCE(v.title,TRIM(COALESCE(v.brand,'')||' '||COALESCE(v.model,'')),'') vehicle_title FROM transactions t LEFT JOIN branches b ON b.id=t.branch_id LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN vehicles v ON v.id=t.vehicle_id WHERE ${sql} ORDER BY datetime(t.occurred_at) DESC LIMIT 150`)
    .bind(...binds).all<Record<string, unknown>>();
  const transactions = (rows.results ?? []).map((row) => ({
    id:String(row.id ?? ''), bookingId:String(row.booking_id ?? ''), paymentId:String(row.payment_id ?? ''), branchId:String(row.branch_id ?? ''), branchName:String(row.branch_name ?? ''), vehicleId:String(row.vehicle_id ?? ''), vehicleTitle:String(row.vehicle_title ?? ''), customerId:String(row.customer_id ?? ''), customerName:String(row.customer_name ?? ''), type:String(row.type ?? ''), status:String(row.status ?? ''), amountVnd:Number(row.amount_vnd ?? 0), method:String(row.method ?? ''), occurredAt:String(row.occurred_at ?? ''), note:String(row.note ?? ''),
  }));
  const completed = transactions.filter((item) => item.status === 'completed');
  const payments = completed.filter((item) => item.type === 'payment').reduce((sum,item) => sum + item.amountVnd,0);
  const refunds = completed.filter((item) => item.type === 'refund').reduce((sum,item) => sum + item.amountVnd,0);
  const serviceExpenses = completed.filter((item) => item.type === 'service_expense').reduce((sum,item) => sum + item.amountVnd,0);
  const cash = completed.filter((item) => item.type === 'payment' && item.method === 'cash').reduce((sum,item) => sum + item.amountVnd,0);
  const online = payments - cash;
  const depositsReceived = completed.filter((item) => item.type === 'deposit_received').reduce((sum,item) => sum + item.amountVnd,0);
  const depositsReturned = completed.filter((item) => item.type === 'deposit_returned').reduce((sum,item) => sum + item.amountVnd,0);

  const pendingWhere: string[] = ["p.status='pending'"];
  const pendingBinds: unknown[] = [];
  const start = periodStart(period);
  if (start) { pendingWhere.push('datetime(p.created_at) >= datetime(?)'); pendingBinds.push(start); }
  if (branchId && branchId !== 'all') { pendingWhere.push('b.pickup_branch_id = ?'); pendingBinds.push(branchId); }
  const pending = await env.DB.prepare(`SELECT COUNT(*) count, COALESCE(SUM(p.amount_vnd),0) amount FROM payments p LEFT JOIN bookings b ON b.id=p.booking_id WHERE ${pendingWhere.join(' AND ')}`).bind(...pendingBinds).first<{ count:number; amount:number }>();

  const discountWhere: string[] = ['b.discount_vnd > 0'];
  const discountBinds: unknown[] = [];
  if (start) { discountWhere.push('datetime(b.created_at) >= datetime(?)'); discountBinds.push(start); }
  if (branchId && branchId !== 'all') { discountWhere.push('b.pickup_branch_id = ?'); discountBinds.push(branchId); }
  const discounts = await env.DB.prepare(`SELECT COALESCE(SUM(b.discount_vnd),0) amount FROM bookings b WHERE ${discountWhere.join(' AND ')}`).bind(...discountBinds).first<{ amount:number }>();

  const branches = await env.DB.prepare("SELECT id,name,address FROM branches WHERE status='active' ORDER BY name").all<Record<string, unknown>>();
  return json({
    period,
    branchId:branchId || 'all',
    summary:{
      grossPaymentsVnd:payments,
      netRevenueVnd:Math.max(0,payments-refunds-serviceExpenses),
      onlineVnd:online,
      cashVnd:cash,
      pendingPaymentsVnd:Number(pending?.amount ?? 0),
      pendingPaymentsCount:Number(pending?.count ?? 0),
      depositsHeldVnd:Math.max(0,depositsReceived-depositsReturned),
      depositsReceivedVnd:depositsReceived,
      depositsReturnedVnd:depositsReturned,
      refundsVnd:refunds,
      discountsVnd:Number(discounts?.amount ?? 0),
      serviceExpensesVnd:serviceExpenses,
    },
    transactions,
    branches:(branches.results ?? []).map((row) => ({ id:String(row.id ?? ''), name:String(row.name ?? ''), address:String(row.address ?? '') })),
    demo:env.DEMO_MODE === 'true',
    persisted:true,
  });
}

async function createDeposit(request: Request, env: FinanceEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' },503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' },400);
  const action = text(payload.action);
  const type: FinanceTransactionType = action === 'return' ? 'deposit_returned' : 'deposit_received';
  const amountVnd = int(payload.amountVnd);
  const branchId = text(payload.branchId);
  const method = text(payload.method) || 'cash';
  const bookingId = text(payload.bookingId);
  const note = text(payload.note) || (type === 'deposit_received' ? 'Депозит принят' : 'Депозит возвращён');
  if (!amountVnd || !['branch-north','branch-center'].includes(branchId) || !['cash','bank_transfer','card'].includes(method)) return json({ error:'invalid_deposit_payload' },400);
  if (bookingId) {
    const booking = await env.DB.prepare('SELECT id,deposit_vnd,deposit_received_vnd,deposit_returned_vnd FROM bookings WHERE id=? LIMIT 1').bind(bookingId).first<{ id:string; deposit_vnd:number; deposit_received_vnd:number; deposit_returned_vnd:number }>();
    if (!booking) return json({ error:'booking_not_found' },404);
    const received = Number(booking.deposit_received_vnd ?? 0) + (type === 'deposit_received' ? amountVnd : 0);
    const returned = Number(booking.deposit_returned_vnd ?? 0) + (type === 'deposit_returned' ? amountVnd : 0);
    const status = returned > 0 && returned >= received ? 'returned' : returned > 0 ? 'partially_returned' : received > 0 ? 'held' : 'pending';
    await env.DB.prepare('UPDATE bookings SET deposit_received_vnd=?,deposit_returned_vnd=?,deposit_status=?,updated_at=? WHERE id=?').bind(received,returned,status,new Date().toISOString(),bookingId).run();
  }
  const id = crypto.randomUUID(); const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO transactions (id,booking_id,branch_id,type,status,amount_vnd,method,occurred_at,note,created_at) VALUES (?,?,? ,?,'completed',?,?,?,?,?)`)
    .bind(id,bookingId || null,branchId,type,amountVnd,method,now,note,now).run();
  return json({ transaction:{ id,bookingId,branchId,type,status:'completed',amountVnd,method,occurredAt:now,note },persisted:true },201);
}

async function createRefund(request: Request, env: FinanceEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' },503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' },400);
  const sourceTransactionId = text(payload.sourceTransactionId);
  const amountVnd = int(payload.amountVnd);
  const reason = text(payload.reason) || 'Возврат клиенту';
  if (!sourceTransactionId || !amountVnd) return json({ error:'invalid_refund_payload' },400);
  const source = await env.DB.prepare(`SELECT id,booking_id,payment_id,branch_id,vehicle_id,customer_id,type,status,amount_vnd,method FROM transactions WHERE id=? LIMIT 1`).bind(sourceTransactionId).first<Record<string, unknown>>();
  if (!source || source.type !== 'payment' || source.status !== 'completed') return json({ error:'source_payment_transaction_not_found' },404);
  const already = await env.DB.prepare(`SELECT COALESCE(SUM(amount_vnd),0) amount FROM payment_refunds WHERE source_transaction_id=? AND status='completed'`).bind(sourceTransactionId).first<{ amount:number }>();
  const remaining = Math.max(0,Number(source.amount_vnd ?? 0)-Number(already?.amount ?? 0));
  if (amountVnd > remaining) return json({ error:'refund_exceeds_remaining',remainingVnd:remaining },409);
  const refundId = crypto.randomUUID(); const txId = crypto.randomUUID(); const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO payment_refunds (id,source_transaction_id,payment_id,booking_id,amount_vnd,status,reason,is_demo,created_at,completed_at) VALUES (?,?,?,?,?,'completed',?,1,?,?)`)
    .bind(refundId,sourceTransactionId,source.payment_id || null,source.booking_id || null,amountVnd,reason,now,now).run();
  await env.DB.prepare(`INSERT INTO transactions (id,booking_id,payment_id,branch_id,vehicle_id,customer_id,type,status,amount_vnd,method,occurred_at,note,created_at) VALUES (?,?,?,?,?,?,'refund','completed',?,?,?,?,?)`)
    .bind(txId,source.booking_id || null,source.payment_id || null,source.branch_id || null,source.vehicle_id || null,source.customer_id || null,amountVnd,String(source.method ?? 'refund'),now,reason,now).run();
  if (source.payment_id) {
    const payment = await env.DB.prepare('SELECT amount_vnd FROM payments WHERE id=? LIMIT 1').bind(String(source.payment_id)).first<{ amount_vnd:number }>();
    if (payment) {
      const totalRefunded = Number(already?.amount ?? 0)+amountVnd;
      const status = totalRefunded >= Number(payment.amount_vnd ?? 0) ? 'refunded' : 'partially_refunded';
      await env.DB.prepare('UPDATE payments SET status=?,updated_at=? WHERE id=?').bind(status,now,String(source.payment_id)).run();
    }
  }
  if (source.booking_id) {
    const booking = await env.DB.prepare('SELECT paid_vnd,total_vnd FROM bookings WHERE id=? LIMIT 1').bind(String(source.booking_id)).first<{ paid_vnd:number; total_vnd:number }>();
    if (booking) {
      const paidVnd = Math.max(0,Number(booking.paid_vnd ?? 0)-amountVnd);
      const paymentStatus = paidVnd <= 0 ? 'unpaid' : paidVnd >= Number(booking.total_vnd ?? 0) ? 'paid' : 'partially_paid';
      await env.DB.prepare('UPDATE bookings SET paid_vnd=?,payment_status=?,updated_at=? WHERE id=?').bind(paidVnd,paymentStatus,now,String(source.booking_id)).run();
    }
  }
  return json({ refund:{ id:refundId,transactionId:txId,sourceTransactionId,amountVnd,reason,status:'completed',remainingVnd:remaining-amountVnd },persisted:true },201);
}

export async function handleFinanceRequest(request: Request, env: FinanceEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/owner/finance')) return null;
  if (!isOwner(request,env)) return json({ error:'unauthorized' },401);
  if (url.pathname === '/api/owner/finance' && request.method === 'GET') {
    const period = (url.searchParams.get('period') ?? '7d') as Period;
    const safePeriod: Period = ['today','7d','30d','all'].includes(period) ? period : '7d';
    return snapshot(env,safePeriod,url.searchParams.get('branch') ?? 'all');
  }
  if (url.pathname === '/api/owner/finance/deposits' && request.method === 'POST') return createDeposit(request,env);
  if (url.pathname === '/api/owner/finance/refunds' && request.method === 'POST') return createRefund(request,env);
  return json({ error:'not_found' },404);
}
