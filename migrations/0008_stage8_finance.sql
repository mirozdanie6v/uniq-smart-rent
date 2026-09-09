PRAGMA foreign_keys = ON;

ALTER TABLE bookings ADD COLUMN deposit_received_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN deposit_returned_vnd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN deposit_status TEXT NOT NULL DEFAULT 'not_required' CHECK (deposit_status IN ('not_required','pending','held','partially_returned','returned'));

CREATE TABLE IF NOT EXISTS payment_refunds (
  id TEXT PRIMARY KEY,
  source_transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  payment_id TEXT REFERENCES payments(id) ON DELETE SET NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  amount_vnd INTEGER NOT NULL CHECK (amount_vnd > 0),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled')),
  reason TEXT NOT NULL DEFAULT '',
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_finance_transactions_status_date ON transactions(status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_refunds_payment ON payment_refunds(payment_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_refunds_source ON payment_refunds(source_transaction_id, status, created_at DESC);

-- Demonstration ledger for the sales prototype. These rows are clearly presented as DEMO data in the owner UI.
INSERT OR IGNORE INTO transactions (id,branch_id,type,status,amount_vnd,method,occurred_at,note,created_at) VALUES
('demo-fin-payment-01','branch-center','payment','completed',4800000,'vietqr',datetime('now','-2 hours'),'DEMO · аренда X-Max · онлайн',datetime('now','-2 hours')),
('demo-fin-payment-02','branch-north','payment','completed',2700000,'cash',datetime('now','-4 hours'),'DEMO · скутер · наличные',datetime('now','-4 hours')),
('demo-fin-deposit-01','branch-center','deposit_received','completed',3000000,'cash',datetime('now','-5 hours'),'DEMO · депозит клиента',datetime('now','-5 hours')),
('demo-fin-payment-03','branch-north','payment','completed',6400000,'vnpay',datetime('now','-1 day','-3 hours'),'DEMO · мотоцикл · VNPAY',datetime('now','-1 day','-3 hours')),
('demo-fin-refund-01','branch-north','refund','completed',1200000,'vnpay',datetime('now','-1 day','-2 hours'),'DEMO · частичный возврат',datetime('now','-1 day','-2 hours')),
('demo-fin-deposit-return-01','branch-center','deposit_returned','completed',2000000,'cash',datetime('now','-1 day','-1 hours'),'DEMO · возврат депозита',datetime('now','-1 day','-1 hours')),
('demo-fin-payment-04','branch-center','payment','completed',5900000,'sbp',datetime('now','-2 day','-4 hours'),'DEMO · СБП',datetime('now','-2 day','-4 hours')),
('demo-fin-payment-05','branch-north','payment','completed',3200000,'cash',datetime('now','-3 day','-2 hours'),'DEMO · наличные',datetime('now','-3 day','-2 hours')),
('demo-fin-deposit-02','branch-north','deposit_received','completed',4000000,'bank_transfer',datetime('now','-4 day','-5 hours'),'DEMO · депозит переводом',datetime('now','-4 day','-5 hours')),
('demo-fin-payment-06','branch-center','payment','completed',7100000,'momo',datetime('now','-5 day','-1 hours'),'DEMO · MoMo',datetime('now','-5 day','-1 hours')),
('demo-fin-payment-07','branch-center','payment','completed',4600000,'yookassa',datetime('now','-6 day','-3 hours'),'DEMO · ЮKassa',datetime('now','-6 day','-3 hours'));
