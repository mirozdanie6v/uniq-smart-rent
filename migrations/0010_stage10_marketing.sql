PRAGMA foreign_keys = ON;

ALTER TABLE promotions ADD COLUMN audience_segment TEXT NOT NULL DEFAULT 'all';
ALTER TABLE promotions ADD COLUMN vehicle_kind TEXT;
ALTER TABLE promotions ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE promotions ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1));

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram','zalo','email','sms')),
  audience_segment TEXT NOT NULL DEFAULT 'all',
  message TEXT NOT NULL,
  promotion_id TEXT REFERENCES promotions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','cancelled')),
  scheduled_at TEXT,
  sent_at TEXT,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  conversions_count INTEGER NOT NULL DEFAULT 0,
  attributed_revenue_vnd INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 1 CHECK (is_demo IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketing_campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','scheduled','sent','opened','clicked','converted','cancelled')),
  count_value INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status_date ON marketing_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_segment ON marketing_campaigns(audience_segment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON marketing_campaign_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_audience_status ON promotions(audience_segment, status, starts_at, ends_at);

INSERT OR IGNORE INTO promotions (
  id, name, status, discount_type, discount_value, starts_at, ends_at, promo_code, max_uses, uses_count, audience_segment, vehicle_kind, description, is_demo
) VALUES
('promo-stage10-repeat','Повторная аренда −10%','active','percent',10,'2026-09-01T00:00:00Z','2026-10-31T23:59:59Z','RETURN10',80,14,'repeat',NULL,'Для клиентов, которые уже арендовали технику UNIQ.',1),
('promo-stage10-scooter','Скутеры недели −8%','active','percent',8,'2026-09-08T00:00:00Z','2026-09-30T23:59:59Z','SCOOTER8',120,23,'all','scooter','Заполняем свободные слоты скутеров в сентябре.',1),
('promo-stage10-vip','VIP upgrade','draft','fixed_vnd',300000,'2026-09-15T00:00:00Z','2026-10-15T23:59:59Z','VIP300',40,0,'vip','car','Персональная скидка VIP-клиентам на автомобили.',1);

INSERT OR IGNORE INTO promotion_branches (promotion_id, branch_id) VALUES
('promo-stage10-repeat','branch-north'),
('promo-stage10-repeat','branch-center'),
('promo-stage10-scooter','branch-north'),
('promo-stage10-scooter','branch-center'),
('promo-stage10-vip','branch-center');

INSERT OR IGNORE INTO marketing_campaigns (
  id, name, channel, audience_segment, message, promotion_id, status, sent_at,
  recipients_count, opened_count, clicked_count, conversions_count, attributed_revenue_vnd, is_demo
) VALUES
('campaign-stage10-repeat','Вернуть повторных клиентов','telegram','repeat','Снова в Нячанге? Для вас −10% на следующую аренду по коду RETURN10.','promo-stage10-repeat','sent','2026-09-07T10:00:00Z',42,31,18,7,12600000,1),
('campaign-stage10-scooter','Свободные скутеры на этой неделе','zalo','all','Свободные скутеры UNIQ на ближайшие даты. Код SCOOTER8 даёт −8%.','promo-stage10-scooter','sent','2026-09-08T09:00:00Z',118,76,34,11,15800000,1),
('campaign-stage10-vip','VIP автомобили','telegram','vip','Подготовили персональное предложение на автомобили UNIQ.','promo-stage10-vip','draft',NULL,0,0,0,0,0,1);
