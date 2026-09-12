import type { AnyRecord } from './types.js';

export const demoLeads:AnyRecord[]=[
  {id:'L-DEMO-205',name:'Demo Delivery',contact:'demo',model:'Ford Mustang Mach-E 2022',budget:36000,source:'WhatsApp',manager:'Максим',status:'Сделка',priority:'Средний',createdAt:'2026-08-18T10:00:00Z',nextAction:'2026-09-13',note:'Автомобиль передан во внутреннюю доставку.',deposit:14000,depositDate:'2026-08-22',paymentMethod:'Банк'},
  {id:'L-DEMO-206',name:'Demo Handoff',contact:'demo',model:'Tesla Model 3 Long Range 2023',budget:34000,source:'Сайт',manager:'Дмитрий',status:'Сделка',priority:'Средний',createdAt:'2026-08-12T10:00:00Z',nextAction:'2026-09-13',note:'Автомобиль готов к выдаче клиенту.',deposit:16000,depositDate:'2026-08-15',paymentMethod:'Банк'}
];

export const demoQuotes:AnyRecord[]=[
  {id:'Q-DEMO-205',leadId:'L-DEMO-205',model:'Ford Mustang Mach-E 2022',lot:23000,auction:1000,inland:700,ocean:2400,customs:5200,repair:600,service:1500,total:34400,status:'Согласован',version:1,validUntil:'2026-09-18',updatedAt:'2026-08-22T08:00:00Z'},
  {id:'Q-DEMO-206',leadId:'L-DEMO-206',model:'Tesla Model 3 Long Range 2023',lot:22100,auction:950,inland:650,ocean:2300,customs:5000,repair:400,service:1500,total:32900,status:'Согласован',version:1,validUntil:'2026-09-18',updatedAt:'2026-08-15T08:00:00Z'}
];

export const demoOrders:AnyRecord[]=[
  {id:'O-DEMO-205',leadId:'L-DEMO-205',customer:'Demo Delivery',model:'Ford Mustang Mach-E 2022',manager:'Максим',source:'WhatsApp',total:34400,cost:32900,stage:'Доставка',eta:'2026-09-16',lot:'DEMO-205',vin:'DEMO-MACHE-205',location:'Автовоз до города выдачи',riskType:'Задержка',riskNote:'Перенос прибытия на один день из-за графика перевозчика.',risk:'Задержка',payments:[{id:'PAY-1',amount:14000,date:'2026-08-22',method:'Банк',note:'Депозит'},{id:'PAY-2',amount:16000,date:'2026-09-09',method:'Банк',note:'Основная доплата'}],paid:30000,updatedAt:'2026-09-12T03:50:00Z'},
  {id:'O-DEMO-206',leadId:'L-DEMO-206',customer:'Demo Handoff',model:'Tesla Model 3 Long Range 2023',manager:'Дмитрий',source:'Сайт',total:32900,cost:31400,stage:'Выдача',eta:'2026-09-12',lot:'DEMO-206',vin:'DEMO-M3-206',location:'Площадка выдачи',riskType:'Нет',riskNote:'',risk:'Нет',payments:[{id:'PAY-1',amount:16000,date:'2026-08-15',method:'Банк',note:'Депозит'},{id:'PAY-2',amount:16900,date:'2026-09-11',method:'Банк',note:'Финальный расчёт'}],paid:32900,updatedAt:'2026-09-12T03:40:00Z'}
];

export const demoNotes:Record<string,AnyRecord[]>={
  'L-DEMO-205':[{id:'N-DEMO-205',at:'2026-09-12T03:50:00Z',text:'Автомобиль передан на автовоз. ETA перенесён на один день.'}],
  'L-DEMO-206':[{id:'N-DEMO-206',at:'2026-09-12T03:40:00Z',text:'Автомобиль готов к выдаче, финальный расчёт получен.'}]
};
