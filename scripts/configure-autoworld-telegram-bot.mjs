import {createHmac} from 'node:crypto';

const token=String(process.env.AUTO_SALE_TELEGRAM_BOT_TOKEN||'').trim();
const appUrl=String(process.env.AUTO_SALE_TELEGRAM_APP_URL||'https://bba01u6g86lg2q49p34d.containers.yandexcloud.net/').trim();
if(!token)throw new Error('AUTO_SALE_TELEGRAM_BOT_TOKEN is required');
if(!/^https:\/\//i.test(appUrl))throw new Error('AUTO_SALE_TELEGRAM_APP_URL must be HTTPS');

const api=async(method,payload={})=>{
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok===false)throw new Error(`${method}: ${data.description||response.status}`);
  return data.result;
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

const webhookKey=createHmac('sha256',token).update('auto-sale-telegram-webhook').digest('hex').slice(0,32);
const webhookUrl=new URL(`/api/auto-sale/telegram/webhook/${webhookKey}`,appUrl).toString();
await api('setWebhook',{
  url:webhookUrl,
  allowed_updates:['message'],
  drop_pending_updates:false
});

const [button,webhook]=await Promise.all([api('getChatMenuButton'),api('getWebhookInfo')]);
console.log(JSON.stringify({
  ok:true,
  bot:{id:me.id,username:me.username,first_name:me.first_name},
  appUrl,
  menuButton:button,
  webhook:{url:webhook.url,pending_update_count:webhook.pending_update_count,last_error_message:webhook.last_error_message||null}
},null,2));
