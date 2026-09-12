import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/auto-sale-photo-catalog.mjs',import.meta.url),'utf8');
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');

const models=['BMW X5 xDrive40i','Tesla Model Y Long Range','Toyota RAV4 XLE Premium','Ford Mustang Mach-E','Mercedes-Benz GLE 350 4MATIC','Lexus RX 350 F Sport','BMW X3 xDrive30i','Audi Q5 Premium Plus','Porsche Macan S','Volvo XC60 B5 Momentum','Honda CR-V EX-L','Mazda CX-5 Turbo','Jeep Grand Cherokee Limited','Subaru Outback Limited','Tesla Model 3 Long Range','Cadillac XT5 Premium Luxury'];

test('verified photo map covers all sixteen catalog models',()=>{
  for(const model of models)assert.ok(source.includes(`model:'${model}'`),model);
  assert.equal((source.match(/\{id:'[^']+',model:/g)||[]).length,16);
});

test('verified photo map has unique model-specific sources and no Unsplash placeholders',()=>{
  const urls=[...source.matchAll(/image:'(https:[^']+)'/g)].map(match=>match[1]);
  assert.equal(urls.length,16);
  assert.equal(new Set(urls).size,16);
  assert.equal(urls.some(url=>url.includes('images.unsplash.com')),false);
});

test('entry page loads photo verification module',()=>{
  assert.ok(index.includes('./auto-sale-photo-catalog.mjs'));
  assert.ok(source.includes('data.photoVerified')||source.includes('dataset.photoVerified'));
});
