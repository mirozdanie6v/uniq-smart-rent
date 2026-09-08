import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import type { ManagedFleetVehicle } from '../fleet/fleetManagement';
import { createTransfer, defaultBranches, fetchTeamSnapshot, permissionCatalog, saveEmployee, TeamBranch, TeamEmployee, TeamRole, TeamSnapshot, TeamTransfer, updateTransferStatus } from '../../api/team';

type Props = {
  fleet: ManagedFleetVehicle[];
  setFleet: Dispatch<SetStateAction<ManagedFleetVehicle[]>>;
};

type EmployeeDraft = TeamEmployee;

const roleLabels: Record<TeamRole,string> = { owner:'Владелец', admin:'Администратор', manager:'Менеджер', branch_staff:'Сотрудник точки' };
const transferLabels: Record<TeamTransfer['status'],string> = { planned:'Запланировано', in_transit:'В пути', completed:'Завершено', cancelled:'Отменено' };
const nowIso = () => new Date().toISOString();
const branchLabel = (id: TeamBranch['id'], branches: TeamBranch[]) => branches.find((item) => item.id === id)?.name ?? id;

function blankEmployee(): EmployeeDraft {
  return { id:`employee-${crypto.randomUUID()}`, branchId:'branch-center', name:'', role:'branch_staff', phone:'', telegram:'', zalo:'', status:'active', permissions:['bookings.view','fleet.status'] };
}

export function OwnerTeamBranches({ fleet, setFleet }: Props) {
  const [snapshot, setSnapshot] = useState<TeamSnapshot>({ branches:defaultBranches, employees:[], transfers:[], persisted:false });
  const [employeeDraft, setEmployeeDraft] = useState<EmployeeDraft | null>(null);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | TeamBranch['id']>('all');
  const [transferVehicleId, setTransferVehicleId] = useState('');
  const [transferTo, setTransferTo] = useState<TeamBranch['id']>('branch-north');
  const [transferNote, setTransferNote] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { let active = true; fetchTeamSnapshot().then((data) => { if (active) setSnapshot(data); }); return () => { active = false; }; }, []);

  const activeFleet = useMemo(() => fleet.filter((item) => !item.archivedAt), [fleet]);
  const activeEmployees = snapshot.employees.filter((item) => item.status === 'active');
  const visibleEmployees = snapshot.employees.filter((employee) => {
    const q = search.trim().toLowerCase();
    return (branchFilter === 'all' || employee.branchId === branchFilter) && (!q || `${employee.name} ${employee.phone} ${employee.telegram}`.toLowerCase().includes(q));
  });
  const selectedVehicle = activeFleet.find((item) => item.id === transferVehicleId);
  const selectedFrom = (selectedVehicle?.branchId === 'branch-north' ? 'branch-north' : 'branch-center') as TeamBranch['id'];
  const transferable = activeFleet.filter((item) => item.branchId === 'branch-north' || item.branchId === 'branch-center');

  function updateDraft<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    setEmployeeDraft((current) => current ? { ...current, [key]:value } : current);
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
    if (!selectedVehicle || selectedFrom === transferTo) { setNotice('Выберите другую точку назначения.'); return; }
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

  return <section className="team-page" data-stage7-team>
    <section className="hero team-hero">
      <div><span className="eyebrow">КОМАНДА И ОФИСЫ</span><h1>Две точки — одна система.</h1><p>Роли, права доступа, сотрудники и перемещения техники между филиалами UNIQ в одном интерфейсе владельца.</p></div>
      <div className="team-hero-card"><b>{activeEmployees.length}</b><span>активных сотрудников</span><small>{snapshot.persisted ? 'D1 · общая база' : 'DEMO · локальное состояние'}</small></div>
    </section>

    <section className="metrics team-metrics">
      <div className="metric"><span>Точки</span><b>2</b><small>Север + Центр</small></div>
      <div className="metric"><span>Команда</span><b>{activeEmployees.length}</b><small>активные профили</small></div>
      <div className="metric"><span>Север</span><b>{activeFleet.filter((item) => item.branchId === 'branch-north').length}</b><small>единиц техники</small></div>
      <div className="metric"><span>Центр</span><b>{activeFleet.filter((item) => item.branchId === 'branch-center').length}</b><small>единиц техники</small></div>
    </section>

    <section className="team-branches" data-stage7-branches>
      {snapshot.branches.map((branch) => <article key={branch.id} data-team-branch={branch.id}>
        <span className="eyebrow">{branch.code === 'north' ? 'СЕВЕР' : 'ЦЕНТР'}</span>
        <h2>{branch.name}</h2><p>{branch.address}</p>
        <div className="branch-kpis"><span><b>{activeFleet.filter((item) => item.branchId === branch.id).length}</b> техника</span><span><b>{activeEmployees.filter((item) => item.branchId === branch.id).length}</b> сотрудников</span></div>
        <a href={branch.mapsUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>
      </article>)}
    </section>

    <section className="section team-section">
      <div className="section-head"><div><span className="eyebrow">СОТРУДНИКИ</span><h2>Роли и права доступа</h2></div><button className="primary" data-add-employee onClick={() => setEmployeeDraft(blankEmployee())}>+ Сотрудник</button></div>
      <div className="team-toolbar"><input data-team-search placeholder="Поиск сотрудника" value={search} onChange={(event) => setSearch(event.target.value)}/><select data-team-branch-filter value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as 'all' | TeamBranch['id'])}><option value="all">Все точки</option>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>
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
        <label>Техника<select data-transfer-vehicle value={transferVehicleId} onChange={(event) => { const id = event.target.value; setTransferVehicleId(id); const vehicle = activeFleet.find((item) => item.id === id); const from = vehicle?.branchId === 'branch-north' ? 'branch-north' : 'branch-center'; setTransferTo(from === 'branch-north' ? 'branch-center' : 'branch-north'); }}><option value="">Выберите технику</option>{transferable.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.title} · {branchLabel((vehicle.branchId || 'branch-center') as TeamBranch['id'],snapshot.branches)}</option>)}</select></label>
        <label>Откуда<input value={transferVehicleId ? branchLabel(selectedFrom,snapshot.branches) : '—'} readOnly/></label>
        <label>Куда<select data-transfer-to value={transferTo} onChange={(event) => setTransferTo(event.target.value as TeamBranch['id'])}>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label>Комментарий<input data-transfer-note value={transferNote} onChange={(event) => setTransferNote(event.target.value)} placeholder="Например: к выдаче 11:00"/></label>
        <button className="primary" data-create-transfer disabled={busy || !selectedVehicle || selectedFrom === transferTo} onClick={startTransfer}>Создать перемещение</button>
      </div>
      {notice ? <div className="team-notice">{notice}</div> : null}
      <div className="transfer-list">{snapshot.transfers.length ? snapshot.transfers.slice(0,12).map((transfer) => <article key={transfer.id} data-transfer={transfer.id}>
        <div><b>{transfer.vehicleTitle}</b><span>{branchLabel(transfer.fromBranchId,snapshot.branches)} → {branchLabel(transfer.toBranchId,snapshot.branches)}</span><small>{new Date(transfer.plannedAt).toLocaleString('ru-RU')} {transfer.note ? `· ${transfer.note}` : ''}</small></div>
        <span className={`transfer-status ${transfer.status}`}>{transferLabels[transfer.status]}</span>
        <div className="transfer-actions">{transfer.status === 'planned' ? <button className="secondary" data-transfer-start={transfer.id} disabled={busy} onClick={() => changeTransfer(transfer,'in_transit')}>В путь</button> : null}{transfer.status === 'planned' || transfer.status === 'in_transit' ? <button className="primary" data-transfer-complete={transfer.id} disabled={busy} onClick={() => changeTransfer(transfer,'completed')}>Завершить</button> : null}</div>
      </article>) : <div className="empty"><b>Перемещений пока нет</b><span>Выберите технику и точку назначения.</span></div>}</div>
    </section>

    {employeeDraft ? <div className="modal-bg" onMouseDown={(event) => { if (event.currentTarget === event.target) setEmployeeDraft(null); }}><section className="modal employee-editor" data-employee-editor>
      <button className="modal-x" onClick={() => setEmployeeDraft(null)}>×</button><span className="eyebrow">СОТРУДНИК</span><h2>{snapshot.employees.some((item) => item.id === employeeDraft.id) ? 'Права и профиль' : 'Новый сотрудник'}</h2>
      <div className="form-grid"><label>Имя<input data-employee-name value={employeeDraft.name} onChange={(event) => updateDraft('name',event.target.value)}/></label><label>Роль<select data-employee-role value={employeeDraft.role} onChange={(event) => updateDraft('role',event.target.value as TeamRole)}>{Object.entries(roleLabels).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label><label>Точка<select data-employee-branch value={employeeDraft.branchId} onChange={(event) => updateDraft('branchId',event.target.value as TeamBranch['id'])}>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label>Статус<select data-employee-status value={employeeDraft.status} onChange={(event) => updateDraft('status',event.target.value as TeamEmployee['status'])}><option value="active">Активен</option><option value="inactive">Отключён</option></select></label><label>Телефон<input value={employeeDraft.phone} onChange={(event) => updateDraft('phone',event.target.value)}/></label><label>Telegram<input value={employeeDraft.telegram} onChange={(event) => updateDraft('telegram',event.target.value)}/></label></div>
      <div className="permission-grid" data-permission-grid>{permissionCatalog.map(([id,label]) => <label key={id} className={employeeDraft.permissions.includes(id) ? 'checked' : ''}><input type="checkbox" checked={employeeDraft.permissions.includes(id)} onChange={(event) => updateDraft('permissions',event.target.checked ? [...employeeDraft.permissions,id] : employeeDraft.permissions.filter((item) => item !== id))}/><span>{label}</span></label>)}</div>
      <button className="primary wide" data-save-employee disabled={busy || !employeeDraft.name.trim()} onClick={persistEmployee}>{busy ? 'Сохраняем…' : 'Сохранить сотрудника'}</button>
      <small>Демонстрационные профили показывают механику ролей и доступа. Реальный состав команды настраивается владельцем.</small>
    </section></div> : null}
  </section>;
}
