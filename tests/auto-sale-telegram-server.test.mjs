import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createTelegramService} from '../server/telegram-bot.mjs';

const TOKEN='123456:TEST_TOKEN';
function initData(user,{authDate=2000000000}={}){
  const params=new URLSearchParams();
  params.set('auth_date',String(authDate));
  params.set('query_id','AAEAAAE');
  params.set('user',JSON.stringify(user));
  const check=[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join('\n');
  const secret=createHmac('sha256','WebAppData').update(TOKEN).digest();
  const hash=createHmac('sha256',secret).update(check).digest('hex');
  params.set('hash',hash);
  return params.toString();
}
function fakeFetch(sent){
  return async(url,options)=>{
    sent.push({url,body:JSON.parse(options.body)});
    return{ok:true,status:200,async json(){return{ok:true,result:{message_id:sent.length}}}};
  };
}

test('Telegram WebApp initData is verified server-side',()=>{
  const service=createTelegramService({token:TOKEN,fetchImpl:async()=>{},now:()=>2000000100*1000});
  const valid=service.validateInitData(initData({id:42,username:'manager'}));
  assert.equal(valid.ok,true);
  assert.equal(valid.user.id,'42');
  const tampered=initData({id:42,username:'manager'}).replace('manager','hacker');
  assert.equal(service.validateInitData(tampered).ok,false);
});

test('manual manager message can only target the linked client',async()=>{
  const sent=[];
  const service=createTelegramService({token:TOKEN,fetchImpl:fakeFetch(sent),managerChatIds:'900'});
  const state={leads:[{
    id:'L-1',name:'Client',model:'BMW X5',telegramUserId:'700',
    managerTelegramUserId:'800'
  }]};
  await assert.rejects(()=>service.sendManual(state,{leadId:'L-1',target:'client',text:'Hello',senderId:'999'}),/telegram_sender_forbidden/);
  const result=await service.sendManual(state,{leadId:'L-1',target:'client',text:'Hello',senderId:'800'});
  assert.equal(result.ok,true);
  assert.equal(sent.length,1);
  assert.equal(sent[0].body.chat_id,'700');
  assert.match(sent[0].body.text,/AUTO МИР · сообщение менеджера/);
});

test('fallback manager chat ids receive new client request notifications',async()=>{
  const sent=[];
  const service=createTelegramService({token:TOKEN,fetchImpl:fakeFetch(sent),managerChatIds:'900,901'});
  const previous={initialized:true,leads:[],quotes:[],orders:[]};
  const next={initialized:true,leads:[{
    id:'L-NEW',name:'Anna',model:'Audi Q5',budget:40000,contact:'@anna',
    clientCreated:true,telegramUserId:'700'
  }],quotes:[],orders:[]};
  const deliveries=await service.notifyStateChanges(previous,next);
  assert.equal(deliveries.length,2);
  assert.deepEqual(sent.map(x=>x.body.chat_id),['900','901']);
  assert.match(sent[0].body.text,/новая заявка/);
});

test('order stage and payment changes notify linked client and manager',async()=>{
  const sent=[];
  const service=createTelegramService({token:TOKEN,fetchImpl:fakeFetch(sent)});
  const lead={id:'L-1',name:'Client',model:'BMW X5',telegramUserId:'700',managerTelegramUserId:'800'};
  const previous={initialized:true,leads:[lead],quotes:[],orders:[{
    id:'O-1',leadId:'L-1',model:'BMW X5',stage:'Выкуп',paid:10000,total:39000,
    payments:[{id:'PAY-1',amount:10000,paymentStage:'auction_deposit'}],
    paymentPlan:[{id:'auction_deposit',title:'1. Аукционный аванс',amount:10000},{id:'auction_balance',title:'2. Автомобиль + аукционные сборы',amount:17000}]
  }]};
  const next=structuredClone(previous);
  next.orders[0].stage='Порт США';
  next.orders[0].paid=27000;
  next.orders[0].payments.push({id:'PAY-2',amount:17000,paymentStage:'auction_balance'});
  const deliveries=await service.notifyStateChanges(previous,next);
  assert.equal(deliveries.filter(x=>x.event==='order_stage').length,2);
  assert.equal(deliveries.filter(x=>x.event==='payment').length,2);
  assert.equal(sent.length,4);
  assert.ok(sent.some(x=>/Автомобиль \+ аукционные сборы/.test(x.body.text)));
});
