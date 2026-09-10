import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const preview = spawn('npx',['vite','preview','--host','127.0.0.1','--port','4173'],{stdio:'ignore',shell:false});
const wait = (ms) => new Promise((resolve)=>setTimeout(resolve,ms));

async function waitForServer(){
  for(let i=0;i<40;i+=1){
    try{const r=await fetch('http://127.0.0.1:4173/'); if(r.ok)return;}catch{}
    await wait(250);
  }
  throw new Error('vite preview did not start');
}

try{
  await waitForServer();
  const browser=await chromium.launch({headless:true});

  const desktop=await browser.newPage({viewport:{width:1440,height:900}});
  await desktop.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const heroTitle=(await desktop.locator('.hero h1').first().textContent())?.trim();
  const heroText=(await desktop.locator('.hero p').first().textContent())?.trim();
  if(heroTitle!=='Весь парк UNIQ — прямо в Telegram.') throw new Error('final client hero title mismatch: '+heroTitle);
  if(heroText!=='Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.') throw new Error('final client hero text mismatch: '+heroText);

  for(const [target,heading] of [['employee-requests','Заявки клиентов'],['employee-fleet','Парк техники.'],['employee-handover','Выдачи и возвраты.']]){
    await desktop.locator('[data-role="employee"]').click();
    const card=desktop.locator(`[data-metric-target="${target}"]`);
    await card.waitFor();
    await card.click();
    await desktop.locator('h1').filter({hasText:heading}).waitFor();
  }

  for(const [target,needle] of [['owner-fleet','Парк'],['owner-requests','Все заявки'],['owner-calendar','Календарь'],['owner-analytics','Что приносит деньги']]){
    await desktop.locator('[data-role="owner"]').click();
    const card=desktop.locator(`[data-metric-target="${target}"]`);
    await card.waitFor();
    await card.click();
    await desktop.getByText(needle,{exact:false}).first().waitFor();
  }

  const mobile=await browser.newPage({viewport:{width:390,height:844}});
  await mobile.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await mobile.locator('[data-role="owner"]').click();
  await mobile.locator('[data-go="customers"]').last().click();
  const historyShortcut=mobile.locator('[data-rental-history]').first();
  await historyShortcut.waitFor();
  await historyShortcut.click();
  const panel=mobile.locator('[data-owner-rental-history-panel].open');
  await panel.waitFor();
  await wait(250);
  const timeline=panel.locator('[data-owner-rental-history]');
  await timeline.waitFor();
  if(!(await timeline.isVisible())) throw new Error('owner rental history timeline is not visible');
  const scrollTop=await panel.evaluate((el)=>el.scrollTop);
  if(scrollTop<=0) throw new Error('owner rental history shortcut did not scroll timeline into view');
  const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
  if(overflow) throw new Error('mobile horizontal overflow');

  await browser.close();
  console.log('Final client hero + clickable cards + owner rental history acceptance passed');
} finally {
  preview.kill('SIGTERM');
}
