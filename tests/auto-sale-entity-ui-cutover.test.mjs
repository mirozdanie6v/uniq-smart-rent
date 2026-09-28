import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=name=>readFile(new URL('../public/'+name,import.meta.url),'utf8');

test('frontend defaults to entity persistence and keeps whole-state autosync opt-in only',async()=>{
  const bootstrap=await source('auto-sale-bootstrap.mjs');
  assert.match(bootstrap,/const LEGACY_AUTOSYNC=QUERY_PARAMS\.has\('legacyAutosync'\)/);
  assert.match(bootstrap,/tracked&&!suppress&&!QUOTE_AUDIT_MODE&&LEGACY_AUTOSYNC/);
  assert.match(bootstrap,/window\.__AUTO_SALE_ENTITY_BATCH__=entityBatch/);
  assert.match(bootstrap,/window\.__AUTO_SALE_CACHE_WRITE__=writeCache/);
  assert.match(bootstrap,/setRowVersions\(state\._rowVersions\|\|\{\}\)/);
});

test('primary business UI modules use entity batches before cache updates',async()=>{
  const [app,clientQuote,director,guard]=await Promise.all([
    source('auto-sale-app-v3.mjs'),
    source('auto-sale-client-quote.mjs'),
    source('auto-sale-director-team.mjs'),
    source('auto-sale-ui-business-guard.mjs')
  ]);
  assert.match(app,/window\.__AUTO_SALE_ENTITY_BATCH__/);
  assert.match(app,/resource:'lead',operation:'patch'/);
  assert.match(app,/resource:'quote'/);
  assert.match(app,/resource:'order'/);
  assert.match(app,/resource:'payment'/);
  assert.match(app,/resource:'catalog'/);
  assert.doesNotMatch(app,/__AUTO_SALE_FLUSH__/);
  assert.match(clientQuote,/window\.__AUTO_SALE_ENTITY_BATCH__/);
  assert.match(director,/window\.__AUTO_SALE_ENTITY_BATCH__/);
  assert.match(guard,/window\.__AUTO_SALE_ENTITY_BATCH__/);
});

test('compatibility save fix cannot race entity persistence',async()=>{
  const fix=await source('auto-sale-quote-save-fix.mjs');
  assert.match(fix,/if\(window\.__AUTO_SALE_ENTITY_BATCH__\)return;/);
  assert.match(fix,/auto-sale-entity-synced/);
  assert.match(fix,/auto-sale-entity-conflict/);
});

test('Telegram and business modules write server-confirmed state through silent cache writer',async()=>{
  const [telegram,clientQuote,director,guard,app]=await Promise.all([
    source('auto-sale-telegram.mjs'),
    source('auto-sale-client-quote.mjs'),
    source('auto-sale-director-team.mjs'),
    source('auto-sale-ui-business-guard.mjs'),
    source('auto-sale-app-v3.mjs')
  ]);
  for(const body of [telegram,clientQuote,director,guard,app]){
    assert.match(body,/__AUTO_SALE_CACHE_WRITE__/);
  }
});
