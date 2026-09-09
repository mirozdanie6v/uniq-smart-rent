PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_branches_status_name_stage12 ON branches(status, name);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status_stage12 ON payments(booking_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_extensions_booking_date_stage12 ON booking_extensions(booking_id, new_to_at DESC);

INSERT OR REPLACE INTO business_settings (key, value_json, updated_at) VALUES
('stage12_operations', '{"dynamic_branches":true,"client_extensions":true,"balance_payments":true,"single_pending_payment":true}', CURRENT_TIMESTAMP);
