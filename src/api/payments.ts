export type PaymentProvider = 'vietqr' | 'vnpay' | 'momo' | 'zalopay' | 'sbp' | 'yookassa' | 'tbank';
export type PaymentPurpose = 'booking' | 'balance' | 'extension';

export type PaymentIntent = {
  id: string;
  bookingId: string;
  provider: PaymentProvider;
  providerLabel: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amountVnd: number;
  totalVnd: number;
  alreadyPaidVnd: number;
  remainingVnd: number;
  requestedPercent: 30 | 100;
  purpose: PaymentPurpose;
  paymentReference: string;
  paymentUrl: string;
  qrPayload: string;
  expiresAt: string;
  mode: 'demo' | 'live-ready';
};

export type PaymentProviderInfo = {
  id: PaymentProvider;
  label: string;
  market: string;
  currency: 'VND' | 'RUB';
  credentialReady: boolean;
  checkoutMode: 'demo' | 'live-ready';
};

export type BookingExtensionResult = {
  bookingId: string;
  extensionId: string;
  previousTo: string;
  newTo: string;
  additionalDays: number;
  additionalAmountVnd: number;
  totalVnd: number;
  paidVnd: number;
  remainingVnd: number;
  paymentStatus: 'unpaid' | 'pending' | 'partially_paid' | 'paid';
  persisted: boolean;
};

const json = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((data as { error?: string }).error ?? `HTTP ${response.status}`));
  return data as T;
};

export async function createPersistedBooking(input: {
  vehicleId: string;
  from: string;
  to: string;
  client: string;
  contact: string;
}): Promise<{ bookingId: string; estimatedTotalVnd: number; status: string }> {
  return json(await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...input, channel: 'telegram' }),
  }));
}

export async function updatePersistedBookingStatus(bookingId: string, status: 'contacted' | 'confirmed' | 'vehicle_issued' | 'active' | 'return_due' | 'returned' | 'completed' | 'cancelled'): Promise<void> {
  await json(await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'x-uniq-demo-role': 'employee' },
    body: JSON.stringify({ status }),
  }));
}

export async function extendPersistedBooking(bookingId: string, newTo: string, actor: 'client' | 'employee' | 'owner' = 'client'): Promise<BookingExtensionResult> {
  return json(await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/extend`, {
    method:'PATCH',
    headers:{ 'content-type':'application/json', 'x-uniq-demo-role':actor },
    body:JSON.stringify({ newTo, note:actor === 'client' ? 'Продление клиентом из MY UNIQ' : 'Продление сотрудником' }),
  }));
}

export async function fetchPaymentProviders(): Promise<PaymentProviderInfo[]> {
  const data = await json<{ providers: PaymentProviderInfo[] }>(await fetch('/api/payments/providers', { cache: 'no-store' }));
  return data.providers;
}

export async function createPaymentIntent(input: { bookingId: string; provider: PaymentProvider; prepaymentPercent: 30 | 100; purpose?: PaymentPurpose }): Promise<PaymentIntent> {
  const data = await json<{ payment: PaymentIntent }>(await fetch('/api/payments/intents', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-uniq-demo-role':'client' },
    body: JSON.stringify(input),
  }));
  return data.payment;
}

export async function confirmDemoPayment(paymentId: string): Promise<{ paymentId: string; bookingId: string; status: 'paid'; amountVnd: number; bookingPaidVnd: number; bookingTotalVnd: number; bookingPaymentStatus: string }> {
  return json(await fetch(`/api/payments/${encodeURIComponent(paymentId)}/demo-confirm`, { method: 'POST', headers:{ 'x-uniq-demo-role':'client' } }));
}
