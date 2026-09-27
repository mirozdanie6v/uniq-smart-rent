import http from 'node:http';
import path from 'node:path';
import {timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import {createYdbStateStore} from './ydb-state.mjs';
import {syncYdbState} from './ydb-sync.mjs';
import {createObjectStorage} from './object-storage.mjs';
import {createTelegramService} from './telegram-bot.mjs';

const rootDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const distDir=path.join(rootDir,'dist');
const port=Number(process.env.PORT||8080);
const connectionString=String(process.env.YDB_CONNECTION_STRING||'').trim();
const apiKey=String(process.env.AUTO_SALE_API_KEY||'').trim();
const publicDemoWrite=/^(1|true|yes)$/i.test(String(process.env.AUTO_SALE_PUBLIC_DEMO_WRITE||''));
const mediaBucket=String(process.env.AUTO_SALE_MEDIA_BUCKET||'').trim();
if(!connectionString)throw new Error('YDB_CONNECTION_STRING is required');
if(!publicDemoWrite&&!apiKey)throw new Error('AUTO_SALE_API_KEY is required when public demo write is disabled');
const store=await createYdbStateStore({connectionString});
const media=createObjectStorage({bucket:mediaBucket});
const telegram=createTelegramService();

const apiHeaders={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'access-control-allow-origin':'*',
  'access-control-allow-headers':'content-type,x-auto-sale-key,x-telegram-init-data,x-auto-sale-skip-telegram',
  'access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS'
};
const json=(res,data,status=200)=>{
  const body=JSON.stringify(data);
  res.writeHead(status,{...apiHeaders,'content-length':Buffer.byteLength(body)});
  res.end(body);
};
const hasApiKey=req=>{
  const supplied=String(req.headers['x-auto-sale-key']||'');
  const expected=Buffer.from(apiKey);
  const actual=Buffer.from(supplied);
  return expected.length===actual.length&&expected.length>0&&timingSafeEqual(expected,actual);
};
const authorized=req=>publicDemoWrite||hasApiKey(req);
async function parseJson(req,maxBytes=2_000_000){
  const chunks=[];let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>maxBytes){
      const error=new Error('payload_too_large');error.statusCode=413;throw error;
    }
    chunks.push(chunk);
  }
  if(!chunks.length)return null;
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{
    const error=new Error('invalid_json');error.statusCode=400;throw error;
  }
}

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
async function staticFile(res,url){
  let rel;
  try{rel=decodeURIComponent(url.pathname)}catch{rel='/'}
  rel=rel==='/'?'index.html':rel.replace(/^\/+/, '');
  let file=path.resolve(distDir,rel);
  if(!file.startsWith(`${distDir}${path.sep}`)&&file!==path.join(distDir,'index.html')){res.writeHead(403);res.end('Forbidden');return}
  try{
    const info=await stat(file);
    if(info.isDirectory())file=path.join(file,'index.html');
    const body=await readFile(file);
    const ext=path.extname(file).toLowerCase();
    const cacheControl=file.endsWith('index.html')||['.css','.js','.mjs'].includes(ext)?'no-cache':'public, max-age=300';
    res.writeHead(200,{'content-type':mime[ext]||'application/octet-stream','cache-control':cacheControl});
    res.end(body);
  }catch{
    const body=await readFile(path.join(distDir,'index.html'));
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});
    res.end(body);
  }
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
    if(req.method==='OPTIONS'&&url.pathname.startsWith('/api/')){
      res.writeHead(204,apiHeaders);res.end();return;
    }
    if(url.pathname==='/api/health'){
      await store.ping();
      json(res,{ok:true,service:'auto-sale-yandex',persistence:'ydb-serverless',schemaVersion:4,writeMode:publicDemoWrite?'public-demo':'authenticated',stateReadMode:publicDemoWrite?'public-demo':'authenticated',mediaStorage:mediaBucket?'object-storage':'disabled',mediaBucket:mediaBucket||null,telegramNotifications:telegram.enabled?'enabled':'disabled',telegramFallbackManagers:telegram.fallbackManagerCount});
      return;
    }
    if(url.pathname==='/api/auto-sale/state'&&req.method==='GET'){
      if(!authorized(req)){json(res,{error:'unauthorized'},401);return}
      json(res,await store.loadState());
      return;
    }
    if(url.pathname==='/api/auto-sale/state'&&req.method==='PUT'){
      if(!authorized(req)){json(res,{error:'unauthorized'},401);return}
      const input=await parseJson(req);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      const skipTelegram=req.headers['x-auto-sale-skip-telegram']==='1'&&hasApiKey(req);
      const notifyTelegram=telegram.enabled&&!skipTelegram;
      const result=await syncYdbState(store,input,{includePrevious:notifyTelegram});
      if(result.status>=200&&result.status<300&&notifyTelegram){
        const before=result.previous;
        const nextState={...input,initialized:true};
        setImmediate(()=>{
          telegram.notifyStateChanges(before,nextState)
            .then(async deliveries=>{
              const failed=deliveries.filter(x=>!x.ok);
              if(failed.length){await store.enqueueNotifications(failed);console.warn('AUTO SALE Telegram queued failed deliveries',failed.map(x=>x.id))}
            })
            .catch(error=>console.error('AUTO SALE Telegram state notification failed',error));
        });
      }
      json(res,result.data,result.status);
      return;
    }
    if(req.method==='POST'&&url.pathname==='/api/auto-sale/notifications/process'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      const pending=await store.pendingNotifications(50),results=[];
      for(const item of pending){
        try{
          const sent=await telegram.send(item.chatId,item.message);
          await store.markNotification(item.id,{ok:true,messageId:sent?.message_id||'',attempts:item.attempts});
          results.push({id:item.id,ok:true,messageId:sent?.message_id||null});
        }catch(error){
          await store.markNotification(item.id,{ok:false,error:String(error?.message||'telegram_send_failed'),attempts:item.attempts});
          results.push({id:item.id,ok:false,error:String(error?.message||'telegram_send_failed')});
        }
      }
      json(res,{ok:true,processed:results.length,results,stats:await store.notificationStats()});
      return;
    }
    if(req.method==='GET'&&url.pathname==='/api/auto-sale/notifications/status'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      json(res,{ok:true,stats:await store.notificationStats()});return;
    }

    if(req.method==='GET'&&url.pathname==='/api/auto-sale/telegram/diagnose'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      const probe=async target=>{
        const started=Date.now();
        try{
          const response=await fetch(target,{method:'GET',signal:AbortSignal.timeout(8000)});
          return{ok:true,status:response.status,ms:Date.now()-started};
        }catch(error){
          return{ok:false,error:String(error?.message||error),detail:String(error?.cause?.message||error?.cause||''),ms:Date.now()-started};
        }
      };
      const [telegramProbe,publicProbe]=await Promise.all([probe('https://api.telegram.org'),probe('https://example.com')]);
      json(res,{ok:true,telegram:telegramProbe,publicInternet:publicProbe});
      return;
    }

    if(req.method==='POST'&&url.pathname==='/api/auto-sale/telegram/test-bot-scenarios'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const chat={id:987654321};
      const from={id:987654321,first_name:'Тест'};
      const scenarios=[
        {name:'start',update:{message:{chat,from,text:'/start'}},expected:'/start',button:true},
        {name:'catalog',update:{message:{chat,from,text:'/catalog'}},expected:'/catalog',button:true},
        {name:'app',update:{message:{chat,from,text:'/app'}},expected:'/app',button:true},
        {name:'help',update:{message:{chat,from,text:'/help'}},expected:'/help',button:true},
        {name:'fallback',update:{message:{chat,from,text:'Здравствуйте'}},expected:'fallback',button:false}
      ];
      const appUrl=process.env.AUTO_SALE_TELEGRAM_APP_URL||'https://autoworld.viiversion.com/';
      const results=[];
      for(const scenario of scenarios){
        const result=await telegram.handleWebhookUpdate(scenario.update,{appUrl,webhookReply:true});
        const payload=result?.webhookPayload||{};
        const webAppUrl=payload?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url||'';
        results.push({name:scenario.name,ok:result?.handled===scenario.expected&&result?.webhookMethod==='sendMessage'&&(!scenario.button||webAppUrl===appUrl),handled:result?.handled,webhookMethod:result?.webhookMethod,webAppUrl});
      }
      const ignored=await telegram.handleWebhookUpdate({update_id:1},{appUrl,webhookReply:true});
      results.push({name:'non_message_ignored',ok:ignored?.ignored===true});
      json(res,{ok:results.every(item=>item.ok),appUrl,results},results.every(item=>item.ok)?200:500);
      return;
    }

    if(req.method==='POST'&&url.pathname==='/api/auto-sale/telegram/test-conversation-delivery'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const state=await store.loadState();
      const team=Array.isArray(state.team)?state.team:[];
      const leads=Array.isArray(state.leads)?state.leads:[];
      let lead=leads.find(item=>/^\d+$/.test(String(item?.telegramUserId||''))&&team.some(member=>member?.active!==false&&String(member?.name||'').trim()===String(item?.manager||'').trim()&&/^\d+$/.test(String(member?.telegramUserId||''))));
      if(!lead)lead=leads.find(item=>/^\d+$/.test(String(item?.telegramUserId||'')));
      if(!lead){json(res,{error:'linked_conversation_not_available'},409);return}
      let manager=team.find(item=>item?.active!==false&&String(item?.name||'').trim()===String(lead.manager||'').trim()&&/^\d+$/.test(String(item?.telegramUserId||'')));
      if(!manager)manager=team.find(item=>item?.active!==false&&/^\d+$/.test(String(item?.telegramUserId||'')));
      if(!manager){json(res,{error:'manager_telegram_not_linked'},409);return}
      const conversationState={...state,leads:leads.map(item=>String(item?.id||'')===String(lead.id||'')?{...item,manager:manager.name,managerTelegramUserId:String(manager.telegramUserId)}:item)};
      try{
        const toClient=await telegram.sendManual(conversationState,{leadId:lead.id,target:'client',text:'Проверка канала: менеджер → клиент.',senderId:String(manager.telegramUserId)});
        const toManager=await telegram.sendManual(conversationState,{leadId:lead.id,target:'manager',text:'Проверка канала: клиент → менеджер.',senderId:String(lead.telegramUserId)});
        json(res,{ok:true,leadId:lead.id,manager:{id:manager.id,name:manager.name},managerToClientMessageId:toClient.messageId,clientToManagerMessageId:toManager.messageId},201);
      }catch(error){
        json(res,{error:String(error?.message||'telegram_send_failed'),telegramDescription:String(error?.telegramDescription||'')},Number(error?.statusCode)||500);
      }
      return;
    }

    if(req.method==='POST'&&url.pathname==='/api/auto-sale/telegram/test-client-delivery'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const state=await store.loadState();
      const lead=(Array.isArray(state.leads)?state.leads:[]).find(item=>/^\d+$/.test(String(item?.telegramUserId||'')));
      if(!lead){json(res,{error:'client_telegram_not_linked'},409);return}
      try{
        const result=await telegram.send(String(lead.telegramUserId),`AUTO МИР · проверка уведомлений клиента\n\nСвязь с вашим заказом настроена. Здесь будут приходить важные изменения по заявке, оплате и этапам доставки автомобиля.`);
        json(res,{ok:true,lead:{id:lead.id,name:lead.name||lead.clientName||''},messageId:result?.message_id||null},201);
      }catch(error){
        json(res,{error:String(error?.message||'telegram_send_failed'),telegramDescription:String(error?.telegramDescription||'')},Number(error?.statusCode)||500);
      }
      return;
    }

    if(req.method==='POST'&&url.pathname==='/api/auto-sale/telegram/test-manager-delivery'){
      if(!hasApiKey(req)){json(res,{error:'unauthorized'},401);return}
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const state=await store.loadState();
      const member=(Array.isArray(state.team)?state.team:[]).find(item=>item?.active!==false&&/^\d+$/.test(String(item?.telegramUserId||'')));
      if(!member){json(res,{error:'manager_telegram_not_linked'},409);return}
      try{
        const result=await telegram.send(String(member.telegramUserId),`AUTO МИР · проверка уведомлений\n\nСвязь с системой настроена. Уведомления менеджеру доставляются через защищённый канал AutoWorld.`);
        json(res,{ok:true,member:{id:member.id,name:member.name,role:member.role},messageId:result?.message_id||null},201);
      }catch(error){
        json(res,{error:String(error?.message||'telegram_send_failed'),telegramDescription:String(error?.telegramDescription||'')},Number(error?.statusCode)||500);
      }
      return;
    }

    if(req.method==='POST'&&url.pathname==='/api/auto-sale/telegram/register-manager'){
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const auth=telegram.validateInitData(req.headers['x-telegram-init-data']);
      if(!auth.ok){json(res,{error:auth.error},401);return}
      const input=await parseJson(req,20_000);
      const memberId=String(input?.memberId||'').trim();
      const memberName=String(input?.memberName||'').trim();
      const state=await store.loadState();
      const team=Array.isArray(state.team)?state.team.map(item=>({...item})):[];
      let index=memberId?team.findIndex(item=>String(item?.id||'')===memberId):-1;
      if(index<0&&memberName)index=team.findIndex(item=>String(item?.name||'').trim()===memberName);
      if(index<0){json(res,{error:'manager_team_member_required',team:team.filter(item=>item?.active!==false&&['Менеджер','Директор','Администратор'].includes(String(item?.role||''))).map(item=>({id:item.id,name:item.name,role:item.role}))},409);return}
      const telegramUserId=String(auth.user.id);
      const username=String(auth.user.username||'').replace(/^@/,'');
      team[index]={...team[index],telegramUserId,telegramUsername:username,telegramFirstName:String(auth.user.first_name||''),telegramLastName:String(auth.user.last_name||''),telegramLinkedAt:new Date().toISOString()};
      const replaced=await store.replaceState({...state,team},{expectedRevision:state.revision});
      if(replaced.status!==200){json(res,replaced.data,replaced.status);return}
      json(res,{ok:true,telegramUserId,username,member:{id:team[index].id,name:team[index].name,role:team[index].role},revision:replaced.data.revision});
      return;
    }

    if(req.method==='POST'&&telegram.isWebhookPath(url.pathname)){
      const input=await parseJson(req,100_000);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      try{
        const result=await telegram.handleWebhookUpdate(input,{appUrl:process.env.AUTO_SALE_TELEGRAM_APP_URL||'https://bba01u6g86lg2q49p34d.containers.yandexcloud.net/',webhookReply:true});
        if(result?.webhookMethod&&result?.webhookPayload){json(res,{method:result.webhookMethod,...result.webhookPayload},200);return}
        json(res,result,200);
      }catch(error){
        const status=Number(error?.statusCode)||500;
        json(res,{error:String(error?.message||'telegram_webhook_failed'),telegramDescription:String(error?.telegramDescription||''),detail:String(error?.cause?.message||error?.cause||'')},status);
      }
      return;
    }
    if(url.pathname==='/api/auto-sale/telegram/message'&&req.method==='POST'){
      if(!telegram.enabled){json(res,{error:'telegram_not_configured'},503);return}
      const auth=telegram.validateInitData(req.headers['x-telegram-init-data']);
      if(!auth.ok){json(res,{error:auth.error},401);return}
      const input=await parseJson(req,50_000);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      try{
        const state=await store.loadState();
        const result=await telegram.sendManual(state,{
          leadId:input.leadId,
          target:input.target,
          text:input.text,
          senderId:auth.user.id
        });
        json(res,result,201);
      }catch(error){
        const status=Number(error?.statusCode)||500;
        json(res,{error:String(error?.message||'telegram_send_failed')},status);
      }
      return;
    }
    if(url.pathname==='/api/auto-sale/media'&&req.method==='POST'){
      if(!authorized(req)){json(res,{error:'unauthorized'},401);return}
      if(!mediaBucket){json(res,{error:'media_storage_not_configured'},503);return}
      const input=await parseJson(req,3_000_000);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      const result=await media.upload({
        carId:input.carId,
        category:input.category,
        dataUrl:input.dataUrl,
        fileName:input.fileName
      });
      json(res,{ok:true,...result},201);
      return;
    }
    if(url.pathname==='/api/auto-sale/media'&&req.method==='DELETE'){
      if(!authorized(req)){json(res,{error:'unauthorized'},401);return}
      if(!mediaBucket){json(res,{error:'media_storage_not_configured'},503);return}
      const input=await parseJson(req,50_000);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      const result=await media.remove(input.url);
      json(res,result);
      return;
    }
    if(url.pathname.startsWith('/api/')){
      json(res,{error:'not_found'},404);
      return;
    }
    await staticFile(res,url);
  }catch(error){
    console.error('AUTO SALE Yandex request failed',error);
    const status=Number(error?.statusCode)||500;
    const code=String(error?.message||'internal_error');
    json(res,{error:status===413?(code==='image_too_large'?'image_too_large':'payload_too_large'):status===400?code:status===503?code:'internal_error'},status);
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`AUTO SALE Yandex listening on ${port}`));

const shutdown=signal=>{
  console.log(`Received ${signal}`);
  server.close(async()=>{
    await store.close();
    process.exit(0);
  });
  setTimeout(()=>process.exit(1),10000).unref();
};
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
