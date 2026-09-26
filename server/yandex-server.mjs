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
  'access-control-allow-headers':'content-type,x-auto-sale-key,x-telegram-init-data',
  'access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS'
};
const json=(res,data,status=200)=>{
  const body=JSON.stringify(data);
  res.writeHead(status,{...apiHeaders,'content-length':Buffer.byteLength(body)});
  res.end(body);
};
const authorized=req=>{
  if(publicDemoWrite)return true;
  const supplied=String(req.headers['x-auto-sale-key']||'');
  const expected=Buffer.from(apiKey);
  const actual=Buffer.from(supplied);
  return expected.length===actual.length&&expected.length>0&&timingSafeEqual(expected,actual);
};
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
    res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':file.endsWith('index.html')?'no-cache':'public, max-age=300'});
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
      const before=telegram.enabled?await store.loadState():null;
      const result=await syncYdbState(store,input);
      if(result.status>=200&&result.status<300&&telegram.enabled){
        try{
          const deliveries=await telegram.notifyStateChanges(before,{...input,initialized:true});
          if(deliveries.some(x=>!x.ok))console.warn('AUTO SALE Telegram partial delivery',deliveries.filter(x=>!x.ok));
        }catch(error){console.error('AUTO SALE Telegram state notification failed',error)}
      }
      json(res,result.data,result.status);
      return;
    }
    if(req.method==='POST'&&telegram.isWebhookPath(url.pathname)){
      const input=await parseJson(req,100_000);
      if(!input||typeof input!=='object'){json(res,{error:'invalid_json'},400);return}
      try{
        const result=await telegram.handleWebhookUpdate(input,{appUrl:process.env.AUTO_SALE_TELEGRAM_APP_URL||'https://bba01u6g86lg2q49p34d.containers.yandexcloud.net/'});
        json(res,result,200);
      }catch(error){
        const status=Number(error?.statusCode)||500;
        json(res,{error:String(error?.message||'telegram_webhook_failed')},status);
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
