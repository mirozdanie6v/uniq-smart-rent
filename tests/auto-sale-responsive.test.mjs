import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync('index.html','utf8');
const base = fs.readFileSync('public/auto-sale-responsive.css','utf8');
const admin = fs.readFileSync('public/auto-sale-mobile-admin.css','utf8');

test('responsive hardening styles are loaded after base/admin styles',()=>{
  const basePos=index.indexOf('./auto-sale.css');
  const adminPos=index.indexOf('./auto-sale-admin.css');
  const responsivePos=index.indexOf('./auto-sale-responsive.css');
  const mobileAdminPos=index.indexOf('./auto-sale-mobile-admin.css');
  assert.ok(basePos>=0 && adminPos>basePos && responsivePos>adminPos && mobileAdminPos>responsivePos);
});

test('mobile navigation fits four role actions without horizontal scrolling',()=>{
  assert.match(base,/max-width:720px/);
  assert.match(base,/\.auto-bottom\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(base,/\.auto-bottom button\{min-width:0/);
  assert.match(base,/\.auto-role-switch\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('mobile cards and modals prevent common narrow-screen overflow',()=>{
  assert.match(base,/overflow-x:clip/);
  assert.match(base,/\.auto-car-top,.auto-order-head\{display:grid;grid-template-columns:1fr/);
  assert.match(base,/max-height:calc\(100dvh - 8px\)/);
  assert.match(base,/\.auto-form input,.auto-form select,.auto-form textarea\{font-size:16px\}/);
});

test('manager and director wide tables collapse into mobile cards',()=>{
  assert.match(admin,/\.auto-data-head\{display:none!important\}/);
  assert.match(admin,/min-width:0!important/);
  assert.match(admin,/\.auto-data-table\.finance/);
  assert.match(admin,/\.auto-data-table\.orders/);
  assert.match(admin,/content:'Себестоимость'/);
  assert.match(admin,/content:'ETA'/);
});

test('very narrow and landscape breakpoints are explicitly covered',()=>{
  assert.match(base,/max-width:380px/);
  assert.match(base,/max-width:340px/);
  assert.match(base,/orientation:landscape/);
});
