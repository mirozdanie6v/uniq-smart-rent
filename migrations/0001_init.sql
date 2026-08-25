PRAGMA foreign_keys = ON;

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
