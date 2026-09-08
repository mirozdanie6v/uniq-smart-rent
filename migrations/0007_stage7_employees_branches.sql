PRAGMA foreign_keys = ON;

CREATE INDEX IF NOT EXISTS idx_employees_branch_status ON employees(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_transfers_status ON vehicle_transfers(status, created_at);

INSERT OR IGNORE INTO employees (id, branch_id, name, role, phone, telegram, zalo, status) VALUES
('employee-demo-admin','branch-center','Алексей Морозов','admin','+84 37 211 2370','@uniq_admin','','active'),
('employee-demo-linh','branch-center','Linh Nguyễn','manager','','@uniq_linh','','active'),
('employee-demo-minh','branch-north','Minh Trần','manager','','@uniq_minh','','active'),
('employee-demo-anh','branch-north','Anh Phạm','branch_staff','','','','active'),
('employee-demo-huong','branch-center','Hương Lê','branch_staff','','','','active');

INSERT OR IGNORE INTO employee_permissions (employee_id, permission) VALUES
('employee-demo-admin','bookings.view'),
('employee-demo-admin','bookings.manage'),
('employee-demo-admin','customers.view'),
('employee-demo-admin','fleet.status'),
('employee-demo-admin','fleet.pricing'),
('employee-demo-admin','payments.manage'),
('employee-demo-admin','finance.view'),
('employee-demo-admin','team.manage'),
('employee-demo-admin','transfers.manage'),
('employee-demo-linh','bookings.view'),
('employee-demo-linh','bookings.manage'),
('employee-demo-linh','customers.view'),
('employee-demo-linh','fleet.status'),
('employee-demo-linh','payments.manage'),
('employee-demo-linh','transfers.manage'),
('employee-demo-minh','bookings.view'),
('employee-demo-minh','bookings.manage'),
('employee-demo-minh','customers.view'),
('employee-demo-minh','fleet.status'),
('employee-demo-minh','payments.manage'),
('employee-demo-minh','transfers.manage'),
('employee-demo-anh','bookings.view'),
('employee-demo-anh','fleet.status'),
('employee-demo-anh','transfers.manage'),
('employee-demo-huong','bookings.view'),
('employee-demo-huong','fleet.status'),
('employee-demo-huong','transfers.manage');
