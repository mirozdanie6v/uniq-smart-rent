import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const demo=fs.readFileSync(new URL('../src/auto-sale/demo-business.ts',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../src/auto-sale-worker.ts',import.meta.url),'utf8');

test('demo business adds delivery and handoff orders',()=>{
  assert.match(demo,/stage:'Доставка'/);
  assert.match(demo,/stage:'Выдача'/);
  assert.match(demo,/riskType:'Задержка'/);
  assert.match(demo,/payments:\[/);
});

test('demo business is exposed only through demo-mode state response',()=>{
  assert.match(worker,/AUTO_SALE_DEMO_MODE==='1'\?withDemoBusiness\(state\):state/);
  assert.match(worker,/demoBusinessOrders/);
});
