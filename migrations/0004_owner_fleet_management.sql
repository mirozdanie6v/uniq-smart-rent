PRAGMA foreign_keys = ON;

ALTER TABLE vehicles ADD COLUMN owner_managed INTEGER NOT NULL DEFAULT 0 CHECK (owner_managed IN (0,1));
ALTER TABLE vehicles ADD COLUMN owner_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_vehicles_owner_managed ON vehicles(owner_managed, archived_at, published);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch_status ON vehicles(branch_id, status, archived_at);

UPDATE vehicles SET owner_managed = 0 WHERE owner_managed IS NULL;

INSERT OR REPLACE INTO business_settings (key, value_json, updated_at) VALUES
('fleet_management', '{"mode":"base_catalog_plus_d1_overrides","photo_upload":"demo_compressed_data_url","branches":["branch-north","branch-center"]}', CURRENT_TIMESTAMP);
