const verifiedPhotos=[
{id:'bmw-x5-22',model:'BMW X5 xDrive40i',aliases:['BMW X5 xDrive40i','X5 xDrive40i'],year:2022,source:'Transparent Motorcars',image:'https://zopsoftware-asset.b-cdn.net/upload/6d9bc03503dcde3e22a3be5139dc9a8b/1703619827_61ca3b02e9021161cc58.jpg'},
{id:'tesla-y-23',model:'Tesla Model Y Long Range',aliases:['Tesla Model Y Long Range','Model Y Long Range'],year:2023,source:'Akins',image:'https://www.akinsjeepram.com/assets/stock/expanded/transparent/1280/2023tss02_1280/2023tss020004_1280_05.png?bg-color=FFFFFF&timestamp=0001-01-01T00%3A00%3A00&width=400'},
{id:'rav4-22',model:'Toyota RAV4 XLE Premium',aliases:['Toyota RAV4 XLE Premium','RAV4 XLE Premium'],year:2022,source:'Aztec Motors',image:'https://www.aztecmotorsinc.com/uploads/autos/6875/2022_TOYOTA_RAV4_6875_52973.aiimg-h1200.jpg'},
{id:'mustang-mach-e',model:'Ford Mustang Mach-E',aliases:['Ford Mustang Mach-E','Mustang Mach-E'],year:2022,source:'The Car Connection',image:'https://images.hgmsites.net/med/2022-ford-mustang-mach-e-premium-awd-front-exterior-view_100820435_m.jpg'},
{id:'gle-21',model:'Mercedes-Benz GLE 350 4MATIC',aliases:['Mercedes-Benz GLE 350 4MATIC','GLE 350 4MATIC'],year:2021,source:'Mercedes-Benz of Arlington',image:'https://vehicle-images.carscommerce.inc/86b8-110012062/4JGFB4KB4MA564501/c0ba29a4f1334f807b5c8f24606d6227.jpg'},
{id:'lexus-rx-22',model:'Lexus RX 350 F Sport',aliases:['Lexus RX 350 F Sport','RX 350 F Sport'],year:2022,source:'Nissan of Cookeville',image:'https://cloudflareimages.dealereprocess.com/resrc/images/c_limit%2Cfl_lossy%2Cw_auto/v1/dvp/3958/36163706888/Used-2022-Lexus-RX350-350FSPORTHandling-ID36163706888-aHR0cDovL2ltYWdlcy51bml0c2ludmVudG9yeS5jb20vdXBsb2Fkcy9waG90b3MvMC8yMDI1LTEyLTExLzMxLTI1NzcxNDI0LTY5M2JhNzQwMTY1YTIuanBn'},
{id:'bmw-x3-23',model:'BMW X3 xDrive30i',aliases:['BMW X3 xDrive30i','X3 xDrive30i'],year:2023,source:'ALM Cars',image:'https://static.overfuel.com/photos/580/737904/6f88a26b-09e7-40f0-abd1-46be31796570.webp?q=80&w=1920'},
{id:'audi-q5-22',model:'Audi Q5 Premium Plus',aliases:['Audi Q5 Premium Plus','Q5 Premium Plus'],year:2022,source:'Audi Exchange',image:'https://vehicle-images.dealerinspire.com/22f0-110013163/thumbnails/large/WA1BBAFY2N2111631/9bc034100c5b781f01544027ec4a52b3.jpg'},
{id:'porsche-macan-21',model:'Porsche Macan S',aliases:['Porsche Macan S','Macan S'],year:2021,source:'Exclusive Automotive Group',image:'https://www.exclusiveautomotivegroup.com/imagetag/4458/10/l/Used-2021-Porsche-Macan-S-1758550191.jpg'},
{id:'volvo-xc60-22',model:'Volvo XC60 B5 Momentum',aliases:['Volvo XC60 B5 Momentum','XC60 B5 Momentum'],year:2022,source:'J.D. Power',image:'https://cdn.jdpower.com/ChromeImageGallery/Expanded/Transparent/640/2022VOS02_640/2022VOS020019_640_03.png'},
{id:'honda-crv-23',model:'Honda CR-V EX-L',aliases:['Honda CR-V EX-L','CR-V EX-L'],year:2023,source:'Hendrick Kia',image:'https://content.homenetiol.com/2000292/2143540/0x0/67128a881b5a44b69f4815d7db59ab90.jpg'},
{id:'mazda-cx5-23',model:'Mazda CX-5 Turbo',aliases:['Mazda CX-5 Turbo','CX-5 Turbo'],year:2023,source:'Schwartz Mazda',image:'https://dealerimages.dealereprocess.com/image/upload/c_limit%2Cf_auto%2Cfl_lossy%2Cw_auto/v1/svp/dep/22mazdacx5sprtturbo/mazda_22cx5sprtturbo_angularfront_jetblackmica'},
{id:'jeep-grand-cherokee-22',model:'Jeep Grand Cherokee Limited',aliases:['Jeep Grand Cherokee Limited','Grand Cherokee Limited'],year:2022,source:'Jeep',image:'https://www.jeep.com/content/dam/fca-brands/na/jeep/en_us/2022/grand-cherokee/trims/2022-All-New-Grand-Cherokee-Limited-Vehicle-Lineup-All-Breakpoints.jpg.image.1440.jpg'},
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
