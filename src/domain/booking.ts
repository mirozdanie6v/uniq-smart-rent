import type { Booking, BookingStatus, Vehicle } from './types.js';

export interface PriceBreakdown {
  days: number;
  months: number;
  weeks: number;
  dailyDays: number;
  totalVnd: number;
}

export function rentalDays(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const delta = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  return Math.max(1, delta);
}

export function isValidDateRange(from: string, to: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return false;
  return new Date(`${to}T00:00:00Z`).getTime() >= new Date(`${from}T00:00:00Z`).getTime();
}

export function calculateRentalTotal(vehicle: Vehicle, from: string, to: string): number {
  return calculatePriceBreakdown(vehicle, from, to).totalVnd;
}

export function calculatePriceBreakdown(vehicle: Vehicle, from: string, to: string): PriceBreakdown {
  const days = rentalDays(from, to);
  const { dailyVnd, weeklyVnd, monthlyVnd } = vehicle.pricing;
  const best: Array<{ total: number; months: number; weeks: number; dailyDays: number }> = Array.from({ length: days + 1 }, () => ({ total: Number.POSITIVE_INFINITY, months: 0, weeks: 0, dailyDays: 0 }));
  best[0] = { total: 0, months: 0, weeks: 0, dailyDays: 0 };
  const packages = [
    { length: 1, price: dailyVnd, key: 'dailyDays' as const },
    { length: 7, price: weeklyVnd, key: 'weeks' as const },
    { length: 30, price: monthlyVnd, key: 'months' as const }
  ];
  for (let d = 1; d <= days; d += 1) {
    for (const pkg of packages) {
      const prevDay = Math.max(0, d - pkg.length);
      const prev = best[prevDay];
      if (!prev) continue;
      const candidate = prev.total + pkg.price;
      if (candidate < (best[d]?.total ?? Number.POSITIVE_INFINITY)) {
        best[d] = { ...prev, total: candidate, [pkg.key]: prev[pkg.key] + 1 };
      }
    }
  }
  const result = best[days] ?? { total: days * dailyVnd, months: 0, weeks: 0, dailyDays: days };
  return { days, months: result.months, weeks: result.weeks, dailyDays: result.dailyDays, totalVnd: result.total };
}

export function canRequestBooking(_vehicle: Vehicle): boolean { return true; }

export function rangesOverlap(fromA: string, toA: string, fromB: string, toB: string): boolean {
  const a1 = new Date(`${fromA}T00:00:00Z`).getTime();
  const a2 = new Date(`${toA}T23:59:59Z`).getTime();
  const b1 = new Date(`${fromB}T00:00:00Z`).getTime();
  const b2 = new Date(`${toB}T23:59:59Z`).getTime();
  return a1 <= b2 && b1 <= a2;
}

const lifecycle: Record<BookingStatus, BookingStatus[]> = {
  draft: ['new', 'cancelled'],
  new: ['contacted', 'awaiting_confirmation', 'cancelled'],
  contacted: ['awaiting_confirmation', 'cancelled'],
  awaiting_confirmation: ['confirmed', 'cancelled'],
  confirmed: ['vehicle_issued', 'cancelled'],
  cancelled: [],
  vehicle_issued: ['active'],
  active: ['return_due', 'returned'],
  return_due: ['returned'],
  returned: ['completed'],
  completed: []
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean { return lifecycle[from].includes(to); }

export function makeBookingRequest(vehicle: Vehicle, from: string, to: string, input: { client: string; contact: string; channel: Booking['channel']; deliveryLocation?: string; note?: string }): Booking {
  return {
    id: `REQ-${Date.now()}`,
    vehicleId: vehicle.id,
    from,
    to,
    status: 'new',
    client: input.client.trim(),
    contact: input.contact.trim(),
    channel: input.channel,
    deliveryLocation: input.deliveryLocation?.trim() ?? '',
    note: input.note?.trim() ?? '',
    estimatedTotalVnd: calculateRentalTotal(vehicle, from, to),
    createdAt: new Date().toISOString(),
    persistence: 'session'
  };
}
