const verifiedPhotos=[
{id:'bmw-x5-22',model:'BMW X5 xDrive40i',aliases:['BMW X5 xDrive40i','X5 xDrive40i'],year:2022,source:'Transparent Motorcars',image:'https://zopsoftware-asset.b-cdn.net/upload/6d9bc03503dcde3e22a3be5139dc9a8b/1703619827_61ca3b02e9021161cc58.jpg'},
{id:'tesla-y-23',model:'Tesla Model Y Long Range',aliases:['Tesla Model Y Long Range','Model Y Long Range'],year:2023,source:'Akins',image:'https://www.akinsjeepram.com/assets/stock/expanded/transparent/1280/2023tss02_1280/2023tss020004_1280_05.png?bg-color=FFFFFF&timestamp=0001-01-01T00%3A00%3A00&width=400'},
{id:'rav4-22',model:'Toyota RAV4 XLE Premium',aliases:['Toyota RAV4 XLE Premium','RAV4 XLE Premium'],year:2022,source:'Aztec Motors',image:'https://www.aztecmotorsinc.com/uploads/autos/6875/2022_TOYOTA_RAV4_6875_52973.aiimg-h1200.jpg'},
{id:'mustang-mach-e',model:'Ford Mustang Mach-E',aliases:['Ford Mustang Mach-E','Mustang Mach-E'],year:2022,source:'Wikimedia Commons · 2022 Ford Mustang Mach-E',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/2022_Ford_Mustang_Mach-E.jpg?width=1280'},
{id:'gle-21',model:'Mercedes-Benz GLE 350 4MATIC',aliases:['Mercedes-Benz GLE 350 4MATIC','GLE 350 4MATIC'],year:2021,source:'Wikimedia Commons · Mercedes-Benz GLE V167 2021',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_GLE-Klasse_(V167)_GLE_350_de_4MATIC_(2021)_(52095367745).jpg?width=1280'},
{id:'lexus-rx-22',model:'Lexus RX 350 F Sport',aliases:['Lexus RX 350 F Sport','RX 350 F Sport'],year:2022,source:'Wikimedia Commons · Lexus RX F Sport AL20',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/LEXUS_RX_300_F-SPORT_(AL20)_China_(4).jpg?width=1280'},
{id:'bmw-x3-23',model:'BMW X3 xDrive30i',aliases:['BMW X3 xDrive30i','X3 xDrive30i'],year:2023,source:'ALM Cars',image:'https://static.overfuel.com/photos/580/737904/6f88a26b-09e7-40f0-abd1-46be31796570.webp?q=80&w=1920'},
{id:'audi-q5-22',model:'Audi Q5 Premium Plus',aliases:['Audi Q5 Premium Plus','Q5 Premium Plus'],year:2022,source:'Wikimedia Commons · Audi Q5 FY Facelift',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Audi_Q5_FY_Facelift_IMG_5684.jpg?width=1280'},
{id:'porsche-macan-21',model:'Porsche Macan S',aliases:['Porsche Macan S','Macan S'],year:2021,source:'Wikimedia Commons · 2021 Porsche Macan S',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/2021_Porsche_Macan_S.jpg?width=1280'},
{id:'volvo-xc60-22',model:'Volvo XC60 B5 Momentum',aliases:['Volvo XC60 B5 Momentum','XC60 B5 Momentum'],year:2022,source:'Wikimedia Commons · Volvo XC60 B5 Mild-Hybrid AWD 2022',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Volvo_XC60_B5_Mild-Hybrid_AWD_(2022)_(52101859478).jpg?width=1280'},
{id:'honda-crv-23',model:'Honda CR-V EX-L',aliases:['Honda CR-V EX-L','CR-V EX-L'],year:2023,source:'Wikimedia Commons · Honda CR-V sixth generation',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/Honda_CR-V_(6th_generation).jpg?width=1280'},
{id:'mazda-cx5-23',model:'Mazda CX-5 Turbo',aliases:['Mazda CX-5 Turbo','CX-5 Turbo'],year:2023,source:'Schwartz Mazda',image:'https://dealerimages.dealereprocess.com/image/upload/c_limit%2Cf_auto%2Cfl_lossy%2Cw_auto/v1/svp/dep/22mazdacx5sprtturbo/mazda_22cx5sprtturbo_angularfront_jetblackmica'},
{id:'jeep-grand-cherokee-22',model:'Jeep Grand Cherokee Limited',aliases:['Jeep Grand Cherokee Limited','Grand Cherokee Limited'],year:2022,source:'Wikimedia Commons · 2022 Jeep Grand Cherokee WL',image:'https://commons.wikimedia.org/wiki/Special:Redirect/file/2022_Jeep_Grand_Cherokee.jpg?width=1280'},
{id:'subaru-outback-23',model:'Subaru Outback Limited',aliases:['Subaru Outback Limited','Outback Limited'],year:2023,source:"Otto's Subaru",image:'https://img.sm360.ca/ir/w1024h768/images/inventory/ottossubaru-743/subaru/outback/2023/37662992/37662992_05385_6e9a6c02-ad57-453f-9587-e3b0a77eae3c.jpg'},
{id:'tesla-model3-23',model:'Tesla Model 3 Long Range',aliases:['Tesla Model 3 Long Range','Model 3 Long Range'],year:2023,source:'AutoHome',image:'https://car3.autoimg.cn/cardfs/product/g27/M00/76/24/autohomecar__ChtlxmUMX_CAfkiKABo7_YHchtU616.jpg'},
{id:'cadillac-xt5-22',model:'Cadillac XT5 Premium Luxury',aliases:['Cadillac XT5 Premium Luxury','XT5 Premium Luxury'],year:2022,source:'AutoGiant USA',image:'https://static.overfuel.com/photos/178/801742/5f0a7532-5501-4ff0-8549-f6724b90cfa1.webp?q=80&w=1920'}
];

const normalized=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const byAlias=new Map();
for(const photo of verifiedPhotos)for(const alias of photo.aliases)byAlias.set(normalized(alias),photo);

function applyVerifiedPhotos(scope=document){
  const images=scope.querySelectorAll?.('.auto-car-media img, .auto-detail-media img')||[];
  for(const image of images){
    const photo=byAlias.get(normalized(image.alt));
    if(!photo||image.dataset.photoVerified===photo.id)continue;
    image.src=photo.image;
    image.alt=photo.model;
    image.dataset.photoVerified=photo.id;
    image.dataset.photoSource=photo.source;
    image.loading='lazy';
    image.decoding='async';
    image.referrerPolicy='no-referrer';
  }
}

window.__AUTO_SALE_VERIFIED_PHOTOS__=verifiedPhotos;
applyVerifiedPhotos();
const root=document.getElementById('app');
if(root){let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;applyVerifiedPhotos(root)})}).observe(root,{childList:true,subtree:true})}
document.addEventListener('click',()=>queueMicrotask(()=>applyVerifiedPhotos()),true);
window.addEventListener('load',()=>applyVerifiedPhotos());
