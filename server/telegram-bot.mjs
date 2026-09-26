import {createHmac,timingSafeEqual} from 'node:crypto';

const clean=value=>String(value??'').trim();
const arr=value=>Array.isArray(value)?value.filter(Boolean):[];
const num=value=>Number(value)||0;
const money=value=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(num(value));
const unique=list=>[...new Set(list.map(clean).filter(Boolean))];

function safeEqualHex(a,b){
  try{
    const left=Buffer.from(String(a||''),'hex'),right=Buffer.from(String(b||''),'hex');
    return left.length===right.length&&left.length>0&&timingSafeEqual(left,right);
  }catch{return false}
}
function parseManagerIds(value){
  return unique(String(value||'').split(',').map(x=>x.trim()).filter(x=>/^-?\d+$/.test(x)));
}
function leadFor(state,leadId){
  return arr(state?.leads).find(x=>clean(x.id)===clean(leadId))||null;
}
function quoteLead(state,quote){
  return leadFor(state,quote?.leadId);
}
function orderLead(state,order){
  return leadFor(state,order?.leadId);
}
function clientId(lead){return /^\d+$/.test(clean(lead?.telegramUserId))?clean(lead.telegramUserId):''}
function managerIds(lead,fallback=[]){
  return unique([
    /^\d+$/.test(clean(lead?.managerTelegramUserId))?clean(lead.managerTelegramUserId):'',
    ...fallback
  ]);
}
function paymentStageTitle(order,payment){
  return arr(order?.paymentPlan).find(x=>clean(x.id)===clean(payment?.paymentStage))?.title||'Платёж';
}
function leadTitle(lead){return clean(lead?.model)||clean(lead?.name)||clean(lead?.id)||'заявка'}
function orderTitle(order){return clean(order?.model)||clean(order?.id)||'автомобиль'}

export function createTelegramService({
  token=process.env.AUTO_SALE_TELEGRAM_BOT_TOKEN||'',
  managerChatIds=process.env.AUTO_SALE_MANAGER_CHAT_IDS||'',
  fetchImpl=globalThis.fetch,
  now=()=>Date.now(),
  maxInitDataAgeSec=86400
}={}){
  const botToken=clean(token);
  const fallbackManagers=parseManagerIds(managerChatIds);
  const enabled=Boolean(botToken&&fetchImpl);
  const webhookKey=botToken?createHmac('sha256',botToken).update('auto-sale-telegram-webhook').digest('hex').slice(0,32):'';
  const webhookPath=webhookKey?`/api/auto-sale/telegram/webhook/${webhookKey}`:'';

  async function api(method,payload){
    if(!enabled){const error=new Error('telegram_not_configured');error.statusCode=503;throw error}
    const response=await fetchImpl(`https://api.telegram.org/bot${botToken}/${method}`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
    let data={};
    try{data=await response.json()}catch{}
    if(!response.ok||data?.ok===false){
      const error=new Error('telegram_api_error');
      error.statusCode=502;
      error.telegramDescription=clean(data?.description)||`HTTP ${response.status}`;
      throw error;
    }
    return data?.result||data;
  }

  async function send(chatId,message,{disableWebPagePreview=true}={}){
    const id=clean(chatId),body=clean(message);
    if(!/^-?\d+$/.test(id)){const error=new Error('telegram_chat_id_required');error.statusCode=409;throw error}
    if(!body){const error=new Error('telegram_message_required');error.statusCode=400;throw error}
    if(body.length>3500){const error=new Error('telegram_message_too_long');error.statusCode=400;throw error}
    return api('sendMessage',{chat_id:id,text:body,disable_web_page_preview:disableWebPagePreview});
  }

  function validateInitData(initData){
    if(!enabled)return{ok:false,error:'telegram_not_configured'};
    const raw=clean(initData);
    if(!raw)return{ok:false,error:'telegram_init_data_required'};
    const params=new URLSearchParams(raw);
    const hash=clean(params.get('hash'));
    if(!hash)return{ok:false,error:'telegram_hash_required'};
    const authDate=Number(params.get('auth_date')||0);
    if(!authDate)return{ok:false,error:'telegram_auth_date_required'};
    const nowSec=Math.floor(now()/1000);
    if(authDate>nowSec+300||nowSec-authDate>maxInitDataAgeSec)return{ok:false,error:'telegram_init_data_expired'};
    const check=[...params.entries()]
      .filter(([key])=>key!=='hash')
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([key,value])=>`${key}=${value}`)
      .join('\n');
    const secret=createHmac('sha256','WebAppData').update(botToken).digest();
    const expected=createHmac('sha256',secret).update(check).digest('hex');
    if(!safeEqualHex(hash,expected))return{ok:false,error:'telegram_init_data_invalid'};
    let user=null;
    try{user=JSON.parse(params.get('user')||'null')}catch{}
    if(!user?.id)return{ok:false,error:'telegram_user_required'};
    return{ok:true,user:{...user,id:String(user.id)},authDate};
  }

  function manualRecipient(state,{leadId,target,senderId}={}){
    const lead=leadFor(state,leadId);
    if(!lead)return{ok:false,error:'lead_not_found'};
    const sender=clean(senderId);
    if(target==='client'){
      const allowedManagers=managerIds(lead,fallbackManagers);
      if(!allowedManagers.includes(sender))return{ok:false,error:'telegram_sender_forbidden'};
      const chatId=clientId(lead);
      if(!chatId)return{ok:false,error:'client_telegram_not_linked'};
      return{ok:true,lead,chatId};
    }
    if(target==='manager'){
      if(clientId(lead)!==sender)return{ok:false,error:'telegram_sender_forbidden'};
      const ids=managerIds(lead,fallbackManagers);
      if(!ids.length)return{ok:false,error:'manager_telegram_not_linked'};
      return{ok:true,lead,chatId:ids[0]};
    }
    return{ok:false,error:'telegram_target_invalid'};
  }

  async function sendManual(state,{leadId,target,text,senderId}={}){
    const body=clean(text);
    if(!body){const error=new Error('telegram_message_required');error.statusCode=400;throw error}
    if(body.length>1500){const error=new Error('telegram_message_too_long');error.statusCode=400;throw error}
    const recipient=manualRecipient(state,{leadId,target,senderId});
    if(!recipient.ok){const error=new Error(recipient.error);error.statusCode=recipient.error==='lead_not_found'?404:recipient.error.includes('forbidden')?403:409;throw error}
    const lead=recipient.lead;
    const prefix=target==='client'
      ?`AUTO МИР · сообщение менеджера\n${leadTitle(lead)}\n\n`
      :`AUTO МИР · сообщение клиента\n${clean(lead.name)||leadTitle(lead)}\n\n`;
    const result=await send(recipient.chatId,prefix+body);
    return{ok:true,chatId:recipient.chatId,messageId:result?.message_id||null};
  }

  async function notifyStateChanges(previous,next){
    if(!enabled||!previous?.initialized)return[];
    const deliveries=[];
    const prevLeads=new Map(arr(previous.leads).map(x=>[clean(x.id),x]));
    const prevQuotes=new Map(arr(previous.quotes).map(x=>[clean(x.id),x]));
    const prevOrders=new Map(arr(previous.orders).map(x=>[clean(x.id),x]));

    const deliver=async(chatId,message,meta)=>{
      try{
        const result=await send(chatId,message);
        deliveries.push({ok:true,chatId,messageId:result?.message_id||null,...meta});
      }catch(error){
        deliveries.push({ok:false,chatId,error:clean(error?.message)||'telegram_send_failed',...meta});
      }
    };
    const toManagers=async(lead,message,meta)=>{
      for(const chatId of managerIds(lead,fallbackManagers))await deliver(chatId,message,{target:'manager',...meta});
    };
    const toClient=async(lead,message,meta)=>{
      const chatId=clientId(lead);if(chatId)await deliver(chatId,message,{target:'client',...meta});
    };

    for(const lead of arr(next?.leads)){
      const before=prevLeads.get(clean(lead.id));
      if(!before&&lead.clientCreated){
        await toManagers(lead,`🚗 AUTO МИР · новая заявка\n${clean(lead.name)||'Клиент'}\n${leadTitle(lead)}\nБюджет: ${lead.budget?money(lead.budget):'не указан'}\nКонтакт: ${clean(lead.contact)||'—'}`,{event:'lead_created',leadId:lead.id});
      }else if(before&&clean(before.status)!==clean(lead.status)){
        const msg=`AUTO МИР · статус заявки\n${leadTitle(lead)}\n${clean(before.status)||'—'} → ${clean(lead.status)||'—'}`;
        await toClient(lead,msg,{event:'lead_status',leadId:lead.id});
        await toManagers(lead,msg,{event:'lead_status',leadId:lead.id});
      }
    }

    for(const quote of arr(next?.quotes)){
      const before=prevQuotes.get(clean(quote.id));
      if(!before||clean(before.status)===clean(quote.status))continue;
      const lead=quoteLead(next,quote);if(!lead)continue;
      const total=num(quote.total)?`\nСтоимость: ${money(quote.total)}`:'';
      const msg=`AUTO МИР · расчёт\n${clean(quote.model)||leadTitle(lead)}\nСтатус: ${clean(quote.status)}${total}`;
      await toClient(lead,msg,{event:'quote_status',leadId:lead.id,quoteId:quote.id});
      await toManagers(lead,msg,{event:'quote_status',leadId:lead.id,quoteId:quote.id});
    }

    for(const order of arr(next?.orders)){
      const before=prevOrders.get(clean(order.id));
      const lead=orderLead(next,order);if(!lead)continue;
      if(!before){
        const msg=`AUTO МИР · заказ создан\n${orderTitle(order)}\nЗаказ: ${clean(order.id)}\nЭтап: ${clean(order.stage)||'Выкуп'}`;
        await toClient(lead,msg,{event:'order_created',leadId:lead.id,orderId:order.id});
        await toManagers(lead,msg,{event:'order_created',leadId:lead.id,orderId:order.id});
      }else if(clean(before.stage)!==clean(order.stage)){
        const extra=clean(order.location)?`\nЛокация: ${clean(order.location)}`:'';
        const msg=`AUTO МИР · новый этап заказа\n${orderTitle(order)}\n${clean(before.stage)||'—'} → ${clean(order.stage)||'—'}${extra}`;
        await toClient(lead,msg,{event:'order_stage',leadId:lead.id,orderId:order.id});
        await toManagers(lead,msg,{event:'order_stage',leadId:lead.id,orderId:order.id});
      }
      const previousPaymentIds=new Set(arr(before?.payments).map(x=>clean(x.id)));
      const newPayments=arr(order.payments).filter(x=>!previousPaymentIds.has(clean(x.id)));
      for(const payment of newPayments){
        const title=paymentStageTitle(order,payment);
        const msg=`AUTO МИР · платёж зафиксирован\n${orderTitle(order)}\n${title}\nСумма: ${money(payment.amount)}\nОплачено по заказу: ${money(order.paid)} из ${money(order.total)}`;
        await toClient(lead,msg,{event:'payment',leadId:lead.id,orderId:order.id,paymentId:payment.id});
        await toManagers(lead,msg,{event:'payment',leadId:lead.id,orderId:order.id,paymentId:payment.id});
      }
    }
    return deliveries;
  }

  function isWebhookPath(pathname=''){
    return Boolean(enabled&&webhookPath&&clean(pathname)===webhookPath);
  }

  async function handleWebhookUpdate(update,{appUrl=''}={}){
    if(!enabled){const error=new Error('telegram_not_configured');error.statusCode=503;throw error}
    const message=update?.message;
    if(!message?.chat?.id)return{ok:true,ignored:true};
    const chatId=String(message.chat.id),textValue=clean(message.text),firstName=clean(message.from?.first_name)||'';
    const command=textValue.split(/\s+/)[0].toLowerCase().replace(/@[^\s]+$/,'');
    const webAppUrl=clean(appUrl);

    if(command==='/start'||command==='/catalog'||command==='/app'){
      const greeting=command==='/start'
        ?`🚗 AUTO МИР\n\nЗдравствуйте${firstName?', '+firstName:''}!\n\nЗдесь можно выбрать автомобиль из США или Грузии, получить расчёт и отслеживать заказ — всё в одном приложении.\n\nНажмите «Открыть каталог», чтобы начать.`
        :`🚗 Каталог AUTO МИР\n\nОткройте приложение, чтобы посмотреть автомобили, отправить заявку или проверить свой заказ.`;
      const payload={chat_id:chatId,text:greeting};
      if(webAppUrl)payload.reply_markup={inline_keyboard:[[{text:'🚗 Открыть каталог',web_app:{url:webAppUrl}}]]};
      const result=await api('sendMessage',payload);
      return{ok:true,handled:command,messageId:result?.message_id||null};
    }

    if(command==='/help'){
      const body='AUTO МИР помогает пройти весь путь покупки автомобиля:\n\n1. Выбрать авто из США или Грузии\n2. Получить прозрачный расчёт\n3. Оформить заявку\n4. Следить за этапами заказа и оплатами\n5. Получать уведомления прямо в Telegram';
      const payload={chat_id:chatId,text:body};
      if(webAppUrl)payload.reply_markup={inline_keyboard:[[{text:'Открыть AUTO МИР',web_app:{url:webAppUrl}}]]};
      const result=await api('sendMessage',payload);
      return{ok:true,handled:'/help',messageId:result?.message_id||null};
    }

    if(textValue){
      const payload={chat_id:chatId,text:'Для работы с AUTO МИР используйте кнопку каталога ниже или команду /help.'};
      if(webAppUrl)payload.reply_markup={inline_keyboard:[[{text:'🚗 Открыть каталог',web_app:{url:webAppUrl}}]]};
      const result=await api('sendMessage',payload);
      return{ok:true,handled:'fallback',messageId:result?.message_id||null};
    }
    return{ok:true,ignored:true};
  }

  return{
    enabled,
    fallbackManagerCount:fallbackManagers.length,
    webhookPath,
    isWebhookPath,
    handleWebhookUpdate,
    send,
    validateInitData,
    manualRecipient,
    sendManual,
    notifyStateChanges
  };
}
