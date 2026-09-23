import {readFile,writeFile} from 'node:fs/promises';

const SOURCE_PATH=process.env.SOURCE_PATH||'data/autoworld-georgia-recent/cars.json';
const OUTPUT_PATH=process.env.OUTPUT_PATH||'data/autoworld-georgia-recent/catalog-import.json';
const AUDIT_PATH=process.env.AUDIT_PATH||OUTPUT_PATH.replace(/\.json$/,'-audit.json');
const STATE_URL=process.env.AUTO_SALE_STATE_URL||'https://auto-sale-demo.viiversion.com/api/auto-sale/state';
const DRY_RUN=/^(1|true|yes)$/i.test(String(process.env.DRY_RUN||''));

const clean=value=>String(value??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const unique=list=>[...new Set((Array.isArray(list)?list:[]).filter(Boolean))];

function titleFromRaw(raw){
  const lines=String(raw||'').split(/\r?\n/).map(clean).filter(Boolean);
  const joined=[];
  for(let i=0;i<lines.length;i++){
    for(let n=1;n<=3&&i+n<=lines.length;n++)joined.push(lines.slice(i,i+n).join(' '));
  }
  for(const candidate of joined){
    const m=candidate.match(/([A-Za-zА-Яа-я][A-Za-zА-Яа-я0-9()\-+. ]{1,60}?)\s+(0?[1-9]|1[0-2])\/(20\d{2}|\d{2})\s*г?\.?/i);
    if(m){
      let name=clean(m[1]).replace(/^.*?[🌟*]\s*/u,'').replace(/\bSou\s+l\b/i,'Soul');
      name=name.replace(/^(?:на|до)\s+\d{1,2}[./]\d{1,2}\s+/i,'');
      const parts=name.split(/\s+/);
      if(parts.length>=2){
        const year=Number(m[3].length===2?'20'+m[3]:m[3]);
        return{title:`${name} ${m[2]}/${year}`,brand:parts[0],model:parts.slice(1).join(' '),year};
      }
    }
  }
  for(const candidate of joined){
    const m=candidate.match(/([A-Za-zА-Яа-я][A-Za-zА-Яа-я0-9()\-+. ]{1,60}?)\s+(20\d{2})\s*г?\.?/i);
    if(m){
      let name=clean(m[1]).replace(/\bSou\s+l\b/i,'Soul');
      const parts=name.split(/\s+/);
      if(parts.length>=2)return{title:`${name} ${m[2]}`,brand:parts[0],model:parts.slice(1).join(' '),year:Number(m[2])};
    }
  }
  return{title:'',brand:'',model:'',year:0};
}

function field(raw,label,pattern){
  const text=String(raw||'');
  const re=pattern||new RegExp(label+'[\\s:–—-]*([^\\n]+)','i');
  const m=text.match(re);
  return clean(m?.[1]||'').replace(/^[🔺🔹♦️]+/u,'').trim();
}

function normalizeDrive(value,raw){
  const text=(clean(value)+' '+String(raw||'')).toUpperCase().replace(/АWD/g,'AWD');
  if(/\b4WD\b/.test(text))return'4WD';
  if(/\bAWD\b/.test(text)||/ПОЛН/.test(text))return'AWD';
  if(/\bRWD\b/.test(text)||/ЗАДН/.test(text))return'RWD';
  if(/\bFWD\b/.test(text)||/ПЕРЕДН/.test(text))return'FWD';
  return clean(value)||'FWD';
}

function extractMileage(car){
  const raw=String(car.rawText||'');
  const m=raw.match(/Пробег[\s\S]{0,80}?(\d[\d\s]*(?:ml|mi|км|km))/i);
  const value=clean(m?.[1]||car.mileage||'').replace(/\s+/g,' ');
  const n=value.match(/(\d[\d\s]*)\s*(ml|mi|км|km)/i);
  if(!n)return value;
  const amount=Number(n[1].replace(/\D/g,''))||0;
  const unit=/^(ml|mi)$/i.test(n[2])?'mi':'км';
  return amount?new Intl.NumberFormat('ru-RU').format(amount)+' '+unit:value;
}

function extractBid(car){
  if(Number(car.estimatedBidUsd)>0)return Number(car.estimatedBidUsd);
  const raw=String(car.rawText||'');
  const m=raw.match(/\+\s*-\s*([0-9][0-9\s]{3,6})[\s\S]{0,80}\(расч[её]тная ставка\)/i);
  return m?Number(m[1].replace(/\D/g,''))||0:0;
}

const BRAND_MAP=new Map([
  ['KIA','Kia'],['HYUNDAI','Hyundai'],['TOYOTA','Toyota'],['NISSAN','Nissan'],
  ['HONDA','Honda'],['FORD','Ford'],['AUDI','Audi'],['ACURA','Acura'],
  ['VW','Volkswagen'],['MB','Mercedes-Benz'],['MERSEDES','Mercedes-Benz']
]);

function canonicalVehicleName(brand,model,rawTitle,vin){
  let b=clean(brand),m=clean(model),title=clean(rawTitle),v=clean(vin).toUpperCase();
  const mapped=BRAND_MAP.get(b.toUpperCase());
  if(mapped)b=mapped;

  if(/^пришел$/i.test(b)&&/SUBARU\s+Crosstrek/i.test(title)){b='Subaru';m='Crosstrek'}
  if(/^Trailblazer$/i.test(b)&&/^KL79/i.test(v)){b='Chevrolet';m='Trailblazer'}
  if(/^Eclipse$/i.test(b)&&/^JA4/i.test(v)){b='Mitsubishi';m='Eclipse Cross'}
  if(/^X1$/i.test(b)&&/^WBX/i.test(v)){b='BMW';m=('X1 '+m).trim()}
  if(/^GLB$/i.test(b)&&/^W1N/i.test(v)){b='Mercedes-Benz';m=('GLB '+m).trim()}
  if(/^Range$/i.test(b)&&/^SAL/i.test(v)){b='Land Rover';m=('Range '+m).trim()}

  const exactModel=new Map([
    ['ELANTRA','Elantra'],['SOUL','Soul']
  ]);
  if(exactModel.has(m))m=exactModel.get(m);
  return{brand:b,model:m};
}

function sourceQualityReason(source){
  const title=titleFromRaw(source.rawText);
  const vin=clean(source.vin).toUpperCase();
  const photos=unique(source.photos).filter(url=>/^https:\/\/storage\.yandexcloud\.net\//i.test(url));
  if(!vin||vin.length!==17)return'invalid_or_missing_vin';
  if(!title.brand||!title.model)return'missing_vehicle_title';
  if(Number(title.year)<2000||Number(title.year)>2030)return'invalid_year';
  if(!photos.length)return'missing_recovered_photos';
  return'';
}

function normalizeCar(source){
  const title=titleFromRaw(source.rawText);
  const rawBrand=clean(title.brand||source.brand);
  const rawModel=clean(title.model||source.model).replace(/\bSou\s+l\b/i,'Soul');
  const year=Number(title.year||source.year)||0;
  const vin=clean(source.vin).toUpperCase();
  const photos=unique(source.photos).filter(url=>/^https:\/\/storage\.yandexcloud\.net\//i.test(url));
  const names=canonicalVehicleName(rawBrand,rawModel,title.title||source.title,vin);
  const brand=names.brand,model=names.model;
  if(!vin||vin.length!==17||!brand||!model||year<2000||year>2030||!photos.length)return null;

  const engine=clean(source.engine)||field(source.rawText,'Двигатель');
  const transmission=clean(source.transmission)||field(source.rawText,'Коробка');
  const interior=clean(source.interior)||field(source.rawText,'Салон');
  const damage=clean(source.damage)||field(source.rawText,'Повреждения?');
  const safetyText=clean(source.safety)||field(source.rawText,'Безопасность');
  const trim=clean(source.trim)||field(source.rawText,'комплектация');
  const bid=extractBid(source);
  const priceRub=Number(source.priceRub)||0;
  const customsRub=Number(source.customsRub)||0;
  const drive=normalizeDrive(source.drive,source.rawText);
  const highlights=[
    trim&&`Комплектация: ${trim}`,
    vin&&`VIN: ${vin}`,
    source.lot&&`Лот: ${clean(source.lot)}`,
    source.auctionDate&&`Торги: ${clean(source.auctionDate)}`
  ].filter(Boolean);
  const safety=[
    safetyText&&`Безопасность: ${safetyText.replace(/^["']|["']$/g,'')}`,
    damage&&`Повреждения: ${damage.replace(/^["']|["']$/g,'')}`
  ].filter(Boolean);

  return{
    id:`AWG-${source.sourcePostId}`,
    brand,
    model,
    year,
    mileage:extractMileage(source)||'Пробег уточняется',
    engine:engine||'Двигатель уточняется',
    drive,
    auction:'AutoWorld Georgia',
    price:0,
    priceRub,
    estimatedBidUsd:bid,
    delivery:'Срок по запросу',
    tag:trim||'AutoWorld',
    image:photos[0],
    interiorPhotos:[],
    otherPhotos:photos.slice(1,7),
    active:true,
    source:'AutoWorld_Georgia',
    sourcePostId:String(source.sourcePostId||''),
    sourceUrl:clean(source.sourceUrl),
    publishedAt:clean(source.publishedAt),
    vin,
    trim,
    transmission,
    interior,
    damage,
    safety,
    auctionDate:clean(source.auctionDate),
    customsRub,
    lot:clean(source.lot),
    calculationDate:clean(source.calculationDate),
    rawSourceTitle:title.title||clean(source.title),
    power:Number(source.powerHp)>0?`${Number(source.powerHp)} л.с.`:'—',
    seats:interior||'—',
    efficiency:clean(source.consumption)||'—',
    highlights,
    bestFor:'Данные автомобиля импортированы из публичного канала AutoWorld Georgia. Перед заказом параметры и актуальность предложения подтверждаются менеджером.'
  };
}

function dedupe(list){
  const byVin=new Map();
  for(const car of list){
    if(!car)continue;
    const before=byVin.get(car.vin);
    if(!before||Number(car.sourcePostId)>Number(before.sourcePostId))byVin.set(car.vin,car);
  }
  return[...byVin.values()].sort((a,b)=>Number(b.sourcePostId)-Number(a.sourcePostId));
}

async function fetchState(){
  const r=await fetch(STATE_URL,{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error(`state_read_failed_${r.status}`);
  return r.json();
}

async function putState(state,catalog){
  const payload={
    baseRevision:Number(state.revision)||0,
    leads:state.leads||[],quotes:state.quotes||[],orders:state.orders||[],
    notes:state.notes||{},team:state.team||[],catalog
  };
  return fetch(STATE_URL,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
}

async function main(){
  const source=JSON.parse(await readFile(SOURCE_PATH,'utf8'));
  const normalizedRows=source.map(item=>({source:item,car:normalizeCar(item)}));
  const imported=dedupe(normalizedRows.map(x=>x.car));
  if(!imported.length)throw new Error('no_valid_imported_cars');
  await writeFile(OUTPUT_PATH,JSON.stringify(imported,null,2)+'\n','utf8');

  const brandCounts={};
  for(const car of imported)brandCounts[car.brand]=(brandCounts[car.brand]||0)+1;
  const skipped=normalizedRows.filter(x=>!x.car).map(x=>({
    sourcePostId:String(x.source.sourcePostId||''),
    sourceUrl:clean(x.source.sourceUrl),
    title:titleFromRaw(x.source.rawText).title||clean(x.source.title),
    vin:clean(x.source.vin),
    reason:sourceQualityReason(x.source)
  }));
  const audit={
    sourceCount:source.length,
    normalizedCount:imported.length,
    skippedCount:skipped.length,
    pricedRub:imported.filter(x=>Number(x.priceRub)>0).length,
    pricedBid:imported.filter(x=>Number(x.estimatedBidUsd)>0).length,
    noPrice:imported.filter(x=>!Number(x.priceRub)&&!Number(x.estimatedBidUsd)).length,
    withPhotos:imported.filter(x=>x.image).length,
    brandCounts,
    skipped
  };
  await writeFile(AUDIT_PATH,JSON.stringify(audit,null,2)+'\n','utf8');
  console.log('AUTOWORLD_NORMALIZE_OK',JSON.stringify(audit));
  if(DRY_RUN)return;

  for(let attempt=0;attempt<8;attempt++){
    const state=await fetchState();
    const importedIds=new Set(imported.map(x=>x.id));
    const importedVins=new Set(imported.map(x=>x.vin));
    const existing=(state.catalog||[]).filter(car=>
      !importedIds.has(String(car.id||'')) &&
      !(String(car.source||'')==='AutoWorld_Georgia'&&importedVins.has(String(car.vin||'').toUpperCase()))
    );
    const catalog=[...existing,...imported];
    const response=await putState(state,catalog);
    if(response.ok){
      const data=await response.json();
      console.log('AUTOWORLD_CATALOG_IMPORT_OK',JSON.stringify({
        imported:imported.length,
        previousCatalog:(state.catalog||[]).length,
        catalog:catalog.length,
        revision:data.revision
      }));
      return;
    }
    const body=await response.text();
    if(response.status!==409)throw new Error(`state_write_failed_${response.status}_${body.slice(0,500)}`);
    await new Promise(r=>setTimeout(r,250));
  }
  throw new Error('state_write_conflict_exhausted');
}

main().catch(error=>{console.error(error);process.exit(1)});
