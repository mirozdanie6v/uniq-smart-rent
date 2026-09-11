import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateClientRequest,validateManagerLead,validateLeadUpdate,validateQuote,
  canCreateOrder,validateOrderUpdate,normalizePayments,paymentsTotal,leadTransitionAllowed
} from '../public/auto-sale-business-rules.mjs';

test('client request requires contact model and realistic budget',()=>{
  assert.ok(validateClientRequest({name:'A',contact:'',model:'BMW X5',budget:40000}).length>0);
  assert.equal(validateClientRequest({name:'A',contact:'@a',model:'BMW X5',budget:40000,yearFrom:2021,yearTo:2024}).length,0);
});

test('manager-created lead requires owner source and next action',()=>{
  const bad=validateManagerLead({name:'A',contact:'@a',model:'BMW',source:'Сайт',manager:'',nextAction:''});
  assert.ok(bad.length>=2);
});

test('lead cannot become deal without agreed quote and deposit',()=>{
  assert.equal(leadTransitionAllowed('Ожидает клиента','Сделка',{hasAgreedQuote:true,deposit:0}),false);
  assert.equal(leadTransitionAllowed('Ожидает клиента','Сделка',{hasAgreedQuote:true,deposit:5000}),true);
  const errors=validateLeadUpdate({name:'A',contact:'@a',model:'BMW',budget:40000,source:'Сайт',manager:'Анна',nextAction:'2026-09-13',status:'Сделка'}, {status:'Ожидает клиента'}, {hasAgreedQuote:true,deposit:0});
  assert.ok(errors.length>0);
});

test('sent quote requires complete cost structure and validity date',()=>{
  assert.ok(validateQuote({leadId:'L-1',model:'BMW',status:'Отправлен',lot:20000}).length>0);
  assert.equal(validateQuote({leadId:'L-1',model:'BMW',status:'Отправлен',lot:20000,auction:1000,inland:700,ocean:2500,customs:6000,service:1500,repair:0,validUntil:'2026-09-20'}).length,0);
});

test('order creation requires agreed quote plus recorded deposit',()=>{
  assert.equal(canCreateOrder({quote:{status:'На согласовании'},deposit:5000}).ok,false);
  assert.equal(canCreateOrder({quote:{status:'Согласован'},deposit:0}).ok,false);
  assert.equal(canCreateOrder({quote:{status:'Согласован'},deposit:5000}).ok,true);
});

test('logistics blocks skipped stages and missing VIN data',()=>{
  const skipped=validateOrderUpdate({stage:'В море',lot:'123',vin:'VIN',eta:'2026-10-20',location:'Atlantic',riskType:'Нет',paymentAmount:0},'Выкуп',['Выкуп','Порт США']);
  assert.ok(skipped.length>0);
  const missing=validateOrderUpdate({stage:'Порт США',lot:'123',vin:'',eta:'2026-10-20',location:'Long Beach',riskType:'Нет',paymentAmount:0},'Выкуп',['Выкуп','Порт США']);
  assert.ok(missing.length>0);
});

test('legacy paid total migrates into payment history',()=>{
  const payments=normalizePayments({paid:12000});
  assert.equal(payments.length,1);
  assert.equal(paymentsTotal(payments),12000);
});
