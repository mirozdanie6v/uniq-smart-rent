import { vehicles, getVehicle } from './domain/catalog.js';
import { businessInfo } from './domain/business.js';
import { calculateRentalTotal, isValidDateRange } from './domain/booking.js';
import type { BookingStatus } from './domain/types.js';

type D1Result = { success?: boolean; results?: unknown[]; meta?: unknown };
interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}
interface D1DatabaseLike { prepare(query: string): D1PreparedStatementLike; }
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

function isAdmin(request: Request, env: Env): boolean {
  if (!env.STAFF_API_KEY) return false;
  return request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY;
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

async function createBooking(request: Request, env: Env): Promise<Response> {
  const body = await parseBody(request);
  if (!body) return json({ error: 'invalid_json' }, 400, corsHeaders);
  const vehicleId = text(body.vehicleId), from = text(body.from), to = text(body.to), client = text(body.client), contact = text(body.contact);
  const channel = text(body.channel) || 'other';
  const deliveryLocation = text(body.deliveryLocation), note = text(body.note);
  const vehicle = getVehicle(vehicleId);
  if (!vehicle || !client || !contact || !isValidDateRange(from, to)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);
  if (!env.DB) return json({ error: 'persistence_not_configured', fallback: 'manager_contact', persisted: false }, 503, corsHeaders);

  const placeholders = blockingStatuses.map(() => '?').join(',');
  const conflict = await env.DB.prepare(`SELECT id FROM bookings WHERE vehicle_id = ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, ...blockingStatuses, to, from).first<{ id: string }>();
  if (conflict) return json({ error: 'vehicle_window_conflict', persisted: false }, 409, corsHeaders);

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
  const placeholders = blockingStatuses.map(() => '?').join(',');
  const conflict = await env.DB.prepare(`SELECT id, status FROM bookings WHERE vehicle_id = ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, ...blockingStatuses, to, from).first<{ id: string; status: string }>();
  return json({ vehicleId, from, to, mode: 'd1', liveData: true, requestAllowed: !conflict, conflict: conflict ? { id: conflict.id, status: conflict.status } : null }, 200, corsHeaders);
}

async function updateBookingStatus(request: Request, env: Env, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const body = await parseBody(request);
  const status = text(body?.status) as BookingStatus;
  const allowed: BookingStatus[] = ['draft','new','contacted','awaiting_confirmation','confirmed','cancelled','vehicle_issued','active','return_due','returned','completed'];
  if (!allowed.includes(status)) return json({ error: 'invalid_status' }, 400, corsHeaders);
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, bookingId).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'status_changed', JSON.stringify({ status }), now).run();
  return json({ bookingId, status, persisted: true }, 200, corsHeaders);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) return new Response(null, { status: 204, headers: corsHeaders });
    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), verifiedCatalog: vehicles.length }, 200, corsHeaders);
    if (url.pathname === '/api/business' && request.method === 'GET') return json(businessInfo, 200, corsHeaders);
    if (url.pathname === '/api/vehicles' && request.method === 'GET') return json({ totalPublishedFleet: businessInfo.publicFleetCount, verifiedSubset: vehicles }, 200, corsHeaders);
    if (url.pathname === '/api/availability' && request.method === 'GET') return availability(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);
    const statusMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
    if (statusMatch && request.method === 'PATCH') return updateBookingStatus(request, env, decodeURIComponent(statusMatch[1] ?? ''));
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, corsHeaders);
    return env.ASSETS.fetch(request);
  }
};
