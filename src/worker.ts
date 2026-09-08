import { vehicles, getVehicle } from './domain/catalog.js';
import { businessInfo } from './domain/business.js';
import { calculateRentalTotal, isValidDateRange } from './domain/booking.js';
import type { BookingStatus } from './domain/types.js';
import type { D1DatabaseLike } from './db/bootstrap.js';
import { handleFleetManagementRequest } from './api/ownerFleetWorker.js';
import { handleBookingOperationsRequest } from './api/bookingOperationsWorker.js';
import { handlePaymentRequest } from './api/paymentWorker.js';
import { handleTeamRequest } from './api/teamWorker.js';
import { handleFinanceRequest } from './api/financeWorker.js';
import { handleServiceRequest } from './api/serviceWorker.js';
import { handleMarketingRequest } from './api/marketingWorker.js';

interface AssetBinding { fetch(request: Request): Promise<Response>; }
interface Env {
  ASSETS: AssetBinding;
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
  [key: string]: unknown;
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}): Response => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

const corsHeaders = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,x-uniq-admin-key,x-uniq-demo-role', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
const blockingStatuses: BookingStatus[] = ['confirmed','vehicle_issued','active','return_due'];
const allowedStatuses: BookingStatus[] = ['draft','new','contacted','awaiting_confirmation','confirmed','cancelled','vehicle_issued','active','return_due','returned','completed'];

function isAdmin(request: Request, env: Env): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  const role = request.headers.get('x-uniq-demo-role');
  return env.DEMO_MODE === 'true' && (role === 'owner' || role === 'employee');
}

async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }

async function d1VehicleRates(db: D1DatabaseLike, vehicleId: string): Promise<{ daily: number; weekly: number; monthly: number } | null> {
  const row = await db.prepare(`SELECT v.id, v.archived_at, v.published, COALESCE(p.daily_vnd,0) AS daily_vnd, COALESCE(p.weekly_vnd,0) AS weekly_vnd, COALESCE(p.monthly_vnd,0) AS monthly_vnd FROM vehicles v LEFT JOIN pricing p ON p.vehicle_id=v.id WHERE v.id=? LIMIT 1`)
    .bind(vehicleId).first<{ id: string; archived_at: string | null; published: number; daily_vnd: number; weekly_vnd: number; monthly_vnd: number }>();
  if (!row || row.archived_at || Number(row.published ?? 1) === 0) return null;
  return { daily: Number(row.daily_vnd ?? 0), weekly: Number(row.weekly_vnd ?? 0), monthly: Number(row.monthly_vnd ?? 0) };
}

function calculateD1Total(rates: { daily: number; weekly: number; monthly: number }, from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  let days = Math.max(1, Math.ceil((end - start) / 86_400_000));
  let total = 0;
  if (rates.monthly > 0) { const count = Math.floor(days / 30); total += count * rates.monthly; days -= count * 30; }
  if (rates.weekly > 0) { const count = Math.floor(days / 7); total += count * rates.weekly; days -= count * 7; }
  total += days * rates.daily;
  return total;
}

async function bookingConflict(db: D1DatabaseLike, vehicleId: string, from: string, to: string, excludeBookingId = ''): Promise<{ type: 'booking' | 'service'; id: string; status?: string } | null> {
  const placeholders = blockingStatuses.map(() => '?').join(',');
  const booking = await db.prepare(`SELECT id, status FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, excludeBookingId, ...blockingStatuses, to, from).first<{ id: string; status: string }>();
  if (booking) return { type: 'booking', id: booking.id, status: booking.status };

  const block = await db.prepare(`SELECT id, block_type FROM vehicle_availability_blocks WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(ends_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, to, from).first<{ id: string; block_type: string }>();
  if (block) return { type: 'service', id: block.id, status: block.block_type };
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
  if (!client || !contact || !isValidDateRange(from, to)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);
  if (!env.DB) return json({ error: 'persistence_not_configured', fallback: 'manager_contact', persisted: false }, 503, corsHeaders);
  const staticVehicle = getVehicle(vehicleId);
  const rates = staticVehicle ? null : await d1VehicleRates(env.DB, vehicleId);
  if (!staticVehicle && !rates) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);
  const conflict = await bookingConflict(env.DB, vehicleId, from, to);
  if (conflict) return json({ error: 'vehicle_window_conflict', persisted: false, conflict }, 409, corsHeaders);
  const estimatedTotal = staticVehicle ? calculateRentalTotal(staticVehicle, from, to) : calculateD1Total(rates!, from, to);
  const customerId = crypto.randomUUID();
  const bookingId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT INTO customers (id, name, contact, preferred_channel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(customerId, client, contact, channel, now, now).run();
  await env.DB.prepare(`INSERT INTO bookings (id, vehicle_id, customer_id, from_at, to_at, status, estimated_total_vnd, delivery_location, note, source, subtotal_vnd, total_vnd, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, 'smart-rent', ?, ?, ?, ?)`)
    .bind(bookingId, vehicleId, customerId, from, to, estimatedTotal, deliveryLocation, note, estimatedTotal, estimatedTotal, now, now).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'created', JSON.stringify({ source: 'smart-rent' }), now).run();
  return json({ bookingId, persisted: true, status: 'new', estimatedTotalVnd: estimatedTotal }, 201, corsHeaders);
}

async function availability(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicleId') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!isValidDateRange(from, to)) return json({ error: 'invalid_query' }, 400, corsHeaders);
  if (!env.DB) return json({ vehicleId, from, to, mode: 'manager_confirmation', liveData: false, requestAllowed: true }, 200, corsHeaders);
  const validVehicle = Boolean(getVehicle(vehicleId)) || Boolean(await d1VehicleRates(env.DB, vehicleId));
  if (!validVehicle) return json({ error: 'invalid_query' }, 400, corsHeaders);
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

    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 10 : null, verifiedCatalog: vehicles.length, ownerFleetManagement: true, bookingCalendar: true, rentalLifecycle: true, paymentCheckout: true, paymentProviders: 7, employeesBranches: true, vehicleTransfers: true, ownerFinance: true, refunds: true, deposits: true, serviceManagement: true, serviceInspections: true, serviceExpenses: true, marketingCampaigns: true, promotionsMarketing: true, marketingSegments: true }, 200, corsHeaders);
    if (url.pathname === '/api/business' && request.method === 'GET') return json(businessInfo, 200, corsHeaders);
    if (url.pathname === '/api/vehicles' && request.method === 'GET') return json({ totalPublishedFleet: businessInfo.publicFleetCount, verifiedSubset: vehicles }, 200, corsHeaders);
    if (url.pathname === '/api/availability' && request.method === 'GET') return availability(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'GET') return listBookings(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);
    const fleetManagementResponse = await handleFleetManagementRequest(request, env, url);
    if (fleetManagementResponse) return fleetManagementResponse;
    const bookingOperationsResponse = await handleBookingOperationsRequest(request, env, url);
    if (bookingOperationsResponse) return bookingOperationsResponse;
    const paymentResponse = await handlePaymentRequest(request, env, url);
    if (paymentResponse) return paymentResponse;
    const teamResponse = await handleTeamRequest(request, env, url);
    if (teamResponse) return teamResponse;
    const financeResponse = await handleFinanceRequest(request, env, url);
    if (financeResponse) return financeResponse;
    const serviceResponse = await handleServiceRequest(request, env, url);
    if (serviceResponse) return serviceResponse;
    const marketingResponse = await handleMarketingRequest(request, env, url);
    if (marketingResponse) return marketingResponse;
    const statusMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
    if (statusMatch && request.method === 'PATCH') return updateBookingStatus(request, env, decodeURIComponent(statusMatch[1] ?? ''));
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, corsHeaders);
    return env.ASSETS.fetch(request);
  }
};
