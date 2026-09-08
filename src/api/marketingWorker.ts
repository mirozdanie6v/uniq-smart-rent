import type { D1DatabaseLike } from '../db/bootstrap.js';

interface MarketingEnv {
  DB?: D1DatabaseLike;
  STAFF_API_KEY?: string;
  DEMO_MODE?: string;
}

const headers = {
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-uniq-admin-key,x-uniq-demo-role',
  'access-control-allow-methods':'GET,POST,PATCH,OPTIONS',
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const int = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : fallback;
const segments = new Set(['all','new','repeat','vip','inactive']);
const channels = new Set(['telegram','zalo','email','sms']);
const promotionStatuses = new Set(['draft','active','paused','expired','archived']);

function isOwner(request: Request, env: MarketingEnv): boolean {
  if (env.STAFF_API_KEY && request.headers.get('x-uniq-admin-key') === env.STAFF_API_KEY) return true;
  return env.DEMO_MODE === 'true' && request.headers.get('x-uniq-demo-role') === 'owner';
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

async function segmentCounts(db: D1DatabaseLike): Promise<Record<string, number>> {
  const result = await db.prepare(`SELECT COALESCE(segment,'new') segment, COUNT(*) count FROM customers GROUP BY COALESCE(segment,'new')`).all<{ segment:string; count:number }>();
  const counts: Record<string, number> = { all:0, new:0, repeat:0, vip:0, inactive:0 };
  for (const row of result.results ?? []) {
    const key = segments.has(row.segment) ? row.segment : 'new';
    counts[key] = Number(row.count ?? 0);
    counts.all += Number(row.count ?? 0);
  }
  return counts;
}

async function promotionFromDb(db: D1DatabaseLike, row: Record<string, unknown>) {
  const branchRows = await db.prepare('SELECT branch_id FROM promotion_branches WHERE promotion_id=? ORDER BY branch_id').bind(String(row.id ?? '')).all<{ branch_id:string }>();
  return {
    id:String(row.id ?? ''), name:String(row.name ?? ''), status:String(row.status ?? 'draft'),
    discountType:String(row.discount_type ?? 'percent'), discountValue:Number(row.discount_value ?? 0),
    startsAt:String(row.starts_at ?? ''), endsAt:String(row.ends_at ?? ''), promoCode:String(row.promo_code ?? ''),
    maxUses:row.max_uses == null ? null : Number(row.max_uses), usesCount:Number(row.uses_count ?? 0),
    audienceSegment:String(row.audience_segment ?? 'all'), vehicleKind:String(row.vehicle_kind ?? ''), description:String(row.description ?? ''),
    branches:(branchRows.results ?? []).map((item) => item.branch_id), isDemo:Number(row.is_demo ?? 1) === 1,
  };
}

const campaignFromRow = (row: Record<string, unknown>) => ({
  id:String(row.id ?? ''), name:String(row.name ?? ''), channel:String(row.channel ?? 'telegram'),
  audienceSegment:String(row.audience_segment ?? 'all'), message:String(row.message ?? ''), promotionId:String(row.promotion_id ?? ''),
  status:String(row.status ?? 'draft'), scheduledAt:String(row.scheduled_at ?? ''), sentAt:String(row.sent_at ?? ''),
  recipientsCount:Number(row.recipients_count ?? 0), openedCount:Number(row.opened_count ?? 0), clickedCount:Number(row.clicked_count ?? 0),
  conversionsCount:Number(row.conversions_count ?? 0), attributedRevenueVnd:Number(row.attributed_revenue_vnd ?? 0), isDemo:Number(row.is_demo ?? 1) === 1,
});

async function listMarketing(env: MarketingEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured', persisted:false }, 503);
  const promoRows = await env.DB.prepare(`SELECT * FROM promotions ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, created_at DESC LIMIT 100`).all<Record<string, unknown>>();
  const promotions = [];
  for (const row of promoRows.results ?? []) promotions.push(await promotionFromDb(env.DB, row));
  const campaignRows = await env.DB.prepare(`SELECT * FROM marketing_campaigns ORDER BY created_at DESC LIMIT 100`).all<Record<string, unknown>>();
  return json({ promotions, campaigns:(campaignRows.results ?? []).map(campaignFromRow), segments:await segmentCounts(env.DB), persisted:true });
}

async function savePromotion(request: Request, env: MarketingEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' }, 400);
  const id = text(payload.id) || `promo-${crypto.randomUUID()}`;
  const name = text(payload.name), status = text(payload.status) || 'draft', discountType = text(payload.discountType);
  const discountValue = int(payload.discountValue), startsAt = text(payload.startsAt), endsAt = text(payload.endsAt), promoCode = text(payload.promoCode).toUpperCase();
  const audienceSegment = text(payload.audienceSegment) || 'all', vehicleKind = text(payload.vehicleKind), description = text(payload.description);
  const maxUses = payload.maxUses == null || payload.maxUses === '' ? null : int(payload.maxUses);
  if (!name || !promotionStatuses.has(status) || !['percent','fixed_vnd'].includes(discountType) || discountValue <= 0 || !startsAt || !endsAt || !segments.has(audienceSegment)) return json({ error:'invalid_promotion' }, 400);
  const now = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO promotions (id,name,status,discount_type,discount_value,starts_at,ends_at,promo_code,max_uses,uses_count,audience_segment,vehicle_kind,description,is_demo,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,discount_type=excluded.discount_type,discount_value=excluded.discount_value,starts_at=excluded.starts_at,ends_at=excluded.ends_at,promo_code=excluded.promo_code,max_uses=excluded.max_uses,audience_segment=excluded.audience_segment,vehicle_kind=excluded.vehicle_kind,description=excluded.description,updated_at=excluded.updated_at`)
    .bind(id,name,status,discountType,discountValue,startsAt,endsAt,promoCode || null,maxUses,audienceSegment,vehicleKind || null,description,now,now).run();
  await env.DB.prepare('DELETE FROM promotion_branches WHERE promotion_id=?').bind(id).run();
  const branchIds = Array.isArray(payload.branches) ? payload.branches.map(text).filter((value) => value === 'branch-north' || value === 'branch-center') : [];
  for (const branchId of branchIds) await env.DB.prepare('INSERT OR IGNORE INTO promotion_branches (promotion_id,branch_id) VALUES (?,?)').bind(id,branchId).run();
  const row = await env.DB.prepare('SELECT * FROM promotions WHERE id=?').bind(id).first<Record<string, unknown>>();
  return json({ promotion:row ? await promotionFromDb(env.DB,row) : null, persisted:true }, 201);
}

async function saveCampaign(request: Request, env: MarketingEnv): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' }, 503);
  const payload = await body(request);
  if (!payload) return json({ error:'invalid_json' }, 400);
  const id = text(payload.id) || `campaign-${crypto.randomUUID()}`;
  const name=text(payload.name), channel=text(payload.channel), segment=text(payload.audienceSegment) || 'all', message=text(payload.message), promotionId=text(payload.promotionId);
  if (!name || !channels.has(channel) || !segments.has(segment) || !message) return json({ error:'invalid_campaign' },400);
  const now=new Date().toISOString();
  await env.DB.prepare(`INSERT INTO marketing_campaigns (id,name,channel,audience_segment,message,promotion_id,status,scheduled_at,is_demo,created_at,updated_at)
    VALUES (?,?,?,?,?,?, 'draft',NULL,1,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,channel=excluded.channel,audience_segment=excluded.audience_segment,message=excluded.message,promotion_id=excluded.promotion_id,updated_at=excluded.updated_at`)
    .bind(id,name,channel,segment,message,promotionId || null,now,now).run();
  await env.DB.prepare(`INSERT INTO marketing_campaign_events (id,campaign_id,event_type,count_value,payload_json,created_at) VALUES (?,?, 'created',1,'{}',?)`).bind(crypto.randomUUID(),id,now).run();
  const row=await env.DB.prepare('SELECT * FROM marketing_campaigns WHERE id=?').bind(id).first<Record<string, unknown>>();
  return json({ campaign:row ? campaignFromRow(row):null, persisted:true },201);
}

async function sendCampaign(env: MarketingEnv, campaignId: string): Promise<Response> {
  if (!env.DB) return json({ error:'persistence_not_configured' },503);
  const row=await env.DB.prepare('SELECT * FROM marketing_campaigns WHERE id=? LIMIT 1').bind(campaignId).first<Record<string, unknown>>();
  if (!row) return json({ error:'campaign_not_found' },404);
  if (String(row.status ?? '') === 'sent') return json({ campaign:campaignFromRow(row), persisted:true, idempotent:true });
  const counts=await segmentCounts(env.DB);
  const segment=String(row.audience_segment ?? 'all');
  const recipients=Math.max(1, counts[segment] ?? counts.all ?? 1);
  const opened=Math.round(recipients * 0.68), clicked=Math.round(recipients * 0.31), conversions=Math.max(0,Math.round(recipients * 0.09));
  const revenue=conversions * 1800000;
  const now=new Date().toISOString();
  await env.DB.prepare(`UPDATE marketing_campaigns SET status='sent', sent_at=?, recipients_count=?, opened_count=?, clicked_count=?, conversions_count=?, attributed_revenue_vnd=?, updated_at=? WHERE id=?`)
    .bind(now,recipients,opened,clicked,conversions,revenue,now,campaignId).run();
  await env.DB.prepare(`INSERT INTO marketing_campaign_events (id,campaign_id,event_type,count_value,payload_json,created_at) VALUES (?,?, 'sent',?,?,?)`)
    .bind(crypto.randomUUID(),campaignId,recipients,JSON.stringify({ demo:true, opened, clicked, conversions, revenue }),now).run();
  const updated=await env.DB.prepare('SELECT * FROM marketing_campaigns WHERE id=?').bind(campaignId).first<Record<string, unknown>>();
  return json({ campaign:updated ? campaignFromRow(updated):null, persisted:true, demoDelivery:true });
}

export async function handleMarketingRequest(request: Request, env: MarketingEnv, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/owner/marketing') && !url.pathname.startsWith('/api/owner/promotions') && !url.pathname.startsWith('/api/owner/campaigns')) return null;
  if (!isOwner(request,env)) return json({ error:'unauthorized' },401);
  if (url.pathname === '/api/owner/marketing' && request.method === 'GET') return listMarketing(env);
  if (url.pathname === '/api/owner/promotions' && request.method === 'POST') return savePromotion(request,env);
  if (url.pathname === '/api/owner/campaigns' && request.method === 'POST') return saveCampaign(request,env);
  const match=url.pathname.match(/^\/api\/owner\/campaigns\/([^/]+)\/send$/);
  if (match && request.method === 'PATCH') return sendCampaign(env,decodeURIComponent(match[1] ?? ''));
  return json({ error:'not_found' },404);
}
