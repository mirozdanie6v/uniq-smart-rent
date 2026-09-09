PRAGMA foreign_keys = ON;

-- Branches / offices ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  maps_url TEXT NOT NULL DEFAULT '',
  phone TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO branches (id, code, name, address, maps_url) VALUES
('branch-north','north','Северный филиал','312 Đ. 2/4, Bắc Nha Trang','https://maps.app.goo.gl/qr3FNiVVxAdThVBV6'),
('branch-center','center','Центр города','254 Nguyễn Thị Minh Khai, Nha Trang','https://maps.app.goo.gl/sJdMndLRPz9b228J7');

-- Employees / access --------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','manager','branch_staff')),
  phone TEXT,
  telegram TEXT,
  zalo TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_permissions (
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id, permission)
);

-- Extend existing fleet model ----------------------------------------------
ALTER TABLE vehicles ADD COLUMN branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE vehicles ADD COLUMN kind TEXT;
ALTER TABLE vehicles ADD COLUMN title TEXT;
ALTER TABLE vehicles ADD COLUMN color TEXT;
ALTER TABLE vehicles ADD COLUMN registration_number TEXT;
ALTER TABLE vehicles ADD COLUMN internal_number TEXT;
ALTER TABLE vehicles ADD COLUMN description TEXT;
ALTER TABLE vehicles ADD COLUMN published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1));
ALTER TABLE vehicles ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN archived_at TEXT;

UPDATE vehicles
SET kind = CASE
  WHEN category = 'scooter' THEN 'scooter'
  WHEN category IN ('naked','cruiser','sport') THEN 'motorcycle'
  ELSE COALESCE(kind,'motorcycle')
END
WHERE kind IS NULL;

UPDATE vehicles SET title = TRIM(brand || ' ' || model) WHERE title IS NULL OR title = '';

ALTER TABLE pricing ADD COLUMN three_day_vnd INTEGER;
ALTER TABLE pricing ADD COLUMN fourteen_day_vnd INTEGER;
ALTER TABLE pricing ADD COLUMN deposit_vnd INTEGER;
ALTER TABLE pricing ADD COLUMN custom_rate_note TEXT;

CREATE TABLE IF NOT EXISTS vehicle_availability_blocks (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('reservation','rental','service','manual')),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  source_entity_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_transfers (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  from_branch_id TEXT REFERENCES branches(id),
  to_branch_id TEXT NOT NULL REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_transit','completed','cancelled')),
  planned_at TEXT,
  completed_at TEXT,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CRM -----------------------------------------------------------------------
ALTER TABLE customers ADD COLUMN country TEXT;
ALTER TABLE customers ADD COLUMN language TEXT NOT NULL DEFAULT 'ru';
ALTER TABLE customers ADD COLUMN phone TEXT;
ALTER TABLE customers ADD COLUMN telegram TEXT;
ALTER TABLE customers ADD COLUMN zalo TEXT;
ALTER TABLE customers ADD COLUMN whatsapp TEXT;
ALTER TABLE customers ADD COLUMN segment TEXT NOT NULL DEFAULT 'new';
ALTER TABLE customers ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE customers ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE customers ADD COLUMN first_contact_at TEXT;
ALTER TABLE customers ADD COLUMN last_rental_at TEXT;
ALTER TABLE customers ADD COLUMN rental_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE customers ADD COLUMN lifetime_value_vnd INTEGER NOT NULL DEFAULT 0;

UPDATE customers SET first_contact_at = COALESCE(first_contact_at, created_at);

-- Booking / operational lifecycle ------------------------------------------
ALTER TABLE bookings ADD COLUMN pickup_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN return_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN manager_id TEXT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN source_channel TEXT NOT NULL DEFAULT 'telegram_mini_app';
ALTER TABLE bookings ADD COLUMN currency TEXT NOT NULL DEFAULT 'VND';
ALTER TABLE bookings ADD COLUMN subtotal_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN discount_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN deposit_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN total_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN paid_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN promo_code TEXT;
ALTER TABLE bookings ADD COLUMN prepayment_percent INTEGER NOT NULL DEFAULT 100;

UPDATE bookings
SET subtotal_vnd = CASE WHEN subtotal_vnd = 0 THEN estimated_total_vnd ELSE subtotal_vnd END,
    total_vnd = CASE WHEN total_vnd = 0 THEN estimated_total_vnd ELSE total_vnd END;

CREATE TABLE IF NOT EXISTS booking_status_history (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments / finance --------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','pending','paid','failed','cancelled','partially_refunded','refunded')),
  currency TEXT NOT NULL DEFAULT 'VND',
  amount_vnd INTEGER NOT NULL,
  display_amount REAL,
  qr_payload TEXT,
  payment_url TEXT,
  expires_at TEXT,
  paid_at TEXT,
  provider_payload_json TEXT NOT NULL DEFAULT '{}',
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('payment','refund','deposit_received','deposit_returned','cash_adjustment','service_expense')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled')),
  amount_vnd INTEGER NOT NULL,
  method TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Rental handover / return --------------------------------------------------
ALTER TABLE rentals ADD COLUMN pickup_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE rentals ADD COLUMN return_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE rentals ADD COLUMN issued_by_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE rentals ADD COLUMN returned_by_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE rentals ADD COLUMN odometer_out_km INTEGER;
ALTER TABLE rentals ADD COLUMN odometer_in_km INTEGER;
ALTER TABLE rentals ADD COLUMN deposit_vnd INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS rental_inspections (
  id TEXT PRIMARY KEY,
  rental_id TEXT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('handover','return')),
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  body_ok INTEGER NOT NULL DEFAULT 1,
  wheels_ok INTEGER NOT NULL DEFAULT 1,
  brakes_ok INTEGER NOT NULL DEFAULT 1,
  fuel_ok INTEGER NOT NULL DEFAULT 1,
  helmet_ok INTEGER NOT NULL DEFAULT 1,
  documents_ok INTEGER NOT NULL DEFAULT 1,
  damage_found INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  photos_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_documents (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('passport','driver_license','international_license','rental_agreement','other')),
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('requested','received','verified','rejected')),
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Service -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_records (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
  service_type TEXT NOT NULL CHECK (service_type IN ('maintenance','repair','inspection','cleaning','other')),
  mileage_km INTEGER,
  cost_vnd INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  next_service_at TEXT,
  next_service_mileage_km INTEGER,
  note TEXT NOT NULL DEFAULT '',
  created_by_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Promotions / marketing ----------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','archived')),
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent','fixed_vnd')),
  discount_value INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  promo_code TEXT,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotion_branches (
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, branch_id)
);

CREATE TABLE IF NOT EXISTS promotion_vehicles (
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, vehicle_id)
);

-- Integration / business configuration -------------------------------------
CREATE TABLE IF NOT EXISTS integration_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'demo' CHECK (status IN ('demo','configured','disabled')),
  config_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO integration_configs (id, provider, category, status) VALUES
('integration-vietqr','vietqr','payment','demo'),
('integration-vnpay','vnpay','payment','demo'),
('integration-momo','momo','payment','demo'),
('integration-zalopay','zalopay','payment','demo'),
('integration-sbp','sbp','payment','demo'),
('integration-yookassa','yookassa','payment','demo'),
('integration-tbank','tbank','payment','demo'),
('integration-telegram','telegram','communication','demo'),
('integration-zalo','zalo','communication','demo');

CREATE TABLE IF NOT EXISTS business_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for owner dashboard / CRM / analytics ----------------------------
CREATE INDEX IF NOT EXISTS idx_vehicles_branch_status ON vehicles(branch_id, status, published);
CREATE INDEX IF NOT EXISTS idx_vehicle_blocks_window ON vehicle_availability_blocks(vehicle_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_vehicle_transfers_status ON vehicle_transfers(status, planned_at);
CREATE INDEX IF NOT EXISTS idx_customers_segment_value ON customers(segment, lifetime_value_vnd DESC);
CREATE INDEX IF NOT EXISTS idx_customers_last_rental ON customers(last_rental_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_status ON bookings(pickup_branch_id, status, from_at);
CREATE INDEX IF NOT EXISTS idx_bookings_source_created ON bookings(source_channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_status_history(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments(booking_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_status ON payments(provider, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_date ON transactions(branch_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle ON service_records(vehicle_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_records_next ON service_records(status, next_service_at);
CREATE INDEX IF NOT EXISTS idx_promotions_status_dates ON promotions(status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_employees_branch_role ON employees(branch_id, role, status);
