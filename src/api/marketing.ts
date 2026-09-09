export type MarketingSegment = 'all' | 'new' | 'repeat' | 'vip' | 'inactive';
export type MarketingChannel = 'telegram' | 'zalo' | 'email' | 'sms';
export type PromotionStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';
export type CampaignStatus = 'draft' | 'scheduled' | 'sent' | 'cancelled';

export interface MarketingPromotion {
  id: string;
  name: string;
  status: PromotionStatus;
  discountType: 'percent' | 'fixed_vnd';
  discountValue: number;
  startsAt: string;
  endsAt: string;
  promoCode: string;
  maxUses: number | null;
  usesCount: number;
  audienceSegment: MarketingSegment;
  vehicleKind: string;
  description: string;
  branches: string[];
  isDemo: boolean;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: MarketingChannel;
  audienceSegment: MarketingSegment;
  message: string;
  promotionId: string;
  status: CampaignStatus;
  scheduledAt: string;
  sentAt: string;
  recipientsCount: number;
  openedCount: number;
  clickedCount: number;
  conversionsCount: number;
  attributedRevenueVnd: number;
  isDemo: boolean;
}

export interface MarketingSnapshot {
  promotions: MarketingPromotion[];
  campaigns: MarketingCampaign[];
  segments: Record<MarketingSegment, number>;
  persisted: boolean;
}

const headers = { accept:'application/json', 'x-uniq-demo-role':'owner' };
const jsonHeaders = { ...headers, 'content-type':'application/json' };

const fallback: MarketingSnapshot = {
  promotions: [
    { id:'promo-local-repeat', name:'Повторная аренда −10%', status:'active', discountType:'percent', discountValue:10, startsAt:'2026-09-01T00:00:00Z', endsAt:'2026-10-31T23:59:59Z', promoCode:'RETURN10', maxUses:80, usesCount:14, audienceSegment:'repeat', vehicleKind:'', description:'Для повторных клиентов UNIQ.', branches:['branch-north','branch-center'], isDemo:true },
    { id:'promo-local-scooter', name:'Скутеры недели −8%', status:'active', discountType:'percent', discountValue:8, startsAt:'2026-09-08T00:00:00Z', endsAt:'2026-09-30T23:59:59Z', promoCode:'SCOOTER8', maxUses:120, usesCount:23, audienceSegment:'all', vehicleKind:'scooter', description:'Заполняем свободные слоты скутеров.', branches:['branch-north','branch-center'], isDemo:true },
  ],
  campaigns: [
    { id:'campaign-local-repeat', name:'Вернуть повторных клиентов', channel:'telegram', audienceSegment:'repeat', message:'Снова в Нячанге? Для вас −10% по коду RETURN10.', promotionId:'promo-local-repeat', status:'sent', scheduledAt:'', sentAt:'2026-09-07T10:00:00Z', recipientsCount:42, openedCount:31, clickedCount:18, conversionsCount:7, attributedRevenueVnd:12600000, isDemo:true },
    { id:'campaign-local-scooter', name:'Свободные скутеры на этой неделе', channel:'zalo', audienceSegment:'all', message:'Свободные скутеры UNIQ. Код SCOOTER8 даёт −8%.', promotionId:'promo-local-scooter', status:'sent', scheduledAt:'', sentAt:'2026-09-08T09:00:00Z', recipientsCount:118, openedCount:76, clickedCount:34, conversionsCount:11, attributedRevenueVnd:15800000, isDemo:true },
  ],
  segments:{ all:72, new:24, repeat:22, vip:9, inactive:17 },
  persisted:false,
};

export async function fetchMarketingSnapshot(): Promise<MarketingSnapshot> {
  try {
    const response = await fetch('/api/owner/marketing', { headers });
    if (!response.ok) return fallback;
    return await response.json() as MarketingSnapshot;
  } catch { return fallback; }
}

export async function savePromotion(promotion: MarketingPromotion): Promise<MarketingPromotion> {
  try {
    const response = await fetch('/api/owner/promotions', { method:'POST', headers:jsonHeaders, body:JSON.stringify(promotion) });
    if (!response.ok) return promotion;
    const data = await response.json() as { promotion?: MarketingPromotion };
    return data.promotion ?? promotion;
  } catch { return promotion; }
}

export async function saveCampaign(campaign: MarketingCampaign): Promise<MarketingCampaign> {
  try {
    const response = await fetch('/api/owner/campaigns', { method:'POST', headers:jsonHeaders, body:JSON.stringify(campaign) });
    if (!response.ok) return campaign;
    const data = await response.json() as { campaign?: MarketingCampaign };
    return data.campaign ?? campaign;
  } catch { return campaign; }
}

export async function sendCampaign(campaignId: string): Promise<MarketingCampaign | null> {
  try {
    const response = await fetch(`/api/owner/campaigns/${encodeURIComponent(campaignId)}/send`, { method:'PATCH', headers:jsonHeaders });
    if (!response.ok) return null;
    const data = await response.json() as { campaign?: MarketingCampaign };
    return data.campaign ?? null;
  } catch { return null; }
}
