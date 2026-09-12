import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const demo=fs.readFileSync(new URL('../src/auto-sale/demo-business.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0008_auto_sale_persistent_demo_cards.sql',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../src/auto-sale-worker.ts',import.meta.url),'utf8');

test('demo business fixture covers delivery and handoff orders',()=>{
  assert.match(demo,/stage:'Доставка'/);
  assert.match(demo,/stage:'Выдача'/);
  assert.match(demo,/riskType:'Задержка'/);
  assert.match(demo,/payments:\[/);
});

test('demo cards are seeded as normal D1 CRM entities',()=>{
  for(const id of ['L-DEMO-205','L-DEMO-206','Q-DEMO-205','Q-DEMO-206','O-DEMO-205','O-DEMO-206'])assert.ok(migration.includes(id),id);
  for(const table of ['auto_sale_leads','auto_sale_quotes','auto_sale_orders','auto_sale_payments','auto_sale_notes'])assert.ok(migration.includes(table),table);
  assert.match(migration,/schema_meta \(version\) VALUES \(8\)/);
  assert.match(worker,/demoCardsPersistent:true/);
  assert.doesNotMatch(worker,/withDemoBusiness/);
});
