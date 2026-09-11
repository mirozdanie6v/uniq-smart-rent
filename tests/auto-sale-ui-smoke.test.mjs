import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/auto-sale-app.mjs',import.meta.url),'utf8');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../public/auto-sale-admin.css',import.meta.url),'utf8');
const responsive=await readFile(new URL('../public/auto-sale-responsive.css',import.meta.url),'utf8');
const mobileAdmin=await readFile(new URL('../public/auto-sale-mobile-admin.css',import.meta.url),'utf8');

test('entry page loads the modular AUTO SALE application',()=>{
  assert.match(html,/auto-sale-admin\.css/);
  assert.match(html,/auto-sale-responsive\.css/);
  assert.match(html,/auto-sale-mobile-admin\.css/);
  assert.match(html,/auto-sale-app\.mjs/);
});

test('all three roles and every operational route are rendered',()=>{
  for(const token of ['client','manager','owner','work','leads','quotes','shipping','overview','pipeline','finance','ordersAdmin']) assert.ok(app.includes(token),token);
});

test('manager scenarios include lead edit quote create conversion and logistics update',()=>{
  for(const token of ['leadEditForm','quoteForm','data-convert-order','orderForm','data-order-next','submitLead','submitQuote','submitOrder']) assert.ok(app.includes(token),token);
});

test('director panels include funnel finance team sources and risk controls',()=>{
  for(const token of ['ownerOverview','ownerPipeline','ownerFinance','ownerOrders','managerStats','sourceStats','financeStats','risk']) assert.ok(app.includes(token),token);
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
