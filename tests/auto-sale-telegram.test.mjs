import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('../public/auto-sale-telegram.mjs',import.meta.url),'utf8');
const catalog=await readFile(new URL('../public/auto-sale-catalog-extra.mjs',import.meta.url),'utf8');

test('Telegram Mini App identity prefills client request',()=>{
  for(const token of ['initDataUnsafe','first_name','last_name','username','telegramUserId','telegramUsername','telegramDisplayName']) assert.ok(source.includes(token),token);
  assert.ok(source.includes('autofillClientRequest'));
  assert.ok(source.includes("form.elements.managerMode?.value!=='0'"));
});

test('client order cards become openable detailed cards',()=>{
  for(const token of ['data-client-lead','showClientDetail','auto-client-order-grid','auto-client-track','LOT','VIN','Оплачено']) assert.ok(source.includes(token),token);
});

test('client can contact assigned manager in Telegram',()=>{
  assert.ok(source.includes('data-tg-manager'));
  assert.ok(source.includes('managerTelegramUsername'));
  assert.ok(source.includes('Написать менеджеру в Telegram'));
});

test('manager can contact client from lead using Telegram username or id',()=>{
  assert.ok(source.includes('data-tg-client'));
  assert.ok(source.includes('clientTelegram'));
  assert.ok(source.includes('telegramUserId'));
  assert.ok(source.includes('Написать клиенту в Telegram'));
});

test('manager Telegram contact is persisted inside lead payload',()=>{
  for(const token of ['managerTelegramUsername','managerTelegramUserId','managerTelegramName','patchLead']) assert.ok(source.includes(token),token);
});

test('catalog module loads Telegram integration in current bootstrap chain',()=>{
  assert.ok(catalog.includes("await import('./auto-sale-telegram.mjs')"));
});
