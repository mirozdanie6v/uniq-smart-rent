import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useMemo, useState } from 'react';
import { archiveOwnerVehicle, fetchFleetOverrides, removeOwnerVehicle, saveOwnerVehicle } from '../../api/ownerFleet';
import { branchOptions, FleetState, ManagedFleetVehicle, mergeFleetOverrides, VehicleType } from './fleetManagement';

type Props = {
  fleet: ManagedFleetVehicle[];
  baseFleet: ManagedFleetVehicle[];
  fleetStates: Record<string, FleetState>;
  setFleet: Dispatch<SetStateAction<ManagedFleetVehicle[]>>;
  setFleetStates: Dispatch<SetStateAction<Record<string, FleetState>>>;
};

type Draft = ManagedFleetVehicle;

const stateLabels: Record<FleetState, string> = {
  manager: 'Подтверждает менеджер',
  ready: 'Готова к выдаче',
  service: 'В сервисе',
  hold: 'Резерв',
};

const typeLabels: Record<VehicleType, string> = { car: 'Авто', scooter: 'Скутер', motorcycle: 'Мотоцикл' };
const blankDraft = (): Draft => ({
  id: '', title: '', brand: '', model: '', type: 'scooter', year: new Date().getFullYear(), engine: '', color: '',
  registrationNumber: '', internalNumber: '', description: '', branchId: 'branch-center', status: 'manager', published: true,
  dailyVnd: 0, threeDayVnd: 0, weeklyVnd: 0, fourteenDayVnd: 0, monthlyVnd: 0, depositVnd: 0, photos: [], archivedAt: null, ownerManaged: true,
});

const numberValue = (value: string) => Math.max(0, Number.parseInt(value.replace(/\D/g, ''), 10) || 0);
const branchLabel = (id?: string) => branchOptions.find((branch) => branch.id === id)?.label ?? 'Без привязки';
const money = (value?: number) => `${new Intl.NumberFormat('ru-RU').format(value ?? 0)} ₫`;

async function imageFileToDataUrl(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1280;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/webp', 0.78);
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export function OwnerFleetManager({ fleet, baseFleet, fleetStates, setFleet, setFleetStates }: Props) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FleetState | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | VehicleType>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | 'branch-north' | 'branch-center'>('all');
  const [photoUrl, setPhotoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const effectiveState = (vehicle: ManagedFleetVehicle): FleetState => fleetStates[vehicle.id] ?? vehicle.status ?? 'manager';
  const visible = useMemo(() => fleet.filter((vehicle) => {
    const q = search.trim().toLowerCase();
    const state = effectiveState(vehicle);
    if (statusFilter === 'archived' && !vehicle.archivedAt) return false;
    if (statusFilter !== 'all' && statusFilter !== 'archived' && state !== statusFilter) return false;
    if (typeFilter !== 'all' && vehicle.type !== typeFilter) return false;
    if (branchFilter !== 'all' && vehicle.branchId !== branchFilter) return false;
    return !q || `${vehicle.title} ${vehicle.brand ?? ''} ${vehicle.model ?? ''} ${vehicle.engine ?? ''} ${vehicle.registrationNumber ?? ''}`.toLowerCase().includes(q);
  }), [fleet, search, statusFilter, typeFilter, branchFilter, fleetStates]);

  const counts = useMemo(() => ({
    total: fleet.filter((item) => !item.archivedAt).length,
    published: fleet.filter((item) => !item.archivedAt && item.published !== false).length,
    service: fleet.filter((item) => !item.archivedAt && effectiveState(item) === 'service').length,
    archived: fleet.filter((item) => Boolean(item.archivedAt)).length,
  }), [fleet, fleetStates]);

  function openVehicle(vehicle: ManagedFleetVehicle) {
    setEditing({ ...vehicle, status: effectiveState(vehicle), photos: [...(vehicle.photos ?? [])] });
    setPhotoUrl('');
    setNotice('');
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setEditing((current) => current ? { ...current, [key]: value } : current);
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])].slice(0, 6);
    if (!files.length || !editing) return;
    setBusy(true);
    try {
      const urls = await Promise.all(files.map(imageFileToDataUrl));
      setEditing((current) => current ? { ...current, photos: [...(current.photos ?? []), ...urls].slice(0, 12) } : current);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  function addPhotoUrl() {
    const url = photoUrl.trim();
    if (!url || !editing) return;
    update('photos', [...(editing.photos ?? []), url].slice(0, 12));
    setPhotoUrl('');
  }

  function movePhoto(index: number, delta: -1 | 1) {
    if (!editing) return;
    const next = [...(editing.photos ?? [])];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    update('photos', next);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editing.title.trim() || !editing.brand?.trim() || !editing.model?.trim()) {
      setNotice('Заполните название, марку и модель.');
      return;
    }
    setBusy(true); setNotice('');
    try {
      const saved = await saveOwnerVehicle({ ...editing, ownerManaged: true });
      setFleet((current) => mergeFleetOverrides(current, [saved]));
      setFleetStates((current) => ({ ...current, [saved.id]: saved.status ?? 'manager' }));
      setEditing(saved);
      setNotice('Изменения сохранены.');
    } finally { setBusy(false); }
  }

  async function archive(vehicle: ManagedFleetVehicle, archived: boolean) {
    setBusy(true); setNotice('');
    try {
      let target = vehicle;
      if (!vehicle.ownerManaged) target = await saveOwnerVehicle({ ...vehicle, status: effectiveState(vehicle), ownerManaged: true });
      const saved = await archiveOwnerVehicle(target.id, archived);
      if (saved) setFleet((current) => mergeFleetOverrides(current, [saved]));
      setEditing(saved);
      setNotice(archived ? 'Техника перемещена в архив.' : 'Техника восстановлена.');
    } finally { setBusy(false); }
  }

  async function remove(vehicle: ManagedFleetVehicle) {
    setBusy(true); setNotice('');
    try {
      await removeOwnerVehicle(vehicle.id);
      const overrides = await fetchFleetOverrides();
      setFleet(mergeFleetOverrides(baseFleet, overrides));
      setFleetStates((current) => { const next = { ...current }; delete next[vehicle.id]; return next; });
      setEditing(null);
    } finally { setBusy(false); }
  }

  return <>
    <section className="hero owner-fleet-hero">
      <div><span className="eyebrow">ПАРК ВЛАДЕЛЬЦА</span><h1>Управление парком.</h1><p>Добавляйте технику, меняйте тарифы, фотографии, филиал и состояние прямо со смартфона.</p></div>
      <button className="primary owner-add-vehicle" data-owner-add-vehicle onClick={() => setEditing(blankDraft())}>+ Добавить технику</button>
    </section>

    <section className="metrics owner-fleet-metrics">
      <div className="metric"><span>Активный парк</span><b>{counts.total}</b></div>
      <div className="metric"><span>Опубликовано</span><b>{counts.published}</b></div>
      <div className="metric"><span>В сервисе</span><b>{counts.service}</b></div>
      <div className="metric"><span>Архив</span><b>{counts.archived}</b></div>
    </section>

    <section className="owner-fleet-toolbar">
      <input data-owner-fleet-search value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по парку…" />
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
        <option value="all">Все состояния</option><option value="manager">Подтверждает менеджер</option><option value="ready">Готовы к выдаче</option><option value="service">В сервисе</option><option value="hold">Резерв</option><option value="archived">Архив</option>
      </select>
      <select data-owner-fleet-type-filter value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
        <option value="all">Все типы</option><option value="car">Авто</option><option value="motorcycle">Мотоциклы</option><option value="scooter">Скутеры</option>
      </select>
      <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value as typeof branchFilter)}>
        <option value="all">Все точки</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
      </select>
      <span>{visible.length} позиций</span>
    </section>

    <section className="owner-fleet-list">
      {visible.map((vehicle) => <article className={`owner-fleet-row ${vehicle.archivedAt ? 'is-archived' : ''}`} key={vehicle.id} data-owner-vehicle={vehicle.id}>
        <div className="owner-fleet-photo">{vehicle.photos?.[0] ? <img src={vehicle.photos[0]} alt={vehicle.title} loading="lazy" /> : <span>UNIQ</span>}</div>
        <div className="owner-fleet-copy"><div><span className="pill">{typeLabels[vehicle.type]}</span>{vehicle.archivedAt ? <span className="pill muted">Архив</span> : vehicle.published === false ? <span className="pill muted">Скрыта</span> : null}</div><b>{vehicle.title}</b><small>{vehicle.year ?? ''} · {vehicle.engine ?? '—'} · {branchLabel(vehicle.branchId)}</small></div>
        <div className="owner-fleet-price"><b>{money(vehicle.dailyVnd)}</b><small>{stateLabels[effectiveState(vehicle)]}</small></div>
        <button className="secondary" data-owner-edit={vehicle.id} onClick={() => openVehicle(vehicle)}>Редактировать</button>
      </article>)}
    </section>

    {editing ? <div className="modal-bg owner-editor-bg" onMouseDown={(event) => { if (event.currentTarget === event.target && !busy) setEditing(null); }}>
      <section className="modal owner-editor" data-owner-editor>
        <button className="modal-x" disabled={busy} onClick={() => setEditing(null)}>×</button>
        <span className="eyebrow">{editing.id ? 'РЕДАКТИРОВАНИЕ ТЕХНИКИ' : 'НОВАЯ ТЕХНИКА'}</span>
        <h2>{editing.id ? editing.title : 'Добавить в парк UNIQ'}</h2>
        <form onSubmit={save}>
          <div className="owner-form-section"><h3>Основное</h3><div className="form-grid">
            <label>Название<input data-owner-title value={editing.title} onChange={(e) => update('title', e.target.value)} required /></label>
            <label>Тип<select value={editing.type} onChange={(e) => update('type', e.target.value as VehicleType)}><option value="scooter">Скутер</option><option value="motorcycle">Мотоцикл</option><option value="car">Авто</option></select></label>
            <label>Марка<input value={editing.brand ?? ''} onChange={(e) => update('brand', e.target.value)} required /></label>
            <label>Модель<input value={editing.model ?? ''} onChange={(e) => update('model', e.target.value)} required /></label>
            <label>Год<input type="number" min="1900" max="2100" value={editing.year ?? ''} onChange={(e) => update('year', numberValue(e.target.value))} /></label>
            <label>Двигатель<input value={editing.engine ?? ''} onChange={(e) => update('engine', e.target.value)} placeholder="155 cc" /></label>
            <label>Цвет<input value={editing.color ?? ''} onChange={(e) => update('color', e.target.value)} /></label>
            <label>Госномер<input value={editing.registrationNumber ?? ''} onChange={(e) => update('registrationNumber', e.target.value)} /></label>
            <label>Внутренний №<input value={editing.internalNumber ?? ''} onChange={(e) => update('internalNumber', e.target.value)} /></label>
            <label>Точка<select value={editing.branchId ?? ''} onChange={(e) => update('branchId', e.target.value as Draft['branchId'])}><option value="">Без привязки</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.label} · {branch.address}</option>)}</select></label>
            <label>Состояние<select data-owner-status value={editing.status ?? 'manager'} onChange={(e) => update('status', e.target.value as FleetState)}>{Object.entries(stateLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div><label>Описание<textarea rows={4} value={editing.description ?? ''} onChange={(e) => update('description', e.target.value)} /></label></div>

          <div className="owner-form-section"><h3>Тарифы</h3><div className="owner-price-grid">
            <label>1 день<input data-owner-daily type="number" min="0" value={editing.dailyVnd ?? 0} onChange={(e) => update('dailyVnd', numberValue(e.target.value))} /></label>
            <label>3 дня<input type="number" min="0" value={editing.threeDayVnd ?? 0} onChange={(e) => update('threeDayVnd', numberValue(e.target.value))} /></label>
            <label>7 дней<input type="number" min="0" value={editing.weeklyVnd ?? 0} onChange={(e) => update('weeklyVnd', numberValue(e.target.value))} /></label>
            <label>14 дней<input type="number" min="0" value={editing.fourteenDayVnd ?? 0} onChange={(e) => update('fourteenDayVnd', numberValue(e.target.value))} /></label>
            <label>30 дней<input type="number" min="0" value={editing.monthlyVnd ?? 0} onChange={(e) => update('monthlyVnd', numberValue(e.target.value))} /></label>
            <label>Депозит<input type="number" min="0" value={editing.depositVnd ?? 0} onChange={(e) => update('depositVnd', numberValue(e.target.value))} /></label>
          </div></div>

          <div className="owner-form-section"><div className="owner-form-title"><h3>Фотографии</h3><span>{editing.photos?.length ?? 0}/12</span></div>
            <div className="owner-photo-add"><input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="URL фотографии" /><button type="button" className="secondary" onClick={addPhotoUrl}>Добавить URL</button><label className="secondary file-button">Загрузить<input data-owner-photo-upload type="file" accept="image/*" multiple onChange={uploadPhotos} /></label></div>
            <div className="owner-photo-grid">{(editing.photos ?? []).map((url,index) => <div key={`${url.slice(0,36)}-${index}`}><img src={url} alt={`Фото ${index + 1}`} /><div><button type="button" onClick={() => movePhoto(index,-1)}>←</button><button type="button" onClick={() => movePhoto(index,1)}>→</button><button type="button" onClick={() => update('photos',(editing.photos ?? []).filter((_,i) => i !== index))}>×</button></div></div>)}</div>
          </div>

          <div className="owner-form-section owner-publish-row"><label><input type="checkbox" checked={editing.published !== false} disabled={Boolean(editing.archivedAt)} onChange={(e) => update('published', e.target.checked)} /> Показывать клиентам в каталоге</label><span>{editing.archivedAt ? 'Техника находится в архиве' : 'Изменение сразу отражается в Mini App'}</span></div>

          {notice ? <div className="owner-save-notice">{notice}</div> : null}
          <div className="owner-editor-actions">
            <button className="primary" data-owner-save type="submit" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
            {editing.id ? editing.archivedAt ? <button className="secondary" type="button" disabled={busy} onClick={() => archive(editing,false)}>Восстановить</button> : <button className="secondary" type="button" disabled={busy} onClick={() => archive(editing,true)}>Архивировать</button> : null}
            {editing.id && editing.ownerManaged ? <button className="danger-link" type="button" disabled={busy} onClick={() => remove(editing)}>{editing.id.startsWith('custom-') ? 'Удалить навсегда' : 'Сбросить изменения'}</button> : null}
          </div>
        </form>
      </section>
    </div> : null}
  </>;
}
