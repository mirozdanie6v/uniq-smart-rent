import type { D1DatabaseLike } from '../db/bootstrap.js';

interface BookingOpsEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(`${value}T00:00:00Z`).getTime());
const blockingStatuses = ['confirmed','vehicle_issued','active','return_due'];

function isStaff(request: Request, env: BookingOpsEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  const role = request.headers.get('x-uniq-demo-role');
  return env.DEMO_MODE === 'true' && (role === 'owner' || role === 'employee');
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

async function conflict(db: D1DatabaseLike, vehicleId: string, from: string, to: string, excludeBookingId = '') {
  const placeholders = blockingStatuses.map(() => '?').join(',');
  const booking = await db.prepare(`SELECT id, status FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, excludeBookingId, ...blockingStatuses, to, from).first<{ id: string; status: string }>();
  if (booking) return { type: 'booking', id: booking.id, status: booking.status };
  const block = await db.prepare(`SELECT id, block_type FROM vehicle_availability_blocks WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(ends_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, to, from).first<{ id: string; block_type: string }>();
  if (block) return { type: 'block', id: block.id, status: block.block_type };
  return null;
}

async function calendar(request: Request, env: BookingOpsEnv, url: URL): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env)) return json({ error: 'unauthorized' }, 401);
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  const branchId = url.searchParams.get('branchId') ?? '';
  const type = url.searchParams.get('type') ?? '';
  if (!isoDate(from) || !isoDate(to) || from > to) return json({ error: 'invalid_query' }, 400);

  const bookings = await env.DB.prepare(`SELECT b.id, b.vehicle_id, b.from_at, b.to_at, b.status, b.estimated_total_vnd, b.pickup_branch_id,
      c.name AS customer_name, c.contact, COALESCE(v.title, TRIM(v.brand || ' ' || v.model)) AS vehicle_title, v.kind AS vehicle_type, v.branch_id
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status != 'cancelled'
      AND date(b.from_at) <= date(?) AND date(b.to_at) >= date(?)
      AND (? = '' OR COALESCE(b.pickup_branch_id, v.branch_id, '') = ?)
      AND (? = '' OR COALESCE(v.kind, '') = ?)
    ORDER BY b.from_at, b.created_at`).bind(to, from, branchId, branchId, type, type).all<Record<string, unknown>>();

  const blocks = await env.DB.prepare(`SELECT ab.id, ab.vehicle_id, ab.branch_id, ab.block_type, ab.starts_at, ab.ends_at, ab.note,
      COALESCE(v.title, TRIM(v.brand || ' ' || v.model)) AS vehicle_title, v.kind AS vehicle_type
    FROM vehicle_availability_blocks ab
    LEFT JOIN vehicles v ON v.id = ab.vehicle_id
    WHERE date(ab.starts_at) <= date(?) AND date(ab.ends_at) >= date(?)
      AND (? = '' OR COALESCE(ab.branch_id, v.branch_id, '') = ?)
      AND (? = '' OR COALESCE(v.kind, '') = ?)
    ORDER BY ab.starts_at`).bind(to, from, branchId, branchId, type, type).all<Record<string, unknown>>();

  return json({ from, to, bookings: bookings.results ?? [], blocks: blocks.results ?? [], liveData: true });
}

async function createBlock(request: Request, env: BookingOpsEnv): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env)) return json({ error: 'unauthorized' }, 401);
  const payload = await body(request);
  if (!payload) return json({ error: 'invalid_json' }, 400);
  const vehicleId = text(payload.vehicleId), from = text(payload.from), to = text(payload.to);
  const branchId = text(payload.branchId), blockType = text(payload.blockType) || 'manual', note = text(payload.note);
  if (!vehicleId || !isoDate(from) || !isoDate(to) || from > to || !['reservation','rental','service','manual'].includes(blockType)) return json({ error: 'invalid_payload' }, 400);
  const vehicle = await env.DB.prepare('SELECT id FROM vehicles WHERE id = ? LIMIT 1').bind(vehicleId).first<{ id: string }>();
  if (!vehicle) return json({ error: 'vehicle_not_found' }, 404);
  const overlap = await conflict(env.DB, vehicleId, from, to);
  if (overlap) return json({ error: 'vehicle_window_conflict', conflict: overlap }, 409);
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO vehicle_availability_blocks (id, vehicle_id, branch_id, block_type, starts_at, ends_at, note, created_at)
    VALUES (?, ?, NULLIF(?,''), ?, ?, ?, ?, ?)`).bind(id, vehicleId, branchId, blockType, from, to, note, new Date().toISOString()).run();
  return json({ id, vehicleId, from, to, blockType, persisted: true }, 201);
}

async function deleteBlock(request: Request, env: BookingOpsEnv, id: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env)) return json({ error: 'unauthorized' }, 401);
  await env.DB.prepare('DELETE FROM vehicle_availability_blocks WHERE id = ?').bind(id).run();
  return json({ id, removed: true, persisted: true });
}

async function extendBooking(request: Request, env: BookingOpsEnv, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env)) return json({ error: 'unauthorized' }, 401);
  const payload = await body(request);
  const newTo = text(payload?.newTo);
  const note = text(payload?.note);
  if (!isoDate(newTo)) return json({ error: 'invalid_new_end_date' }, 400);
  const booking = await env.DB.prepare(`SELECT b.id, b.vehicle_id, b.to_at, b.status, b.estimated_total_vnd, b.total_vnd,
      COALESCE(p.daily_vnd,0) AS daily_vnd
    FROM bookings b LEFT JOIN pricing p ON p.vehicle_id = b.vehicle_id WHERE b.id = ? LIMIT 1`)
    .bind(bookingId).first<{ id: string; vehicle_id: string; to_at: string; status: string; estimated_total_vnd: number; total_vnd: number; daily_vnd: number }>();
  if (!booking) return json({ error: 'booking_not_found' }, 404);
  if (!['confirmed','vehicle_issued','active','return_due'].includes(booking.status)) return json({ error: 'booking_not_extendable' }, 409);
  const previousTo = booking.to_at.slice(0,10);
  if (newTo <= previousTo) return json({ error: 'new_end_must_be_later' }, 400);
  const overlap = await conflict(env.DB, booking.vehicle_id, previousTo, newTo, bookingId);
  if (overlap) return json({ error: 'vehicle_window_conflict', conflict: overlap }, 409);
  const days = Math.round((new Date(`${newTo}T00:00:00Z`).getTime() - new Date(`${previousTo}T00:00:00Z`).getTime()) / 86400000);
  const additionalAmount = Math.max(0, days * Number(booking.daily_vnd ?? 0));
  const now = new Date().toISOString();
  const extensionId = crypto.randomUUID();
  await env.DB.prepare(`UPDATE bookings SET original_to_at = COALESCE(original_to_at, to_at), to_at = ?, extension_count = extension_count + 1,
      extended_at = ?, estimated_total_vnd = estimated_total_vnd + ?, subtotal_vnd = subtotal_vnd + ?, total_vnd = total_vnd + ?, updated_at = ? WHERE id = ?`)
    .bind(newTo, now, additionalAmount, additionalAmount, additionalAmount, now, bookingId).run();
  await env.DB.prepare(`INSERT INTO booking_extensions (id, booking_id, previous_to_at, new_to_at, additional_days, additional_amount_vnd, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(extensionId, bookingId, previousTo, newTo, days, additionalAmount, note, now).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'extended', JSON.stringify({ previousTo, newTo, days, additionalAmount }), now).run();
  return json({ bookingId, previousTo, newTo, additionalDays: days, additionalAmountVnd: additionalAmount, persisted: true });
}

async function lifecycle(request: Request, env: BookingOpsEnv, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isStaff(request, env)) return json({ error: 'unauthorized' }, 401);
  const payload = await body(request);
  const action = text(payload?.action);
  const booking = await env.DB.prepare('SELECT id, vehicle_id, status FROM bookings WHERE id = ? LIMIT 1').bind(bookingId).first<{ id: string; vehicle_id: string; status: string }>();
  if (!booking) return json({ error: 'booking_not_found' }, 404);
  const allowed: Record<string, { from: string[]; to: string }> = {
    issue: { from: ['confirmed','vehicle_issued'], to: 'active' },
    return: { from: ['active','return_due'], to: 'returned' },
    complete: { from: ['returned'], to: 'completed' },
  };
  const transition = allowed[action];
  if (!transition || !transition.from.includes(booking.status)) return json({ error: 'invalid_lifecycle_transition', from: booking.status, action }, 409);
  const now = new Date().toISOString();
  const stamp = action === 'issue' ? ', issued_at = ?' : action === 'return' ? ', returned_at = ?' : '';
  const values: unknown[] = [transition.to, now];
  if (stamp) values.push(now);
  values.push(bookingId);
  await env.DB.prepare(`UPDATE bookings SET status = ?, updated_at = ?${stamp} WHERE id = ?`).bind(...values).run();
  await env.DB.prepare('UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?').bind(action === 'issue' ? 'hold' : 'ready', now, booking.vehicle_id).run();
  await env.DB.prepare('INSERT INTO booking_status_history (id, booking_id, from_status, to_status, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), bookingId, booking.status, transition.to, `Stage 4 ${action}`, now).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, `lifecycle_${action}`, JSON.stringify({ from: booking.status, to: transition.to }), now).run();
  return json({ bookingId, action, status: transition.to, persisted: true });
}

export async function handleBookingOperationsRequest(request: Request, env: BookingOpsEnv, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/owner/calendar' && request.method === 'GET') return calendar(request, env, url);
  if (url.pathname === '/api/owner/availability-blocks' && request.method === 'POST') return createBlock(request, env);
  const blockMatch = url.pathname.match(/^\/api\/owner\/availability-blocks\/([^/]+)$/);
  if (blockMatch && request.method === 'DELETE') return deleteBlock(request, env, decodeURIComponent(blockMatch[1] ?? ''));
  const extendMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/extend$/);
  if (extendMatch && request.method === 'PATCH') return extendBooking(request, env, decodeURIComponent(extendMatch[1] ?? ''));
  const lifecycleMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/lifecycle$/);
  if (lifecycleMatch && request.method === 'PATCH') return lifecycle(request, env, decodeURIComponent(lifecycleMatch[1] ?? ''));
  return null;
}
