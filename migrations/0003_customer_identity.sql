ALTER TABLE customers ADD COLUMN contact_key TEXT NOT NULL DEFAULT '';

UPDATE customers
SET contact_key = lower(
  replace(
    replace(
      replace(
        replace(
          replace(trim(contact), ' ', ''),
          '-', ''
        ),
        '(', ''
      ),
      ')', ''
    ),
    '.', ''
  )
)
WHERE contact_key = '';

CREATE INDEX IF NOT EXISTS idx_customers_contact_key ON customers(contact_key, updated_at DESC);
INSERT OR IGNORE INTO schema_meta (version) VALUES (3);
