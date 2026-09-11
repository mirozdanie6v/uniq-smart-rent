import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

function setValue(root,selector,value){
  const el=root.querySelector(selector);
  assert.ok(el,`missing ${selector}`);
  el.value=value;
  return el;
}

function submit(dom,form){
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
}

test('client -> manager -> quote -> order -> logistics -> director scenario works in one shared state', async()=>{
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale.viiversion.com/'});
  globalThis.window=dom.window;
  globalThis.document=dom.window.document;
  globalThis.localStorage=dom.window.localStorage;
  globalThis.sessionStorage=dom.window.sessionStorage;
  globalThis.FormData=dom.window.FormData;
  globalThis.Event=dom.window.Event;
  globalThis.CustomEvent=dom.window.CustomEvent;

  await import(`../public/auto-sale-app.mjs?scenario=${Date.now()}`);
  const root=dom.window.document.querySelector('#app');
  assert.match(root.textContent,/Автомобиль из США под ключ/);

  root.querySelector('[data-open-request]').click();
  const requestForm=root.querySelector('#requestForm');
  assert.ok(requestForm);
  setValue(requestForm,'[name="name"]','Тестовый клиент');
  setValue(requestForm,'[name="contact"]','@test_client');
  setValue(requestForm,'[name="model"]','Audi Q5 2023');
  setValue(requestForm,'[name="budget"]','41000');
  setValue(requestForm,'[name="source"]','Сайт');
  submit(dom,requestForm);

  const leadsAfterRequest=JSON.parse(localStorage.getItem('auto-sale-leads-v2'));
  const clientLead=leadsAfterRequest.find(x=>x.contact==='@test_client');
  assert.ok(clientLead);
  assert.equal(clientLead.clientCreated,true);
  assert.equal(clientLead.status,'Новый');
  assert.match(root.textContent,/Заявки и статус поставки/);

  root.querySelector('[data-role="manager"]').click();
  assert.match(root.textContent,/Сегодня у менеджера/);
  root.querySelector('[data-go="leads"]').click();
  root.querySelector(`[data-lead="${clientLead.id}"]`).click();
  const leadForm=root.querySelector('#leadEditForm');
  assert.ok(leadForm);
  setValue(leadForm,'[name="status"]','В работе');
  setValue(leadForm,'[name="manager"]','Анна');
  setValue(leadForm,'[name="nextAction"]','2026-09-13');
  setValue(leadForm,'[name="note"]','Подготовить три лота Audi Q5.');
  submit(dom,leadForm);

  const updatedLead=JSON.parse(localStorage.getItem('auto-sale-leads-v2')).find(x=>x.id===clientLead.id);
  assert.equal(updatedLead.status,'В работе');
  assert.equal(updatedLead.manager,'Анна');

  root.querySelector(`[data-create-quote="${clientLead.id}"]`).click();
  const quoteForm=root.querySelector('#quoteForm');
  assert.ok(quoteForm);
  setValue(quoteForm,'[name="model"]','Audi Q5 Premium Plus 2023');
  setValue(quoteForm,'[name="lot"]','26000');
  setValue(quoteForm,'[name="auction"]','1000');
  setValue(quoteForm,'[name="inland"]','700');
  setValue(quoteForm,'[name="ocean"]','2400');
  setValue(quoteForm,'[name="customs"]','6200');
  setValue(quoteForm,'[name="repair"]','1200');
  setValue(quoteForm,'[name="service"]','1500');
  setValue(quoteForm,'[name="status"]','Согласован');
  submit(dom,quoteForm);

  const quote=JSON.parse(localStorage.getItem('auto-sale-quotes-v2')).find(x=>x.leadId===clientLead.id);
  assert.ok(quote);
  assert.equal(quote.total,39000);
  assert.equal(quote.status,'Согласован');

  root.querySelector('[data-go="leads"]').click();
  root.querySelector(`[data-lead="${clientLead.id}"]`).click();
  root.querySelector(`[data-convert-order="${clientLead.id}"]`).click();
  let order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.leadId===clientLead.id);
  assert.ok(order);
  assert.equal(order.stage,'Выкуп');
  assert.equal(order.manager,'Анна');
  assert.equal(order.total,39000);

  root.querySelector(`[data-order-next="${order.id}"]`).click();
  order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.id===order.id);
  assert.equal(order.stage,'Порт США');

  const orderForm=root.querySelector('#orderForm');
  setValue(orderForm,'[name="stage"]','В море');
  setValue(orderForm,'[name="eta"]','2026-10-25');
  setValue(orderForm,'[name="location"]','Atlantic Ocean');
  setValue(orderForm,'[name="risk"]','Нет');
  setValue(orderForm,'[name="paid"]','20000');
  submit(dom,orderForm);
  order=JSON.parse(localStorage.getItem('auto-sale-orders-v2')).find(x=>x.id===order.id);
  assert.equal(order.stage,'В море');
  assert.equal(order.paid,20000);

  root.querySelector('[data-role="owner"]').click();
  assert.match(root.textContent,/Бизнес одним экраном/);
  root.querySelector('[data-go="finance"]').click();
  assert.match(root.textContent,/Деньги по заказам/);
  assert.match(root.textContent,/Дебиторка/);
  root.querySelector('[data-go="ordersAdmin"]').click();
  assert.match(root.textContent,/Все сделки и автомобили/);
  assert.match(root.textContent,/Audi Q5 Premium Plus 2023/);

  root.querySelector('[data-role="client"]').click();
  root.querySelector('[data-go="orders"]').click();
  assert.match(root.textContent,/Audi Q5 Premium Plus 2023/);
  assert.match(root.textContent,/В море/);

  dom.window.close();
});
