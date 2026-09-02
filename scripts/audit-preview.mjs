import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd();
const fail=msg=>{throw new Error(msg)};
const manifest=JSON.parse(await readFile(path.join(root,'assets/fleet-manifest.json'),'utf8'));
const report=JSON.parse(await readFile(path.join(root,'assets/sync-report.json'),'utf8'));
const html=await readFile(path.join(root,'preview/full-pages.html'),'utf8');

const fleet=manifest.fleet||[];
if(fleet.length!==89) fail(`Expected 89 vehicles, got ${fleet.length}`);
if(report.vehicleCount!==89) fail(`Report expected 89 vehicles, got ${report.vehicleCount}`);
const ids=new Set(fleet.map(v=>v.id));
if(ids.size!==fleet.length) fail('Duplicate vehicle ids found');
const invalidPrice=fleet.filter(v=>!Number.isFinite(v.dailyVnd)||v.dailyVnd<=0);
if(invalidPrice.length) fail(`Invalid daily price for: ${invalidPrice.map(v=>v.id).join(', ')}`);
const noPhotos=fleet.filter(v=>!Array.isArray(v.photos)||v.photos.length===0);
if(noPhotos.length) fail(`Vehicles without local photos: ${noPhotos.map(v=>v.id).join(', ')}`);
for(const v of fleet){
  if(!v.sourceUrl?.startsWith('https://uniqmoto.com/ru/rentals/')) fail(`Unexpected source URL: ${v.sourceUrl}`);
  for(const photo of v.photos){
    const rel=photo.replace(/^\.\//,'');
    await access(path.join(root,rel));
  }
}
await access(path.join(root,'assets/brand/uniq-logo.svg'));
const required=[
  'data-role="client"','data-role="team"','data-role="owner"',
  "function clientHome()","function teamHome()","function ownerHome()",
  "function catalog()","function bookingsPage()","function contacts()",
  'id="bookingForm"','data-status=','data-fleet=','localStorage'
];
for(const marker of required) if(!html.includes(marker)) fail(`Preview marker missing: ${marker}`);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
if(!scripts.length) fail('No inline preview script found');
for(const source of scripts) new Function(source);
console.log(JSON.stringify({vehicles:fleet.length,images:report.imageCount,syncFailures:report.failureCount,roles:['client','team','owner'],previewSyntax:'ok',localAssetPaths:'ok'},null,2));
