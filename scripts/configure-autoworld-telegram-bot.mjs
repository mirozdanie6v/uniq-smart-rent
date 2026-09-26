import {createHmac} from 'node:crypto';

const token=String(process.env.AUTO_SALE_TELEGRAM_BOT_TOKEN||'').trim();
const appUrl=String(process.env.AUTO_SALE_TELEGRAM_APP_URL||'https://bba01u6g86lg2q49p34d.containers.yandexcloud.net/').trim();
if(!token)throw new Error('AUTO_SALE_TELEGRAM_BOT_TOKEN is required');
if(!/^https:\/\//i.test(appUrl))throw new Error('AUTO_SALE_TELEGRAM_APP_URL must be HTTPS');

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const api=async(method,payload={})=>{
  for(let attempt=1;attempt<=3;attempt++){
    const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
    const data=await response.json().catch(()=>({}));
    if(response.status===429||data?.error_code===429){
      const retryAfter=Math.max(1,Number(data?.parameters?.retry_after)||1);
      if(attempt<3){
        console.log(`${method}: Telegram rate limit, retrying after ${retryAfter}s`);
        await sleep((retryAfter+1)*1000);
        continue;
      }
    }
    if(!response.ok||data.ok===false)throw new Error(`${method}: ${data.description||response.status}`);
    return data.result;
  }
};

const me=await api('getMe');
if(String(me.username||'').toLowerCase()!=='autoworld_georgia_bot'){
  throw new Error(`Wrong bot token: expected @AutoWorld_Georgia_bot, got @${me.username||'unknown'}`);
}

await api('setMyName',{name:'AUTO МИР | AutoWorld Georgia'});
await api('setMyDescription',{description:'Автомобили из США и Грузии с доставкой в Россию. Каталог, прозрачный расчёт, заявка, этапы оплаты и отслеживание заказа — в одном приложении.'});
await api('setMyShortDescription',{short_description:'Автомобили из США и Грузии · каталог и заказ'});
await api('setMyCommands',{commands:[
  {command:'start',description:'Начать'},
  {command:'catalog',description:'Открыть каталог'},
  {command:'help',description:'Как это работает'}
]});
await api('setChatMenuButton',{menu_button:{
  type:'web_app',
  text:'🚗 Открыть каталог',
  web_app:{url:appUrl}
}});

const webhookKey=createHmac('sha256',token).update('auto-sale-telegram-webhook-v2').digest('hex').slice(0,32);
const webhookUrl=new URL(`/api/auto-sale/telegram/webhook/${webhookKey}`,appUrl).toString();
await api('deleteWebhook',{drop_pending_updates:false});
await api('setWebhook',{
  url:webhookUrl,
  allowed_updates:['message'],
  drop_pending_updates:false
});
const webhookProbe=await fetch(webhookUrl,{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({update_id:-1})
});
if(!webhookProbe.ok)throw new Error(`Webhook endpoint probe failed: HTTP ${webhookProbe.status}`);
const webhookProbeBody=await webhookProbe.json().catch(()=>({}));
if(webhookProbeBody?.ok!==true)throw new Error('Webhook endpoint probe did not return ok=true');

const [actualBot,name,description,shortDescription,commands,button,webhook]=await Promise.all([
  api('getMe'),
  api('getMyName'),
  api('getMyDescription'),
  api('getMyShortDescription'),
  api('getMyCommands'),
  api('getChatMenuButton'),
  api('getWebhookInfo')
]);
console.log(JSON.stringify({
  ok:true,
  bot:{id:actualBot.id,username:actualBot.username,name:name?.name||actualBot.first_name},
  description:description?.description||'',
  shortDescription:shortDescription?.short_description||'',
  commands,
  appUrl,
  menuButton:button,
  webhook:{configured:Boolean(webhook.url),endpointProbe:true,pending_update_count:webhook.pending_update_count,last_error_message:webhook.last_error_message||null}
},null,2));
