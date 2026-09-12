import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seedLeads,seedQuotes,seedOrders} from '../public/auto-sale-core.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup(tag){
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale.viiversion.com/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.FormData=dom.window.FormData;globalThis.Event=dom.window.Event;globalThis.CustomEvent=dom.window.CustomEvent;globalThis.MutationObserver=dom.window.MutationObserver;globalThis.HTMLFormElement=dom.window.HTMLFormElement;
  localStorage.setItem('auto-sale-leads-v2',JSON.stringify(seedLeads()));
  localStorage.setItem('auto-sale-quotes-v2',JSON.stringify(seedQuotes()));
  localStorage.setItem('auto-sale-orders-v2',JSON.stringify(seedOrders()));
  localStorage.setItem('auto-sale-notes-v2','{}');
  sessionStorage.setItem('auto-sale-role-v2','owner');
  await import(`../public/auto-sale-app-v3.mjs?director-app=${tag}-${Date.now()}-${Math.random()}`);
  await import(`../public/auto-sale-director-team.mjs?director=${tag}-${Date.now()}-${Math.random()}`);
  await tick();await tick();
  return{dom,root:document.querySelector('#app')};
}

test('director team rows are active and open employee deals',async()=>{
  const {dom,root}=await setup('member');
  const manage=[...root.querySelectorAll('[data-director-team]')].find(x=>/Управление командой/.test(x.textContent));
  assert.ok(manage);
  const row=root.querySelector('[data-director-member="TM-DMITRY"]');assert.ok(row);row.click();await tick();
  const modal=root.querySelector('.director-modal');assert.ok(modal);assert.match(modal.textContent,/Дмитрий/);assert.match(modal.textContent,/Сделки сотрудника/);assert.ok(modal.querySelector('[data-order]'));
  dom.window.close();
});

test('director can edit team member and assignments follow renamed manager',async()=>{
  const {dom,root}=await setup('edit');
  root.querySelector('[data-director-member="TM-DMITRY"]').click();await tick();
  root.querySelector('[data-director-edit="TM-DMITRY"]').click();await tick();
  const form=root.querySelector('#directorTeamForm');assert.ok(form);form.elements.name.value='Дмитрий Тест';form.elements.telegram.value='@dmitry_test';form.querySelector('button[type="submit"]').click();await tick();await tick();
  const member=JSON.parse(localStorage.getItem('auto-sale-team-v1')).find(x=>x.id==='TM-DMITRY');assert.equal(member.name,'Дмитрий Тест');assert.equal(member.telegram,'@dmitry_test');
  assert.ok(JSON.parse(localStorage.getItem('auto-sale-leads-v2')).filter(x=>x.manager==='Дмитрий Тест').length>0);
  assert.ok(JSON.parse(localStorage.getItem('auto-sale-orders-v2')).filter(x=>x.manager==='Дмитрий Тест').length>0);
  dom.window.close();
});

test('director KPI source and funnel information tiles are actionable',async()=>{
  const {dom,root}=await setup('tiles');
  const financeTile=root.querySelector('.auto-kpi[data-director-kpi="finance"]');assert.ok(financeTile);financeTile.click();await tick();assert.match(root.textContent,/Деньги по заказам/);
  root.querySelector('[data-go="overview"]').click();await tick();await tick();
  assert.ok(root.querySelector('[data-director-source]'));assert.ok(root.querySelector('[data-director-funnel]'));
  root.querySelector('[data-director-source]').click();await tick();assert.ok(root.querySelector('.director-modal'));
  dom.window.close();
});
