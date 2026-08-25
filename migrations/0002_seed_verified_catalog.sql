INSERT OR REPLACE INTO vehicles (id, slug, brand, model, year, category, engine_label, status, updated_at) VALUES
('mt09-sp-2023','yamaha-mt-09-sp-2023','Yamaha','MT-09 SP',2023,'naked','900 cc','manager_confirmation',CURRENT_TIMESTAMP),
('xmax-2024','yamaha-x-max-2024-76826','Yamaha','X-Max 300',2024,'scooter','292 cc','manager_confirmation',CURRENT_TIMESTAMP),
('r7-2023','yamaha-r7-2023','Yamaha','YZF-R7',2023,'sport','689 cc','manager_confirmation',CURRENT_TIMESTAMP),
('rebel-300-2023','honda-rebel-300-2023','Honda','Rebel 300',2023,'cruiser','286 cc','manager_confirmation',CURRENT_TIMESTAMP),
('espero-50-2024','detech-espero-50cc-2024','Detech','Espero 50cc',2024,'scooter','49 cc','manager_confirmation',CURRENT_TIMESTAMP);

INSERT OR REPLACE INTO pricing (vehicle_id, daily_vnd, weekly_vnd, monthly_vnd, deposit_usd, updated_at) VALUES
('mt09-sp-2023',4000000,15000000,32000000,2000,CURRENT_TIMESTAMP),
('xmax-2024',1800000,8000000,17000000,600,CURRENT_TIMESTAMP),
('r7-2023',3500000,16000000,32000000,1500,CURRENT_TIMESTAMP),
('rebel-300-2023',1600000,7000000,17500000,600,CURRENT_TIMESTAMP),
('espero-50-2024',450000,2500000,4000000,200,CURRENT_TIMESTAMP);
