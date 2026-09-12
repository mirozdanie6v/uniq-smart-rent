import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seedLeads,seedQuotes,seedOrders} from '../public/auto-sale-core.mjs';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('draft quote saves on mobile-style form even when lead select is temporarily disabled',async()=>{
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale.viiversion.com/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.FormData=dom.window.FormData;globalThis.Event=dom.window.Event;globalThis.CustomEvent=dom.window.CustomEvent;globalThis.MutationObserver=dom.window.MutationObserver;globalThis.HTMLFormElement=dom.window.HTMLFormElement;globalThis.EventTarget=dom.window.EventTarget;globalThis.Element=dom.window.Element;globalThis.Storage=dom.window.Storage;
  localStorage.setItem('auto-sale-leads-v2',JSON.stringify(seedLeads()));
  localStorage.setItem('auto-sale-quotes-v2',JSON.stringify(seedQuotes()));
  localStorage.setItem('auto-sale-orders-v2',JSON.stringify(seedOrders()));
  localStorage.setItem('auto-sale-notes-v2',JSON.stringify({}));

  const tag=`mobile-${Date.now()}-${Math.random()}`;
  await import(`../public/auto-sale-submit-bridge.mjs?${tag}`);
  await import(`../public/auto-sale-app-v3.mjs?${tag}`);
  await import(`../public/auto-sale-ui-business-guard.mjs?${tag}`);
  await import(`../public/auto-sale-quote-lead-serialization.mjs?${tag}`);
  await import(`../public/auto-sale-quote-save-fix.mjs?${tag}`);
  await tick();

  const root=document.querySelector('#app');
  root.querySelector('[data-role="manager"]').click();
  root.querySelector('[data-go="quotes"]').click();
  const before=JSON.parse(localStorage.getItem('auto-sale-quotes-v2')).length;
  root.querySelector('[data-new-quote]').click();
  await tick();

  const form=root.querySelector('#quoteForm');
  assert.ok(form);
  const lead=form.querySelector('select[name="leadId"]');
  assert.ok(lead?.value);
  lead.disabled=true;
  form.querySelectorAll('input[type="hidden"][name="leadId"]').forEach(x=>x.remove());
  assert.equal(new dom.window.FormData(form).get('leadId'),null);

  form.querySelector('button[type="submit"]').click();
  await tick();

  const rows=JSON.parse(localStorage.getItem('auto-sale-quotes-v2'));
  assert.equal(rows.length,before+1);
  const saved=rows.at(-1);
  assert.equal(saved.status,'Черновик');
  assert.equal(saved.total,1500);
  assert.ok(saved.leadId);
  assert.equal(root.querySelector('#quoteForm'),null);
  assert.match(root.textContent,/Калькуляции клиентам/i);
  dom.window.close();
});
