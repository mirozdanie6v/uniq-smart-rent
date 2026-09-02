import { readFile, writeFile } from 'node:fs/promises';

const path='public/app-v2.js';
let app=await readFile(path,'utf8');
const replace=(from,to,label)=>{
  if(!app.includes(from)) throw new Error(`Missing ${label}`);
  app=app.replace(from,to);
};

replace('<span class="eyebrow">BOOKING DEMO</span>','<span class="eyebrow">БРОНИРОВАНИЕ</span>','booking label');
replace('Создать демо-заявку','Отправить заявку','booking button');
replace('Демо-заявка хранится только в текущем сеансе и сразу становится видна сотруднику и владельцу.','После отправки заявка появится в разделе «Мои заявки» и будет доступна сотруднику и владельцу.','booking note');
replace('<div class="fatal"><b>Каталог ещё не синхронизирован.</b><span>Ожидается локальный assets/fleet-manifest.js.</span></div>','<div class="fatal"><b>Каталог временно недоступен.</b><span>Обновите страницу или свяжитесь с менеджером UNIQ.</span></div>','catalog error');
app=app.replaceAll("hero('EMPLOYEE'","hero('СОТРУДНИК'");
app=app.replaceAll("hero('OWNER'","hero('ВЛАДЕЛЕЦ'");

for(const text of ['BOOKING DEMO','Создать демо-заявку','Демо-заявка хранится','Каталог ещё не синхронизирован','assets/fleet-manifest.js']){
  if(app.includes(text)) throw new Error(`Visible technical copy remains: ${text}`);
}
await writeFile(path,app,'utf8');
console.log('Final visible technical copy removed');
