import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_LEAD_STATUSES,QUOTE_STATUSES,validateClientRequest,validateManagerLead,validateLeadUpdate,validateQuote,
  canCreateOrder,validateOrderUpdate,normalizePayments,paymentsTotal,leadTransitionAllowed,quoteTransitionAllowed,orderRequiredFields
} from '../public/auto-sale-business-rules.mjs';

const LEAD_STATUSES=['Новый','В работе','Расчёт','Ожидает клиента','Сделка','Отказ'];

test('client request requires contact model realistic budget and valid year range',()=>{
  assert.ok(validateClientRequest({name:'A',contact:'',model:'BMW X5',budget:40000}).length>0);
  assert.ok(validateClientRequest({name:'A',contact:'@a',model:'BMW X5',budget:40000,yearFrom:2025,yearTo:2021}).length>0);
  assert.equal(validateClientRequest({name:'A',contact:'@a',model:'BMW X5',budget:40000,yearFrom:2021,yearTo:2024}).length,0);
});

test('manager-created lead requires manager source and next action',()=>{
  const bad=validateManagerLead({name:'A',contact:'@a',model:'BMW',source:'Сайт',manager:'',nextAction:''});
  assert.ok(bad.length>=2);
});

test('lead transition matrix allows only canonical CRM movement',()=>{
  const allowed={
    'Новый':['Новый','В работе','Отказ'],
    'В работе':['Новый','В работе','Расчёт','Отказ'],
    'Расчёт':['В работе','Расчёт','Ожидает клиента','Отказ'],
    'Ожидает клиента':['Расчёт','Ожидает клиента','Отказ'],
    'Сделка':['Сделка'],
    'Отказ':['Отказ']
  };
  for(const from of LEAD_STATUSES)for(const to of LEAD_STATUSES)assert.equal(leadTransitionAllowed(from,to),allowed[from].includes(to),`${from} -> ${to}`);
  assert.equal(leadTransitionAllowed('Ожидает клиента','Сделка',{hasAgreedQuote:true,deposit:5000}),true);
  assert.equal(leadTransitionAllowed('Ожидает клиента','Сделка',{hasAgreedQuote:false,deposit:5000}),false);
  assert.equal(leadTransitionAllowed('Ожидает клиента','Сделка',{hasAgreedQuote:true,deposit:0}),false);
});

test('active lead requires next action while terminal refusal does not',()=>{
  const common={name:'A',contact:'@a',model:'BMW',budget:40000,source:'Сайт',manager:'Анна',nextAction:''};
  assert.ok(validateLeadUpdate({...common,status:'В работе'},{status:'Новый'}).length>0);
  assert.equal(validateLeadUpdate({...common,status:'Отказ',lostReason:'Неактуально'},{status:'Новый'}).length,0);
  assert.ok(validateLeadUpdate({...common,status:'Отказ',lostReason:''},{status:'Новый'}).length>0);
});

test('quote transition matrix locks terminal versions',()=>{
  const allowed={
    'Черновик':['Черновик','Отправлен'],
    'Отправлен':['Отправлен','На согласовании','Отказ'],
    'На согласовании':['На согласовании','Согласован','Отказ'],
    'Согласован':['Согласован'],
    'Отказ':['Отказ']
  };
  assert.equal(quoteTransitionAllowed('','Черновик'),true);
  assert.equal(quoteTransitionAllowed('','Отправлен'),true);
  assert.equal(quoteTransitionAllowed('','Согласован'),false);
  for(const from of QUOTE_STATUSES)for(const to of QUOTE_STATUSES)assert.equal(quoteTransitionAllowed(from,to),allowed[from].includes(to),`${from} -> ${to}`);
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

test('logistics fields start at US port and remain required through handoff',()=>{
  assert.deepEqual(orderRequiredFields('Выкуп'),[]);
  for(const stage of ['Порт США','В море','Таможня','Доставка','Выдача'])assert.deepEqual(orderRequiredFields(stage),['lot','vin','eta','location'],stage);
});

test('logistics blocks skipped stages missing fields unnoted risks and invalid payments',()=>{
  assert.ok(validateOrderUpdate({stage:'В море',lot:'123',vin:'VIN',eta:'2026-10-20',location:'Atlantic',riskType:'Нет',paymentAmount:0},'Выкуп',['Выкуп','Порт США']).length>0);
  assert.ok(validateOrderUpdate({stage:'Порт США',lot:'123',vin:'',eta:'2026-10-20',location:'Long Beach',riskType:'Нет',paymentAmount:0},'Выкуп',['Выкуп','Порт США']).length>0);
  assert.ok(validateOrderUpdate({stage:'Порт США',lot:'123',vin:'VIN',eta:'2026-10-20',location:'Long Beach',riskType:'Задержка',riskNote:'',paymentAmount:0},'Выкуп',['Выкуп','Порт США']).length>0);
  assert.ok(validateOrderUpdate({stage:'Порт США',lot:'123',vin:'VIN',eta:'2026-10-20',location:'Long Beach',riskType:'Нет',paymentAmount:1000,paymentDate:''},'Выкуп',['Выкуп','Порт США']).length>0);
  assert.equal(validateOrderUpdate({stage:'Порт США',lot:'123',vin:'VIN',eta:'2026-10-20',location:'Long Beach',riskType:'Нет',paymentAmount:1000,paymentDate:'2026-09-12'},'Выкуп',['Выкуп','Порт США']).length,0);
});

test('issued vehicle cannot move backward',()=>{
  assert.ok(validateOrderUpdate({stage:'Доставка',lot:'123',vin:'VIN',eta:'2026-09-12',location:'City',riskType:'Нет',paymentAmount:0},'Выдача',['Выдача']).length>0);
});

test('legacy paid total migrates into payment history',()=>{
  const payments=normalizePayments({paid:12000});
  assert.equal(payments.length,1);
  assert.equal(paymentsTotal(payments),12000);
});

test('active status registry matches CRM matrix',()=>{
  assert.deepEqual(ACTIVE_LEAD_STATUSES,['Новый','В работе','Расчёт','Ожидает клиента']);
});
