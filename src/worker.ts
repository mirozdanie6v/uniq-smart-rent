import { vehicles, getVehicle } from './domain/catalog.js';
import { businessInfo } from './domain/business.js';
import { calculateRentalTotal, isValidDateRange } from './domain/booking.js';
import type { BookingStatus } from './domain/types.js';
import { ensureDatabase } from './db/bootstrap.js';
import type { D1DatabaseLike } from './db/bootstrap.js';

interface AssetBinding { fetch(request: Request): Promise<Response>; }
interface Env {
  ASSETS: AssetBinding;
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}): Response => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-uniq-admin-key', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS' };
const blockingStatuses: BookingStatus[] = ['confirmed','vehicle_issued','active','return_due'];
const allowedStatuses: BookingStatus[] = ['draft','new','contacted','awaiting_confirmation','confirmed','cancelled','vehicle_issued','active','return_due','returned','completed'];

function isAdmin(request: Request, env: Env): boolean {
  if (!env.STAFF_API_KEY) return false;
  return request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY;
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

async function bookingConflict(db: D1DatabaseLike, vehicleId: string, from: string, to: string, excludeBookingId = ''): Promise<{ type: 'booking' | 'service'; id: string; status?: string } | null> {
  const placeholders = blockingStatuses.map(() => '?').join(',');
  const booking = await db.prepare(`SELECT id, status FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, excludeBookingId, ...blockingStatuses, to, from).first<{ id: string; status: string }>();
  if (booking) return { type: 'booking', id: booking.id, status: booking.status };

  const service = await db.prepare(`SELECT id FROM service_events WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(COALESCE(ends_at, starts_at)) >= date(?) LIMIT 1`)
    .bind(vehicleId, to, from).first<{ id: string }>();
  return service ? { type: 'service', id: service.id } : null;
}

async function createBooking(request: Request, env: Env): Promise<Response> {
  const body = await parseBody(request);
  if (!body) return json({ error: 'invalid_json' }, 400, corsHeaders);
  const vehicleId = text(body.vehicleId), from = text(body.from), to = text(body.to), client = text(body.client), contact = text(body.contact);
  const channel = text(body.channel) || 'other';
  const deliveryLocation = text(body.deliveryLocation), note = text(body.note);
  const vehicle = getVehicle(vehicleId);
  if (!vehicle || !client || !contact || !isValidDateRange(from, to)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);
  if (!env.DB) return json({ error: 'persistence_not_configured', fallback: 'manager_contact', persisted: false }, 503, corsHeaders);

  const conflict = await bookingConflict(env.DB, vehicleId, from, to);
  if (conflict) return json({ error: 'vehicle_window_conflict', persisted: false, conflict }, 409, corsHeaders);

  const customerId = crypto.randomUUID();
  const bookingId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO customers (id, name, contact, preferred_channel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(customerId, client, contact, channel, now, now).run();
  await env.DB.prepare(`INSERT INTO bookings (id, vehicle_id, customer_id, from_at, to_at, status, estimated_total_vnd, delivery_location, note, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, 'smart-rent', ?, ?)`)
    .bind(bookingId, vehicleId, customerId, from, to, calculateRentalTotal(vehicle, from, to), deliveryLocation, note, now, now).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'created', JSON.stringify({ source: 'smart-rent' }), now).run();
  return json({ bookingId, persisted: true, status: 'new' }, 201, corsHeaders);
}

async function availability(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicleId') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!getVehicle(vehicleId) || !isValidDateRange(from, to)) return json({ error: 'invalid_query' }, 400, corsHeaders);
  if (!env.DB) return json({ vehicleId, from, to, mode: 'manager_confirmation', liveData: false, requestAllowed: true }, 200, corsHeaders);
  const conflict = await bookingConflict(env.DB, vehicleId, from, to);
  return json({ vehicleId, from, to, mode: 'd1', liveData: true, requestAllowed: !conflict, conflict }, 200, corsHeaders);
}

async function listBookings(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const result = await env.DB.prepare(`SELECT b.id, b.vehicle_id, b.from_at, b.to_at, b.status, b.estimated_total_vnd, b.delivery_location, b.note, b.source, b.created_at, b.updated_at, c.name AS customer_name, c.contact, c.preferred_channel FROM bookings b JOIN customers c ON c.id = b.customer_id ORDER BY b.created_at DESC LIMIT 200`).all<Record<string, unknown>>();
  return json({ bookings: result.results ?? [] }, 200, corsHeaders);
}

async function updateBookingStatus(request: Request, env: Env, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const body = await parseBody(request);
  const status = text(body?.status) as BookingStatus;
  if (!allowedStatuses.includes(status)) return json({ error: 'invalid_status' }, 400, corsHeaders);

  const booking = await env.DB.prepare('SELECT id, vehicle_id, from_at, to_at, status FROM bookings WHERE id = ? LIMIT 1')
    .bind(bookingId).first<{ id: string; vehicle_id: string; from_at: string; to_at: string; status: string }>();
  if (!booking) return json({ error: 'booking_not_found' }, 404, corsHeaders);

  if (blockingStatuses.includes(status)) {
    const conflict = await bookingConflict(env.DB, booking.vehicle_id, booking.from_at, booking.to_at, bookingId);
    if (conflict) return json({ error: 'vehicle_window_conflict', bookingId, conflict }, 409, corsHeaders);
  }

  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, bookingId).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'status_changed', JSON.stringify({ from: booking.status, to: status }), now).run();
  return json({ bookingId, status, persisted: true }, 200, corsHeaders);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) return new Response(null, { status: 204, headers: corsHeaders });

    if (env.DB) {
      try {
        await ensureDatabase(env.DB);
      } catch (error) {
        console.error('D1 bootstrap failed', error);
        if (url.pathname.startsWith('/api/')) return json({ error: 'database_initialization_failed', d1: true }, 503, corsHeaders);
      }
    }

    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 2 : null, verifiedCatalog: vehicles.length }, 200, corsHeaders);
    if (url.pathname === '/api/business' && request.method === 'GET') return json(businessInfo, 200, corsHeaders);
    if (url.pathname === '/api/vehicles' && request.method === 'GET') return json({ totalPublishedFleet: businessInfo.publicFleetCount, verifiedSubset: vehicles }, 200, corsHeaders);
    if (url.pathname === '/api/availability' && request.method === 'GET') return availability(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'GET') return listBookings(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);
    const statusMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
    if (statusMatch && request.method === 'PATCH') return updateBookingStatus(request, env, decodeURIComponent(statusMatch[1] ?? ''));
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, corsHeaders);
    return env.ASSETS.fetch(request);
  }
};
