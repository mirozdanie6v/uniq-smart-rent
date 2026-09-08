export type PaymentCurrency = 'VND' | 'RUB' | 'USD';
export type PaymentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentProviderId =
  | 'demo'
  | 'vietqr'
  | 'vnpay'
  | 'momo'
  | 'zalopay'
  | 'sbp'
  | 'yookassa'
  | 'tbank';

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  currency: PaymentCurrency;
  description: string;
  returnUrl?: string;
}

export interface PaymentSession {
  id: string;
  provider: PaymentProviderId;
  status: PaymentStatus;
  amount: number;
  currency: PaymentCurrency;
  qrPayload?: string;
  deepLink?: string;
  expiresAt?: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  readonly mode: 'demo' | 'live';
  createPayment(input: CreatePaymentInput): Promise<PaymentSession>;
  getStatus(paymentId: string): Promise<PaymentStatus>;
  refund(paymentId: string, amount?: number): Promise<PaymentStatus>;
}
