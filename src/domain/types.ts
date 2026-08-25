export type Language = 'ru' | 'en' | 'vi' | 'ko';
export type Role = 'client' | 'team' | 'owner';
export type VehicleCategory = 'scooter' | 'naked' | 'cruiser' | 'adventure';
export type FleetStatus = 'available' | 'booked' | 'rented' | 'service';
export type BookingStatus = 'request' | 'confirmed' | 'active' | 'returned';

export interface Vehicle {
  id: string;
  slug: string;
  model: string;
  year: number;
  category: VehicleCategory;
  pricePerDayVnd: number;
  depositUsd: number;
  status: FleetStatus;
  nextEvent: string;
  description: string;
  tags: string[];
  demoVisual: string;
}

export interface Booking {
  id: string;
  vehicleId: string;
  from: string;
  to: string;
  status: BookingStatus;
  client: string;
  totalVnd: number;
}
