import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

async function setup(tag){
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale-demo.viiversion.com/'});
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  globalThis.localStorage=dom.window.localStorage;
  globalThis.sessionStorage=dom.window.sessionStorage;
  globalThis.FormData=dom.window.FormData;
  globalThis.Event=dom.window.Event;
  globalThis.CustomEvent=dom.window.CustomEvent;
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
