export type AnalyticsPeriod = 'today' | '7d' | '30d';
export type AnalyticsBranch = 'all' | 'branch-north' | 'branch-center';

export interface AnalyticsKpis {
  revenueVnd: number;
  bookings: number;
  paidBookings: number;
  averageCheckVnd: number;
  utilizationPercent: number;
  repeatSharePercent: number;
  newCustomers: number;
  activeRentals: number;
  conversionPercent: number;
}

export interface AnalyticsTrendPoint {
  day: string;
  label: string;
  revenueVnd: number;
  bookings: number;
}

export interface AnalyticsStatusPoint {
  status: string;
  count: number;
}

export interface AnalyticsSourcePoint {
  source: string;
  bookings: number;
  revenueVnd: number;
  sharePercent: number;
}

export interface AnalyticsBranchPoint {
  branchId: string;
  label: string;
  bookings: number;
  revenueVnd: number;
  utilizationPercent: number;
}

export interface AnalyticsVehiclePoint {
  vehicleId: string;
  title: string;
  rentals: number;
  revenueVnd: number;
  utilizationPercent: number;
  idleDays: number;
}

export interface AnalyticsFunnelPoint {
  key: 'views' | 'vehicle_opens' | 'booking_starts' | 'payment_starts' | 'paid_bookings';
  label: string;
  value: number;
  conversionPercent: number;
}

export interface AnalyticsCustomers {
  all: number;
  new: number;
  repeat: number;
  vip: number;
  inactive: number;
  repeatSharePercent: number;
}

export interface AnalyticsSnapshot {
  period: AnalyticsPeriod;
  branch: AnalyticsBranch;
  kpis: AnalyticsKpis;
  trend: AnalyticsTrendPoint[];
  statuses: AnalyticsStatusPoint[];
  sources: AnalyticsSourcePoint[];
  branches: AnalyticsBranchPoint[];
  vehicles: AnalyticsVehiclePoint[];
  funnel: AnalyticsFunnelPoint[];
  customers: AnalyticsCustomers;
  persisted: boolean;
  demoData: boolean;
  generatedAt: string;
}

const headers = { accept: 'application/json', 'x-uniq-demo-role': 'owner' };

export async function fetchAnalyticsSnapshot(period: AnalyticsPeriod, branch: AnalyticsBranch): Promise<AnalyticsSnapshot | null> {
  try {
    const params = new URLSearchParams({ period, branch });
    const response = await fetch(`/api/owner/analytics?${params.toString()}`, { headers });
    if (!response.ok) return null;
    return await response.json() as AnalyticsSnapshot;
  } catch {
    return null;
  }
}
