import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/auto-sale-app-v3.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../public/auto-sale-bootstrap.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('../public/auto-sale-admin.css',import.meta.url),'utf8');
const responsive=await readFile(new URL('../public/auto-sale-responsive.css',import.meta.url),'utf8');
const mobileAdmin=await readFile(new URL('../public/auto-sale-mobile-admin.css',import.meta.url),'utf8');
const core=await readFile(new URL('../public/auto-sale-core.mjs',import.meta.url),'utf8');
const details=await readFile(new URL('../public/auto-sale-car-details.mjs',import.meta.url),'utf8');
const team=await readFile(new URL('../public/auto-sale-director-team.mjs',import.meta.url),'utf8');

test('entry page boots the current v3 AUTO SALE chain',()=>{
  assert.match(html,/auto-sale-bootstrap\.mjs/);
  assert.match(bootstrap,/await import\('\.\/auto-sale-app-v3\.mjs(?:\?[^']+)?'\)/);
  assert.match(bootstrap,/await import\('\.\/auto-sale-ui-business-guard\.mjs'\)/);
  assert.match(bootstrap,/await import\('\.\/auto-sale-telegram\.mjs/);
  assert.match(bootstrap,/await import\('\.\/auto-sale-telegram-id\.mjs/);
});

test('all three roles and every operational route are rendered by v3',()=>{
  for(const token of ['client','manager','owner','work','leads','quotes','shipping','overview','pipeline','finance','ordersAdmin']) assert.ok(app.includes(token),token);
});

test('every core rendered business action has a click handler',()=>{
  const pairs=[
    ['data-role','dataset.role'],['data-go','dataset.go'],['data-close','dataset.close'],['data-modal-bg','dataset.modalBg'],
    ['data-open-request','dataset.openRequest'],['data-manager-new','dataset.managerNew'],['data-request-car','dataset.requestCar'],['data-detail','dataset.detail'],
    ['data-lead','dataset.lead'],['data-quote','dataset.quote'],['data-order','dataset.order'],['data-new-quote','dataset.newQuote'],
    ['data-create-quote','dataset.createQuote'],['data-convert-order','dataset.convertOrder'],['data-quote-action','dataset.quoteAction'],
    ['data-clone-quote','dataset.cloneQuote'],['data-order-next','dataset.orderNext']
  ];
  for(const [markup,handler] of pairs){assert.ok(app.includes(markup),markup);assert.ok(app.includes(handler),handler)}
});

test('manager scenarios include lead edit quote conversion payments and logistics update',()=>{
  for(const token of ['leadEditForm','quoteForm','data-convert-order','orderForm','data-order-next','paymentAmount','riskType','submitLead','submitQuote','submitOrder']) assert.ok(app.includes(token),token);
});

test('director panels include funnel finance team sources and read-only risk controls',()=>{
  for(const token of ['ownerOverview','ownerPipeline','ownerFinance','ownerOrders','managerStats','sourceStats','financeStats','КОНТРОЛЬ']) assert.ok(app.includes(token),token);
});

test('client request and order-tracking scenarios remain available',()=>{
  for(const token of ['requestForm','clientOrders','data-request-car','data-open-request','timeline']) assert.ok(app.includes(token),token);
});

test('admin stylesheet includes responsive table and modal layouts',()=>{
  for(const token of ['auto-admin-filters','auto-data-table','auto-modal-grid','auto-timeline-full','@media(max-width:620px)']) assert.ok(css.includes(token),token);
});

test('mobile shell keeps role and bottom navigation inside narrow viewports',()=>{
  for(const token of ['@media(max-width:720px)','grid-template-columns:repeat(3,minmax(0,1fr))','grid-template-columns:repeat(4,minmax(0,1fr))','min-width:0','100dvh']) assert.ok(responsive.includes(token),token);
});

test('manager and director tables collapse into mobile cards instead of wide scroll tables',()=>{
  for(const token of ['.auto-data-head{display:none!important}','min-width:0!important','content:\'Себестоимость\'','content:\'ETA\'','.auto-data-table.finance','.auto-data-table.orders']) assert.ok(mobileAdmin.includes(token),token);
});

test('very narrow screens and landscape phones have dedicated fallbacks',()=>{
  for(const token of ['@media(max-width:380px)','@media(max-width:340px)','orientation:landscape']) assert.ok(responsive.includes(token),token);
});

test('active production bundle contains no demo business or catalog fallback data',()=>{
  for(const token of ['L-101','Q-501','O-2301','bmw-x5-22','tesla-y-23','images.unsplash.com','Демо-данные'])assert.equal(app.includes(token)||core.includes(token),false,token);
  for(const token of ['TM-DMITRY','TM-ANNA','TM-MAKSIM'])assert.equal(team.includes(token),false,token);
  assert.doesNotMatch(details,/пример автомобиля|bmw-x5-22|tesla-y-23/);
  assert.match(app,/const defaultCars=\[\]/);
  assert.match(core,/export const seedLeads = \(\) => \[\]/);
});

test('empty production state stays empty instead of restoring seeded data',async()=>{
  const mod=await import('../public/auto-sale-core.mjs?no-demo-smoke');
  assert.deepEqual(mod.seedLeads(),[]);
  assert.deepEqual(mod.seedQuotes(),[]);
  assert.deepEqual(mod.seedOrders(),[]);
});
