import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE='https://uniqmoto.com';
const OUT=path.resolve('assets');
const FLEET_OUT=path.join(OUT,'fleet');
const UA='Mozilla/5.0 (compatible; UNIQSmartRentAssetSync/2.0)';
const TIMEOUT=12000;
const uniq=a=>[...new Set(a.filter(Boolean))];
const clean=v=>String(v??'').replace(/&nbsp;/g,' ').replace(/&#x2F;/g,'/').replace(/&amp;/g,'&').replace(/\\u0026|\u0026/g,'&').replace(/\\\//g,'/');
const strip=h=>clean(h).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();

async function fetchTimed(url, opts={}){
  const response=await fetch(url,{...opts,signal:AbortSignal.timeout(TIMEOUT),headers:{'user-agent':UA,'accept-language':'ru-RU,ru;q=0.9,en;q=0.8',...(opts.headers||{})}});
  if(!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response;
}
async function text(url){return (await fetchTimed(url)).text()}
function links(html){const n=clean(html);return uniq(n.match(/\/ru\/rentals\/(?:motorcycles|cars)\/[a-z0-9-]+/gi)||[]).map(x=>new URL(x,SITE).href)}
function title(html,fallback){const m=clean(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);return strip(m?.[1]||fallback)}
function vndAfter(t,label){const i=t.toLowerCase().indexOf(label.toLowerCase());if(i<0)return 0;const m=t.slice(i,i+650).match(/(?:≈\s*)?([0-9][0-9.\s]{2,})\s*₫/);return m?Number(m[1].replace(/[^0-9]/g,'')):0}
function spec(t,label){const re=new RegExp(`${label}\\s+([^|]{1,55}?)(?=\\s+(?:Weight|Cruise speed|Fuel use|Capacity|Color|Цена|Депозит|Неделя|Месяц|Профиль|Engine)|$)`,'i');return t.match(re)?.[1]?.trim()||''}
function imageUrls(html){const n=clean(html),out=[];for(const m of n.matchAll(/url=(https?%3A%2F%2F[^&"'<>]+?\.(?:jpg|jpeg|png|webp))/gi)){try{out.push(decodeURIComponent(m[1]))}catch{}}for(const m of n.matchAll(/https:\/\/ahodwykbyoytwtpfoxgi\.supabase\.co\/storage\/v1\/object\/public\/public-assets\/vehicles\/[^"'<>\\ ]+?\.(?:jpg|jpeg|png|webp)/gi))out.push(m[0]);for(const m of n.matchAll(/https:\/\/uniqmoto\.com\/assets\/[^"'<>\\ ]+?\.(?:jpg|jpeg|png|webp)/gi))out.push(m[0]);return uniq(out.map(x=>clean(x).replace(/\\/g,'')))}
function ext(url,ct=''){const e=path.extname(new URL(url).pathname).toLowerCase();if(['.jpg','.jpeg','.png','.webp','.avif'].includes(e))return e==='.jpeg'?'.jpg':e;if(ct.includes('webp'))return'.webp';if(ct.includes('png'))return'.png';return'.jpg'}
async function saveImage(url,base){const r=await fetchTimed(url,{headers:{referer:`${SITE}/ru`}});const ct=r.headers.get('content-type')||'';if(!ct.startsWith('image/'))throw new Error(`Not image ${ct}`);const target=base+ext(url,ct);await writeFile(target,Buffer.from(await r.arrayBuffer()));return './'+target.replaceAll('\\','/')}
async function mapLimit(items,limit,fn){const results=new Array(items.length);let next=0;async function worker(){while(true){const i=next++;if(i>=items.length)return;results[i]=await fn(items[i],i)}}await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));return results}

async function main(){
  await mkdir(OUT,{recursive:true});await rm(FLEET_OUT,{recursive:true,force:true});await mkdir(FLEET_OUT,{recursive:true});
  const cat=await Promise.all([text(`${SITE}/ru/rentals/motorcycles`),text(`${SITE}/ru/rentals/cars`)]);
  let pages=uniq(cat.flatMap(links));if(pages.length<70)pages=uniq([...pages,...links(await text(`${SITE}/ru`))]);
  console.log(`Discovered ${pages.length} detail pages`);if(pages.length<70)throw new Error(`Incomplete catalog discovery: ${pages.length}`);
  const failures=[];let imageCount=0;
  const fleet=(await mapLimit(pages,8,async(sourceUrl,i)=>{
    const pageSlug=new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
    try{
      const html=await text(sourceUrl),plain=strip(html),name=title(html,pageSlug.replaceAll('-',' '));
      const urls=imageUrls(html),dir=path.join(FLEET_OUT,pageSlug);await mkdir(dir,{recursive:true});const photos=[];
      for(let p=0;p<urls.length;p++)try{photos.push(await saveImage(urls[p],path.join(dir,String(p+1).padStart(2,'0'))));imageCount++}catch(e){failures.push({sourceUrl,image:urls[p],error:String(e.message||e)})}
      console.log(`${i+1}/${pages.length} ${name}: ${photos.length}/${urls.length} photos`);
      const year=plain.match(/\b(20\d{2})\b/)?.[1];
      return{id:pageSlug,slug:pageSlug,sourceUrl,type:sourceUrl.includes('/cars/')?'car':(/Scooter/i.test(plain)?'scooter':'motorcycle'),title:name,year:year?Number(year):null,engine:spec(plain,'Engine'),weight:spec(plain,'Weight'),cruiseSpeed:spec(plain,'Cruise speed'),fuelUse:spec(plain,'Fuel use'),capacity:spec(plain,'Capacity'),dailyVnd:vndAfter(plain,'Цена в день'),depositVnd:vndAfter(plain,'Депозит'),weeklyVnd:vndAfter(plain,'Неделя'),monthlyVnd:vndAfter(plain,'Месяц'),photos,sourcePhotoCount:urls.length};
    }catch(e){failures.push({sourceUrl,error:String(e.message||e)});return null}
  })).filter(Boolean);
  fleet.sort((a,b)=>a.type.localeCompare(b.type)||a.title.localeCompare(b.title));const generatedAt=new Date().toISOString();
  const summary={generatedAt,vehicleCount:fleet.length,imageCount,failureCount:failures.length};
  await writeFile(path.join(OUT,'fleet-manifest.js'),`window.UNIQ_FLEET=${JSON.stringify(fleet)};\nwindow.UNIQ_ASSET_SYNC=${JSON.stringify(summary)};\n`,'utf8');
  await writeFile(path.join(OUT,'fleet-manifest.json'),JSON.stringify({generatedAt,fleet},null,2),'utf8');
  await writeFile(path.join(OUT,'sync-report.json'),JSON.stringify({...summary,failures},null,2),'utf8');
  console.log(summary);if(fleet.length<70||imageCount<50)throw new Error(`Quality gate failed: ${fleet.length} vehicles, ${imageCount} images`);
}
main().catch(e=>{console.error(e);process.exit(1)});
