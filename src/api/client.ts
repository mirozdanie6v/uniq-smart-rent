import type { Booking } from '../domain/types.js';

export interface BookingApiPayload {
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  contact: string;
  channel: Booking['channel'];
  deliveryLocation: string;
  note: string;
}

export interface BookingApiResult {
  ok: boolean;
  persisted: boolean;
  bookingId?: string;
  reason?: string;
}

export async function submitBookingToApi(payload: BookingApiPayload): Promise<BookingApiResult> {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) {
    return { ok: false, persisted: false, reason: 'api-unavailable-in-preview' };
  }
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string };
      return { ok: false, persisted: false, reason: data.error ?? `http-${response.status}` };
    }
    const data = await response.json() as { bookingId?: string; persisted?: boolean };
    const result: BookingApiResult = { ok: true, persisted: data.persisted === true };
    if (data.bookingId) result.bookingId = data.bookingId;
    return result;
  } catch {
    return { ok: false, persisted: false, reason: 'network-error' };
  }
}
