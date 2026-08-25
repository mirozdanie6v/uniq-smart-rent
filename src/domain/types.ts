export type Language = 'ru' | 'en' | 'vi' | 'ko';
export type Role = 'client' | 'team' | 'owner';
export type VehicleCategory = 'scooter' | 'naked' | 'cruiser' | 'sport';
export type AvailabilityMode = 'manager_confirmation';
export type BookingStatus =
  | 'draft'
  | 'new'
  | 'contacted'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'vehicle_issued'
  | 'active'
  | 'return_due'
  | 'returned'
  | 'completed';

export interface LocalizedText {
  ru: string;
  en: string;
  vi: string;
  ko: string;
}

export interface PriceTiers {
  dailyVnd: number;
  weeklyVnd: number;
  monthlyVnd: number;
  depositUsd: number;
}

export interface VehiclePhoto {
  src: string;
  alt: LocalizedText;
  sourceUrl: string;
}

export interface Vehicle {
  id: string;
  slug: string;
  brand: string;
  model: string;
  year: number;
  category: VehicleCategory;
  engineLabel: string;
  weightKg: number;
  cruiseSpeed: string;
  fuelUse: string;
  capacity: string;
  pricing: PriceTiers;
  availability: AvailabilityMode;
  descriptions: LocalizedText;
  included: LocalizedText[];
  requirements: LocalizedText[];
  tags: string[];
  photos: VehiclePhoto[];
  sourceUrl: string;
  verifiedAt: string;
}

export interface Booking {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  status: BookingStatus;
  client: string;
  contact: string;
  channel: 'whatsapp' | 'telegram' | 'phone' | 'other';
  deliveryLocation: string;
  note: string;
  estimatedTotalVnd: number;
  createdAt: string;
  persistence: 'session' | 'd1';
}

export interface Branch {
  id: string;
  name: LocalizedText;
  address: string;
  mapsUrl: string;
}

export interface BusinessInfo {
  legalName: string;
  brand: string;
  phone: string;
  phoneDisplay: string;
  whatsappUrl: string;
  telegramHandle: string;
  telegramUrl: string;
  zaloPhone: string;
  website: string;
  publicRating: number;
  publicReviewCount: number;
  publicFleetCount: number;
  branches: Branch[];
  verifiedAt: string;
}
