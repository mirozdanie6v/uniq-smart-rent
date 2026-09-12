import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {seedLeads,seedQuotes,seedOrders} from '../public/auto-sale-core.mjs';

async function setup(tag,{custom=false}={}){
  const dom=new JSDOM('<!doctype html><div id="app"></div>',{url:'https://auto-sale.viiversion.com/'});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.localStorage=dom.window.localStorage;globalThis.sessionStorage=dom.window.sessionStorage;globalThis.FormData=dom.window.FormData;globalThis.Event=dom.window.Event;globalThis.CustomEvent=dom.window.CustomEvent;globalThis.MutationObserver=dom.window.MutationObserver;globalThis.HTMLFormElement=dom.window.HTMLFormElement;
  if(custom){
    const leads=seedLeads();leads.push({id:'L-999',name:'Guard Test',contact:'demo',model:'Audi Q5',budget:40000,source:'Сайт',manager:'Анна',status:'Ожидает клиента',priority:'Средний',createdAt:'2026-09-12T00:00:00Z',nextAction:'2026-09-13',note:'',deposit:0});
    const quotes=seedQuotes();quotes.push({id:'Q-999',leadId:'L-999',model:'Audi Q5',lot:25000,auction:1000,inland:800,ocean:2500,customs:6000,repair:1000,service:1500,total:37800,status:'Согласован',version:1,validUntil:'2026-09-20',updatedAt:'2026-09-12T00:00:00Z'});
    localStorage.setItem('auto-sale-leads-v2',JSON.stringify(leads));localStorage.setItem('auto-sale-quotes-v2',JSON.stringify(quotes));localStorage.setItem('auto-sale-orders-v2',JSON.stringify(seedOrders()));
  }
  await import(`../public/auto-sale-app-v3.mjs?guard-app=${tag}-${Date.now()}-${Math.random()}`);
  await import(`../public/auto-sale-ui-business-guard.mjs?guard=${tag}-${Date.now()}-${Math.random()}`);
  return{dom,root:document.querySelector('#app')};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));

test('existing quote keeps its original lead locked in UI',async()=>{
  const {dom,root}=await setup('quote-lock');
  root.querySelector('[data-role="manager"]').click();root.querySelector('[data-go="quotes"]').click();root.querySelector('[data-quote="Q-501"]').click();await tick();
  const form=root.querySelector('#quoteForm'),select=form.querySelector('select[name="leadId"]'),hidden=form.querySelector('input[type="hidden"][name="leadId"]');
  assert.equal(select.disabled,true);assert.equal(hidden.value,'L-101');assert.match(form.textContent,/Лид зафиксирован/);
  dom.window.close();
});

test('new quote excludes deal and refused leads',async()=>{
  const {dom,root}=await setup('quote-new');
  root.querySelector('[data-role="manager"]').click();root.querySelector('[data-go="quotes"]').click();root.querySelector('[data-new-quote]').click();await tick();
  const ids=[...root.querySelector('#quoteForm select[name="leadId"]').options].map(x=>x.value);
  assert.equal(ids.includes('L-104'),false);assert.equal(ids.includes('L-107'),false);assert.ok(ids.includes('L-101'));
  dom.window.close();
});

test('deposit above agreed quote is stopped before base submit handler',async()=>{
  const {dom,root}=await setup('deposit-cap',{custom:true});
  root.querySelector('[data-role="manager"]').click();root.querySelector('[data-go="leads"]').click();root.querySelector('[data-lead="L-999"]').click();await tick();
  const form=root.querySelector('#leadEditForm'),deposit=form.querySelector('[name="deposit"]');assert.ok(deposit);deposit.value='40000';
  form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  const lead=JSON.parse(localStorage.getItem('auto-sale-leads-v2')).find(x=>x.id==='L-999');assert.equal(Number(lead.deposit)||0,0);assert.match(form.textContent,/превышает согласованную стоимость/);
  dom.window.close();
});
