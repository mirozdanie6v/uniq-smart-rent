import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('lead save handler remains wired',()=>{
  const app=fs.readFileSync('public/auto-sale-app-v3.mjs','utf8');
  assert.match(app,/function submitLead\(/);
  assert.match(app,/form\.id==='leadEditForm'/);
  const bootstrap=fs.readFileSync('public/auto-sale-bootstrap.mjs','utf8');
  assert.match(bootstrap,/mergeDemoRows/);
  assert.match(bootstrap,/state\.demoBusiness/);
});
