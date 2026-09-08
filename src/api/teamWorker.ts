import type { D1DatabaseLike } from '../db/bootstrap.js';

interface TeamEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

const headers = {
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const boolStatus = (value: unknown) => value === 'inactive' ? 'inactive' : 'active';
const roles = new Set(['owner','admin','manager','branch_staff']);
const branches = new Set(['branch-north','branch-center']);
const permissions = new Set(['bookings.view','bookings.manage','customers.view','fleet.status','fleet.pricing','payments.manage','finance.view','team.manage','transfers.manage']);
const transferStatuses = new Set(['planned','in_transit','completed','cancelled']);

function isOwner(request: Request, env: TeamEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

async function listTeam(env: TeamEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured', persisted:false }, 503);
  const branchRows = await env.DB.prepare(`SELECT id, code, name, address, maps_url, COALESCE(phone,'') phone, status FROM branches ORDER BY CASE id WHEN 'branch-north' THEN 1 ELSE 2 END`).all<Record<string, unknown>>();
  const employeeRows = await env.DB.prepare(`SELECT id, COALESCE(branch_id,'branch-center') branch_id, name, role, COALESCE(phone,'') phone, COALESCE(telegram,'') telegram, COALESCE(zalo,'') zalo, status FROM employees ORDER BY status DESC, role, name`).all<Record<string, unknown>>();
  const employees = [] as Record<string, unknown>[];
  for (const row of employeeRows.results ?? []) {
    const result = await env.DB.prepare('SELECT permission FROM employee_permissions WHERE employee_id=? ORDER BY permission').bind(String(row.id ?? '')).all<{ permission:string }>();
    employees.push({
      id:String(row.id ?? ''), branchId:String(row.branch_id ?? 'branch-center'), name:String(row.name ?? ''), role:String(row.role ?? 'branch_staff'),
      phone:String(row.phone ?? ''), telegram:String(row.telegram ?? ''), zalo:String(row.zalo ?? ''), status:String(row.status ?? 'active'),
      permissions:(result.results ?? []).map((item) => item.permission),
    });
  }
  const transferRows = await env.DB.prepare(`SELECT t.id,t.vehicle_id,t.from_branch_id,t.to_branch_id,t.status,COALESCE(t.employee_id,'') employee_id,COALESCE(t.planned_at,'') planned_at,COALESCE(t.completed_at,'') completed_at,COALESCE(t.note,'') note,COALESCE(v.title,TRIM(v.brand||' '||v.model),t.vehicle_id) vehicle_title FROM vehicle_transfers t LEFT JOIN vehicles v ON v.id=t.vehicle_id ORDER BY t.created_at DESC LIMIT 50`).all<Record<string, unknown>>();
  const transfers = (transferRows.results ?? []).map((row) => ({
    id:String(row.id ?? ''), vehicleId:String(row.vehicle_id ?? ''), vehicleTitle:String(row.vehicle_title ?? ''),
    fromBranchId:String(row.from_branch_id ?? 'branch-center'), toBranchId:String(row.to_branch_id ?? 'branch-north'), status:String(row.status ?? 'planned'),
    employeeId:String(row.employee_id ?? ''), plannedAt:String(row.planned_at ?? ''), completedAt:String(row.completed_at ?? ''), note:String(row.note ?? ''), persisted:true,
  }));
  return json({
    branches:(branchRows.results ?? []).map((row) => ({
      id:String(row.id ?? ''), code:String(row.code ?? ''), name:String(row.name ?? ''), address:String(row.address ?? ''), mapsUrl:String(row.maps_url ?? ''), phone:String(row.phone ?? ''), status:String(row.status ?? 'active'),
    })),
    employees,
    transfers,
    persisted:true,
  });
}

async function saveEmployee(request: Request, env: TeamEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' }, 400);
  const id = text(payload.id) || crypto.randomUUID();
  const name = text(payload.name);
  const role = text(payload.role);
  const branchId = text(payload.branchId);
  const status = boolStatus(payload.status);
  const requestedPermissions = Array.isArray(payload.permissions) ? payload.permissions.map(text).filter((item) => permissions.has(item)) : [];
  if (!name || !roles.has(role) || !branches.has(branchId)) return json({ error:'invalid_employee' }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO employees (id,branch_id,name,role,phone,telegram,zalo,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET branch_id=excluded.branch_id,name=excluded.name,role=excluded.role,phone=excluded.phone,telegram=excluded.telegram,zalo=excluded.zalo,status=excluded.status,updated_at=excluded.updated_at`)
    .bind(id, branchId, name, role, text(payload.phone), text(payload.telegram), text(payload.zalo), status, now, now).run();
  await env.DB.prepare('DELETE FROM employee_permissions WHERE employee_id=?').bind(id).run();
  for (const permission of requestedPermissions) await env.DB.prepare('INSERT OR IGNORE INTO employee_permissions (employee_id,permission) VALUES (?,?)').bind(id, permission).run();
  return json({ employee:{ id, branchId, name, role, phone:text(payload.phone), telegram:text(payload.telegram), zalo:text(payload.zalo), status, permissions:requestedPermissions }, persisted:true });
}

async function createTransfer(request: Request, env: TeamEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' }, 400);
  const id = text(payload.id) || crypto.randomUUID();
  const vehicleId = text(payload.vehicleId);
  const vehicleTitle = text(payload.vehicleTitle) || vehicleId;
  const fromBranchId = text(payload.fromBranchId);
  const toBranchId = text(payload.toBranchId);
  const employeeId = text(payload.employeeId);
  const plannedAt = text(payload.plannedAt) || new Date().toISOString();
  const note = text(payload.note);
  if (!vehicleId || !branches.has(fromBranchId) || !branches.has(toBranchId) || fromBranchId === toBranchId) return json({ error:'invalid_transfer' }, 400);
  const vehicle = await env.DB.prepare('SELECT id FROM vehicles WHERE id=? LIMIT 1').bind(vehicleId).first<{ id:string }>();
  if (!vehicle) return json({ transfer:{ id,vehicleId,vehicleTitle,fromBranchId,toBranchId,status:'planned',employeeId,plannedAt,completedAt:'',note,persisted:false }, persisted:false, reason:'vehicle_not_synced_to_d1' }, 200);
  await env.DB.prepare(`INSERT INTO vehicle_transfers (id,vehicle_id,from_branch_id,to_branch_id,status,planned_at,employee_id,note,created_at) VALUES (?,?,?,?, 'planned',?,?,?,?)`)
    .bind(id, vehicleId, fromBranchId, toBranchId, plannedAt, employeeId || null, note, new Date().toISOString()).run();
  return json({ transfer:{ id,vehicleId,vehicleTitle,fromBranchId,toBranchId,status:'planned',employeeId,plannedAt,completedAt:'',note,persisted:true }, persisted:true });
}

async function updateTransfer(request: Request, env: TeamEnv, transferId: string): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const payload = await body(request);
  const status = text(payload?.status);
  if (!transferStatuses.has(status)) return json({ error:'invalid_transfer_status' }, 400);
  const transfer = await env.DB.prepare(`SELECT t.id,t.vehicle_id,t.from_branch_id,t.to_branch_id,t.status,COALESCE(t.employee_id,'') employee_id,COALESCE(t.planned_at,'') planned_at,COALESCE(t.completed_at,'') completed_at,COALESCE(t.note,'') note,COALESCE(v.title,TRIM(v.brand||' '||v.model),t.vehicle_id) vehicle_title FROM vehicle_transfers t LEFT JOIN vehicles v ON v.id=t.vehicle_id WHERE t.id=? LIMIT 1`).bind(transferId).first<Record<string, unknown>>();
  if (!transfer) return json({ error:'transfer_not_found' }, 404);
  const completedAt = status === 'completed' ? new Date().toISOString() : String(transfer.completed_at ?? '');
  await env.DB.prepare('UPDATE vehicle_transfers SET status=?, completed_at=? WHERE id=?').bind(status, completedAt || null, transferId).run();
  if (status === 'completed') await env.DB.prepare('UPDATE vehicles SET branch_id=?, updated_at=? WHERE id=?').bind(String(transfer.to_branch_id ?? ''), new Date().toISOString(), String(transfer.vehicle_id ?? '')).run();
  return json({ transfer:{
    id:String(transfer.id ?? ''), vehicleId:String(transfer.vehicle_id ?? ''), vehicleTitle:String(transfer.vehicle_title ?? ''),
    fromBranchId:String(transfer.from_branch_id ?? ''), toBranchId:String(transfer.to_branch_id ?? ''), status,
    employeeId:String(transfer.employee_id ?? ''), plannedAt:String(transfer.planned_at ?? ''), completedAt, note:String(transfer.note ?? ''), persisted:true,
  }, persisted:true });
}

export async function handleTeamRequest(request: Request, env: TeamEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/owner/team') && !url.pathname.startsWith('/api/owner/employees') && !url.pathname.startsWith('/api/owner/transfers')) return null;
  if (!isOwner(request, env)) return json({ error:'unauthorized' }, 401);
  if (url.pathname === '/api/owner/team' && request.method === 'GET') return listTeam(env);
  if (url.pathname === '/api/owner/employees' && request.method === 'POST') return saveEmployee(request, env);
  if (url.pathname === '/api/owner/transfers' && request.method === 'POST') return createTransfer(request, env);
  const transferMatch = url.pathname.match(/^\/api\/owner\/transfers\/([^/]+)$/);
  if (transferMatch && request.method === 'PATCH') return updateTransfer(request, env, decodeURIComponent(transferMatch[1] ?? ''));
  return json({ error:'not_found' }, 404);
}
