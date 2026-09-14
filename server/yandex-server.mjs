import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import {createPostgresStateStore} from './pg-state.mjs';

const rootDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const distDir=path.join(rootDir,'dist');
const schemaPath=path.join(rootDir,'yandex','postgres','001_init.sql');
const port=Number(process.env.PORT||8080);
const databaseUrl=String(process.env.DATABASE_URL||'').trim();
if(!databaseUrl)throw new Error('DATABASE_URL is required');
const store=await createPostgresStateStore({databaseUrl,schemaPath});
const json=(res,data,status=200)=>{const body=JSON.stringify(data);res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(body)});res.end(body)};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
async function staticFile(res,url){let rel;try{rel=decodeURIComponent(url.pathname)}catch{rel='/'}rel=rel==='/'?'index.html':rel.replace(/^\/+/, '');let file=path.resolve(distDir,rel);if(!file.startsWith(`${distDir}${path.sep}`)&&file!==path.join(distDir,'index.html')){res.writeHead(403);res.end('Forbidden');return}try{const info=await stat(file);if(info.isDirectory())file=path.join(file,'index.html');const body=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':file.endsWith('index.html')?'no-cache':'public, max-age=300'});res.end(body)}catch{const body=await readFile(path.join(distDir,'index.html'));res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});res.end(body)}}

const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);if(url.pathname==='/api/health'){await store.ping();json(res,{ok:true,service:'auto-sale-yandex',persistence:'postgresql',schemaVersion:1,writeMode:'disabled-until-auth'});return}if(url.pathname==='/api/auto-sale/state'&&req.method==='GET'){json(res,await store.loadState());return}if(url.pathname.startsWith('/api/')){json(res,{error:'not_found'},404);return}await staticFile(res,url)}catch(error){console.error('AUTO SALE Yandex request failed',error);json(res,{error:'internal_error'},500)}});
server.listen(port,'0.0.0.0',()=>console.log(`AUTO SALE Yandex listening on ${port}`));
const shutdown=signal=>{console.log(`Received ${signal}`);server.close(async()=>{await store.close();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()};
process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
