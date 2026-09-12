import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const migration5=await readFile(new URL('../migrations/0005_auto_sale_crm.sql',import.meta.url),'utf8');
const migration6=await readFile(new URL('../migrations/0006_auto_sale_demo_cleanup.sql',import.meta.url),'utf8');
const migration7=await readFile(new URL('../migrations/0007_auto_sale_legacy_backfill.sql',import.meta.url),'utf8');
const worker=await readFile(new URL('../src/auto-sale-worker.ts',import.meta.url),'utf8');
const stateApi=await readFile(new URL('../src/auto-sale/state-api.ts',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../public/auto-sale-bootstrap.mjs',import.meta.url),'utf8');
const apiAudit=await readFile(new URL('../public/auto-sale-api-audit.js',import.meta.url),'utf8');
const wrangler=await readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8');

test('AUTO SALE has isolated D1 tables demo cleanup and schema 7 legacy backfill',()=>{
  for(const table of ['auto_sale_leads','auto_sale_quotes','auto_sale_orders','auto_sale_payments','auto_sale_notes','auto_sale_state_meta']) assert.ok(migration5.includes(table),table);
  assert.match(migration6,/O-DEMO-%/);assert.match(migration6,/Q-DEMO-%/);assert.match(migration6,/L-DEMO-%/);assert.match(migration6,/schema_meta \(version\) VALUES \(6\)/);
  assert.match(migration7,/validUntil/);assert.match(migration7,/riskType/);assert.match(migration7,/riskNote/);assert.match(migration7,/PAY-LEGACY/);assert.match(migration7,/schema_meta \(version\) VALUES \(7\)/);
});

test('AUTO SALE branch deploys its own Worker entry',()=>{
  assert.match(wrangler,/src\/auto-sale-worker\.ts/);assert.match(wrangler,/auto-sale-db/);assert.match(wrangler,/AUTO_SALE_DEMO_MODE/);
});

test('Worker exposes schema 7 D1 state API and virtual demo layer',()=>{
  assert.match(worker,/\/api\/auto-sale\/state/);assert.match(worker,/schemaVersion:7/);assert.match(worker,/withDemoBusiness/);assert.match(worker,/syncState/);
});

test('state API filters demo ids and enforces transitions before writes',()=>{
  for(const token of ['demoId','leadTransitionAllowed','quoteTransitionAllowed','validateOrder','quote_lead_locked','locked_quote_changed','locked_order_field_changed','new_order_must_start_at_purchase','order_prerequisites_missing']) assert.ok(stateApi.includes(token),token);
  const validationEnd=stateApi.indexOf('for(const lead of leads)await putLead');
  for(const token of ['invalid_lead_transition','invalid_quote_transition','invalid_order']) assert.ok(stateApi.indexOf(token)>=0&&stateApi.indexOf(token)<validationEnd,token);
  assert.ok(stateApi.indexOf('for(const lead of leads)await putLead')<stateApi.indexOf('return{status:200'));
});

test('browser hydrates from API and restores server state after rejected writes',()=>{
  assert.match(bootstrap,/fetch\('\/api\/auto-sale\/state'/);assert.match(bootstrap,/baseRevision:revision/);assert.match(bootstrap,/response\.status===409/);assert.match(bootstrap,/auto-sale-server-rejected/);assert.match(bootstrap,/await pullLatest\(true\)/);assert.match(bootstrap,/await import\('\.\/auto-sale-app-v3\.mjs'\)/);
});

test('live API audit has its own result and checks schema 7 demo logistics stages',()=>{
  assert.match(apiAudit,/api-audit-result/);assert.match(apiAudit,/API_AUDIT_OK/);assert.match(apiAudit,/schemaVersion\)!==7/);assert.match(apiAudit,/x\.stage==='Доставка'/);assert.match(apiAudit,/x\.stage==='Выдача'/);
});
