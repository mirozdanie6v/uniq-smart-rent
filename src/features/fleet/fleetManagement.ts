export type VehicleType = 'car' | 'scooter' | 'motorcycle';
export type FleetState = 'manager' | 'ready' | 'service' | 'hold';

export interface ManagedFleetVehicle {
  id: string;
  title: string;
  type: VehicleType;
  brand?: string;
  model?: string;
  year?: number | string;
  engine?: string;
  weight?: string;
  cruiseSpeed?: string;
  dailyVnd?: number;
  threeDayVnd?: number;
  weeklyVnd?: number;
  fourteenDayVnd?: number;
  monthlyVnd?: number;
  depositVnd?: number;
  color?: string;
  registrationNumber?: string;
  internalNumber?: string;
  description?: string;
  branchId?: string;
  status?: FleetState;
  published?: boolean;
  archivedAt?: string | null;
  photos?: string[];
  sourceUrl?: string;
  ownerManaged?: boolean;
}

export const branchOptions = [
  { id: 'branch-north', label: 'Северный филиал', address: '312 Đ. 2/4' },
  { id: 'branch-center', label: 'Центр города', address: '254 Nguyễn Thị Minh Khai' },
] as const;

export function demoBranchForVehicleId(id: string): 'branch-north' | 'branch-center' {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % 2 === 0 ? 'branch-north' : 'branch-center';
}

export function normalizeBaseVehicle(vehicle: ManagedFleetVehicle): ManagedFleetVehicle {
  const words = vehicle.title.trim().split(/\s+/);
  return {
    ...vehicle,
    brand: vehicle.brand ?? words[0] ?? '',
    model: vehicle.model ?? words.slice(1).join(' '),
    status: vehicle.status ?? 'manager',
    branchId: vehicle.branchId || demoBranchForVehicleId(vehicle.id),
    published: vehicle.published ?? true,
    archivedAt: vehicle.archivedAt ?? null,
    ownerManaged: vehicle.ownerManaged ?? false,
  };
}

export function mergeFleetOverrides(base: ManagedFleetVehicle[], overrides: ManagedFleetVehicle[]): ManagedFleetVehicle[] {
  const map = new Map(base.map((vehicle) => [vehicle.id, normalizeBaseVehicle(vehicle)]));
  for (const override of overrides) {
    const previous = map.get(override.id);
    map.set(override.id, normalizeBaseVehicle({ ...(previous ?? {}), ...override } as ManagedFleetVehicle));
  }
  return [...map.values()];
}

export function publicFleet(fleet: ManagedFleetVehicle[]): ManagedFleetVehicle[] {
  return fleet.filter((vehicle) => vehicle.published !== false && !vehicle.archivedAt);
}

export function activeOperationalFleet(fleet: ManagedFleetVehicle[]): ManagedFleetVehicle[] {
  return fleet.filter((vehicle) => !vehicle.archivedAt);
}
