export const ORDER_STAGES = ['Запрос','Подбор','Расчёт','Согласование','Выкуп','Порт США','В море','Таможня','Доставка','Выдача'];
export const LEAD_STATUSES = ['Новый','В работе','Расчёт','Ожидает клиента','Сделка','Отказ'];
export const MANAGERS = ['Дмитрий','Анна','Максим'];
export const SOURCES = ['Telegram','Instagram','Сайт','Рекомендации','WhatsApp'];

const clone = value => JSON.parse(JSON.stringify(value));
const n = value => Number(value) || 0;

const LEADS = [
  {id:'L-101',name:'Алексей',contact:'@alexey_car',model:'BMW X5 2021–2023',budget:50000,source:'Telegram',manager:'Дмитрий',status:'Расчёт',priority:'Высокий',createdAt:'2026-09-09T09:20:00Z',nextAction:'2026-09-12',note:'Нужен xDrive40i, светлый салон, без силовых повреждений.'},
  {id:'L-102',name:'Мария',contact:'+7 999 222-41-18',model:'Tesla Model Y Long Range',budget:42000,source:'Instagram',manager:'Анна',status:'Ожидает клиента',priority:'Средний',createdAt:'2026-09-09T13:05:00Z',nextAction:'2026-09-12',note:'Согласовать цвет и максимальный пробег.'},
  {id:'L-103',name:'Игорь',contact:'@igor_rav',model:'Toyota RAV4 XLE',budget:34000,source:'Сайт',manager:'Дмитрий',status:'В работе',priority:'Средний',createdAt:'2026-09-10T06:45:00Z',nextAction:'2026-09-13',note:'Важно уложиться в бюджет под ключ.'},
  {id:'L-104',name:'Олег',contact:'+7 911 620-18-05',model:'Lexus RX 350 F Sport',budget:46000,source:'Рекомендации',manager:'Максим',status:'Сделка',priority:'Высокий',createdAt:'2026-09-05T15:10:00Z',nextAction:'2026-09-12',note:'Лот выкуплен, передан в логистику.'},
  {id:'L-105',name:'Наталья',contact:'@natali_usa',model:'Mercedes-Benz GLE 350',budget:55000,source:'Telegram',manager:'Анна',status:'Расчёт',priority:'Высокий',createdAt:'2026-09-11T03:40:00Z',nextAction:'2026-09-12',note:'Только чистая история и минимальные повреждения.'},
  {id:'L-106',name:'Сергей',contact:'+7 921 370-00-91',model:'Ford Mustang Mach-E',budget:36000,source:'WhatsApp',manager:'Максим',status:'Новый',priority:'Средний',createdAt:'2026-09-11T12:15:00Z',nextAction:'2026-09-12',note:'Интересует AWD и батарея без замечаний.'},
  {id:'L-107',name:'Роман',contact:'@roman_auto',model:'BMW X3 / Audi Q5',budget:39000,source:'Instagram',manager:'Дмитрий',status:'Отказ',priority:'Низкий',createdAt:'2026-09-03T07:00:00Z',nextAction:'2026-09-08',note:'Отложил покупку на ноябрь.',lostReason:'Отложил покупку'},
  {id:'L-108',name:'Елена',contact:'+7 903 888-24-61',model:'Tesla Model 3',budget:30000,source:'Сайт',manager:'Анна',status:'В работе',priority:'Средний',createdAt:'2026-09-11T15:30:00Z',nextAction:'2026-09-13',note:'Нужен белый салон, год от 2022.'}
];

const QUOTES = [
  {id:'Q-501',leadId:'L-101',model:'BMW X5 xDrive40i 2022',lot:31400,auction:1200,inland:900,ocean:2800,customs:7200,repair:1800,service:1500,total:46800,status:'Отправлен',updatedAt:'2026-09-11T11:30:00Z'},
  {id:'Q-502',leadId:'L-102',model:'Tesla Model Y Long Range 2023',lot:27200,auction:1100,inland:700,ocean:2500,customs:6000,repair:700,service:1500,total:39700,status:'На согласовании',updatedAt:'2026-09-11T10:05:00Z'},
  {id:'Q-503',leadId:'L-103',model:'Toyota RAV4 XLE Premium 2022',lot:21100,auction:900,inland:800,ocean:2300,customs:5200,repair:0,service:1500,total:31800,status:'Черновик',updatedAt:'2026-09-11T16:40:00Z'},
  {id:'Q-504',leadId:'L-104',model:'Lexus RX 350 F Sport 2022',lot:30200,auction:1200,inland:950,ocean:2700,customs:6500,repair:750,service:1500,total:43800,status:'Согласован',updatedAt:'2026-09-06T08:00:00Z'},
  {id:'Q-505',leadId:'L-105',model:'Mercedes-Benz GLE 350 4MATIC 2021',lot:35400,auction:1300,inland:1100,ocean:2900,customs:7600,repair:2300,service:1500,total:52100,status:'Отправлен',updatedAt:'2026-09-11T14:00:00Z'}
];

const ORDERS = [
  {id:'O-2301',leadId:'L-101',customer:'Алексей',model:'BMW X5 xDrive40i 2022',manager:'Дмитрий',source:'Telegram',total:46800,cost:44200,paid:35000,stage:'В море',eta:'2026-10-18',lot:'482913',vin:'5UXCR6C0XN9***318',location:'Atlantic Ocean',risk:'Нет',updatedAt:'2026-09-11T12:00:00Z'},
  {id:'O-2302',leadId:'L-102',customer:'Мария',model:'Tesla Model Y Long Range 2023',manager:'Анна',source:'Instagram',total:39700,cost:37300,paid:22000,stage:'Порт США',eta:'2026-10-22',lot:'195044',vin:'7SAYGDEE5PF***741',location:'Long Beach, CA',risk:'Ожидает судно',updatedAt:'2026-09-11T09:00:00Z'},
  {id:'O-2303',leadId:'L-104',customer:'Олег',model:'Lexus RX 350 F Sport 2022',manager:'Максим',source:'Рекомендации',total:43800,cost:41000,paid:43800,stage:'Таможня',eta:'2026-09-20',lot:'773240',vin:'2T2HZMDA8NC***552',location:'Таможенный терминал',risk:'Документы',updatedAt:'2026-09-11T07:30:00Z'},
  {id:'O-2304',leadId:'L-103',customer:'Игорь',model:'Toyota RAV4 XLE Premium 2022',manager:'Дмитрий',source:'Сайт',total:31800,cost:29800,paid:12000,stage:'Выкуп',eta:'2026-10-29',lot:'663501',vin:'2T3P1RFV6NC***406',location:'Copart, New Jersey',risk:'Нет',updatedAt:'2026-09-11T17:20:00Z'}
];

export const seedLeads = () => clone(LEADS);
export const seedQuotes = () => clone(QUOTES);
export const seedOrders = () => clone(ORDERS);

export function calculateQuote(parts = {}) {
  return ['lot','auction','inland','ocean','customs','repair','service'].reduce((sum,key)=>sum+n(parts[key]),0);
}

export function quoteCost(parts = {}) {
  return ['lot','auction','inland','ocean','customs','repair'].reduce((sum,key)=>sum+n(parts[key]),0);
}

export function orderMargin(order = {}) {
  return n(order.total) - n(order.cost);
}

export function nextId(prefix, items = []) {
  const max = items.reduce((m,item)=>{
    const hit = String(item.id || '').match(/(\d+)$/);
    return hit ? Math.max(m, Number(hit[1])) : m;
  }, 0);
  return `${prefix}-${max + 1}`;
}

export function orderStageIndex(stage) {
  const idx = ORDER_STAGES.indexOf(stage);
  return idx < 0 ? 0 : idx;
}

export function nextOrderStage(stage) {
  return ORDER_STAGES[Math.min(orderStageIndex(stage)+1, ORDER_STAGES.length-1)];
}

export function leadStage(status) {
  const map = {
    'Новый':'Запрос',
    'В работе':'Подбор',
    'Расчёт':'Расчёт',
    'Ожидает клиента':'Согласование',
    'Сделка':'Выкуп',
    'Отказ':'Запрос'
  };
  return map[status] || 'Запрос';
}

export function clientStage(lead, order) {
  return order?.stage || leadStage(lead?.status);
}

export function filterLeads(leads = [], filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase();
  return leads.filter(lead => {
    const hay = `${lead.id} ${lead.name} ${lead.contact} ${lead.model}`.toLowerCase();
    return (!query || hay.includes(query)) &&
      (!filters.status || filters.status === 'all' || lead.status === filters.status) &&
      (!filters.source || filters.source === 'all' || lead.source === filters.source) &&
      (!filters.manager || filters.manager === 'all' || lead.manager === filters.manager);
  });
}

export function filterOrders(orders = [], filters = {}) {
  const query = String(filters.query || '').trim().toLowerCase();
  return orders.filter(order => {
    const hay = `${order.id} ${order.customer} ${order.model} ${order.vin} ${order.lot}`.toLowerCase();
    return (!query || hay.includes(query)) &&
      (!filters.stage || filters.stage === 'all' || order.stage === filters.stage) &&
      (!filters.manager || filters.manager === 'all' || order.manager === filters.manager) &&
      (!filters.risk || filters.risk === 'all' || (filters.risk === 'risk' ? order.risk !== 'Нет' : order.risk === 'Нет'));
  });
}

export function sourceStats(leads = [], orders = []) {
  const sources = [...new Set([...SOURCES, ...leads.map(x=>x.source).filter(Boolean)])];
  return sources.map(source => {
    const leadCount = leads.filter(x=>x.source===source).length;
    const deals = orders.filter(x=>x.source===source).length;
    return {source, leads:leadCount, deals, conversion:leadCount ? Math.round(deals/leadCount*100) : 0};
  }).filter(x=>x.leads || x.deals).sort((a,b)=>b.leads-a.leads);
}

export function managerStats(leads = [], orders = []) {
  const managers = [...new Set([...MANAGERS, ...leads.map(x=>x.manager).filter(Boolean)])];
  return managers.map(manager => {
    const ownedLeads = leads.filter(x=>x.manager===manager);
    const active = ownedLeads.filter(x=>!['Сделка','Отказ'].includes(x.status)).length;
    const deals = orders.filter(x=>x.manager===manager);
    const revenue = deals.reduce((sum,x)=>sum+n(x.total),0);
    const margin = deals.reduce((sum,x)=>sum+orderMargin(x),0);
    return {manager, leads:ownedLeads.length, active, deals:deals.length, revenue, margin};
  }).sort((a,b)=>b.revenue-a.revenue);
}

export function financeStats(orders = []) {
  const turnover = orders.reduce((sum,x)=>sum+n(x.total),0);
  const cost = orders.reduce((sum,x)=>sum+n(x.cost),0);
  const paid = orders.reduce((sum,x)=>sum+n(x.paid),0);
  const margin = turnover - cost;
  return {turnover,cost,paid,margin,outstanding:Math.max(0,turnover-paid),avgCheck:orders.length?Math.round(turnover/orders.length):0,marginPct:turnover?Math.round(margin/turnover*1000)/10:0};
}

export function dashboardStats(leads = [], orders = [], quotes = []) {
  const activeLeads = leads.filter(x=>!['Сделка','Отказ'].includes(x.status)).length;
  const newLeads = leads.filter(x=>x.status==='Новый').length;
  const waiting = leads.filter(x=>x.status==='Ожидает клиента').length;
  const inTransit = orders.filter(x=>!['Запрос','Подбор','Расчёт','Согласование','Выдача'].includes(x.stage)).length;
  const risky = orders.filter(x=>x.risk && x.risk!=='Нет').length;
  const wonLeadIds = new Set(orders.map(x=>x.leadId).filter(Boolean));
  const conversion = leads.length ? Math.round(wonLeadIds.size/leads.length*100) : 0;
  const openQuotes = quotes.filter(x=>!['Согласован','Отказ'].includes(x.status)).length;
  return {activeLeads,newLeads,waiting,inTransit,risky,conversion,openQuotes,deals:orders.length};
}

export function funnelStats(leads = [], orders = []) {
  const counts = {
    'Лиды': leads.length,
    'В работе': leads.filter(x=>['В работе','Расчёт','Ожидает клиента','Сделка'].includes(x.status)).length,
    'Расчёт': leads.filter(x=>['Расчёт','Ожидает клиента','Сделка'].includes(x.status)).length,
    'Согласовано': leads.filter(x=>['Ожидает клиента','Сделка'].includes(x.status)).length,
    'Сделки': new Set(orders.map(x=>x.leadId).filter(Boolean)).size
  };
  return Object.entries(counts).map(([label,value])=>({label,value}));
}

export function lostReasons(leads = []) {
  const lost = leads.filter(x=>x.status==='Отказ');
  const map = new Map();
  for (const lead of lost) {
    const reason = lead.lostReason || 'Причина не указана';
    map.set(reason,(map.get(reason)||0)+1);
  }
  return [...map.entries()].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count);
}
