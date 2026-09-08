import { useEffect, useMemo, useState } from 'react';
import { fetchMarketingSnapshot, MarketingCampaign, MarketingChannel, MarketingPromotion, MarketingSegment, MarketingSnapshot, saveCampaign, savePromotion, sendCampaign } from '../../api/marketing';

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₫`;
const segmentLabels: Record<MarketingSegment,string> = { all:'Все клиенты', new:'Новые', repeat:'Повторные', vip:'VIP', inactive:'Неактивные' };
const channelLabels: Record<MarketingChannel,string> = { telegram:'Telegram', zalo:'Zalo', email:'Email', sms:'SMS' };
const statusLabels: Record<string,string> = { draft:'Черновик', active:'Активна', paused:'Пауза', expired:'Завершена', archived:'Архив', scheduled:'Запланирована', sent:'Отправлена', cancelled:'Отменена' };

function defaultPromotion(): MarketingPromotion {
  const start = new Date();
  const end = new Date(); end.setDate(end.getDate()+30);
  return { id:`promo-${crypto.randomUUID()}`, name:'', status:'active', discountType:'percent', discountValue:10, startsAt:start.toISOString(), endsAt:end.toISOString(), promoCode:'', maxUses:100, usesCount:0, audienceSegment:'all', vehicleKind:'', description:'', branches:['branch-north','branch-center'], isDemo:true };
}

function defaultCampaign(): MarketingCampaign {
  return { id:`campaign-${crypto.randomUUID()}`, name:'', channel:'telegram', audienceSegment:'all', message:'', promotionId:'', status:'draft', scheduledAt:'', sentAt:'', recipientsCount:0, openedCount:0, clickedCount:0, conversionsCount:0, attributedRevenueVnd:0, isDemo:true };
}

export function OwnerMarketing() {
  const [data,setData]=useState<MarketingSnapshot>({ promotions:[], campaigns:[], segments:{all:0,new:0,repeat:0,vip:0,inactive:0}, persisted:false });
  const [promotion,setPromotion]=useState<MarketingPromotion|null>(null);
  const [campaign,setCampaign]=useState<MarketingCampaign|null>(null);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{ let active=true; fetchMarketingSnapshot().then((snapshot)=>{ if(active)setData(snapshot); }); return()=>{active=false;}; },[]);

  const stats=useMemo(()=>data.campaigns.reduce((acc,item)=>({ recipients:acc.recipients+item.recipientsCount, opens:acc.opens+item.openedCount, clicks:acc.clicks+item.clickedCount, conversions:acc.conversions+item.conversionsCount, revenue:acc.revenue+item.attributedRevenueVnd }),{recipients:0,opens:0,clicks:0,conversions:0,revenue:0}),[data.campaigns]);

  async function persistPromotion() {
    if(!promotion?.name.trim() || !promotion.promoCode.trim()) return;
    setBusy(true); setNotice('');
    try {
      const saved=await savePromotion({ ...promotion, name:promotion.name.trim(), promoCode:promotion.promoCode.trim().toUpperCase() });
      setData((current)=>({ ...current, promotions:[saved,...current.promotions.filter((item)=>item.id!==saved.id)] }));
      setPromotion(null); setNotice('Акция сохранена.');
    } finally { setBusy(false); }
  }

  async function persistCampaign() {
    if(!campaign?.name.trim() || !campaign.message.trim()) return;
    setBusy(true); setNotice('');
    try {
      const saved=await saveCampaign({ ...campaign, name:campaign.name.trim(), message:campaign.message.trim() });
      setData((current)=>({ ...current, campaigns:[saved,...current.campaigns.filter((item)=>item.id!==saved.id)] }));
      setCampaign(null); setNotice('Кампания сохранена как черновик.');
    } finally { setBusy(false); }
  }

  async function deliver(item: MarketingCampaign) {
    setBusy(true); setNotice('');
    try {
      const saved=await sendCampaign(item.id);
      if(saved){ setData((current)=>({ ...current, campaigns:current.campaigns.map((campaignItem)=>campaignItem.id===saved.id?saved:campaignItem) })); setNotice('DEMO-рассылка отправлена, статистика обновлена.'); }
    } finally { setBusy(false); }
  }

  return <section className="marketing-page" data-stage10-marketing>
    <section className="hero marketing-hero"><div><span className="eyebrow">МАРКЕТИНГ</span><h1>Возвращайте клиентов и заполняйте свободный парк.</h1><p>Акции, промокоды и сегментированные кампании по клиентской базе UNIQ. Отправка каналов сейчас работает в демонстрационном режиме.</p></div><div className="marketing-hero-card"><b>{money(stats.revenue)}</b><span>атрибутированная выручка DEMO</span><small>{data.persisted?'D1 · общая база':'DEMO · локальный fallback'}</small></div></section>

    <section className="metrics marketing-metrics">
      <div className="metric"><span>Активные акции</span><b>{data.promotions.filter((item)=>item.status==='active').length}</b><small>промокоды и предложения</small></div>
      <div className="metric"><span>Получатели</span><b>{stats.recipients}</b><small>по всем отправленным кампаниям</small></div>
      <div className="metric"><span>Переходы</span><b>{stats.clicks}</b><small>{stats.recipients?Math.round(stats.clicks/stats.recipients*100):0}% CTR DEMO</small></div>
      <div className="metric"><span>Конверсии</span><b>{stats.conversions}</b><small>связанные покупки DEMO</small></div>
    </section>

    <section className="segment-strip" data-marketing-segments>{(Object.keys(segmentLabels) as MarketingSegment[]).map((key)=><div key={key}><b>{data.segments[key]}</b><span>{segmentLabels[key]}</span></div>)}</section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">АКЦИИ И ПРОМОКОДЫ</span><h2>Управление предложениями</h2></div><button className="primary" data-add-promotion onClick={()=>setPromotion(defaultPromotion())}>+ Акция</button></div>
      <div className="promotion-grid">{data.promotions.map((item)=><article key={item.id} data-promotion={item.id}><div className="promotion-head"><span className={`marketing-status ${item.status}`}>{statusLabels[item.status]??item.status}</span><b>{item.promoCode||'Без кода'}</b></div><h3>{item.name}</h3><p>{item.description||'Персональное предложение UNIQ.'}</p><div className="promotion-value">{item.discountType==='percent'?`−${item.discountValue}%`:`−${money(item.discountValue)}`}</div><div className="promotion-meta"><span>{segmentLabels[item.audienceSegment]}</span><span>{item.vehicleKind||'Весь парк'}</span><span>{item.usesCount}/{item.maxUses??'∞'} использований</span></div><button className="secondary" onClick={()=>setPromotion({...item,branches:[...item.branches]})}>Редактировать</button></article>)}</div>
    </section>

    <section className="section">
      <div className="section-head"><div><span className="eyebrow">РАССЫЛКИ</span><h2>Кампании по CRM-сегментам</h2></div><button className="primary" data-add-campaign onClick={()=>setCampaign(defaultCampaign())}>+ Кампания</button></div>
      {notice?<div className="marketing-notice">{notice}</div>:null}
      <div className="campaign-list">{data.campaigns.map((item)=><article key={item.id} data-campaign={item.id}><div className="campaign-main"><div><span className={`marketing-status ${item.status}`}>{statusLabels[item.status]??item.status}</span><small>{channelLabels[item.channel]} · {segmentLabels[item.audienceSegment]}</small></div><h3>{item.name}</h3><p>{item.message}</p></div><div className="campaign-stats"><span><b>{item.recipientsCount}</b>получили</span><span><b>{item.openedCount}</b>открыли</span><span><b>{item.clickedCount}</b>перешли</span><span><b>{item.conversionsCount}</b>купили</span></div><div className="campaign-revenue"><b>{money(item.attributedRevenueVnd)}</b><span>выручка DEMO</span>{item.status==='draft'?<button className="primary" data-send-campaign={item.id} disabled={busy} onClick={()=>void deliver(item)}>DEMO отправить</button>:null}</div></article>)}</div>
    </section>

    {promotion?<div className="modal-bg" onMouseDown={(event)=>{if(event.currentTarget===event.target)setPromotion(null);}}><section className="modal marketing-editor" data-promotion-editor><button className="modal-x" onClick={()=>setPromotion(null)}>×</button><span className="eyebrow">АКЦИЯ</span><h2>Настройка промокода</h2><div className="form-grid"><label>Название<input data-promo-name value={promotion.name} onChange={(event)=>setPromotion({...promotion,name:event.target.value})}/></label><label>Промокод<input data-promo-code value={promotion.promoCode} onChange={(event)=>setPromotion({...promotion,promoCode:event.target.value.toUpperCase()})}/></label><label>Скидка<select value={promotion.discountType} onChange={(event)=>setPromotion({...promotion,discountType:event.target.value as MarketingPromotion['discountType']})}><option value="percent">Процент</option><option value="fixed_vnd">Сумма VND</option></select></label><label>Значение<input type="number" min="1" value={promotion.discountValue} onChange={(event)=>setPromotion({...promotion,discountValue:Number(event.target.value)})}/></label><label>Сегмент<select value={promotion.audienceSegment} onChange={(event)=>setPromotion({...promotion,audienceSegment:event.target.value as MarketingSegment})}>{Object.entries(segmentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Тип техники<select value={promotion.vehicleKind} onChange={(event)=>setPromotion({...promotion,vehicleKind:event.target.value})}><option value="">Весь парк</option><option value="car">Авто</option><option value="motorcycle">Мотоциклы</option><option value="scooter">Скутеры</option></select></label><label>Лимит<input type="number" min="1" value={promotion.maxUses??''} onChange={(event)=>setPromotion({...promotion,maxUses:event.target.value?Number(event.target.value):null})}/></label><label>Статус<select value={promotion.status} onChange={(event)=>setPromotion({...promotion,status:event.target.value as MarketingPromotion['status']})}><option value="active">Активна</option><option value="draft">Черновик</option><option value="paused">Пауза</option></select></label></div><label>Описание<textarea value={promotion.description} onChange={(event)=>setPromotion({...promotion,description:event.target.value})}/></label><div className="branch-checks"><label><input type="checkbox" checked={promotion.branches.includes('branch-north')} onChange={(event)=>setPromotion({...promotion,branches:event.target.checked?[...promotion.branches,'branch-north']:promotion.branches.filter((item)=>item!=='branch-north')})}/>Север</label><label><input type="checkbox" checked={promotion.branches.includes('branch-center')} onChange={(event)=>setPromotion({...promotion,branches:event.target.checked?[...promotion.branches,'branch-center']:promotion.branches.filter((item)=>item!=='branch-center')})}/>Центр</label></div><button className="primary wide" data-save-promotion disabled={busy||!promotion.name.trim()||!promotion.promoCode.trim()} onClick={()=>void persistPromotion()}>Сохранить акцию</button></section></div>:null}

    {campaign?<div className="modal-bg" onMouseDown={(event)=>{if(event.currentTarget===event.target)setCampaign(null);}}><section className="modal marketing-editor" data-campaign-editor><button className="modal-x" onClick={()=>setCampaign(null)}>×</button><span className="eyebrow">РАССЫЛКА</span><h2>Новая кампания</h2><div className="form-grid"><label>Название<input data-campaign-name value={campaign.name} onChange={(event)=>setCampaign({...campaign,name:event.target.value})}/></label><label>Канал<select data-campaign-channel value={campaign.channel} onChange={(event)=>setCampaign({...campaign,channel:event.target.value as MarketingChannel})}>{Object.entries(channelLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Аудитория<select data-campaign-segment value={campaign.audienceSegment} onChange={(event)=>setCampaign({...campaign,audienceSegment:event.target.value as MarketingSegment})}>{Object.entries(segmentLabels).map(([key,label])=><option key={key} value={key}>{label} · {data.segments[key as MarketingSegment]}</option>)}</select></label><label>Акция<select value={campaign.promotionId} onChange={(event)=>setCampaign({...campaign,promotionId:event.target.value})}><option value="">Без акции</option>{data.promotions.map((item)=><option key={item.id} value={item.id}>{item.name} · {item.promoCode}</option>)}</select></label></div><label>Сообщение<textarea data-campaign-message value={campaign.message} onChange={(event)=>setCampaign({...campaign,message:event.target.value})} placeholder="Текст предложения для клиента"/></label><div className="message-preview"><span>Предпросмотр</span><p>{campaign.message||'Здесь появится сообщение для клиента.'}</p></div><button className="primary wide" data-save-campaign disabled={busy||!campaign.name.trim()||!campaign.message.trim()} onClick={()=>void persistCampaign()}>Сохранить черновик</button><small>Telegram / Zalo / Email / SMS работают как DEMO-интеграции до подключения реальных провайдеров рассылок.</small></section></div>:null}
  </section>;
}
