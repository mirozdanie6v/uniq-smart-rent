export type D1Result = { success?: boolean; results?: unknown[]; meta?: unknown };

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  exec(query: string): Promise<D1Result>;
}

let bootstrapPromise: Promise<void> | null = null;

const schemaSql = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS schema_meta (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  category TEXT NOT NULL,
  engine_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'manager_confirmation',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS pricing (
  vehicle_id TEXT PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
  daily_vnd INTEGER NOT NULL,
  weekly_vnd INTEGER NOT NULL,
  monthly_vnd INTEGER NOT NULL,
  deposit_usd INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  preferred_channel TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  from_at TEXT NOT NULL,
  to_at TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_total_vnd INTEGER NOT NULL,
  delivery_location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'smart-rent',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE REFERENCES bookings(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  issued_at TEXT,
  due_at TEXT,
  returned_at TEXT,
  final_total_vnd INTEGER,
  deposit_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS service_events (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  event_type TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS staff_notes (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  note TEXT NOT NULL,
  author TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_window ON bookings(vehicle_id, from_at, to_at, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_vehicle_window ON service_events(vehicle_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_log(entity_type, entity_id, created_at DESC);
`;

const seedSql = `
INSERT OR IGNORE INTO vehicles (id, slug, brand, model, year, category, engine_label, status) VALUES
('mt09-sp-2023','yamaha-mt-09-sp-2023','Yamaha','MT-09 SP',2023,'naked','900 cc','manager_confirmation'),
('xmax-2024','yamaha-x-max-2024-76826','Yamaha','X-Max 300',2024,'scooter','292 cc','manager_confirmation'),
('r7-2023','yamaha-r7-2023','Yamaha','YZF-R7',2023,'sport','689 cc','manager_confirmation'),
('rebel-300-2023','honda-rebel-300-2023','Honda','Rebel 300',2023,'cruiser','286 cc','manager_confirmation'),
('espero-50-2024','detech-espero-50cc-2024','Detech','Espero 50cc',2024,'scooter','49 cc','manager_confirmation');
INSERT OR IGNORE INTO pricing (vehicle_id, daily_vnd, weekly_vnd, monthly_vnd, deposit_usd) VALUES
('mt09-sp-2023',4000000,15000000,32000000,2000),
('xmax-2024',1800000,8000000,17000000,600),
('r7-2023',3500000,16000000,32000000,1500),
('rebel-300-2023',1600000,7000000,17500000,600),
('espero-50-2024',450000,2500000,4000000,200);
INSERT OR IGNORE INTO vehicle_photos (id, vehicle_id, url, sort_order, source_url) VALUES
('mt09-sp-2023-1','mt09-sp-2023','https://ahodwykbyoytwtpfoxgi.supabase.co/storage/v1/object/public/public-assets/vehicles/75172/1.jpg',1,'https://uniqmoto.com/en/rentals/motorcycles/yamaha-mt-09-sp-2023'),
('xmax-2024-1','xmax-2024','https://uniqmoto.com/assets/vehicles/client-fleet/yamaha-x-max-2024-76826.webp',1,'https://uniqmoto.com/en/rentals/motorcycles/yamaha-x-max-2024-76826'),
('r7-2023-1','r7-2023','https://uniqmoto.com/assets/vehicles/client-fleet/yamaha-r7-2023.webp',1,'https://uniqmoto.com/en/rentals/motorcycles/yamaha-r7-2023'),
('rebel-300-2023-1','rebel-300-2023','https://uniqmoto.com/assets/vehicles/client-fleet/honda-rebel-300-2023.webp',1,'https://uniqmoto.com/en/rentals/motorcycles/honda-rebel-300-2023'),
('espero-50-2024-1','espero-50-2024','https://uniqmoto.com/assets/vehicles/client-fleet/detech-espero-50cc-2024.webp',1,'https://uniqmoto.com/en/rentals/motorcycles/detech-espero-50cc-2024');
INSERT OR IGNORE INTO schema_meta (version) VALUES (2);
`;

export async function ensureDatabase(db: D1DatabaseLike): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await db.exec(schemaSql);
      await db.exec(seedSql);
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  await bootstrapPromise;
}
