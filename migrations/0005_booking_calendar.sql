-- Stage 4: booking calendar, extensions and rental lifecycle -----------------

ALTER TABLE bookings ADD COLUMN original_to_at TEXT;
ALTER TABLE bookings ADD COLUMN extension_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN extended_at TEXT;
ALTER TABLE bookings ADD COLUMN issued_at TEXT;
ALTER TABLE bookings ADD COLUMN returned_at TEXT;

CREATE TABLE IF NOT EXISTS booking_extensions (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_to_at TEXT NOT NULL,
  new_to_at TEXT NOT NULL,
  additional_days INTEGER NOT NULL,
  additional_amount_vnd INTEGER NOT NULL DEFAULT 0,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking ON booking_extensions(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_period_status_stage4 ON bookings(vehicle_id, from_at, to_at, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_availability_blocks_period ON vehicle_availability_blocks(vehicle_id, starts_at, ends_at, block_type);
