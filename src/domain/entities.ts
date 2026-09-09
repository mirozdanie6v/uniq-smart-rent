export type Id = string;
export type IsoDate = string;
export type IsoDateTime = string;
export type MoneyVnd = number;
export type LanguageCode = 'ru' | 'vi' | 'en' | 'ko' | 'zh';
export type CurrencyCode = 'VND' | 'RUB' | 'USD';

export type BranchStatus = 'active' | 'inactive';
export interface BranchEntity {
  id: Id;
  code: string;
  name: string;
  address: string;
  mapsUrl: string;
  phone?: string;
  timezone: string;
  status: BranchStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type EmployeeRole = 'owner' | 'admin' | 'manager' | 'branch_staff';
export type EmployeeStatus = 'active' | 'inactive';
export interface EmployeeEntity {
  id: Id;
  branchId?: Id;
  name: string;
  role: EmployeeRole;
  phone?: string;
  telegram?: string;
  zalo?: string;
  status: EmployeeStatus;
  permissions: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type VehicleKind = 'car' | 'motorcycle' | 'scooter';
export type VehicleOperationalStatus = 'available' | 'reserved' | 'rented' | 'service' | 'hidden' | 'archived' | 'manager_confirmation';
export interface VehicleEntity {
  id: Id;
  branchId?: Id;
  slug: string;
  brand: string;
  model: string;
  title: string;
  kind: VehicleKind;
  year?: number;
  engineLabel?: string;
  color?: string;
  registrationNumber?: string;
  internalNumber?: string;
  description?: string;
  status: VehicleOperationalStatus;
  dailyVnd: MoneyVnd;
  threeDayVnd?: MoneyVnd;
  weeklyVnd?: MoneyVnd;
  fourteenDayVnd?: MoneyVnd;
  monthlyVnd?: MoneyVnd;
  depositVnd?: MoneyVnd;
  photos: string[];
  sortOrder: number;
  published: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type CustomerSegment = 'new' | 'repeat' | 'vip' | 'inactive';
export interface CustomerEntity {
  id: Id;
  name: string;
  country?: string;
  language: LanguageCode;
  phone?: string;
  telegram?: string;
  zalo?: string;
  whatsapp?: string;
  preferredChannel: 'telegram' | 'zalo' | 'whatsapp' | 'phone' | 'other';
  segment: CustomerSegment;
  tags: string[];
  notes?: string;
  firstContactAt: IsoDateTime;
  lastRentalAt?: IsoDateTime;
  rentalCount: number;
  lifetimeValueVnd: MoneyVnd;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type BookingStatusEntity = 'new' | 'awaiting_payment' | 'paid' | 'confirmed' | 'ready_for_handover' | 'issued' | 'active' | 'return_due' | 'completed' | 'cancelled';
export type BookingSource = 'telegram_mini_app' | 'website' | 'office' | 'telegram_ads' | 'google' | 'instagram' | 'partner' | 'qr' | 'manual';
export interface BookingEntity {
  id: Id;
  customerId: Id;
  vehicleId: Id;
  pickupBranchId?: Id;
  returnBranchId?: Id;
  managerId?: Id;
  fromAt: IsoDateTime;
  toAt: IsoDateTime;
  status: BookingStatusEntity;
  source: BookingSource;
  currency: CurrencyCode;
  subtotalVnd: MoneyVnd;
  discountVnd: MoneyVnd;
  depositVnd: MoneyVnd;
  totalVnd: MoneyVnd;
  paidVnd: MoneyVnd;
  promoCode?: string;
  note?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type PaymentProviderCode = 'demo' | 'vietqr' | 'vnpay' | 'momo' | 'zalopay' | 'sbp' | 'yookassa' | 'tbank' | 'cash' | 'bank_transfer';
export type PaymentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'partially_refunded' | 'refunded';
export interface PaymentEntity {
  id: Id;
  bookingId: Id;
  customerId: Id;
  provider: PaymentProviderCode;
  providerPaymentId?: string;
  status: PaymentStatus;
  currency: CurrencyCode;
  amountVnd: MoneyVnd;
  displayAmount?: number;
  qrPayload?: string;
  paymentUrl?: string;
  expiresAt?: IsoDateTime;
  paidAt?: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type TransactionType = 'payment' | 'refund' | 'deposit_received' | 'deposit_returned' | 'cash_adjustment' | 'service_expense';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export interface TransactionEntity {
  id: Id;
  bookingId?: Id;
  paymentId?: Id;
  branchId?: Id;
  vehicleId?: Id;
  customerId?: Id;
  type: TransactionType;
  status: TransactionStatus;
  amountVnd: MoneyVnd;
  method: string;
  occurredAt: IsoDateTime;
  note?: string;
  createdAt: IsoDateTime;
}

export type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export interface ServiceRecordEntity {
  id: Id;
  vehicleId: Id;
  branchId?: Id;
  status: ServiceStatus;
  serviceType: 'maintenance' | 'repair' | 'inspection' | 'cleaning' | 'other';
  mileageKm?: number;
  costVnd: MoneyVnd;
  startedAt: IsoDateTime;
  completedAt?: IsoDateTime;
  nextServiceAt?: IsoDateTime;
  nextServiceMileageKm?: number;
  note?: string;
  createdByEmployeeId?: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';
export type DiscountType = 'percent' | 'fixed_vnd';
export interface PromotionEntity {
  id: Id;
  name: string;
  status: PromotionStatus;
  discountType: DiscountType;
  discountValue: number;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  branchIds: Id[];
  vehicleIds: Id[];
  promoCode?: string;
  maxUses?: number;
  usesCount: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const ENTITY_TABLES = [
  'branches',
  'employees',
  'vehicles',
  'customers',
  'bookings',
  'payments',
  'transactions',
  'service_records',
  'promotions',
] as const;

export type EntityTable = (typeof ENTITY_TABLES)[number];
