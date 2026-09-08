import type { ManagedFleetVehicle } from '../features/fleet/fleetManagement';
import { mergeFleetOverrides } from '../features/fleet/fleetManagement';

const fallbackKey = 'uniq-owner-fleet-overrides-v1';

function loadFallback(): ManagedFleetVehicle[] {
  try {
    const raw = sessionStorage.getItem(fallbackKey);
    return raw ? JSON.parse(raw) as ManagedFleetVehicle[] : [];
  } catch {
    return [];
  }
}

function saveFallback(items: ManagedFleetVehicle[]) {
  try { sessionStorage.setItem(fallbackKey, JSON.stringify(items)); } catch {}
}

function upsertFallback(vehicle: ManagedFleetVehicle) {
  const current = loadFallback();
  const next = mergeFleetOverrides(current, [vehicle]);
  saveFallback(next);
}

function removeFallback(id: string) {
  saveFallback(loadFallback().filter((item) => item.id !== id));
}

export async function fetchFleetOverrides(): Promise<ManagedFleetVehicle[]> {
  try {
    const response = await fetch('/api/fleet-overrides', { headers: { accept: 'application/json' } });
    if (!response.ok) return loadFallback();
    const data = await response.json() as { vehicles?: ManagedFleetVehicle[] };
    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
    saveFallback(vehicles);
    return vehicles;
  } catch {
    return loadFallback();
  }
}

export async function saveOwnerVehicle(vehicle: ManagedFleetVehicle): Promise<ManagedFleetVehicle> {
  upsertFallback(vehicle);
  try {
    const response = await fetch('/api/owner/fleet', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-uniq-demo-role': 'owner' },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) return vehicle;
    const data = await response.json() as { vehicle?: ManagedFleetVehicle };
    if (data.vehicle) {
      upsertFallback(data.vehicle);
      return data.vehicle;
    }
  } catch {}
  return vehicle;
}

export async function archiveOwnerVehicle(id: string, archived: boolean): Promise<ManagedFleetVehicle | null> {
  const fallback = loadFallback().find((item) => item.id === id);
  if (fallback) upsertFallback({ ...fallback, archivedAt: archived ? new Date().toISOString() : null, published: archived ? false : fallback.published });
  try {
    const response = await fetch(`/api/owner/fleet/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-uniq-demo-role': 'owner' },
      body: JSON.stringify({ action: archived ? 'archive' : 'restore' }),
    });
    if (!response.ok) return fallback ?? null;
    const data = await response.json() as { vehicle?: ManagedFleetVehicle };
    if (data.vehicle) upsertFallback(data.vehicle);
    return data.vehicle ?? fallback ?? null;
  } catch {
    return fallback ?? null;
  }
}

export async function removeOwnerVehicle(id: string): Promise<void> {
  removeFallback(id);
  try {
    await fetch(`/api/owner/fleet/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-uniq-demo-role': 'owner' },
    });
  } catch {}
}
