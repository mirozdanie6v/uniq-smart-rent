PRAGMA foreign_keys = ON;

-- Stage 11 analytics funnel --------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_daily_funnel (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  vehicle_opens INTEGER NOT NULL DEFAULT 0,
  booking_starts INTEGER NOT NULL DEFAULT 0,
  payment_starts INTEGER NOT NULL DEFAULT 0,
  paid_bookings INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_funnel_day_branch ON analytics_daily_funnel(day DESC, branch_id);

-- Use the five canonical server-side vehicles seeded in migration 0002.
-- The frontend still shows the full 89-vehicle catalog; keeping D1 demo bookings
-- on canonical IDs avoids conflicts with owner-created fleet overrides.
UPDATE vehicles SET branch_id='branch-center', title='Yamaha X-Max 300', kind='scooter' WHERE id='xmax-2024';
UPDATE vehicles SET branch_id='branch-north', title='Yamaha MT-09 SP', kind='motorcycle' WHERE id='mt09-sp-2023';
UPDATE vehicles SET branch_id='branch-center', title='Yamaha YZF-R7', kind='motorcycle' WHERE id='r7-2023';
UPDATE vehicles SET branch_id='branch-north', title='Honda Rebel 300', kind='motorcycle' WHERE id='rebel-300-2023';
UPDATE vehicles SET branch_id='branch-center', title='Detech Espero 50cc', kind='scooter' WHERE id='espero-50-2024';

-- Realistic multilingual DEMO customers ------------------------------------
INSERT OR IGNORE INTO customers
(id,name,contact,preferred_channel,country,language,phone,telegram,zalo,segment,notes,first_contact_at,last_rental_at,rental_count,lifetime_value_vnd,created_at,updated_at)
VALUES
('demo-a11-01','Анна Крылова','@anna_demo','telegram','RU','ru',NULL,'@anna_demo',NULL,'new','DEMO · первый запрос',datetime('now','-1 hour'),NULL,0,0,datetime('now','-1 hour'),datetime('now','-1 hour')),
('demo-a11-02','Nguyễn Minh Anh','zalo-demo-02','zalo','VN','vi',NULL,NULL,'demo02','repeat','DEMO · повторный клиент',datetime('now','-40 day'),datetime('now','-12 day'),3,9800000,datetime('now','-40 day'),datetime('now','-3 hour')),
('demo-a11-03','Алексей Морозов','@alex_demo','telegram','RU','ru',NULL,'@alex_demo',NULL,'repeat','DEMO',datetime('now','-60 day'),datetime('now','-18 day'),2,11200000,datetime('now','-60 day'),datetime('now','-5 hour')),
('demo-a11-04','Kim Min-ji','@minji_demo','telegram','KR','ko',NULL,'@minji_demo',NULL,'new','DEMO',datetime('now','-7 hour'),NULL,0,0,datetime('now','-7 hour'),datetime('now','-7 hour')),
('demo-a11-05','Chen Wei','wechat-demo-05','other','CN','zh',NULL,NULL,NULL,'vip','DEMO · VIP',datetime('now','-120 day'),datetime('now','-8 day'),6,36800000,datetime('now','-120 day'),datetime('now','-10 hour')),
('demo-a11-06','Мария Лебедева','@maria_demo','telegram','RU','ru',NULL,'@maria_demo',NULL,'repeat','DEMO',datetime('now','-90 day'),datetime('now','-20 day'),3,17400000,datetime('now','-90 day'),datetime('now','-20 hour')),
('demo-a11-07','Sergey Volkov','@sergey_demo','telegram','RU','ru',NULL,'@sergey_demo',NULL,'vip','DEMO · VIP',datetime('now','-150 day'),datetime('now','-9 day'),7,45100000,datetime('now','-150 day'),datetime('now','-28 hour')),
('demo-a11-08','Olga Petrova','@olga_demo','telegram','RU','ru',NULL,'@olga_demo',NULL,'repeat','DEMO',datetime('now','-55 day'),datetime('now','-14 day'),2,8700000,datetime('now','-55 day'),datetime('now','-48 hour')),
('demo-a11-09','Park Ji-hoon','@jihoon_demo','telegram','KR','ko',NULL,'@jihoon_demo',NULL,'new','DEMO',datetime('now','-72 hour'),NULL,0,0,datetime('now','-72 hour'),datetime('now','-72 hour')),
('demo-a11-10','Trần Thu Hà','zalo-demo-10','zalo','VN','vi',NULL,NULL,'demo10','repeat','DEMO',datetime('now','-80 day'),datetime('now','-22 day'),4,19300000,datetime('now','-80 day'),datetime('now','-96 hour')),
('demo-a11-11','Dmitry Orlov','@orlov_demo','telegram','RU','ru',NULL,'@orlov_demo',NULL,'vip','DEMO · VIP',datetime('now','-200 day'),datetime('now','-6 day'),8,52400000,datetime('now','-200 day'),datetime('now','-120 hour')),
('demo-a11-12','Emily Carter','email-demo-12','email','UK','en',NULL,NULL,NULL,'new','DEMO',datetime('now','-144 hour'),NULL,0,0,datetime('now','-144 hour'),datetime('now','-144 hour')),
('demo-a11-13','Ирина Соколова','@irina_demo','telegram','RU','ru',NULL,'@irina_demo',NULL,'repeat','DEMO',datetime('now','-70 day'),datetime('now','-30 day'),2,7800000,datetime('now','-70 day'),datetime('now','-150 hour')),
('demo-a11-14','Lê Quốc Bảo','zalo-demo-14','zalo','VN','vi',NULL,NULL,'demo14','new','DEMO',datetime('now','-155 hour'),NULL,0,0,datetime('now','-155 hour'),datetime('now','-155 hour')),
('demo-a11-15','Максим Беляев','@max_demo','telegram','RU','ru',NULL,'@max_demo',NULL,'inactive','DEMO · отменённый запрос',datetime('now','-95 day'),datetime('now','-65 day'),1,2400000,datetime('now','-95 day'),datetime('now','-51 hour')),
('demo-a11-16','Sofia Ivanova','@sofia_demo','telegram','RU','ru',NULL,'@sofia_demo',NULL,'new','DEMO',datetime('now','-54 hour'),NULL,0,0,datetime('now','-54 hour'),datetime('now','-54 hour')),
('demo-a11-17','Lee Soo-jin','@soojin_demo','telegram','KR','ko',NULL,'@soojin_demo',NULL,'repeat','DEMO',datetime('now','-100 day'),datetime('now','-28 day'),2,6900000,datetime('now','-100 day'),datetime('now','-74 hour')),
('demo-a11-18','Pavel Smirnov','@pavel_demo','telegram','RU','ru',NULL,'@pavel_demo',NULL,'vip','DEMO · VIP',datetime('now','-180 day'),datetime('now','-16 day'),5,33200000,datetime('now','-180 day'),datetime('now','-80 hour')),
('demo-a11-19','Vũ Hoàng Nam','zalo-demo-19','zalo','VN','vi',NULL,NULL,'demo19','repeat','DEMO',datetime('now','-110 day'),datetime('now','-19 day'),3,14200000,datetime('now','-110 day'),datetime('now','-100 hour')),
('demo-a11-20','Елена Кузнецова','@elena_demo','telegram','RU','ru',NULL,'@elena_demo',NULL,'repeat','DEMO',datetime('now','-140 day'),datetime('now','-24 day'),4,21900000,datetime('now','-140 day'),datetime('now','-130 hour'));

-- 20 DEMO bookings across the complete operational lifecycle ----------------
INSERT OR IGNORE INTO bookings
(id,vehicle_id,customer_id,from_at,to_at,status,estimated_total_vnd,delivery_location,note,source,created_at,updated_at,pickup_branch_id,return_branch_id,source_channel,currency,subtotal_vnd,discount_vnd,deposit_vnd,total_vnd,paid_vnd,payment_status,prepayment_percent,deposit_received_vnd,deposit_returned_vnd,deposit_status)
VALUES
('demo-b11-01','xmax-2024','demo-a11-01',date('now','+1 day'),date('now','+3 day'),'new',5400000,'Центр','DEMO · новая заявка','stage11-demo',datetime('now','-1 hour'),datetime('now','-1 hour'),'branch-center','branch-center','telegram_mini_app','VND',5400000,0,3000000,5400000,0,'unpaid',50,0,0,'pending'),
('demo-b11-02','mt09-sp-2023','demo-a11-02',date('now','+2 day'),date('now','+5 day'),'new',12000000,'Север','DEMO · новая заявка','stage11-demo',datetime('now','-3 hour'),datetime('now','-3 hour'),'branch-north','branch-north','website','VND',12000000,0,5000000,12000000,0,'unpaid',50,0,0,'pending'),
('demo-b11-03','r7-2023','demo-a11-03',date('now','+1 day'),date('now','+3 day'),'contacted',10500000,'Центр','DEMO · менеджер связался','stage11-demo',datetime('now','-5 hour'),datetime('now','-5 hour'),'branch-center','branch-center','google','VND',10500000,0,4000000,10500000,0,'pending',50,0,0,'pending'),
('demo-b11-04','rebel-300-2023','demo-a11-04',date('now','+3 day'),date('now','+4 day'),'awaiting_confirmation',3200000,'Север','DEMO · ждёт подтверждения','stage11-demo',datetime('now','-7 hour'),datetime('now','-7 hour'),'branch-north','branch-north','instagram','VND',3200000,0,2500000,3200000,0,'pending',50,0,0,'pending'),
('demo-b11-05','xmax-2024','demo-a11-05',date('now','+1 day'),date('now','+4 day'),'confirmed',7200000,'Центр','DEMO · оплачено и подтверждено','stage11-demo',datetime('now','-10 hour'),datetime('now','-10 hour'),'branch-center','branch-center','telegram_mini_app','VND',7200000,0,3000000,7200000,7200000,'paid',100,3000000,0,'held'),
('demo-b11-06','espero-50-2024','demo-a11-06',date('now','+2 day'),date('now','+5 day'),'confirmed',1800000,'Центр','DEMO · подтверждено','stage11-demo',datetime('now','-20 hour'),datetime('now','-20 hour'),'branch-center','branch-center','qr','VND',1800000,0,1000000,1800000,1800000,'paid',100,1000000,0,'held'),
('demo-b11-07','mt09-sp-2023','demo-a11-07',date('now'),date('now','+2 day'),'vehicle_issued',12000000,'Север','DEMO · техника выдана','stage11-demo',datetime('now','-28 hour'),datetime('now','-24 hour'),'branch-north','branch-north','office','VND',12000000,0,5000000,12000000,12000000,'paid',100,5000000,0,'held'),
('demo-b11-08','r7-2023','demo-a11-08',date('now','-1 day'),date('now','+3 day'),'active',16000000,'Центр','DEMO · активная аренда','stage11-demo',datetime('now','-48 hour'),datetime('now','-24 hour'),'branch-center','branch-center','telegram_mini_app','VND',16000000,0,5000000,16000000,16000000,'paid',100,5000000,0,'held'),
('demo-b11-09','rebel-300-2023','demo-a11-09',date('now','-2 day'),date('now','+1 day'),'active',6400000,'Север','DEMO · активная аренда','stage11-demo',datetime('now','-72 hour'),datetime('now','-48 hour'),'branch-north','branch-north','partner','VND',6400000,0,2500000,6400000,6400000,'paid',100,2500000,0,'held'),
('demo-b11-10','espero-50-2024','demo-a11-10',date('now','-5 day'),date('now'),'return_due',2700000,'Центр','DEMO · возврат сегодня','stage11-demo',datetime('now','-96 hour'),datetime('now','-24 hour'),'branch-center','branch-center','office','VND',2700000,0,1000000,2700000,2700000,'paid',100,1000000,0,'held'),
('demo-b11-11','rebel-300-2023','demo-a11-11',date('now','-7 day'),date('now','-1 day'),'returned',7000000,'Север','DEMO · возвращено, ждёт закрытия','stage11-demo',datetime('now','-120 hour'),datetime('now','-24 hour'),'branch-north','branch-north','qr','VND',7000000,0,2500000,7000000,7000000,'paid',100,2500000,0,'held'),
('demo-b11-12','xmax-2024','demo-a11-12',date('now','-8 day'),date('now','-5 day'),'completed',7200000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-144 hour'),datetime('now','-120 hour'),'branch-center','branch-center','telegram_mini_app','VND',7200000,0,3000000,7200000,7200000,'paid',100,3000000,3000000,'returned'),
('demo-b11-13','r7-2023','demo-a11-13',date('now','-10 day'),date('now','-7 day'),'completed',14000000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-150 hour'),datetime('now','-140 hour'),'branch-center','branch-center','website','VND',14000000,0,5000000,14000000,14000000,'paid',100,5000000,5000000,'returned'),
('demo-b11-14','mt09-sp-2023','demo-a11-14',date('now','-14 day'),date('now','-11 day'),'completed',15000000,'Север','DEMO · завершена','stage11-demo',datetime('now','-155 hour'),datetime('now','-145 hour'),'branch-north','branch-north','google','VND',15000000,0,5000000,15000000,15000000,'paid',100,5000000,5000000,'returned'),
('demo-b11-15','rebel-300-2023','demo-a11-15',date('now','+1 day'),date('now','+2 day'),'cancelled',3200000,'Север','DEMO · отменена','stage11-demo',datetime('now','-51 hour'),datetime('now','-48 hour'),'branch-north','branch-north','website','VND',3200000,0,2500000,3200000,0,'unpaid',50,0,0,'not_required'),
('demo-b11-16','mt09-sp-2023','demo-a11-16',date('now','+5 day'),date('now','+9 day'),'new',15000000,'Север','DEMO · новая заявка','stage11-demo',datetime('now','-54 hour'),datetime('now','-54 hour'),'branch-north','branch-north','partner','VND',15000000,0,5000000,15000000,0,'unpaid',50,0,0,'pending'),
('demo-b11-17','espero-50-2024','demo-a11-17',date('now','+3 day'),date('now','+5 day'),'contacted',1350000,'Центр','DEMO · менеджер связался','stage11-demo',datetime('now','-74 hour'),datetime('now','-74 hour'),'branch-center','branch-center','qr','VND',1350000,0,1000000,1350000,0,'pending',50,0,0,'pending'),
('demo-b11-18','xmax-2024','demo-a11-18',date('now','+2 day'),date('now','+5 day'),'confirmed',7200000,'Центр','DEMO · подтверждена','stage11-demo',datetime('now','-80 hour'),datetime('now','-72 hour'),'branch-center','branch-center','telegram_mini_app','VND',7200000,0,3000000,7200000,7200000,'paid',100,3000000,0,'held'),
('demo-b11-19','rebel-300-2023','demo-a11-19',date('now','-3 day'),date('now','+2 day'),'active',9600000,'Север','DEMO · активная аренда','stage11-demo',datetime('now','-100 hour'),datetime('now','-48 hour'),'branch-north','branch-north','website','VND',9600000,0,2500000,9600000,9600000,'paid',100,2500000,0,'held'),
('demo-b11-20','espero-50-2024','demo-a11-20',date('now','-6 day'),date('now','-3 day'),'completed',1800000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-130 hour'),datetime('now','-72 hour'),'branch-center','branch-center','office','VND',1800000,0,1000000,1800000,1800000,'paid',100,1000000,1000000,'returned');

-- Linked DEMO revenue transactions used by Finance + Analytics --------------
INSERT OR IGNORE INTO transactions
(id,booking_id,branch_id,vehicle_id,customer_id,type,status,amount_vnd,method,occurred_at,note,created_at)
VALUES
('demo-a11-pay-05','demo-b11-05','branch-center','xmax-2024','demo-a11-05','payment','completed',7200000,'vietqr',datetime('now','-9 hour'),'DEMO · Stage 11 payment',datetime('now','-9 hour')),
('demo-a11-pay-06','demo-b11-06','branch-center','espero-50-2024','demo-a11-06','payment','completed',1800000,'momo',datetime('now','-19 hour'),'DEMO · Stage 11 payment',datetime('now','-19 hour')),
('demo-a11-pay-07','demo-b11-07','branch-north','mt09-sp-2023','demo-a11-07','payment','completed',12000000,'cash',datetime('now','-27 hour'),'DEMO · Stage 11 payment',datetime('now','-27 hour')),
('demo-a11-pay-08','demo-b11-08','branch-center','r7-2023','demo-a11-08','payment','completed',16000000,'vnpay',datetime('now','-47 hour'),'DEMO · Stage 11 payment',datetime('now','-47 hour')),
('demo-a11-pay-09','demo-b11-09','branch-north','rebel-300-2023','demo-a11-09','payment','completed',6400000,'sbp',datetime('now','-70 hour'),'DEMO · Stage 11 payment',datetime('now','-70 hour')),
('demo-a11-pay-10','demo-b11-10','branch-center','espero-50-2024','demo-a11-10','payment','completed',2700000,'cash',datetime('now','-92 hour'),'DEMO · Stage 11 payment',datetime('now','-92 hour')),
('demo-a11-pay-11','demo-b11-11','branch-north','rebel-300-2023','demo-a11-11','payment','completed',7000000,'zalopay',datetime('now','-116 hour'),'DEMO · Stage 11 payment',datetime('now','-116 hour')),
('demo-a11-pay-12','demo-b11-12','branch-center','xmax-2024','demo-a11-12','payment','completed',7200000,'yookassa',datetime('now','-140 hour'),'DEMO · Stage 11 payment',datetime('now','-140 hour')),
('demo-a11-pay-13','demo-b11-13','branch-center','r7-2023','demo-a11-13','payment','completed',14000000,'vietqr',datetime('now','-148 hour'),'DEMO · Stage 11 payment',datetime('now','-148 hour')),
('demo-a11-pay-14','demo-b11-14','branch-north','mt09-sp-2023','demo-a11-14','payment','completed',15000000,'tbank',datetime('now','-152 hour'),'DEMO · Stage 11 payment',datetime('now','-152 hour')),
('demo-a11-pay-18','demo-b11-18','branch-center','xmax-2024','demo-a11-18','payment','completed',7200000,'vietqr',datetime('now','-78 hour'),'DEMO · Stage 11 payment',datetime('now','-78 hour')),
('demo-a11-pay-19','demo-b11-19','branch-north','rebel-300-2023','demo-a11-19','payment','completed',9600000,'vnpay',datetime('now','-98 hour'),'DEMO · Stage 11 payment',datetime('now','-98 hour')),
('demo-a11-pay-20','demo-b11-20','branch-center','espero-50-2024','demo-a11-20','payment','completed',1800000,'cash',datetime('now','-128 hour'),'DEMO · Stage 11 payment',datetime('now','-128 hour'));

-- 30-day deterministic DEMO funnel telemetry for both branches -------------
WITH RECURSIVE days(n) AS (
  SELECT 0 UNION ALL SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO analytics_daily_funnel
(id,day,branch_id,views,vehicle_opens,booking_starts,payment_starts,paid_bookings)
SELECT 'demo-funnel-north-' || date('now','-' || n || ' day'),date('now','-' || n || ' day'),'branch-north',
  112 + ((n * 17) % 43),61 + ((n * 11) % 24),27 + ((n * 7) % 12),21 + ((n * 5) % 9),16 + ((n * 3) % 7)
FROM days;

WITH RECURSIVE days(n) AS (
  SELECT 0 UNION ALL SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO analytics_daily_funnel
(id,day,branch_id,views,vehicle_opens,booking_starts,payment_starts,paid_bookings)
SELECT 'demo-funnel-center-' || date('now','-' || n || ' day'),date('now','-' || n || ' day'),'branch-center',
  138 + ((n * 19) % 51),76 + ((n * 13) % 29),34 + ((n * 7) % 14),26 + ((n * 5) % 10),20 + ((n * 3) % 8)
FROM days;
