import type { Booking, Vehicle } from './types.js';

export function rentalDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const delta = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, delta);
}

export function calculateRentalTotal(vehicle: Vehicle, from: string, to: string): number {
  return rentalDays(from, to) * vehicle.pricePerDayVnd;
}

export function isBookable(vehicle: Vehicle): boolean {
  return vehicle.status === 'available';
}

export function makeDemoBooking(vehicle: Vehicle, from: string, to: string, client = 'Demo Rider'): Booking {
  return {
    id: `REQ-${Date.now()}`,
    vehicleId: vehicle.id,
    from,
    to,
    status: 'request',
    client,
    totalVnd: calculateRentalTotal(vehicle, from, to)
  };
}
