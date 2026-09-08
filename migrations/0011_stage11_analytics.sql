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

-- Real fleet names from the public UNIQ catalog, inserted only when a D1 row
-- does not yet exist. This lets the analytics prototype join bookings to names.
INSERT OR IGNORE INTO vehicles
(id,slug,brand,model,year,category,engine_label,status,branch_id,kind,title,published,sort_order,created_at,updated_at)
VALUES
('hyundai-elantra-2025-74404','hyundai-elantra-2025-74404','Hyundai','Elantra',2025,'car','1.6 L','manager_confirmation','branch-center','car','Hyundai Elantra',1,101,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('kia-sorento-2023-74401','kia-sorento-2023-74401','Kia','Sorento',2023,'car','2.2 L','manager_confirmation','branch-north','car','Kia Sorento',1,102,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('mazda-cx-5-2022-74405','mazda-cx-5-2022-74405','Mazda','CX-5',2022,'car','2.0 L','manager_confirmation','branch-center','car','Mazda CX-5',1,103,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('toyota-yaris-cross-2025-74402','toyota-yaris-cross-2025-74402','Toyota','Yaris Cross',2025,'car','1.5 L','manager_confirmation','branch-north','car','Toyota Yaris Cross',1,104,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('honda-cb500x-2023-73325','honda-cb500x-2023-73325','Honda','CB500X',2023,'motorcycle','471 cc','manager_confirmation','branch-north','motorcycle','Honda CB500X',1,105,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('honda-cb650r-2022-73228','honda-cb650r-2022-73228','Honda','CB650R',2022,'motorcycle','649 cc','manager_confirmation','branch-center','motorcycle','Honda CB650R',1,106,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('honda-cbr-150cc-2021-76481','honda-cbr-150cc-2021-76481','Honda','CBR-150cc',2021,'motorcycle','149 cc','manager_confirmation','branch-north','motorcycle','Honda CBR-150cc',1,107,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('yamaha-x-max-2024-76826','yamaha-x-max-2024-76826','Yamaha','X-Max',2024,'scooter','292 cc','manager_confirmation','branch-center','scooter','Yamaha X-Max',1,108,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('honda-pcx-150cc-2022-73073','honda-pcx-150cc-2022-73073','Honda','PCX 150cc',2022,'scooter','150 cc','manager_confirmation','branch-center','scooter','Honda PCX 150cc',1,109,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('honda-pcx-125cc-2018-76169','honda-pcx-125cc-2018-76169','Honda','PCX 125cc',2018,'scooter','125 cc','manager_confirmation','branch-north','scooter','Honda PCX 125cc',1,110,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO pricing (vehicle_id,daily_vnd,weekly_vnd,monthly_vnd,deposit_usd,updated_at) VALUES
('hyundai-elantra-2025-74404',1350000,8750000,24000000,700,CURRENT_TIMESTAMP),
('kia-sorento-2023-74401',1950000,12600000,30000000,700,CURRENT_TIMESTAMP),
('mazda-cx-5-2022-74405',1450000,9100000,25500000,700,CURRENT_TIMESTAMP),
('toyota-yaris-cross-2025-74402',1400000,9100000,25500000,700,CURRENT_TIMESTAMP),
('honda-cb500x-2023-73325',2500000,10000000,25000000,1000,CURRENT_TIMESTAMP),
('honda-cb650r-2022-73228',2500000,10000000,25000000,1000,CURRENT_TIMESTAMP),
('honda-cbr-150cc-2021-76481',700000,3500000,7500000,500,CURRENT_TIMESTAMP),
('yamaha-x-max-2024-76826',1800000,8000000,17000000,600,CURRENT_TIMESTAMP),
('honda-pcx-150cc-2022-73073',550000,3000000,6000000,300,CURRENT_TIMESTAMP),
('honda-pcx-125cc-2018-76169',450000,2500000,5000000,300,CURRENT_TIMESTAMP);

-- Realistic multilingual DEMO customers ------------------------------------
INSERT OR IGNORE INTO customers
(id,name,contact,preferred_channel,country,language,phone,telegram,zalo,segment,notes,first_contact_at,last_rental_at,rental_count,lifetime_value_vnd,created_at,updated_at)
VALUES
('demo-a11-01','Анна Крылова','@anna_demo','telegram','RU','ru',NULL,'@anna_demo',NULL,'new','DEMO · первый запрос',datetime('now','-1 hour'),NULL,0,0,datetime('now','-1 hour'),datetime('now','-1 hour')),
('demo-a11-02','Nguyễn Minh Anh','zalo-demo-02','zalo','VN','vi',NULL,NULL,'demo02','repeat','DEMO · повторный клиент',datetime('now','-40 day'),datetime('now','-12 day'),3,9800000,datetime('now','-40 day'),datetime('now','-3 hour')),
('demo-a11-03','Алексей Морозов','@alex_demo','telegram','RU','ru',NULL,'@alex_demo',NULL,'repeat','DEMO',datetime('now','-60 day'),datetime('now','-18 day'),2,11200000,datetime('now','-60 day'),datetime('now','-5 hour')),
('demo-a11-04','Kim Min-ji','@minji_demo','telegram','KR','ko',NULL,'@minji_demo',NULL,'new','DEMO',datetime('now','-7 hour'),NULL,0,0,datetime('now','-7 hour'),datetime('now','-7 hour')),
('demo-a11-05','Chen Wei','wechat-demo-05','other','CN','zh',NULL,NULL,NULL,'vip','DEMO · VIP',datetime('now','-120 day'),datetime('now','-8 day'),6,36800000,datetime('now','-120 day'),datetime('now','-10 hour')),
('demo-a11-06','Мария Лебедева','@maria_demo','telegram','RU','ru',NULL,'@maria_demo',NULL,'repeat','DEMO',datetime('now','-90 day'),datetime('now','-20 day'),3,17400000,datetime('now','-90 day'),datetime('now','-1 day')),
('demo-a11-07','Sergey Volkov','@sergey_demo','telegram','RU','ru',NULL,'@sergey_demo',NULL,'vip','DEMO · VIP',datetime('now','-150 day'),datetime('now','-9 day'),7,45100000,datetime('now','-150 day'),datetime('now','-1 day')),
('demo-a11-08','Olga Petrova','@olga_demo','telegram','RU','ru',NULL,'@olga_demo',NULL,'repeat','DEMO',datetime('now','-55 day'),datetime('now','-14 day'),2,8700000,datetime('now','-55 day'),datetime('now','-2 day')),
('demo-a11-09','Park Ji-hoon','@jihoon_demo','telegram','KR','ko',NULL,'@jihoon_demo',NULL,'new','DEMO',datetime('now','-2 day'),NULL,0,0,datetime('now','-2 day'),datetime('now','-2 day')),
('demo-a11-10','Trần Thu Hà','zalo-demo-10','zalo','VN','vi',NULL,NULL,'demo10','repeat','DEMO',datetime('now','-80 day'),datetime('now','-22 day'),4,19300000,datetime('now','-80 day'),datetime('now','-3 day')),
('demo-a11-11','Dmitry Orlov','@orlov_demo','telegram','RU','ru',NULL,'@orlov_demo',NULL,'vip','DEMO · VIP',datetime('now','-200 day'),datetime('now','-6 day'),8,52400000,datetime('now','-200 day'),datetime('now','-4 day')),
('demo-a11-12','Emily Carter','email-demo-12','email','UK','en',NULL,NULL,NULL,'new','DEMO',datetime('now','-5 day'),NULL,0,0,datetime('now','-5 day'),datetime('now','-5 day')),
('demo-a11-13','Ирина Соколова','@irina_demo','telegram','RU','ru',NULL,'@irina_demo',NULL,'repeat','DEMO',datetime('now','-70 day'),datetime('now','-30 day'),2,7800000,datetime('now','-70 day'),datetime('now','-6 day')),
('demo-a11-14','Lê Quốc Bảo','zalo-demo-14','zalo','VN','vi',NULL,NULL,'demo14','new','DEMO',datetime('now','-8 day'),NULL,0,0,datetime('now','-8 day'),datetime('now','-8 day')),
('demo-a11-15','Максим Беляев','@max_demo','telegram','RU','ru',NULL,'@max_demo',NULL,'inactive','DEMO · отменённый запрос',datetime('now','-95 day'),datetime('now','-65 day'),1,2400000,datetime('now','-95 day'),datetime('now','-2 day')),
('demo-a11-16','Sofia Ivanova','@sofia_demo','telegram','RU','ru',NULL,'@sofia_demo',NULL,'new','DEMO',datetime('now','-2 day'),NULL,0,0,datetime('now','-2 day'),datetime('now','-2 day')),
('demo-a11-17','Lee Soo-jin','@soojin_demo','telegram','KR','ko',NULL,'@soojin_demo',NULL,'repeat','DEMO',datetime('now','-100 day'),datetime('now','-28 day'),2,6900000,datetime('now','-100 day'),datetime('now','-3 day')),
('demo-a11-18','Pavel Smirnov','@pavel_demo','telegram','RU','ru',NULL,'@pavel_demo',NULL,'vip','DEMO · VIP',datetime('now','-180 day'),datetime('now','-16 day'),5,33200000,datetime('now','-180 day'),datetime('now','-4 day')),
('demo-a11-19','Vũ Hoàng Nam','zalo-demo-19','zalo','VN','vi',NULL,NULL,'demo19','repeat','DEMO',datetime('now','-110 day'),datetime('now','-19 day'),3,14200000,datetime('now','-110 day'),datetime('now','-6 day')),
('demo-a11-20','Елена Кузнецова','@elena_demo','telegram','RU','ru',NULL,'@elena_demo',NULL,'repeat','DEMO',datetime('now','-140 day'),datetime('now','-24 day'),4,21900000,datetime('now','-140 day'),datetime('now','-20 day'));

-- 20 DEMO bookings in different operational and payment states -------------
INSERT OR IGNORE INTO bookings
(id,vehicle_id,customer_id,from_at,to_at,status,estimated_total_vnd,delivery_location,note,source,created_at,updated_at,pickup_branch_id,return_branch_id,source_channel,currency,subtotal_vnd,discount_vnd,deposit_vnd,total_vnd,paid_vnd,payment_status,prepayment_percent,deposit_received_vnd,deposit_returned_vnd,deposit_status)
VALUES
('demo-b11-01','hyundai-elantra-2025-74404','demo-a11-01',date('now','+1 day'),date('now','+3 day'),'new',4050000,'Центр','DEMO · новая заявка','stage11-demo',datetime('now','-1 hour'),datetime('now','-1 hour'),'branch-center','branch-center','telegram_mini_app','VND',4050000,0,3000000,4050000,0,'unpaid',50,0,0,'pending'),
('demo-b11-02','kia-sorento-2023-74401','demo-a11-02',date('now','+2 day'),date('now','+5 day'),'new',7800000,'Север','DEMO · новая заявка','stage11-demo',datetime('now','-3 hour'),datetime('now','-3 hour'),'branch-north','branch-north','website','VND',7800000,0,4000000,7800000,0,'unpaid',50,0,0,'pending'),
('demo-b11-03','mazda-cx-5-2022-74405','demo-a11-03',date('now','+1 day'),date('now','+3 day'),'contacted',4350000,'Центр','DEMO · менеджер связался','stage11-demo',datetime('now','-5 hour'),datetime('now','-5 hour'),'branch-center','branch-center','google','VND',4350000,0,3000000,4350000,0,'pending',50,0,0,'pending'),
('demo-b11-04','toyota-yaris-cross-2025-74402','demo-a11-04',date('now','+3 day'),date('now','+4 day'),'awaiting_confirmation',2800000,'Север','DEMO · ждёт подтверждения','stage11-demo',datetime('now','-7 hour'),datetime('now','-7 hour'),'branch-north','branch-north','instagram','VND',2800000,0,3000000,2800000,0,'pending',50,0,0,'pending'),
('demo-b11-05','yamaha-x-max-2024-76826','demo-a11-05',date('now','+1 day'),date('now','+4 day'),'confirmed',7200000,'Центр','DEMO · оплачено и подтверждено','stage11-demo',datetime('now','-10 hour'),datetime('now','-10 hour'),'branch-center','branch-center','telegram_mini_app','VND',7200000,0,3000000,7200000,7200000,'paid',100,3000000,0,'held'),
('demo-b11-06','honda-pcx-150cc-2022-73073','demo-a11-06',date('now','+2 day'),date('now','+5 day'),'confirmed',2200000,'Центр','DEMO · подтверждено','stage11-demo',datetime('now','-1 day'),datetime('now','-1 day'),'branch-center','branch-center','qr','VND',2200000,0,1000000,2200000,2200000,'paid',100,1000000,0,'held'),
('demo-b11-07','honda-cb500x-2023-73325','demo-a11-07',date('now'),date('now','+2 day'),'vehicle_issued',7500000,'Север','DEMO · техника выдана','stage11-demo',datetime('now','-1 day','-4 hour'),datetime('now','-1 day'),'branch-north','branch-north','office','VND',7500000,0,5000000,7500000,7500000,'paid',100,5000000,0,'held'),
('demo-b11-08','honda-cb650r-2022-73228','demo-a11-08',date('now','-1 day'),date('now','+3 day'),'active',12500000,'Центр','DEMO · активная аренда','stage11-demo',datetime('now','-2 day'),datetime('now','-1 day'),'branch-center','branch-center','telegram_mini_app','VND',12500000,0,5000000,12500000,12500000,'paid',100,5000000,0,'held'),
('demo-b11-09','honda-cbr-150cc-2021-76481','demo-a11-09',date('now','-2 day'),date('now','+1 day'),'active',2800000,'Север','DEMO · активная аренда','stage11-demo',datetime('now','-3 day'),datetime('now','-2 day'),'branch-north','branch-north','partner','VND',2800000,0,1500000,2800000,2800000,'paid',100,1500000,0,'held'),
('demo-b11-10','honda-pcx-150cc-2022-73073','demo-a11-10',date('now','-5 day'),date('now'),'return_due',3850000,'Центр','DEMO · возврат сегодня','stage11-demo',datetime('now','-4 day'),datetime('now','-1 day'),'branch-center','branch-center','office','VND',3850000,0,1000000,3850000,3850000,'paid',100,1000000,0,'held'),
('demo-b11-11','honda-pcx-125cc-2018-76169','demo-a11-11',date('now','-7 day'),date('now','-1 day'),'returned',3150000,'Север','DEMO · возвращено, ждёт закрытия','stage11-demo',datetime('now','-5 day'),datetime('now','-1 day'),'branch-north','branch-north','qr','VND',3150000,0,1000000,3150000,3150000,'paid',100,1000000,0,'held'),
('demo-b11-12','hyundai-elantra-2025-74404','demo-a11-12',date('now','-8 day'),date('now','-5 day'),'completed',5400000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-6 day'),datetime('now','-5 day'),'branch-center','branch-center','telegram_mini_app','VND',5400000,0,3000000,5400000,5400000,'paid',100,3000000,3000000,'returned'),
('demo-b11-13','mazda-cx-5-2022-74405','demo-a11-13',date('now','-10 day'),date('now','-7 day'),'completed',5800000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-8 day'),datetime('now','-7 day'),'branch-center','branch-center','website','VND',5800000,0,3000000,5800000,5800000,'paid',100,3000000,3000000,'returned'),
('demo-b11-14','kia-sorento-2023-74401','demo-a11-14',date('now','-14 day'),date('now','-11 day'),'completed',7800000,'Север','DEMO · завершена','stage11-demo',datetime('now','-12 day'),datetime('now','-11 day'),'branch-north','branch-north','google','VND',7800000,0,4000000,7800000,7800000,'paid',100,4000000,4000000,'returned'),
('demo-b11-15','toyota-yaris-cross-2025-74402','demo-a11-15',date('now','+1 day'),date('now','+2 day'),'cancelled',2800000,'Север','DEMO · отменена','stage11-demo',datetime('now','-2 day','-3 hour'),datetime('now','-2 day'),'branch-north','branch-north','website','VND',2800000,0,3000000,2800000,0,'unpaid',50,0,0,'not_required'),
('demo-b11-16','honda-cb500x-2023-73325','demo-a11-16',date('now','+5 day'),date('now','+9 day'),'new',12500000,'Север','DEMO · новая заявка','stage11-demo',datetime('now','-2 day','-6 hour'),datetime('now','-2 day'),'branch-north','branch-north','partner','VND',12500000,0,5000000,12500000,0,'unpaid',50,0,0,'pending'),
('demo-b11-17','honda-pcx-150cc-2022-73073','demo-a11-17',date('now','+3 day'),date('now','+5 day'),'contacted',1650000,'Центр','DEMO · менеджер связался','stage11-demo',datetime('now','-3 day','-2 hour'),datetime('now','-3 day'),'branch-center','branch-center','qr','VND',1650000,0,1000000,1650000,0,'pending',50,0,0,'pending'),
('demo-b11-18','yamaha-x-max-2024-76826','demo-a11-18',date('now','+2 day'),date('now','+5 day'),'confirmed',7200000,'Центр','DEMO · подтверждена','stage11-demo',datetime('now','-4 day'),datetime('now','-3 day'),'branch-center','branch-center','telegram_mini_app','VND',7200000,0,3000000,7200000,7200000,'paid',100,3000000,0,'held'),
('demo-b11-19','toyota-yaris-cross-2025-74402','demo-a11-19',date('now','-3 day'),date('now','+2 day'),'active',8400000,'Север','DEMO · активная аренда','stage11-demo',datetime('now','-6 day'),datetime('now','-2 day'),'branch-north','branch-north','website','VND',8400000,0,3000000,8400000,8400000,'paid',100,3000000,0,'held'),
('demo-b11-20','hyundai-elantra-2025-74404','demo-a11-20',date('now','-22 day'),date('now','-18 day'),'completed',6750000,'Центр','DEMO · завершена','stage11-demo',datetime('now','-20 day'),datetime('now','-18 day'),'branch-center','branch-center','office','VND',6750000,0,3000000,6750000,6750000,'paid',100,3000000,3000000,'returned');

-- Linked DEMO revenue transactions used by finance + analytics --------------
INSERT OR IGNORE INTO transactions
(id,booking_id,branch_id,vehicle_id,customer_id,type,status,amount_vnd,method,occurred_at,note,created_at)
VALUES
('demo-a11-pay-05','demo-b11-05','branch-center','yamaha-x-max-2024-76826','demo-a11-05','payment','completed',7200000,'vietqr',datetime('now','-9 hour'),'DEMO · Stage 11 payment',datetime('now','-9 hour')),
('demo-a11-pay-06','demo-b11-06','branch-center','honda-pcx-150cc-2022-73073','demo-a11-06','payment','completed',2200000,'momo',datetime('now','-20 hour'),'DEMO · Stage 11 payment',datetime('now','-20 hour')),
('demo-a11-pay-07','demo-b11-07','branch-north','honda-cb500x-2023-73325','demo-a11-07','payment','completed',7500000,'cash',datetime('now','-1 day','-3 hour'),'DEMO · Stage 11 payment',datetime('now','-1 day','-3 hour')),
('demo-a11-pay-08','demo-b11-08','branch-center','honda-cb650r-2022-73228','demo-a11-08','payment','completed',12500000,'vnpay',datetime('now','-2 day','+2 hour'),'DEMO · Stage 11 payment',datetime('now','-2 day','+2 hour')),
('demo-a11-pay-09','demo-b11-09','branch-north','honda-cbr-150cc-2021-76481','demo-a11-09','payment','completed',2800000,'sbp',datetime('now','-3 day','+1 hour'),'DEMO · Stage 11 payment',datetime('now','-3 day','+1 hour')),
('demo-a11-pay-10','demo-b11-10','branch-center','honda-pcx-150cc-2022-73073','demo-a11-10','payment','completed',3850000,'cash',datetime('now','-4 day','+1 hour'),'DEMO · Stage 11 payment',datetime('now','-4 day','+1 hour')),
('demo-a11-pay-11','demo-b11-11','branch-north','honda-pcx-125cc-2018-76169','demo-a11-11','payment','completed',3150000,'zalopay',datetime('now','-5 day','+1 hour'),'DEMO · Stage 11 payment',datetime('now','-5 day','+1 hour')),
('demo-a11-pay-12','demo-b11-12','branch-center','hyundai-elantra-2025-74404','demo-a11-12','payment','completed',5400000,'yookassa',datetime('now','-6 day'),'DEMO · Stage 11 payment',datetime('now','-6 day')),
('demo-a11-pay-13','demo-b11-13','branch-center','mazda-cx-5-2022-74405','demo-a11-13','payment','completed',5800000,'vietqr',datetime('now','-8 day'),'DEMO · Stage 11 payment',datetime('now','-8 day')),
('demo-a11-pay-14','demo-b11-14','branch-north','kia-sorento-2023-74401','demo-a11-14','payment','completed',7800000,'tbank',datetime('now','-12 day'),'DEMO · Stage 11 payment',datetime('now','-12 day')),
('demo-a11-pay-18','demo-b11-18','branch-center','yamaha-x-max-2024-76826','demo-a11-18','payment','completed',7200000,'vietqr',datetime('now','-4 day','+2 hour'),'DEMO · Stage 11 payment',datetime('now','-4 day','+2 hour')),
('demo-a11-pay-19','demo-b11-19','branch-north','toyota-yaris-cross-2025-74402','demo-a11-19','payment','completed',8400000,'vnpay',datetime('now','-6 day','+3 hour'),'DEMO · Stage 11 payment',datetime('now','-6 day','+3 hour')),
('demo-a11-pay-20','demo-b11-20','branch-center','hyundai-elantra-2025-74404','demo-a11-20','payment','completed',6750000,'cash',datetime('now','-20 day'),'DEMO · Stage 11 payment',datetime('now','-20 day'));

-- 30-day funnel dataset for both branches. Numbers are deterministic DEMO
-- telemetry, kept in D1 so charts behave like a real reporting backend.
WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO analytics_daily_funnel
(id,day,branch_id,views,vehicle_opens,booking_starts,payment_starts,paid_bookings)
SELECT
  'demo-funnel-north-' || date('now','-' || n || ' day'),
  date('now','-' || n || ' day'),
  'branch-north',
  112 + ((n * 17) % 43),
  61 + ((n * 11) % 24),
  27 + ((n * 7) % 12),
  21 + ((n * 5) % 9),
  16 + ((n * 3) % 7)
FROM days;

WITH RECURSIVE days(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM days WHERE n < 29
)
INSERT OR IGNORE INTO analytics_daily_funnel
(id,day,branch_id,views,vehicle_opens,booking_starts,payment_starts,paid_bookings)
SELECT
  'demo-funnel-center-' || date('now','-' || n || ' day'),
  date('now','-' || n || ' day'),
  'branch-center',
  138 + ((n * 19) % 51),
  76 + ((n * 13) % 29),
  34 + ((n * 7) % 14),
  26 + ((n * 5) % 10),
  20 + ((n * 3) % 8)
FROM days;
