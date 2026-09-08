import type { D1DatabaseLike } from '../db/bootstrap.js';

interface FleetEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

interface VehiclePayload {
  id?: unknown;
  title?: unknown;
  type?: unknown;
  brand?: unknown;
  model?: unknown;
  year?: unknown;
  engine?: unknown;
  dailyVnd?: unknown;
  threeDayVnd?: unknown;
  weeklyVnd?: unknown;
  fourteenDayVnd?: unknown;
  monthlyVnd?: unknown;
  depositVnd?: unknown;
  color?: unknown;
  registrationNumber?: unknown;
  internalNumber?: unknown;
  description?: unknown;
  branchId?: unknown;
  status?: unknown;
  published?: unknown;
  archivedAt?: unknown;
  photos?: unknown;
  sourceUrl?: unknown;
}

const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const asText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const asInt = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
};
const asBool = (value: unknown, fallback = true) => typeof value === 'boolean' ? value : fallback;
const validTypes = new Set(['car','scooter','motorcycle']);
const validStates = new Set(['manager','ready','service','hold']);
const validBranches = new Set(['','branch-north','branch-center']);

function isOwner(request: Request, env: FleetEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `vehicle-${Date.now()}`;
}

function normalize(input: VehiclePayload) {
  const title = asText(input.title);
  const type = asText(input.type);
  const brand = asText(input.brand) || title.split(/\s+/)[0] || 'UNIQ';
  const model = asText(input.model) || title.split(/\s+/).slice(1).join(' ') || title;
  const engine = asText(input.engine) || '—';
  const branchId = asText(input.branchId);
  const status = asText(input.status) || 'manager';
  if (!title || !validTypes.has(type) || !validBranches.has(branchId) || !validStates.has(status)) return null;
  const photos = Array.isArray(input.photos) ? input.photos.map(asText).filter(Boolean).slice(0, 12) : [];
  return {
    id: asText(input.id) || `custom-${slugify(title)}-${Date.now()}`,
    title,
    type,
    brand,
    model,
    year: Math.max(1900, asInt(input.year, new Date().getFullYear())),
    engine,
    dailyVnd: asInt(input.dailyVnd),
    threeDayVnd: asInt(input.threeDayVnd),
    weeklyVnd: asInt(input.weeklyVnd),
    fourteenDayVnd: asInt(input.fourteenDayVnd),
    monthlyVnd: asInt(input.monthlyVnd),
    depositVnd: asInt(input.depositVnd),
    color: asText(input.color),
    registrationNumber: asText(input.registrationNumber),
    internalNumber: asText(input.internalNumber),
    description: asText(input.description),
    branchId,
    status,
    published: asBool(input.published, true),
    archivedAt: asText(input.archivedAt) || null,
    photos,
    sourceUrl: asText(input.sourceUrl),
    ownerManaged: true,
  };
}

async function listManaged(db: D1DatabaseLike) {
  const rows = await db.prepare(`SELECT v.id, v.title, v.kind, v.brand, v.model, v.year, v.engine_label, v.color, v.registration_number, v.internal_number, v.description, v.branch_id, v.status, v.published, v.archived_at, v.owner_managed, p.daily_vnd, p.three_day_vnd, p.weekly_vnd, p.fourteen_day_vnd, p.monthly_vnd, p.deposit_vnd
    FROM vehicles v LEFT JOIN pricing p ON p.vehicle_id = v.id
    WHERE v.owner_managed = 1
    ORDER BY COALESCE(v.archived_at,''), v.sort_order, v.updated_at DESC`).all<Record<string, unknown>>();
  const photoRows = await db.prepare(`SELECT vp.vehicle_id, vp.url FROM vehicle_photos vp JOIN vehicles v ON v.id = vp.vehicle_id WHERE v.owner_managed = 1 ORDER BY vp.vehicle_id, vp.sort_order`).all<{ vehicle_id: string; url: string }>();
  const photos = new Map<string, string[]>();
  for (const row of photoRows.results ?? []) {
    const list = photos.get(row.vehicle_id) ?? [];
    list.push(row.url);
    photos.set(row.vehicle_id, list);
  }
  return (rows.results ?? []).map((row) => ({
    id: String(row.id ?? ''),
    title: String(row.title ?? `${row.brand ?? ''} ${row.model ?? ''}`.trim()),
    type: String(row.kind ?? 'motorcycle'),
    brand: String(row.brand ?? ''),
    model: String(row.model ?? ''),
    year: Number(row.year ?? 0),
    engine: String(row.engine_label ?? ''),
    color: String(row.color ?? ''),
    registrationNumber: String(row.registration_number ?? ''),
    internalNumber: String(row.internal_number ?? ''),
    description: String(row.description ?? ''),
    branchId: String(row.branch_id ?? ''),
    status: String(row.status ?? 'manager'),
    published: Number(row.published ?? 1) === 1,
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    dailyVnd: Number(row.daily_vnd ?? 0),
    threeDayVnd: Number(row.three_day_vnd ?? 0),
    weeklyVnd: Number(row.weekly_vnd ?? 0),
    fourteenDayVnd: Number(row.fourteen_day_vnd ?? 0),
    monthlyVnd: Number(row.monthly_vnd ?? 0),
    depositVnd: Number(row.deposit_vnd ?? 0),
    photos: photos.get(String(row.id ?? '')) ?? [],
    ownerManaged: true,
  }));
}

async function saveVehicle(db: D1DatabaseLike, raw: VehiclePayload) {
  const vehicle = normalize(raw);
  if (!vehicle) return json({ error: 'invalid_vehicle_payload' }, 400);
  const now = new Date().toISOString();
  const category = vehicle.type === 'motorcycle' ? 'motorcycle' : vehicle.type;
  const archivedAt = vehicle.archivedAt;
  const published = archivedAt ? 0 : (vehicle.published ? 1 : 0);
  await db.prepare(`INSERT INTO vehicles (id, slug, brand, model, year, category, engine_label, status, branch_id, kind, title, color, registration_number, internal_number, description, published, archived_at, owner_managed, owner_updated_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?,''), ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET brand=excluded.brand, model=excluded.model, year=excluded.year, category=excluded.category, engine_label=excluded.engine_label, status=excluded.status, branch_id=excluded.branch_id, kind=excluded.kind, title=excluded.title, color=excluded.color, registration_number=excluded.registration_number, internal_number=excluded.internal_number, description=excluded.description, published=excluded.published, archived_at=excluded.archived_at, owner_managed=1, owner_updated_at=excluded.owner_updated_at, updated_at=excluded.updated_at`)
    .bind(vehicle.id, slugify(`${vehicle.brand}-${vehicle.model}-${vehicle.id}`), vehicle.brand, vehicle.model, vehicle.year, category, vehicle.engine, vehicle.status, vehicle.branchId, vehicle.type, vehicle.title, vehicle.color, vehicle.registrationNumber, vehicle.internalNumber, vehicle.description, published, archivedAt, now, now, now).run();
  await db.prepare(`INSERT INTO pricing (vehicle_id, daily_vnd, weekly_vnd, monthly_vnd, deposit_usd, three_day_vnd, fourteen_day_vnd, deposit_vnd, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    ON CONFLICT(vehicle_id) DO UPDATE SET daily_vnd=excluded.daily_vnd, weekly_vnd=excluded.weekly_vnd, monthly_vnd=excluded.monthly_vnd, three_day_vnd=excluded.three_day_vnd, fourteen_day_vnd=excluded.fourteen_day_vnd, deposit_vnd=excluded.deposit_vnd, updated_at=excluded.updated_at`)
    .bind(vehicle.id, vehicle.dailyVnd, vehicle.weeklyVnd, vehicle.monthlyVnd, vehicle.threeDayVnd, vehicle.fourteenDayVnd, vehicle.depositVnd, now).run();
  await db.prepare('DELETE FROM vehicle_photos WHERE vehicle_id = ?').bind(vehicle.id).run();
  for (let index = 0; index < vehicle.photos.length; index += 1) {
    await db.prepare('INSERT INTO vehicle_photos (id, vehicle_id, url, sort_order, source_url, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(`${vehicle.id}-owner-${index + 1}`, vehicle.id, vehicle.photos[index] ?? '', index, vehicle.sourceUrl || null, now).run();
  }
  await db.prepare('INSERT INTO activity_log (id, entity_type, entity_id, action, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), 'vehicle', vehicle.id, 'owner_saved', JSON.stringify({ published: Boolean(published), branchId: vehicle.branchId, status: vehicle.status }), now).run();
  const all = await listManaged(db);
  return json({ vehicle: all.find((item) => item.id === vehicle.id) ?? vehicle, persisted: true }, 200);
}

async function patchVehicle(db: D1DatabaseLike, request: Request, id: string) {
  const payload = await body(request);
  const action = asText(payload?.action);
  const now = new Date().toISOString();
  const existing = await db.prepare('SELECT id FROM vehicles WHERE id = ? LIMIT 1').bind(id).first<{ id: string }>();
  if (!existing) return json({ error: 'vehicle_not_found' }, 404);
  if (action === 'archive') {
    await db.prepare('UPDATE vehicles SET archived_at = ?, published = 0, owner_managed = 1, owner_updated_at = ?, updated_at = ? WHERE id = ?').bind(now, now, now, id).run();
  } else if (action === 'restore') {
    await db.prepare('UPDATE vehicles SET archived_at = NULL, owner_managed = 1, owner_updated_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
  } else {
    return json({ error: 'unsupported_action' }, 400);
  }
  const all = await listManaged(db);
  return json({ vehicle: all.find((item) => item.id === id) ?? null, persisted: true });
}

async function removeVehicle(db: D1DatabaseLike, id: string) {
  const existing = await db.prepare('SELECT id FROM vehicles WHERE id = ? AND owner_managed = 1 LIMIT 1').bind(id).first<{ id: string }>();
  if (!existing) return json({ error: 'vehicle_not_found' }, 404);
  const now = new Date().toISOString();

  if (!id.startsWith('custom-')) {
    await db.prepare('UPDATE vehicles SET owner_managed = 0, archived_at = NULL, published = 1, owner_updated_at = ?, updated_at = ? WHERE id = ?').bind(now, now, id).run();
    return json({ removed: false, overrideReset: true, persisted: true });
  }

  const booking = await db.prepare('SELECT id FROM bookings WHERE vehicle_id = ? LIMIT 1').bind(id).first<{ id: string }>();
  if (booking) {
    await db.prepare('UPDATE vehicles SET archived_at = ?, published = 0, owner_managed = 1, owner_updated_at = ?, updated_at = ? WHERE id = ?').bind(now, now, now, id).run();
    return json({ removed: false, archived: true, persisted: true });
  }
  await db.prepare('DELETE FROM vehicles WHERE id = ?').bind(id).run();
  return json({ removed: true, persisted: true });
}

export async function handleFleetManagementRequest(request: Request, env: FleetEnv, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/fleet-overrides' && request.method === 'GET') {
    if (!env.DB) return json({ vehicles: [], persisted: false });
    return json({ vehicles: await listManaged(env.DB), persisted: true });
  }

  if (!url.pathname.startsWith('/api/owner/fleet')) return null;
  if (!env.DB) return json({ error: 'persistence_not_configured' }, 503);
  if (!isOwner(request, env)) return json({ error: 'unauthorized' }, 401);

  if (url.pathname === '/api/owner/fleet' && request.method === 'POST') {
    const payload = await body(request);
    if (!payload) return json({ error: 'invalid_json' }, 400);
    return saveVehicle(env.DB, payload);
  }

  const match = url.pathname.match(/^\/api\/owner\/fleet\/([^/]+)$/);
  if (!match) return json({ error: 'not_found' }, 404);
  const id = decodeURIComponent(match[1] ?? '');
  if (request.method === 'PATCH') return patchVehicle(env.DB, request, id);
  if (request.method === 'DELETE') return removeVehicle(env.DB, id);
  return json({ error: 'method_not_allowed' }, 405);
}
