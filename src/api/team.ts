export type TeamRole = 'owner' | 'admin' | 'manager' | 'branch_staff';
export type TeamStatus = 'active' | 'inactive';
export type TransferStatus = 'planned' | 'in_transit' | 'completed' | 'cancelled';

export interface TeamBranch {
  id: 'branch-north' | 'branch-center';
  code: string;
  name: string;
  address: string;
  mapsUrl: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface TeamEmployee {
  id: string;
  branchId: TeamBranch['id'];
  name: string;
  role: TeamRole;
  phone: string;
  telegram: string;
  zalo: string;
  status: TeamStatus;
  permissions: string[];
}

export interface TeamTransfer {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  fromBranchId: TeamBranch['id'];
  toBranchId: TeamBranch['id'];
  status: TransferStatus;
  employeeId: string;
  plannedAt: string;
  completedAt: string;
  note: string;
  persisted: boolean;
}

export interface TeamSnapshot {
  branches: TeamBranch[];
  employees: TeamEmployee[];
  transfers: TeamTransfer[];
  persisted: boolean;
}

const storageKey = 'uniq-stage7-team-v1';
const transferStorageKey = 'uniq-stage7-transfers-v1';

export const permissionCatalog = [
  ['bookings.view','Просмотр заявок'],
  ['bookings.manage','Управление бронированиями'],
  ['customers.view','Клиенты и CRM'],
  ['fleet.status','Статусы техники'],
  ['fleet.pricing','Цены и парк'],
  ['payments.manage','Оплаты'],
  ['finance.view','Финансы'],
  ['team.manage','Сотрудники и права'],
  ['transfers.manage','Перемещения техники'],
] as const;

export const defaultBranches: TeamBranch[] = [
  { id:'branch-north', code:'north', name:'Северный филиал', address:'312 Đ. 2/4, Bắc Nha Trang', mapsUrl:'https://maps.app.goo.gl/qr3FNiVVxAdThVBV6', phone:'+84 37 211 2370', status:'active' },
  { id:'branch-center', code:'center', name:'Центр города', address:'254 Nguyễn Thị Minh Khai, Nha Trang', mapsUrl:'https://maps.app.goo.gl/sJdMndLRPz9b228J7', phone:'+84 37 211 2370', status:'active' },
];

const adminPermissions = permissionCatalog.map(([id]) => id);
const managerPermissions = ['bookings.view','bookings.manage','customers.view','fleet.status','payments.manage','transfers.manage'];
const staffPermissions = ['bookings.view','fleet.status','transfers.manage'];

export const defaultEmployees: TeamEmployee[] = [
  { id:'employee-demo-admin', branchId:'branch-center', name:'Алексей Морозов', role:'admin', phone:'+84 37 211 2370', telegram:'@uniq_admin', zalo:'', status:'active', permissions:adminPermissions },
  { id:'employee-demo-linh', branchId:'branch-center', name:'Linh Nguyễn', role:'manager', phone:'', telegram:'@uniq_linh', zalo:'', status:'active', permissions:managerPermissions },
  { id:'employee-demo-minh', branchId:'branch-north', name:'Minh Trần', role:'manager', phone:'', telegram:'@uniq_minh', zalo:'', status:'active', permissions:managerPermissions },
  { id:'employee-demo-anh', branchId:'branch-north', name:'Anh Phạm', role:'branch_staff', phone:'', telegram:'', zalo:'', status:'active', permissions:staffPermissions },
  { id:'employee-demo-huong', branchId:'branch-center', name:'Hương Lê', role:'branch_staff', phone:'', telegram:'', zalo:'', status:'active', permissions:staffPermissions },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch { return fallback; }
}

function writeLocal<T>(key: string, value: T) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function localTeamSnapshot(): TeamSnapshot {
  return {
    branches: defaultBranches,
    employees: readLocal<TeamEmployee[]>(storageKey, defaultEmployees),
    transfers: readLocal<TeamTransfer[]>(transferStorageKey, []),
    persisted: false,
  };
}

function normalizeSnapshot(data: Partial<TeamSnapshot>): TeamSnapshot {
  const local = localTeamSnapshot();
  const branches = Array.isArray(data.branches) && data.branches.length ? data.branches : local.branches;
  const employees = Array.isArray(data.employees) && data.employees.length ? data.employees : local.employees;
  const remoteTransfers = Array.isArray(data.transfers) ? data.transfers : [];
  const localTransfers = local.transfers;
  const transferMap = new Map<string,TeamTransfer>();
  for (const item of [...remoteTransfers, ...localTransfers]) transferMap.set(item.id, item);
  writeLocal(storageKey, employees);
  writeLocal(transferStorageKey, [...transferMap.values()]);
  return { branches, employees, transfers:[...transferMap.values()], persisted:Boolean(data.persisted) };
}

export async function fetchTeamSnapshot(): Promise<TeamSnapshot> {
  try {
    const response = await fetch('/api/owner/team', { headers:{ accept:'application/json', 'x-uniq-demo-role':'owner' } });
    if (!response.ok) return localTeamSnapshot();
    return normalizeSnapshot(await response.json() as Partial<TeamSnapshot>);
  } catch { return localTeamSnapshot(); }
}

export async function saveEmployee(employee: TeamEmployee): Promise<TeamEmployee> {
  const current = readLocal<TeamEmployee[]>(storageKey, defaultEmployees);
  const local = [...current.filter((item) => item.id !== employee.id), employee];
  writeLocal(storageKey, local);
  try {
    const response = await fetch('/api/owner/employees', {
      method:'POST',
      headers:{ 'content-type':'application/json', 'x-uniq-demo-role':'owner' },
      body:JSON.stringify(employee),
    });
    if (!response.ok) return employee;
    const data = await response.json() as { employee?: TeamEmployee };
    return data.employee ?? employee;
  } catch { return employee; }
}

export async function createTransfer(transfer: TeamTransfer): Promise<TeamTransfer> {
  const current = readLocal<TeamTransfer[]>(transferStorageKey, []);
  const local = { ...transfer, persisted:false };
  writeLocal(transferStorageKey, [...current.filter((item) => item.id !== local.id), local]);
  try {
    const response = await fetch('/api/owner/transfers', {
      method:'POST',
      headers:{ 'content-type':'application/json', 'x-uniq-demo-role':'owner' },
      body:JSON.stringify(local),
    });
    if (!response.ok) return local;
    const data = await response.json() as { transfer?: TeamTransfer };
    const saved = data.transfer ?? local;
    writeLocal(transferStorageKey, [...current.filter((item) => item.id !== saved.id), saved]);
    return saved;
  } catch { return local; }
}

export async function updateTransferStatus(transfer: TeamTransfer, status: TransferStatus): Promise<TeamTransfer> {
  const completedAt = status === 'completed' ? new Date().toISOString() : transfer.completedAt;
  const local = { ...transfer, status, completedAt };
  const current = readLocal<TeamTransfer[]>(transferStorageKey, []);
  writeLocal(transferStorageKey, [...current.filter((item) => item.id !== local.id), local]);
  try {
    const response = await fetch(`/api/owner/transfers/${encodeURIComponent(transfer.id)}`, {
      method:'PATCH',
      headers:{ 'content-type':'application/json', 'x-uniq-demo-role':'owner' },
      body:JSON.stringify({ status }),
    });
    if (!response.ok) return local;
    const data = await response.json() as { transfer?: TeamTransfer };
    const saved = data.transfer ?? local;
    writeLocal(transferStorageKey, [...current.filter((item) => item.id !== saved.id), saved]);
    return saved;
  } catch { return local; }
}
