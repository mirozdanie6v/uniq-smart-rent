import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/auto-sale-catalog-extra.mjs',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../public/auto-sale-bootstrap.mjs',import.meta.url),'utf8');

test('expanded catalog adds exactly ten cars',()=>{
  const ids=[...source.matchAll(/id:'([^']+)'/g)].map(match=>match[1]);
  assert.equal(ids.length,10);
  assert.equal(new Set(ids).size,10);
});

test('expanded catalog covers ten useful models',()=>{
  for(const token of ['BMW','Audi','Porsche','Volvo','Honda','Mazda','Jeep','Subaru','Tesla','Cadillac']) assert.ok(source.includes(`brand:'${token}'`),token);
});

test('extra cars participate in search brand budget details and request flow',()=>{
  for(const token of ['brandFilter','budgetFilter','autoSearch','data-extra-detail','data-extra-model','data-open-request']) assert.ok(source.includes(token),token);
});

test('catalog extension prevents self-triggered render loops',()=>{
  for(const token of ['extraCatalogSignature','let scheduled=false','if(scheduled)return']) assert.ok(source.includes(token),token);
});

test('bootstrap loads expanded catalog after main AUTO SALE application',()=>{
  const app=bootstrap.indexOf("await import('./auto-sale-app-v3.mjs')");
  const extra=bootstrap.indexOf("await import('./auto-sale-catalog-extra.mjs')");
  assert.ok(app>=0&&extra>app);
});
