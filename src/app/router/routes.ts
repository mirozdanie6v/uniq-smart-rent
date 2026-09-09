export type AppRole = 'client' | 'employee' | 'owner';

export type ClientRoute = 'home' | 'catalog' | 'bookings' | 'contacts' | 'profile';
export type EmployeeRoute = 'dashboard' | 'requests' | 'fleet' | 'handover';
export type OwnerRoute =
  | 'dashboard'
  | 'bookings'
  | 'fleet'
  | 'customers'
  | 'employees'
  | 'finance'
  | 'marketing'
  | 'analytics'
  | 'service'
  | 'integrations'
  | 'settings'
  | 'ai';

export interface RoleRoutes {
  client: readonly ClientRoute[];
  employee: readonly EmployeeRoute[];
  owner: readonly OwnerRoute[];
}

export const roleRoutes: RoleRoutes = {
  client: ['home', 'catalog', 'bookings', 'contacts', 'profile'],
  employee: ['dashboard', 'requests', 'fleet', 'handover'],
  owner: [
    'dashboard',
    'bookings',
    'fleet',
    'customers',
    'employees',
    'finance',
    'marketing',
    'analytics',
    'service',
    'integrations',
    'settings',
    'ai',
  ],
};
