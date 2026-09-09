import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { ManagedFleetVehicle } from '../fleet/fleetManagement';
import { createBranch, createTransfer, defaultBranches, fetchTeamSnapshot, permissionCatalog, saveEmployee, TeamBranch, TeamEmployee, TeamRole, TeamSnapshot, TeamTransfer, updateTransferStatus } from '../../api/team';

type Props = {
  fleet: ManagedFleetVehicle[];
  setFleet: Dispatch<SetStateAction<ManagedFleetVehicle[]>>;
};

type EmployeeDraft = TeamEmployee;
type BranchDraft = TeamBranch;

const roleLabels: Record<TeamRole,string> = { owner:'Владелец', admin:'Администратор', manager:'Менеджер', branch_staff:'Сотрудник точки' };
const transferLabels: Record<TeamTransfer['status'],string> = { planned:'Запланировано', in_transit:'В пути', completed:'Завершено', cancelled:'Отменено' };
const nowIso = () => new Date().toISOString();
const branchLabel = (id: string, branches: TeamBranch[]) => branches.find((item) => item.id === id)?.name ?? (id || 'Без филиала');

function slugify(value: string): string {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
  return normalized || `office-${Date.now()}`;
}

function blankEmployee(branchId: string): EmployeeDraft {
  return { id:`employee-${crypto.randomUUID()}`, branchId, name:'', role:'branch_staff', phone:'', telegram:'', zalo:'', status:'active', permissions:['bookings.view','fleet.status'] };
}

function blankBranch(): BranchDraft {
  return { id:'', code:'', name:'', address:'', mapsUrl:'', phone:'+84 37 211 2370', status:'active' };
}

export function OwnerTeamBranches({ fleet, setFleet }: Props) {
  const [snapshot, setSnapshot] = useState<TeamSnapshot>({ branches:defaultBranches, employees:[], transfers:[], persisted:false });
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft | null>(null);
  const [branchDraft, setBranchDraft] = useState<BranchDraft | null>(null);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [transferVehicleId, setTransferVehicleId] = useState('');
  const [transferTo, setTransferTo] = useState<string>('branch-north');
  const [transferNote, setTransferNote] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { let active = true; fetchTeamSnapshot().then((data) => { if (active) setSnapshot(data); }); return () => { active = false; }; }, []);

  const activeBranches = useMemo(() => snapshot.branches.filter((item) => item.status === 'active'), [snapshot.branches]);
  useEffect(() => {
    if (!activeBranches.some((item) => item.id === transferTo)) setTransferTo(activeBranches[0]?.id ?? '');
  }, [activeBranches, transferTo]);

  const activeFleet = useMemo(() => fleet.filter((item) => !item.archivedAt), [fleet]);
  const activeEmployees = snapshot.employees.filter((item) => item.status === 'active');
  const visibleEmployees = snapshot.employees.filter((employee) => {
    const q = search.trim().toLowerCase();
    return (branchFilter === 'all' || employee.branchId === branchFilter) && (!q || `${employee.name} ${employee.phone} ${employee.telegram}`.toLowerCase().includes(q));
  });
  const selectedVehicle = activeFleet.find((item) => item.id === transferVehicleId);
  const selectedFrom = selectedVehicle?.branchId || activeBranches[0]?.id || '';
  const transferable = activeFleet.filter((item) => Boolean(item.branchId) && activeBranches.some((branch) => branch.id === item.branchId));

  function updateDraft<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    setEmployeeDraft((current) => current ? { ...current, [key]:value } : current);
  }

  function updateBranchDraft<K extends keyof BranchDraft>(key: K, value: BranchDraft[K]) {
    setBranchDraft((current) => current ? { ...current, [key]:value } : current);
  }

  async function persistBranch() {
    if (!branchDraft?.name.trim() || !branchDraft.address.trim()) return;
    const code = slugify(branchDraft.code || branchDraft.name);
    const candidate: TeamBranch = { ...branchDraft, id:branchDraft.id || `branch-${code}`, code, name:branchDraft.name.trim(), address:branchDraft.address.trim(), mapsUrl:branchDraft.mapsUrl.trim(), phone:branchDraft.phone.trim(), status:'active' };
    setBusy(true); setNotice('');
    try {
      const saved = await createBranch(candidate);
      setSnapshot((current) => ({ ...current, branches:[...current.branches.filter((item) => item.id !== saved.id), saved] }));
      setTransferTo(saved.id);
      setBranchDraft(null);
      setNotice(`Филиал «${saved.name}» добавлен в общую систему.`);
    } catch (error) {
      setNotice(error instanceof Error && error.message === 'branch_code_exists' ? 'Филиал с таким кодом уже существует.' : 'Не удалось сохранить филиал. Проверьте данные.');
    } finally { setBusy(false); }
  }

  async function persistEmployee() {
    if (!employeeDraft?.name.trim()) return;
    setBusy(true); setNotice('');
    try {
      const saved = await saveEmployee({ ...employeeDraft, name:employeeDraft.name.trim() });
      setSnapshot((current) => ({ ...current, employees:[...current.employees.filter((item) => item.id !== saved.id), saved] }));
      setEmployeeDraft(null);
      setNotice('Карточка сотрудника сохранена.');
    } finally { setBusy(false); }
  }

  async function startTransfer() {
    if (!selectedVehicle || !selectedFrom || selectedFrom === transferTo) { setNotice('Выберите другую точку назначения.'); return; }
    const manager = activeEmployees.find((item) => item.permissions.includes('transfers.manage')) ?? activeEmployees[0];
    const transfer: TeamTransfer = {
      id:`transfer-${crypto.randomUUID()}`,
      vehicleId:selectedVehicle.id,
      vehicleTitle:selectedVehicle.title,
      fromBranchId:selectedFrom,
      toBranchId:transferTo,
      status:'planned',
      employeeId:manager?.id ?? '',
      plannedAt:nowIso(),
      completedAt:'',
      note:transferNote.trim(),
      persisted:false,
    };
    setBusy(true); setNotice('');
    try {
      const saved = await createTransfer(transfer);
      setSnapshot((current) => ({ ...current, transfers:[saved, ...current.transfers.filter((item) => item.id !== saved.id)] }));
      setTransferVehicleId(''); setTransferNote('');
      setNotice(saved.persisted ? 'Перемещение записано в общей системе.' : 'Перемещение создано в демонстрационном режиме.');
    } finally { setBusy(false); }
  }

  async function changeTransfer(transfer: TeamTransfer, status: TeamTransfer['status']) {
    setBusy(true); setNotice('');
    try {
      const saved = await updateTransferStatus(transfer, status);
      setSnapshot((current) => ({ ...current, transfers:current.transfers.map((item) => item.id === saved.id ? saved : item) }));
      if (status === 'completed') setFleet((current) => current.map((vehicle) => vehicle.id === transfer.vehicleId ? { ...vehicle, branchId:transfer.toBranchId } : vehicle));
      setNotice(status === 'completed' ? 'Техника перемещена на новую точку.' : 'Статус перемещения обновлён.');
    } finally { setBusy(false); }
  }

  return <section className="team-page" data-stage7-team data-stage12-branches>
    <section className="hero team-hero">
      <div><span className="eyebrow">КОМАНДА И ФИЛИАЛЫ</span><h1>Все точки — одна система.</h1><p>Добавляйте филиалы, назначайте сотрудников и перемещайте технику между точками UNIQ прямо из панели владельца.</p></div>
      <div className="team-hero-card"><b>{activeEmployees.length}</b><span>активных сотрудников</span><small>{snapshot.persisted ? 'D1 · общая база' : 'DEMO · локальное состояние'}</small></div>
    </section>

    <section className="metrics team-metrics">
      <div className="metric"><span>Филиалы</span><b>{activeBranches.length}</b><small>активные точки</small></div>
      <div className="metric"><span>Команда</span><b>{activeEmployees.length}</b><small>активные профили</small></div>
      <div className="metric"><span>Парк</span><b>{activeFleet.length}</b><small>единиц техники</small></div>
      <div className="metric"><span>Перемещения</span><b>{snapshot.transfers.filter((item) => item.status === 'planned' || item.status === 'in_transit').length}</b><small>в работе</small></div>
    </section>

    <div className="team-branch-actions"><div><span className="eyebrow">ФИЛИАЛЫ</span><h2>Точки UNIQ</h2></div><button className="primary" data-add-branch onClick={() => setBranchDraft(blankBranch())}>+ Добавить филиал</button></div>
    <section className="team-branches" data-stage7-branches>
      {snapshot.branches.map((branch) => <article key={branch.id} data-team-branch={branch.id}>
        <span className="eyebrow">{branch.code.toUpperCase()}</span>
        <h2>{branch.name}</h2><p>{branch.address}</p>
        <div className="branch-kpis"><span><b>{activeFleet.filter((item) => item.branchId === branch.id).length}</b> техника</span><span><b>{activeEmployees.filter((item) => item.branchId === branch.id).length}</b> сотрудников</span></div>
        {branch.mapsUrl ? <a href={branch.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a> : <small>Карта пока не добавлена</small>}
      </article>)}
    </section>

    <section className="section team-section">
      <div className="section-head"><div><span className="eyebrow">СОТРУДНИКИ</span><h2>Роли и права доступа</h2></div><button className="primary" data-add-employee onClick={() => setEmployeeDraft(blankEmployee(activeBranches[0]?.id ?? 'branch-center'))}>+ Сотрудник</button></div>
      <div className="team-toolbar"><input data-team-search placeholder="Поиск сотрудника" value={search} onChange={(event) => setSearch(event.target.value)}/><select data-team-branch-filter value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}><option value="all">Все точки</option>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>
      <div className="employee-list">{visibleEmployees.map((employee) => <article key={employee.id} data-employee={employee.id}>
        <div className="employee-avatar">{employee.name.split(/\s+/).slice(0,2).map((item) => item[0]).join('').toUpperCase()}</div>
        <div className="employee-main"><b>{employee.name}</b><span>{roleLabels[employee.role]} · {branchLabel(employee.branchId,snapshot.branches)}</span><small>{employee.telegram || employee.phone || 'Внутренний профиль'} · {employee.permissions.length} прав</small></div>
        <span className={`employee-status ${employee.status}`}>{employee.status === 'active' ? 'Активен' : 'Отключён'}</span>
        <button className="secondary" data-edit-employee={employee.id} onClick={() => setEmployeeDraft({ ...employee, permissions:[...employee.permissions] })}>Настроить</button>
      </article>)}</div>
    </section>

    <section className="section transfer-section" data-stage7-transfers>
      <div className="section-head"><div><span className="eyebrow">ЛОГИСТИКА</span><h2>Перемещение техники</h2></div></div>
      <div className="transfer-form">
        <label>Техника<select data-transfer-vehicle value={transferVehicleId} onChange={(event) => { const id = event.target.value; setTransferVehicleId(id); const vehicle = activeFleet.find((item) => item.id === id); const from = vehicle?.branchId || activeBranches[0]?.id || ''; setTransferTo(activeBranches.find((branch) => branch.id !== from)?.id ?? from); }}><option value="">Выберите технику</option>{transferable.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.title} · {branchLabel(vehicle.branchId || '',snapshot.branches)}</option>)}</select></label>
        <label>Откуда<input value={transferVehicleId ? branchLabel(selectedFrom,snapshot.branches) : '—'} readOnly/></label>
        <label>Куда<select data-transfer-to value={transferTo} onChange={(event) => setTransferTo(event.target.value)}>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Комментарий<input data-transfer-note value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Например: к выдаче 11:00"/></label>
        <button className="primary" data-create-transfer disabled={busy || !selectedVehicle || !transferTo || selectedFrom === transferTo} onClick={startTransfer}>Создать перемещение</button>
      </div>
      {notice ? <div className="team-notice">{notice}</div> : null}
      <div className="transfer-list">{snapshot.transfers.length ? snapshot.transfers.slice(0,12).map((transfer) => <article key={transfer.id} data-transfer={transfer.id}>
        <div><b>{transfer.vehicleTitle}</b><span>{branchLabel(transfer.fromBranchId,snapshot.branches)} → {branchLabel(transfer.toBranchId,snapshot.branches)}</span><small>{new Date(transfer.plannedAt).toLocaleString('ru-RU')} {transfer.note ? `· ${transfer.note}` : ''}</small></div>
        <span className={`transfer-status ${transfer.status}`}>{transferLabels[transfer.status]}</span>
        <div className="transfer-actions">{transfer.status === 'planned' ? <button className="secondary" data-transfer-start={transfer.id} disabled={busy} onClick={() => changeTransfer(transfer,'in_transit')}>В путь</button> : null}{transfer.status === 'planned' || transfer.status === 'in_transit' ? <button className="primary" data-transfer-complete={transfer.id} disabled={busy} onClick={() => changeTransfer(transfer,'completed')}>Завершить</button> : null}</div>
      </article>) : <div className="empty"><b>Перемещений пока нет</b><span>Выберите технику и точку назначения.</span></div>}</div>
    </section>

    {branchDraft ? <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) setBranchDraft(null); }}><section className="modal branch-editor" data-branch-editor>
      <button className="modal-x" disabled={busy} onClick={() => setBranchDraft(null)}>×</button><span className="eyebrow">НОВЫЙ ФИЛИАЛ</span><h2>Добавить точку UNIQ</h2>
      <div className="form-grid"><label>Название<input data-branch-name value={branchDraft.name} onChange={(event) => updateBranchDraft('name',event.target.value)} placeholder="Например: Аэропорт"/></label><label>Код<input data-branch-code value={branchDraft.code} onChange={(event) => updateBranchDraft('code',event.target.value)} placeholder="airport"/></label><label>Адрес<input data-branch-address value={branchDraft.address} onChange={(event) => updateBranchDraft('address',event.target.value)} placeholder="Полный адрес"/></label><label>Телефон<input data-branch-phone value={branchDraft.phone} onChange={(event) => updateBranchDraft('phone',event.target.value)}/></label></div>
      <label>Google Maps<input data-branch-map value={branchDraft.mapsUrl} onChange={(event) => updateBranchDraft('mapsUrl',event.target.value)} placeholder="https://maps.app.goo.gl/..."/></label>
      <button className="primary wide" data-save-branch disabled={busy || !branchDraft.name.trim() || !branchDraft.address.trim()} onClick={() => void persistBranch()}>{busy ? 'Сохраняем…' : 'Добавить филиал'}</button>
      <small>После сохранения филиал сразу доступен для сотрудников и перемещения техники.</small>
    </section></div> : null}

    {employeeDraft ? <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target) setEmployeeDraft(null); }}><section className="modal employee-editor" data-employee-editor>
      <button className="modal-x" onClick={() => setEmployeeDraft(null)}>×</button><span className="eyebrow">СОТРУДНИК</span><h2>{snapshot.employees.some((item) => item.id === employeeDraft.id) ? 'Права и профиль' : 'Новый сотрудник'}</h2>
      <div className="form-grid"><label>Имя<input data-employee-name value={employeeDraft.name} onChange={(event) => updateDraft('name',event.target.value)}/></label><label>Роль<select data-employee-role value={employeeDraft.role} onChange={(event) => updateDraft('role',event.target.value as TeamRole)}>{Object.entries(roleLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Точка<select data-employee-branch value={employeeDraft.branchId} onChange={(event) => updateDraft('branchId',event.target.value)}>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Статус<select data-employee-status value={employeeDraft.status} onChange={(event) => updateDraft('status',event.target.value as TeamEmployee['status'])}><option value="active">Активен</option><option value="inactive">Отключён</option></select></label><label>Телефон<input value={employeeDraft.phone} onChange={(event) => updateDraft('phone',event.target.value)}/></label><label>Telegram<input value={employeeDraft.telegram} onChange={(event) => updateDraft('telegram',event.target.value)}/></label></div>
      <div className="permission-grid" data-permission-grid>{permissionCatalog.map(([id,label]) => <label key={id} className={employeeDraft.permissions.includes(id) ? 'checked' : ''}><input type="checkbox" checked={employeeDraft.permissions.includes(id)} onChange={(event) => updateDraft('permissions',event.target.checked ? [...employeeDraft.permissions,id] : employeeDraft.permissions.filter((item) => item !== id))}/><span>{label}</span></label>)}</div>
      <button className="primary wide" data-save-employee disabled={busy || !employeeDraft.name.trim()} onClick={() => void persistEmployee()}>{busy ? 'Сохраняем…' : 'Сохранить сотрудника'}</button>
      <small>Демонстрационные профили показывают механику ролей и доступа. Реальный состав команды настраивается владельцем.</small>
    </section></div> : null}
  </section>;
}
