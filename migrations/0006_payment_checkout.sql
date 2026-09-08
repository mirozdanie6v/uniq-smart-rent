-- Stage 5: payment checkout, provider events and idempotent demo confirmation.
ALTER TABLE payments ADD COLUMN payment_reference TEXT;
ALTER TABLE payments ADD COLUMN method_label TEXT;
ALTER TABLE payments ADD COLUMN checkout_token TEXT;
ALTER TABLE payments ADD COLUMN confirmed_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_checkout_token ON payments(checkout_token);
CREATE INDEX IF NOT EXISTS idx_payments_booking_status ON payments(booking_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_booking_type ON transactions(booking_id, type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS payment_events (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event ON payment_events(provider, provider_event_id) WHERE provider_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON payment_events(payment_id, created_at DESC);

INSERT OR IGNORE INTO schema_meta (version) VALUES (6);
