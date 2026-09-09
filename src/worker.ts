import { vehicles } from './domain/catalog.js';
import { businessInfo } from './domain/business.js';
import { calculateRentalTotalForPricing, isValidDateRange, normalizeBookingStatus } from './domain/booking.js';
import { normalizeContactKey } from './domain/customer.js';
import { normalizeFleetStatus } from './domain/fleet.js';
import type { BookingStatus } from './domain/types.js';
import { ensureDatabase } from './db/bootstrap.js';
import type { D1DatabaseLike } from './db/bootstrap.js';

interface AssetBinding { fetch(request: Request): Promise<Response>; }
interface Env {
  ASSETS: AssetBinding;
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
}

interface PublishedVehicle {
  id: string;
  slug: string;
  sourceUrl?: string;
  type: string;
  title: string;
  year: number;
  engine?: string;
  weight?: string;
  cruiseSpeed?: string;
  fuelUse?: string;
  capacity?: string;
  dailyVnd: number;
  weeklyVnd: number;
  monthlyVnd: number;
  depositVnd?: number;
  photos?: string[];
  sourcePhotoCount?: number;
}

interface FleetManifest {
  generatedAt?: string;
  typeCounts?: Record<string, number>;
  fleet?: PublishedVehicle[];
}

let publishedFleetPromise: Promise<PublishedVehicle[]> | null = null;

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

async function loadPublishedFleet(request: Request, env: Env): Promise<PublishedVehicle[]> {
  if (!publishedFleetPromise) {
    publishedFleetPromise = (async () => {
      const assetUrl = new URL('/assets/fleet-manifest.json', request.url);
      const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET' }));
      if (!response.ok) throw new Error(`fleet_manifest_http_${response.status}`);
      const manifest = await response.json() as FleetManifest;
      if (!Array.isArray(manifest.fleet) || manifest.fleet.length === 0) throw new Error('fleet_manifest_empty');
      return manifest.fleet;
    })().catch(error => {
      publishedFleetPromise = null;
      throw error;
    });
  }
  return publishedFleetPromise;
}

async function findPublishedVehicle(request: Request, env: Env, vehicleId: string): Promise<PublishedVehicle | null> {
  const fleet = await loadPublishedFleet(request, env);
  return fleet.find(vehicle => vehicle.id === vehicleId) ?? null;
}

function splitVehicleTitle(title: string): { brand: string; model: string } {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { brand: parts[0] ?? 'UNIQ', model: parts[0] ?? 'Vehicle' };
  return { brand: parts[0] ?? 'UNIQ', model: parts.slice(1).join(' ') };
}

async function ensureVehicleRecord(db: D1DatabaseLike, vehicle: PublishedVehicle): Promise<void> {
  const { brand, model } = splitVehicleTitle(vehicle.title);
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO vehicles (id, slug, brand, model, year, category, engine_label, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manager_confirmation', ?, ?)
    ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, brand = excluded.brand, model = excluded.model, year = excluded.year, category = excluded.category, engine_label = excluded.engine_label, updated_at = excluded.updated_at`)
    .bind(vehicle.id, vehicle.slug, brand, model, Number(vehicle.year) || 0, vehicle.type || 'vehicle', vehicle.engine || '', now, now).run();
  await db.prepare(`INSERT INTO pricing (vehicle_id, daily_vnd, weekly_vnd, monthly_vnd, deposit_usd, updated_at)
    VALUES (?, ?, ?, ?, COALESCE((SELECT deposit_usd FROM pricing WHERE vehicle_id = ?), 0), ?)
    ON CONFLICT(vehicle_id) DO UPDATE SET daily_vnd = excluded.daily_vnd, weekly_vnd = excluded.weekly_vnd, monthly_vnd = excluded.monthly_vnd, updated_at = excluded.updated_at`)
    .bind(vehicle.id, Number(vehicle.dailyVnd) || 0, Number(vehicle.weeklyVnd) || 0, Number(vehicle.monthlyVnd) || 0, vehicle.id, now).run();
}

async function bookingConflict(db: D1DatabaseLike, vehicleId: string, from: string, to: string, excludeBookingId = ''): Promise<{ type: 'booking' | 'service'; id: string; status?: string } | null> {
  const placeholders = blockingStatuses.map(() => '?').join(',');
  const booking = await db.prepare(`SELECT id, status FROM bookings WHERE vehicle_id = ? AND id != ? AND status IN (${placeholders}) AND date(from_at) <= date(?) AND date(to_at) >= date(?) LIMIT 1`)
    .bind(vehicleId, excludeBookingId, ...blockingStatuses, to, from).first<{ id: string; status: string }>();
  if (booking) return { type: 'booking', id: booking.id, status: booking.status };

  const service = await db.prepare(`SELECT id FROM service_events WHERE vehicle_id = ? AND date(starts_at) <= date(?) AND date(COALESCE(ends_at, starts_at)) >= date(?) LIMIT 1`)
    .bind(vehicleId, to, from).first<{ id: string }>();
  return service ? { type: 'service', id: service.id } : null;
}

async function findOrCreateCustomer(db: D1DatabaseLike, input: { name: string; contact: string; channel: string; now: string }): Promise<string> {
  const contactKey = normalizeContactKey(input.contact);
  const existing = contactKey
    ? await db.prepare('SELECT id FROM customers WHERE contact_key = ? ORDER BY updated_at DESC LIMIT 1').bind(contactKey).first<{ id: string }>()
    : null;

  if (existing) {
    await db.prepare('UPDATE customers SET name = ?, contact = ?, contact_key = ?, preferred_channel = ?, updated_at = ? WHERE id = ?')
      .bind(input.name, input.contact, contactKey, input.channel, input.now, existing.id).run();
    return existing.id;
  }

  const customerId = crypto.randomUUID();
  await db.prepare('INSERT INTO customers (id, name, contact, contact_key, preferred_channel, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(customerId, input.name, input.contact, contactKey, input.channel, input.now, input.now).run();
  return customerId;
}

async function createBooking(request: Request, env: Env): Promise<Response> {
  const body = await parseBody(request);
  if (!body) return json({ error: 'invalid_json' }, 400, corsHeaders);
  const vehicleId = text(body.vehicleId), from = text(body.from), to = text(body.to), client = text(body.client), contact = text(body.contact);
  const channel = text(body.channel) || 'other';
  const deliveryLocation = text(body.deliveryLocation), note = text(body.note);
  if (!vehicleId || !client || !contact || !isValidDateRange(from, to)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);

  let vehicle: PublishedVehicle | null = null;
  try { vehicle = await findPublishedVehicle(request, env, vehicleId); } catch { return json({ error: 'fleet_manifest_unavailable' }, 503, corsHeaders); }
  if (!vehicle || !(vehicle.dailyVnd > 0)) return json({ error: 'invalid_booking_payload' }, 400, corsHeaders);
  if (!env.DB) return json({ error: 'persistence_not_configured', fallback: 'manager_contact', persisted: false }, 503, corsHeaders);

  await ensureVehicleRecord(env.DB, vehicle);
  const conflict = await bookingConflict(env.DB, vehicleId, from, to);
  if (conflict) return json({ error: 'vehicle_window_conflict', persisted: false, conflict }, 409, corsHeaders);

  const bookingId = crypto.randomUUID();
  const now = new Date().toISOString();
  const customerId = await findOrCreateCustomer(env.DB, { name: client, contact, channel, now });
  const estimatedTotalVnd = calculateRentalTotalForPricing(vehicle, from, to);
  await env.DB.prepare(`INSERT INTO bookings (id, vehicle_id, customer_id, from_at, to_at, status, estimated_total_vnd, delivery_location, note, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, 'smart-rent', ?, ?)`)
    .bind(bookingId, vehicleId, customerId, from, to, estimatedTotalVnd, deliveryLocation, note, now, now).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'booking', bookingId, 'created', JSON.stringify({ source: 'smart-rent', customerId, vehicleId }), now).run();
  return json({ bookingId, customerId, persisted: true, status: 'new', estimatedTotalVnd }, 201, corsHeaders);
}

async function availability(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const vehicleId = url.searchParams.get('vehicleId') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!vehicleId || !isValidDateRange(from, to)) return json({ error: 'invalid_query' }, 400, corsHeaders);
  let vehicle: PublishedVehicle | null = null;
  try { vehicle = await findPublishedVehicle(request, env, vehicleId); } catch { return json({ error: 'fleet_manifest_unavailable' }, 503, corsHeaders); }
  if (!vehicle) return json({ error: 'invalid_query' }, 400, corsHeaders);
  if (!env.DB) return json({ vehicleId, from, to, mode: 'manager_confirmation', liveData: false, requestAllowed: true }, 200, corsHeaders);
  await ensureVehicleRecord(env.DB, vehicle);
  const conflict = await bookingConflict(env.DB, vehicleId, from, to);
  return json({ vehicleId, from, to, mode: 'd1', liveData: true, requestAllowed: !conflict, conflict }, 200, corsHeaders);
}

async function listPublishedVehicles(request: Request, env: Env): Promise<Response> {
  try {
    const fleet = await loadPublishedFleet(request, env);
    return json({ totalPublishedFleet: fleet.length, vehicles: fleet }, 200, corsHeaders);
  } catch {
    return json({ error: 'fleet_manifest_unavailable', totalPublishedFleet: businessInfo.publicFleetCount, vehicles: [] }, 503, corsHeaders);
  }
}

async function syncFleetCatalog(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  let fleet: PublishedVehicle[];
  try { fleet = await loadPublishedFleet(request, env); } catch { return json({ error: 'fleet_manifest_unavailable' }, 503, corsHeaders); }
  for (const vehicle of fleet) await ensureVehicleRecord(env.DB, vehicle);
  return json({ synced: fleet.length, source: 'assets/fleet-manifest.json' }, 200, corsHeaders);
}

async function listFleetState(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const result = await env.DB.prepare(`SELECT v.id, v.slug, v.brand, v.model, v.year, v.category, v.engine_label, v.status, v.updated_at, p.daily_vnd, p.weekly_vnd, p.monthly_vnd FROM vehicles v LEFT JOIN pricing p ON p.vehicle_id = v.id ORDER BY v.brand, v.model, v.year DESC`).all<Record<string, unknown>>();
  return json({ fleet: result.results ?? [] }, 200, corsHeaders);
}

async function updateFleetStatus(request: Request, env: Env, vehicleId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const body = await parseBody(request);
  const rawStatus = text(body?.status);
  const status = normalizeFleetStatus(rawStatus);
  if (!status) return json({ error: 'invalid_fleet_status' }, 400, corsHeaders);
  let vehicle: PublishedVehicle | null = null;
  try { vehicle = await findPublishedVehicle(request, env, vehicleId); } catch { return json({ error: 'fleet_manifest_unavailable' }, 503, corsHeaders); }
  if (!vehicle) return json({ error: 'vehicle_not_found' }, 404, corsHeaders);
  await ensureVehicleRecord(env.DB, vehicle);
  const now = new Date().toISOString();
  await env.DB.prepare('UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, vehicleId).run();
  await env.DB.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'vehicle', vehicleId, 'status_changed', JSON.stringify({ to: status, requested: rawStatus }), now).run();
  return json({ vehicleId, status, persisted: true }, 200, corsHeaders);
}

async function listBookings(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const result = await env.DB.prepare(`SELECT b.id, b.vehicle_id, b.customer_id, b.from_at, b.to_at, b.status, b.estimated_total_vnd, b.delivery_location, b.note, b.source, b.created_at, b.updated_at, c.name AS customer_name, c.contact, c.preferred_channel FROM bookings b JOIN customers c ON c.id = b.customer_id ORDER BY b.created_at DESC LIMIT 200`).all<Record<string, unknown>>();
  return json({ bookings: result.results ?? [] }, 200, corsHeaders);
}

async function listCustomers(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const result = await env.DB.prepare(`SELECT c.id, c.name, c.contact, c.preferred_channel, c.created_at, c.updated_at, COUNT(b.id) AS booking_count, MAX(b.created_at) AS last_booking_at FROM customers c LEFT JOIN bookings b ON b.customer_id = c.id GROUP BY c.id, c.name, c.contact, c.preferred_channel, c.created_at, c.updated_at ORDER BY COALESCE(MAX(b.created_at), c.updated_at) DESC LIMIT 200`).all<Record<string, unknown>>();
  return json({ customers: result.results ?? [] }, 200, corsHeaders);
}

async function updateBookingStatus(request: Request, env: Env, bookingId: string): Promise<Response> {
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503, corsHeaders);
  if (!isAdmin(request, env)) return json({ error: 'unauthorized' }, 401, corsHeaders);
  const body = await parseBody(request);
  const rawStatus = text(body?.status);
  const status = normalizeBookingStatus(rawStatus);
  if (!status || !allowedStatuses.includes(status)) return json({ error: 'invalid_status' }, 400, corsHeaders);

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
    .bind(crypto.randomUUID(), 'booking', bookingId, 'status_changed', JSON.stringify({ from: booking.status, to: status, requested: rawStatus }), now).run();
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

    if (url.pathname === '/api/health') return json({ ok: true, service: 'uniq-smart-rent', d1: Boolean(env.DB), d1Ready: Boolean(env.DB), schemaVersion: env.DB ? 3 : null, legacyVerifiedSubset: vehicles.length, publicFleetCount: businessInfo.publicFleetCount }, 200, corsHeaders);
    if (url.pathname === '/api/business' && request.method === 'GET') return json(businessInfo, 200, corsHeaders);
    if (url.pathname === '/api/vehicles' && request.method === 'GET') return listPublishedVehicles(request, env);
    if (url.pathname === '/api/availability' && request.method === 'GET') return availability(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'GET') return listBookings(request, env);
    if (url.pathname === '/api/bookings' && request.method === 'POST') return createBooking(request, env);
    if (url.pathname === '/api/customers' && request.method === 'GET') return listCustomers(request, env);
    if (url.pathname === '/api/fleet' && request.method === 'GET') return listFleetState(request, env);
    if (url.pathname === '/api/admin/sync-fleet' && request.method === 'POST') return syncFleetCatalog(request, env);
    const bookingStatusMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/status$/);
    if (bookingStatusMatch && request.method === 'PATCH') return updateBookingStatus(request, env, decodeURIComponent(bookingStatusMatch[1] ?? ''));
    const vehicleStatusMatch = url.pathname.match(/^\/api\/vehicles\/([^/]+)\/status$/);
    if (vehicleStatusMatch && request.method === 'PATCH') return updateFleetStatus(request, env, decodeURIComponent(vehicleStatusMatch[1] ?? ''));
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404, corsHeaders);
    return env.ASSETS.fetch(request);
  }
};
