import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=msg=>{throw new Error(msg)};
const manifest=JSON.parse(await readFile(path.join(root,'assets/fleet-manifest.json'),'utf8'));
const report=JSON.parse(await readFile(path.join(root,'assets/sync-report.json'),'utf8'));
const html=await readFile(path.join(root,'preview/v2/index.html'),'utf8');
const js=await readFile(path.join(root,'preview/v2/app.js'),'utf8');
const css=await readFile(path.join(root,'preview/v2/styles.css'),'utf8');
const fleet=manifest.fleet||[];

if(fleet.length!==89) fail(`Expected 89 vehicles, got ${fleet.length}`);
if(report.vehicleCount!==89) fail(`Sync report has ${report.vehicleCount} vehicles`);
if(new Set(fleet.map(v=>v.id)).size!==fleet.length) fail('Duplicate vehicle ids');
const badPrice=fleet.filter(v=>!Number.isFinite(v.dailyVnd)||v.dailyVnd<=0);
if(badPrice.length) fail(`Invalid daily price: ${badPrice.map(v=>v.id).join(', ')}`);
const noPhotos=fleet.filter(v=>!Array.isArray(v.photos)||v.photos.length===0);
if(noPhotos.length) fail(`Vehicles without local photos: ${noPhotos.map(v=>v.id).join(', ')}`);
let checkedPhotos=0;
for(const v of fleet){
  if(!v.sourceUrl?.startsWith('https://uniqmoto.com/ru/rentals/')) fail(`Unexpected source: ${v.sourceUrl}`);
  for(const photo of v.photos){
    if(!photo.startsWith('./assets/fleet/')) fail(`Non-local manifest path: ${photo}`);
    await access(path.join(root,photo.replace(/^\.\//,'')));
    checkedPhotos++;
  }
}
await access(path.join(root,'assets/brand/uniq-logo.svg'));
if(!html.includes('../../assets/fleet-manifest.js')) fail('Fleet manifest is not locally connected');
if(!html.includes('./styles.css')||!html.includes('./app.js')) fail('Local v2 resources missing');
for(const marker of ["['client','Клиент']","['team','Сотрудник']","['owner','Владелец']",'function clientHome()','function teamHome()','function ownerHome()','function catalogPage()','function vehiclePage()','function bookingsPage()','function contactsPage()','openBooking','data-booking-status','data-fleet-status','localStorage']) if(!js.includes(marker)) fail(`Missing v2 marker: ${marker}`);
new Function(js);
if(!css.includes('--green:#20e38f')||!css.includes('--bg:#080b09')) fail('Approved black/green palette missing');
console.log(JSON.stringify({vehicles:fleet.length,photos:checkedPhotos,syncFailures:report.failureCount,roles:['client','team','owner'],pages:['home','catalog','vehicle','bookings','contacts','employee-dashboard','owner-dashboard'],syntax:'ok',localPaths:'ok',palette:'ok'},null,2));
