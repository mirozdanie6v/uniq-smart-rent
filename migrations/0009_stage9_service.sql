PRAGMA foreign_keys = ON;

ALTER TABLE vehicles ADD COLUMN odometer_km INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN last_service_at TEXT;
ALTER TABLE vehicles ADD COLUMN next_service_at TEXT;
ALTER TABLE vehicles ADD COLUMN next_service_mileage_km INTEGER;

ALTER TABLE service_records ADD COLUMN supplier TEXT NOT NULL DEFAULT '';
ALTER TABLE service_records ADD COLUMN parts_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE service_records ADD COLUMN inspection_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE service_records ADD COLUMN odometer_after_km INTEGER;

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('routine','pre_rental','post_rental','service')),
  mileage_km INTEGER,
  body_ok INTEGER NOT NULL DEFAULT 1,
  wheels_ok INTEGER NOT NULL DEFAULT 1,
  brakes_ok INTEGER NOT NULL DEFAULT 1,
  lights_ok INTEGER NOT NULL DEFAULT 1,
  fluids_ok INTEGER NOT NULL DEFAULT 1,
  tires_ok INTEGER NOT NULL DEFAULT 1,
  electrics_ok INTEGER NOT NULL DEFAULT 1,
  damage_found INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  photos_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_records_status_started ON service_records(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_records_branch_status ON service_records(branch_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle_created ON vehicle_inspections(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_next_service ON vehicles(next_service_at, next_service_mileage_km);

INSERT OR IGNORE INTO service_records (id,vehicle_id,branch_id,status,service_type,mileage_km,cost_vnd,started_at,completed_at,next_service_at,next_service_mileage_km,note,supplier,parts_json,inspection_json) VALUES
('service-demo-xmax','xmax-2024','branch-center','completed','maintenance',12840,850000,'2026-08-26T03:00:00Z','2026-08-26T06:30:00Z','2026-10-26T03:00:00Z',15840,'Замена масла и фильтра','UNIQ Service','["масло","фильтр"]','{"brakes":true,"tires":true}'),
('service-demo-rebel','rebel-300-2023','branch-north','in_progress','repair',21420,1600000,'2026-09-08T02:30:00Z',NULL,NULL,NULL,'Диагностика тормозной системы','Moto Service Nha Trang','["колодки"]','{"brakes":false,"tires":true}'),
('service-demo-espero','espero-50-2024','branch-center','scheduled','inspection',8930,0,'2026-09-10T02:00:00Z',NULL,'2026-11-10T02:00:00Z',10930,'Плановый осмотр перед высоким сезоном','UNIQ Service','[]','{}');

UPDATE vehicles SET odometer_km=12840,last_service_at='2026-08-26T06:30:00Z',next_service_at='2026-10-26T03:00:00Z',next_service_mileage_km=15840 WHERE id='xmax-2024';
UPDATE vehicles SET odometer_km=21420 WHERE id='rebel-300-2023';
UPDATE vehicles SET odometer_km=8930,next_service_at='2026-11-10T02:00:00Z',next_service_mileage_km=10930 WHERE id='espero-50-2024';
