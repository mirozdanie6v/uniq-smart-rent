const extraCars=[
{id:'bmw-x3-23',brand:'BMW',model:'X3 xDrive30i',year:2023,mileage:'27 000 км',engine:'2.0 бензин',drive:'AWD',auction:'Manheim',price:41200,delivery:'8–11 недель',tag:'Premium SUV',image:'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=82'},
{id:'audi-q5-22',brand:'Audi',model:'Q5 Premium Plus',year:2022,mileage:'36 000 км',engine:'2.0 бензин',drive:'AWD',auction:'Copart',price:38900,delivery:'8–11 недель',tag:'Premium SUV',image:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=82'},
{id:'porsche-macan-21',brand:'Porsche',model:'Macan S',year:2021,mileage:'44 000 км',engine:'3.0 бензин',drive:'AWD',auction:'Copart',price:54800,delivery:'8–12 недель',tag:'Sport SUV',image:'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=82'},
{id:'volvo-xc60-22',brand:'Volvo',model:'XC60 B5 Momentum',year:2022,mileage:'31 000 км',engine:'2.0 mild hybrid',drive:'AWD',auction:'IAAI',price:37600,delivery:'8–11 недель',tag:'Safety SUV',image:'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1400&q=82'},
{id:'honda-crv-23',brand:'Honda',model:'CR-V EX-L',year:2023,mileage:'25 000 км',engine:'1.5 бензин',drive:'AWD',auction:'Copart',price:29600,delivery:'8–12 недель',tag:'Family SUV',image:'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1400&q=82'},
{id:'mazda-cx5-23',brand:'Mazda',model:'CX-5 Turbo',year:2023,mileage:'24 000 км',engine:'2.5 бензин',drive:'AWD',auction:'IAAI',price:28700,delivery:'8–11 недель',tag:'Urban SUV',image:'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1400&q=82'},
{id:'jeep-grand-cherokee-22',brand:'Jeep',model:'Grand Cherokee Limited',year:2022,mileage:'39 000 км',engine:'3.6 бензин',drive:'4WD',auction:'Copart',price:35700,delivery:'8–12 недель',tag:'4x4 SUV',image:'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1400&q=82'},
{id:'subaru-outback-23',brand:'Subaru',model:'Outback Limited',year:2023,mileage:'22 000 км',engine:'2.5 бензин',drive:'AWD',auction:'IAAI',price:30900,delivery:'8–11 недель',tag:'Adventure',image:'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1400&q=82'},
{id:'tesla-model3-23',brand:'Tesla',model:'Model 3 Long Range',year:2023,mileage:'19 000 км',engine:'Electric',drive:'AWD',auction:'IAAI',price:32900,delivery:'7–10 недель',tag:'EV',image:'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1400&q=82'},
{id:'cadillac-xt5-22',brand:'Cadillac',model:'XT5 Premium Luxury',year:2022,mileage:'35 000 км',engine:'3.6 бензин',drive:'AWD',auction:'Manheim',price:40100,delivery:'8–11 недель',tag:'Luxury SUV',image:'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=82'}
];
window.__AUTO_SALE_EXTRA_CARS__=extraCars;

const money=value=>'$'+new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(value)||0);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const matchesBudget=(car,value)=>value==='all'||value==='35'&&car.price<=35000||value==='45'&&car.price>35000&&car.price<=45000||value==='46'&&car.price>45000;

function card(car){return `<article class="auto-car auto-extra-car" data-extra-car="${car.id}"><div class="auto-car-media"><img src="${car.image}" alt="${esc(car.brand+' '+car.model)}"><span class="auto-chip">${esc(car.tag)}</span></div><div class="auto-car-body"><div class="auto-car-top"><div><small>${car.year} · ${esc(car.auction)}</small><h3>${esc(car.brand+' '+car.model)}</h3></div><div class="auto-price"><b>от ${money(car.price)}</b><span>ориентир под ключ</span></div></div><div class="auto-specs"><span>${esc(car.mileage)}</span><span>${esc(car.engine)}</span><span>${esc(car.drive)}</span></div><div class="auto-card-actions"><button class="auto-btn primary" data-open-request data-extra-model="${esc(car.brand+' '+car.model)}">Рассчитать</button><button class="auto-btn ghost" data-extra-detail="${car.id}">Подробнее</button></div></div></article>`}

function renderExtraCars(){
  const brandFilter=document.getElementById('brandFilter');
  const budgetFilter=document.getElementById('budgetFilter');
  const search=document.getElementById('autoSearch');
  if(!brandFilter||!budgetFilter||!search)return;
  const grid=brandFilter.closest('.auto-section')?.querySelector('.auto-grid');
  if(!grid)return;

  const query=search.value.trim().toLowerCase();
  const rows=extraCars.filter(car=>(brandFilter.value==='all'||car.brand===brandFilter.value)&&matchesBudget(car,budgetFilter.value)&&(!query||`${car.brand} ${car.model} ${car.year} ${car.engine}`.toLowerCase().includes(query)));
  const signature=[brandFilter.value,budgetFilter.value,query,rows.map(car=>car.id).join(',')].join('|');
  if(grid.dataset.extraCatalogSignature===signature&&grid.querySelectorAll('.auto-extra-car').length===rows.length)return;
  grid.dataset.extraCatalogSignature=signature;

  const known=new Set([...brandFilter.options].map(option=>option.value));
  for(const brand of [...new Set(extraCars.map(car=>car.brand))].sort())if(!known.has(brand))brandFilter.insertAdjacentHTML('beforeend',`<option value="${esc(brand)}">${esc(brand)}</option>`);

  grid.querySelectorAll('.auto-extra-car').forEach(node=>node.remove());
  if(rows.length){grid.querySelector('.auto-empty')?.remove();grid.insertAdjacentHTML('beforeend',rows.map(card).join(''))}
}

function showDetail(car){
  const shell=document.querySelector('.auto-shell');
  if(!shell)return;
  shell.insertAdjacentHTML('beforeend',`<div class="auto-modal-bg" data-extra-modal-bg><div class="auto-modal"><div class="auto-modal-head"><div><span class="auto-eyebrow">${esc(car.auction)} · ${car.year}</span><h2>${esc(car.brand+' '+car.model)}</h2></div><button class="auto-close" data-extra-close>×</button></div><div class="auto-car-media auto-detail-media"><img src="${car.image}" alt="${esc(car.brand+' '+car.model)}"></div><div class="auto-kpis auto-detail-kpis"><div class="auto-kpi"><span>Ориентир</span><b>${money(car.price)}</b></div><div class="auto-kpi"><span>Пробег</span><b>${esc(car.mileage)}</b></div><div class="auto-kpi"><span>Привод</span><b>${esc(car.drive)}</b></div><div class="auto-kpi"><span>Срок</span><b>${esc(car.delivery)}</b></div></div><div class="auto-actions"><button class="auto-btn primary" data-open-request data-extra-model="${esc(car.brand+' '+car.model)}">Получить расчёт</button><button class="auto-btn ghost" data-extra-close>Закрыть</button></div></div></div>`);
}

document.addEventListener('click',event=>{
  const request=event.target.closest('[data-extra-model]');
  if(request){const model=request.dataset.extraModel;queueMicrotask(()=>{const input=document.querySelector('#requestForm [name="model"]');if(input)input.value=model})}
  const detail=event.target.closest('[data-extra-detail]');
  if(detail){const car=extraCars.find(item=>item.id===detail.dataset.extraDetail);if(car)showDetail(car)}
  if(event.target.closest('[data-extra-close]')||event.target.matches('[data-extra-modal-bg]'))event.target.closest('[data-extra-modal-bg]')?.remove();
});

let scheduled=false;
const scheduleRender=()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;renderExtraCars()})};
const observer=new MutationObserver(scheduleRender);
observer.observe(document.getElementById('app'),{childList:true,subtree:true});
window.addEventListener('load',renderExtraCars);
await import('./auto-sale-telegram.mjs');