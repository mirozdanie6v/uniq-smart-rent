import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

async function setup(tag,{emptyCatalog=false,catalogSeed=null}={}){
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale-demo.viiversion.com/'});
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  globalThis.localStorage=dom.window.localStorage;
  globalThis.sessionStorage=dom.window.sessionStorage;
  globalThis.FormData=dom.window.FormData;
  globalThis.Event=dom.window.Event;
  globalThis.CustomEvent=dom.window.CustomEvent;
  if(emptyCatalog)localStorage.setItem('auto-sale-catalog-v1','[]');
  if(Array.isArray(catalogSeed))localStorage.setItem('auto-sale-catalog-v1',JSON.stringify(catalogSeed));
  await import(`../public/auto-sale-app-v3.mjs?manager-catalog=${tag}-${Date.now()}-${Math.random()}`);
  await tick();
  return{dom,root:document.querySelector('#app')};
}

test('manager navigation exposes catalog and can add a published vehicle',async()=>{
  const {dom,root}=await setup('add');
  root.querySelector('[data-role="manager"]').click();await tick();
  const nav=[...root.querySelectorAll('.auto-bottom [data-go]')].map(x=>x.textContent.trim());
  assert.ok(nav.some(x=>x.includes('Каталог')));
  root.querySelector('[data-go="catalogAdmin"]').click();await tick();
  root.querySelector('[data-catalog-add]').click();await tick();
  const form=root.querySelector('#catalogCarForm');assert.ok(form);
  form.elements.brand.value='Kia';
  form.elements.model.value='Telluride SX';
  form.elements.year.value='2024';
  form.elements.mileage.value='12 000 км';
  form.elements.engine.value='3.8 бензин';
  form.elements.drive.value='AWD';
  form.elements.auction.value='Manheim';
  form.elements.price.value='42000';
  form.elements.delivery.value='8–11 недель';
  form.elements.tag.value='Family SUV';
  form.elements.image.value='https://example.com/kia-telluride.jpg';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await tick();

  const catalog=JSON.parse(localStorage.getItem('auto-sale-catalog-v1'));
  const car=catalog.find(x=>x.brand==='Kia'&&x.model==='Telluride SX');
  assert.ok(car);
  assert.equal(car.active,true);
  assert.equal(car.price,42000);

  root.querySelector('[data-role="client"]').click();await tick();
  root.querySelector('[data-go="catalog"]').click();await tick();
  assert.match(root.textContent,/Kia Telluride SX/);
  dom.window.close();
});

test('manager can edit and hide a catalog vehicle from clients',async()=>{
  const {dom,root}=await setup('edit');
  root.querySelector('[data-role="manager"]').click();await tick();
  root.querySelector('[data-go="catalogAdmin"]').click();await tick();
  const first=root.querySelector('[data-catalog-edit]');assert.ok(first);
  const id=first.dataset.catalogEdit;
  first.click();await tick();
  const form=root.querySelector('#catalogCarForm');assert.ok(form);
  form.elements.price.value='49999';
  form.elements.active.checked=false;
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await tick();

  const catalog=JSON.parse(localStorage.getItem('auto-sale-catalog-v1'));
  const car=catalog.find(x=>x.id===id);
  assert.equal(car.price,49999);
  assert.equal(car.active,false);

  root.querySelector('[data-role="client"]').click();await tick();
  root.querySelector('[data-go="catalog"]').click();await tick();
  assert.equal(root.querySelector(`[data-detail="${id}"]`),null);
  dom.window.close();
});


test('empty server catalog is seeded with existing cars and each row opens edit form',async()=>{
  const {dom,root}=await setup('seed-existing',{emptyCatalog:true});
  root.querySelector('[data-role="manager"]').click();await tick();
  root.querySelector('[data-go="catalogAdmin"]').click();await tick();
  const rows=[...root.querySelectorAll('[data-catalog-edit]')];
  assert.equal(rows.length,16);
  const bmw=root.querySelector('[data-catalog-edit="bmw-x5-22"]');
  assert.ok(bmw);
  bmw.click();await tick();
  const form=root.querySelector('#catalogCarForm');assert.ok(form);
  assert.equal(form.elements.brand.value,'BMW');
  assert.equal(form.elements.model.value,'X5 xDrive40i');
  assert.equal(form.elements.price.value,'46800');
  dom.window.close();
});


test('manager catalog form supports local main, interior and other photo sets',async()=>{
  const {dom,root}=await setup('photos');
  root.querySelector('[data-role="manager"]').click();await tick();
  root.querySelector('[data-go="catalogAdmin"]').click();await tick();
  root.querySelector('[data-catalog-add]').click();await tick();
  const form=root.querySelector('#catalogCarForm');assert.ok(form);
  assert.equal(form.querySelectorAll('[data-catalog-photo-upload]').length,3);
  assert.ok(form.querySelector('[data-catalog-photo-upload="main"]'));
  assert.ok(form.querySelector('[data-catalog-photo-upload="interior"][multiple]'));
  assert.ok(form.querySelector('[data-catalog-photo-upload="other"][multiple]'));

  form.elements.brand.value='Ford';
  form.elements.model.value='Bronco Photo Demo';
  form.elements.year.value='2024';
  form.elements.mileage.value='9 000 км';
  form.elements.engine.value='2.7 бензин';
  form.elements.drive.value='4WD';
  form.elements.auction.value='Manheim';
  form.elements.price.value='45000';
  form.elements.delivery.value='8–11 недель';
  form.elements.tag.value='Photo demo';
  form.elements.image.value='data:image/jpeg;base64,MAIN';
  form.elements.interiorPhotos.value=JSON.stringify(['data:image/jpeg;base64,INT1','data:image/jpeg;base64,INT2']);
  form.elements.otherPhotos.value=JSON.stringify(['data:image/jpeg;base64,OTH1']);
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await tick();

  const catalog=JSON.parse(localStorage.getItem('auto-sale-catalog-v1'));
  const car=catalog.find(x=>x.model==='Bronco Photo Demo');
  assert.ok(car);
  assert.equal(car.image,'data:image/jpeg;base64,MAIN');
  assert.deepEqual(car.interiorPhotos,['data:image/jpeg;base64,INT1','data:image/jpeg;base64,INT2']);
  assert.deepEqual(car.otherPhotos,['data:image/jpeg;base64,OTH1']);
  dom.window.close();
});


test('manager can edit an imported source-priced car without losing source metadata',async()=>{
  const imported=[{
    id:'AWG-999',brand:'Kia',model:'K4',year:2026,mileage:'393 mi',engine:'2.0L',
    drive:'FWD',auction:'AutoWorld Georgia',price:0,priceRub:2970000,delivery:'Срок по запросу',
    tag:'EX',image:'https://example.com/k4.jpg',interiorPhotos:[],otherPhotos:[],active:true,
    source:'AutoWorld_Georgia',sourcePostId:'999',sourceUrl:'https://t.me/AutoWorld_Georgia/999',vin:'VINTEST1234567890'
  }];
  const {dom,root}=await setup('source-price',{catalogSeed:imported});
  root.querySelector('[data-role="manager"]').click();await tick();
  root.querySelector('[data-go="catalogAdmin"]').click();await tick();
  root.querySelector('[data-catalog-edit="AWG-999"]').click();await tick();
  const form=root.querySelector('#catalogCarForm');assert.ok(form);
  assert.equal(form.elements.price.value,'0');
  assert.equal(form.elements.priceRub.value,'2970000');
  form.elements.priceRub.value='3000000';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  await tick();
  const updated=JSON.parse(localStorage.getItem('auto-sale-catalog-v1')).find(x=>x.id==='AWG-999');
  assert.equal(updated.priceRub,3000000);
  assert.equal(updated.source,'AutoWorld_Georgia');
  assert.equal(updated.sourcePostId,'999');
  assert.equal(updated.vin,'VINTEST1234567890');
  dom.window.close();
});
