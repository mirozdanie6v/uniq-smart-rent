import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=name=>readFile(new URL('../'+name,import.meta.url),'utf8');

test('Phase 6 retires the browser whole-state write path',async()=>{
  const bootstrap=await root('public/auto-sale-bootstrap.mjs');
  assert.ok(bootstrap.includes('window.__AUTO_SALE_LEGACY_AUTOSYNC__=false'));
  assert.ok(!bootstrap.includes('legacyAutosync'));
  assert.ok(!bootstrap.includes("__AUTO_SALE_FLUSH__"));
  assert.ok(!bootstrap.includes("method:'PUT'"));
  assert.ok(bootstrap.includes('window.__AUTO_SALE_ENTITY_BATCH__=entityBatch'));
});

test('Phase 6 entity commands use normalized authoritative state',async()=>{
  const commands=await root('server/ydb-entity-commands.mjs');
  assert.ok(commands.includes('domainStore.loadState()'));
  assert.ok(commands.includes('legacyStore.commitDomainState'));
  assert.ok(commands.includes('authoritativeSyncStore'));
  assert.ok(!commands.includes('legacyStore.loadState()'));
  assert.ok(!commands.includes('syncYdbState(legacyStore'));
});

test('Phase 6 runtime refuses legacy whole-state writes by default',async()=>{
  const server=await root('server/yandex-server.mjs');
  assert.ok(server.includes('AUTO_SALE_LEGACY_STATE_WRITE'));
  assert.ok(server.includes("error:'legacy_state_write_retired'"));
  assert.ok(server.includes("legacyStateWrite:legacyStateWriteEnabled?'rollback-only':'retired'"));
  assert.ok(server.includes('commitDomainState(state,cleared'));
  assert.ok(server.includes("(await getDomainStore()).loadState()"));
});

test('Phase 6 normalized reads are authoritative when legacy writes are retired',async()=>{
  const readMode=await root('server/ydb-read-mode.mjs');
  assert.ok(readMode.includes('authoritativeNormalized=false'));
  assert.ok(readMode.includes("mode==='normalized'&&authoritativeNormalized"));
  assert.ok(readMode.includes("source:'normalized'"));
  assert.ok(readMode.includes('authoritative:true'));
});

test('Phase 6 deployment disables dual-write and gates legacy retirement',async()=>{
  const workflow=await root('.github/workflows/deploy-yandex-staging.yml');
  assert.ok(workflow.includes('AUTO_SALE_YDB_DUAL_WRITE: "false"'));
  assert.ok(workflow.includes('AUTO_SALE_LEGACY_STATE_WRITE: "false"'));
  assert.ok(workflow.includes('Verify legacy whole-state write is retired'));
  assert.ok(workflow.includes('legacy-retirement-snapshot'));
});


test('Phase 6 live scenarios cannot use the retired whole-state writer',async()=>{
  const telegram=await root('scripts/test-telegram-lifecycle.mjs');
  const ui=await root('scripts/test-ui-manager-director-live.mjs');
  assert.ok(telegram.includes('/api/auto-sale/entities/batch'));
  assert.ok(!telegram.includes("method:'PUT'"));
  assert.ok(telegram.includes('/api/auto-sale/admin/cleanup-test-scenario'));
  assert.ok(ui.includes('/api/auto-sale/entities/batch'));
  assert.ok(ui.includes('legacyWholeStateWrites'));
});

test('Phase 6 Telegram lifecycle versions child creates against their parent aggregate',async()=>{
  const telegram=await root('scripts/test-telegram-lifecycle.mjs');
  assert.ok(telegram.includes("['note','payment'].includes(String(operation.resource||''))"));
  assert.ok(telegram.includes('operation.baseRowVersion=version'));
  assert.ok(telegram.includes("resource:'payment',operation:'create',orderId"));
});

test('Phase 6 Telegram lifecycle retries only transient receipt and outbox failures',async()=>{
  const telegram=await root('scripts/test-telegram-lifecycle.mjs');
  assert.ok(telegram.includes('[500,502,503,504].includes(checked.response.status)'));
  assert.ok(telegram.includes('[500,502,503,504].includes(processed.response.status)'));
  assert.ok(telegram.includes("delivery receipts HTTP '+checked.response.status"));
  assert.ok(telegram.includes('/api/auto-sale/notifications/revision?revision='));
  assert.ok(telegram.includes('wanted.has(item.id)'));
});

