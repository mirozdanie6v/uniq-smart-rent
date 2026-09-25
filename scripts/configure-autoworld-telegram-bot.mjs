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
  console.warn(`Configured bot username is @${me.username}; requested username is @AutoWorld_Georgia_bot`);
}

await api('setMyName',{name:'AutoWorld Georgia'});
await api('setMyDescription',{description:'Автомобили из США и Грузии с доставкой в Россию. Каталог, заявка, расчёт и отслеживание заказа в одном приложении.'});
await api('setMyShortDescription',{short_description:'Каталог автомобилей AUTO МИР · США и Грузия'});
await api('setMyCommands',{commands:[
  {command:'start',description:'Открыть AUTO МИР'},
  {command:'app',description:'Открыть каталог'}
]});
await api('setChatMenuButton',{menu_button:{
  type:'web_app',
  text:'Открыть каталог',
  web_app:{url:appUrl}
}});

const button=await api('getChatMenuButton');
console.log(JSON.stringify({
  ok:true,
  bot:{id:me.id,username:me.username,first_name:me.first_name},
  appUrl,
  menuButton:button
},null,2));
