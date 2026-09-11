import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migration=await readFile(new URL('../migrations/0005_auto_sale_crm.sql',import.meta.url),'utf8');
const worker=await readFile(new URL('../src/auto-sale-worker.ts',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../public/auto-sale-bootstrap.mjs',import.meta.url),'utf8');
const wrangler=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');

test('AUTO SALE has isolated D1 entity tables',()=>{
  for(const table of ['auto_sale_leads','auto_sale_quotes','auto_sale_orders','auto_sale_payments','auto_sale_notes','auto_sale_state_meta']) assert.ok(migration.includes(table),table);
  assert.match(migration,/schema_meta \(version\) VALUES \(5\)/);
});

test('AUTO SALE branch deploys its own Worker entry',()=>{
  assert.match(wrangler,/src\/auto-sale-worker\.ts/);
  assert.match(wrangler,/auto-sale-db/);
  assert.match(wrangler,/AUTO_SALE_DEMO_MODE/);
});

test('Worker exposes D1 health and state API',()=>{
  assert.match(worker,/\/api\/auto-sale\/state/);
  assert.match(worker,/schemaVersion:5/);
  assert.match(worker,/loadState/);
  assert.match(worker,/syncState/);
});

test('browser hydrates from API and keeps localStorage only as cache',()=>{
  assert.match(bootstrap,/fetch\('\/api\/auto-sale\/state'/);
  assert.match(bootstrap,/baseRevision:revision/);
  assert.match(bootstrap,/revision_conflict|response\.status===409/);
  assert.match(bootstrap,/Storage\.prototype\.setItem/);
  assert.match(bootstrap,/await import\('\.\/auto-sale-app-v3\.mjs'\)/);
});
