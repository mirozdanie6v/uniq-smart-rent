import type { FleetStatus } from './types.js';

const fleetStatusAliases: Record<string, FleetStatus> = {
  manager: 'manager_confirmation',
  manager_confirmation: 'manager_confirmation',
  ready: 'available',
  available: 'available',
  hold: 'reserved',
  reserved: 'reserved',
  service: 'service'
};

export const fleetStatuses: FleetStatus[] = ['manager_confirmation', 'available', 'reserved', 'service'];

export function normalizeFleetStatus(value: string): FleetStatus | null {
  return fleetStatusAliases[value] ?? null;
}
