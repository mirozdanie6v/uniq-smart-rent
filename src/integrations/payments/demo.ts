import type { CreatePaymentInput, PaymentProvider, PaymentSession, PaymentStatus } from './types';

const sessions = new Map<string, PaymentSession>();

function makeId(): string {
  return `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const demoPaymentProvider: PaymentProvider = {
  id: 'demo',
  mode: 'demo',

  async createPayment(input: CreatePaymentInput): Promise<PaymentSession> {
    const id = makeId();
    const session: PaymentSession = {
      id,
      provider: 'demo',
      status: 'pending',
      amount: input.amount,
      currency: input.currency,
      qrPayload: `UNIQ|${input.bookingId}|${input.amount}|${input.currency}|${id}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
    sessions.set(id, session);
    return session;
  },

  async getStatus(paymentId: string): Promise<PaymentStatus> {
    return sessions.get(paymentId)?.status ?? 'failed';
  },

  async refund(paymentId: string): Promise<PaymentStatus> {
    const session = sessions.get(paymentId);
    if (!session) return 'failed';
    session.status = 'refunded';
    sessions.set(paymentId, session);
    return 'refunded';
  },
};

export function markDemoPaymentPaid(paymentId: string): PaymentSession | null {
  const session = sessions.get(paymentId);
  if (!session) return null;
  session.status = 'paid';
  sessions.set(paymentId, session);
  return session;
}
