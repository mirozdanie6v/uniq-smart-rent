import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const set=(root,selector,value)=>{const el=root.querySelector(selector);assert.ok(el,`missing ${selector}`);el.value=value;return el;};
const submit=(dom,form)=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));

test('validated client to delivery workflow preserves business rules',async()=>{
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale.viiversion.com/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.FormData=dom.window.FormData;globalThis.Event=dom.window.Event;globalThis.CustomEvent=dom.window.CustomEvent;
  await import(`../public/auto-sale-app-v3.mjs?scenario=${Date.now()}`);
  const root=document.querySelector('#app');

  root.querySelector('[data-open-request]').click();
  let form=root.querySelector('#requestForm');
  assert.ok(form);
  assert.equal(form.querySelector('[name="source"]'),null);
  assert.equal(form.querySelector('[name="priority"]'),null);
  set(form,'[name="name"]','Тестовый клиент');
  set(form,'[name="contact"]','@validated_client');
  set(form,'[name="model"]','Audi Q5 2023');
  set(form,'[name="budget"]','41000');
  set(form,'[name="yearFrom"]','2022');
  set(form,'[name="yearTo"]','2024');
  set(form,'[name="mileageMax"]','50000');
  set(form,'[name="deliveryCity"]','Москва');
  submit(dom,form);

  let lead=JSON.parse(localStorage.getItem('auto-sale-leads-v2')).find(x=>x.contact==='@validated_client');
  assert.ok(lead);
  assert.equal(lead.source,'Mini App');
  assert.equal(lead.clientCreated,true);
  assert.equal(lead.yearFrom,'2022');

  root.querySelector('[data-role="manager"]').click();
  root.querySelector('[data-go="leads"]').click();
  root.querySelector(`[data-lead="${lead.id}"]`).click();
  form=root.querySelector('#leadEditForm');
  set(form,'[name="status"]','В работе');
  set(form,'[name="manager"]','Анна');
  set(form,'[name="nextAction"]','2026-09-14');
  set(form,'[name="note"]','Подготовить проверенные лоты.');
  submit(dom,form);
  lead=JSON.parse(localStorage.getItem('auto-sale-leads-v2')).find(x=>x.id===lead.id);
  assert.equal(lead.manager,'Анна');
  assert.equal(lead.status,'В работе');

  root.querySelector(`[data-create-quote="${lead.id}"]`).click();
  form=root.querySelector('#quoteForm');
  set(form,'[name="model"]','Audi Q5 Premium Plus 2023');
  set(form,'[name="lot"]','26000');
  set(form,'[name="auction"]','1000');
  set(form,'[name="inland"]','700');
  set(form,'[name="ocean"]','2400');
  set(form,'[name="customs"]','6200');
  set(form,'[name="repair"]','1200');
  set(form,'[name="service"]','1500');
  set(form,'[name="validUntil"]','2026-09-20');
  set(form,'[name="status"]','Отправлен');
  submit(dom,form);

  let quote=JSON.parse(localStorage.getItem('auto-sale-quotes-v2')).find(x=>x.leadId===lead.id);
  assert.ok(quote);
  assert.equal(quote.total,39000);
  assert.equal(quote.status,'Отправлен');
  root.querySelector(`[data-id="${quote.id}"][data-quote-action="На согласовании"]`).click();
  root.querySelector(`[data-id="${quote.id}"][data-quote-action="Согласован"]`).click();
  quote=JSON.parse(localStorage.getItem('auto-sale-quotes-v2')).find(x=>x.id===quote.id);
  assert.equal(quote.status,'Согласован');

  root.querySelector('[data-go="leads"]').click();
  root.querySelector(`[data-lead="${lead.id}"]`).click();
  form=root.querySelector('#leadEditForm');
  assert.ok(form.querySelector('[name="deposit"]'));
  set(form,'[name="deposit"]','5000');
  set(form,'[name="depositDate"]','2026-09-12');
  set(form,'[name="paymentMethod"]','Банк');
  submit(dom,form);
  const convert=root.querySelector(`[data-convert-order="${lead.id}"]`);
  assert.ok(convert);
  assert.equal(convert.disabled,false);
  convert.click();

  let order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.leadId===lead.id);
  assert.ok(order);
  assert.equal(order.stage,'Выкуп');
  assert.equal(order.paid,5000);
  assert.equal(order.payments.length,1);

  form=root.querySelector('#orderForm');
  set(form,'[name="stage"]','Порт США');
  set(form,'[name="lot"]','998877');
  set(form,'[name="vin"]','WAUZZZTEST1234567');
  set(form,'[name="eta"]','2026-10-25');
  set(form,'[name="location"]','Long Beach, CA');
  submit(dom,form);
  order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.id===order.id);
  assert.equal(order.stage,'Порт США');
  assert.equal(order.vin,'WAUZZZTEST1234567');

  form=root.querySelector('#orderForm');
  set(form,'[name="stage"]','В море');
  set(form,'[name="location"]','Atlantic Ocean');
  set(form,'[name="paymentAmount"]','15000');
  set(form,'[name="paymentDate"]','2026-09-13');
  set(form,'[name="paymentMethod"]','Банк');
  submit(dom,form);
  order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.id===order.id);
  assert.equal(order.stage,'В море');
  assert.equal(order.paid,20000);
  assert.equal(order.payments.length,2);

  root.querySelector('[data-role="owner"]').click();
  root.querySelector('[data-go="ordersAdmin"]').click();
  root.querySelector(`[data-order="${order.id}"]`).click();
  assert.equal(root.querySelector('#orderForm'),null);
  assert.match(root.textContent,/КОНТРОЛЬ/);

  root.querySelector('[data-role="client"]').click();
  root.querySelector('[data-go="orders"]').click();
  assert.match(root.textContent,/Audi Q5 Premium Plus 2023/);
  assert.match(root.textContent,/В море/);
  dom.window.close();
});
