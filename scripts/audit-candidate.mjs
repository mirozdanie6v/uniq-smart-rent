import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=msg=>{throw new Error(msg)};
const read=rel=>readFile(path.join(root,rel),'utf8');
const manifest=JSON.parse(await read('assets/fleet-manifest.json'));
const report=JSON.parse(await read('assets/sync-report.json'));
const index=await read('index.html');
const app=await read('public/app-v2.js');
const css=await read('styles.css');
const build=await read('scripts/build.mjs');
const fleet=manifest.fleet||[];

if(fleet.length!==89) fail(`Expected 89 vehicles, got ${fleet.length}`);
if(fleet.filter(v=>v.type==='car').length!==7) fail('Expected 7 cars in synchronized fleet');
if(!fleet.some(v=>v.type==='motorcycle')||!fleet.some(v=>v.type==='scooter')) fail('Motorcycle/scooter classification is incomplete');
if(report.vehicleCount!==89||report.imageCount<400||report.failureCount!==0) fail(`Asset sync gate failed: ${JSON.stringify(report)}`);
if(new Set(fleet.map(v=>v.id)).size!==fleet.length) fail('Duplicate vehicle ids');
const badPrice=fleet.filter(v=>!Number.isFinite(v.dailyVnd)||v.dailyVnd<=0);
if(badPrice.length) fail(`Invalid daily price: ${badPrice.map(v=>v.id).join(', ')}`);
const noPhotos=fleet.filter(v=>!Array.isArray(v.photos)||v.photos.length===0);
if(noPhotos.length) fail(`Vehicles without photos: ${noPhotos.map(v=>v.id).join(', ')}`);
let checkedPhotos=0;
for(const v of fleet){
  if(!v.sourceUrl?.startsWith('https://uniqmoto.com/ru/rentals/')) fail(`Unexpected vehicle source ${v.sourceUrl}`);
  for(const photo of v.photos){
    if(!photo.startsWith('./assets/fleet/')) fail(`Non-local photo path ${photo}`);
    await access(path.join(root,photo.replace(/^\.\//,'')));
    checkedPhotos++;
  }
}
if(checkedPhotos!==report.imageCount) fail(`Manifest photo count ${checkedPhotos} != sync report ${report.imageCount}`);
await access(path.join(root,'public/brand/uniq-logo.svg'));
for(const marker of ['./assets/fleet-manifest.js','./app-v2.js','./styles.css']) if(!index.includes(marker)) fail(`Root index missing ${marker}`);
for(const marker of [
  "client: [['home','Главная']","employee: [['dashboard','Рабочий стол']","owner: [['overview','Обзор']",
  'function clientHome()','function catalog()','function vehicleDetail()','function requestsPage()','function contacts()',
  'function employeeDashboard()','function employeeFleet()','function handover()',
  'function ownerOverview()','function ownerFleet()','function systemPage()','function openBooking(id)',
  "sessionStorage.getItem('uniq-role-v2')",'[data-status]','[data-fleet-state]'
]) if(!app.includes(marker)) fail(`Candidate marker missing: ${marker}`);
if(app.includes('localStorage')) fail('Candidate app must keep demo operations session-scoped');
new Function(app);
if(!css.includes('--green:#20e38f')||!css.includes('--bg:#070a09')) fail('Approved black-green palette missing');
if(!build.includes("access(path.join(root, 'assets'))")||!build.includes("access(path.join(root, 'public'))")) fail('Build does not copy local assets/public candidate files');
for(const rel of ['dist/index.html','dist/app-v2.js','dist/brand/uniq-logo.svg','dist/assets/fleet-manifest.js']) await access(path.join(root,rel));
const sample=fleet.find(v=>v.photos?.length)?.photos?.[0];
if(sample) await access(path.join(root,'dist',sample.replace(/^\.\//,'')));
console.log(JSON.stringify({vehicles:fleet.length,cars:7,photos:checkedPhotos,syncFailures:report.failureCount,roles:['client','employee','owner'],clientPages:['home','catalog','vehicle','requests','contacts'],employeePages:['dashboard','requests','fleet','handover'],ownerPages:['overview','requests','fleet','system'],syntax:'ok',dist:'ok',localAssets:'ok',palette:'ok',storage:'session'},null,2));
