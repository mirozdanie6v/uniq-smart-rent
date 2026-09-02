import { readFile, writeFile } from 'node:fs/promises';

const appPath = 'public/app-v2.js';
const cssPath = 'styles.css';
let app = await readFile(appPath, 'utf8');
let css = await readFile(cssPath, 'utf8');

const oldHero = "    return hero('UNIQ SMART RENT · NHA TRANG','Весь парк UNIQ — прямо в Telegram.','Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.',`<div class=\"hero-card\"><b>${fleet.length}</b><span>единиц техники</span><div>${metric('Точки выдачи','2','Нячанг')}${metric('Связь','Telegram · Zalo')}</div></div>`) +";
const newHero = "    return hero('UNIQ SMART RENT · NHA TRANG','Весь парк UNIQ — прямо в Telegram.','Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.',`<div class=\"hero-card\"><b>${fleet.length}</b><span>единиц техники</span><div class=\"hero-office-maps\"><a class=\"hero-office-map\" href=\"https://maps.app.goo.gl/qr3FNiVVxAdThVBV6\" target=\"_blank\" rel=\"noreferrer\" aria-label=\"UNIQ Moto, 312 Đ. 2/4 — открыть в Google Maps\"><iframe title=\"UNIQ Moto — 312 Đ. 2/4\" src=\"https://www.google.com/maps?q=UNIQ%20Moto%20312%20%C4%90.%202%2F4%20Nha%20Trang&output=embed\" loading=\"lazy\" tabindex=\"-1\"></iframe><span><b>312 Đ. 2/4</b><small>Северный филиал · Google Maps ↗</small></span></a><a class=\"hero-office-map\" href=\"https://maps.app.goo.gl/sJdMndLRPz9b228J7\" target=\"_blank\" rel=\"noreferrer\" aria-label=\"UNIQ Moto, 254 Nguyễn Thị Minh Khai — открыть в Google Maps\"><iframe title=\"UNIQ Moto — 254 Nguyễn Thị Minh Khai\" src=\"https://www.google.com/maps?q=UNIQ%20Moto%20254%20Nguyen%20Thi%20Minh%20Khai%20Nha%20Trang&output=embed\" loading=\"lazy\" tabindex=\"-1\"></iframe><span><b>254 Nguyễn Thị Minh Khai</b><small>Центр города · Google Maps ↗</small></span></a></div></div>`) +";

if (!app.includes(oldHero)) throw new Error('Expected hero cards not found');
app = app.replace(oldHero, newHero);
if (app.includes("metric('Точки выдачи','2','Нячанг')") || app.includes("metric('Связь','Telegram · Zalo')")) throw new Error('Old hero cards remain');
if (!app.includes('hero-office-map') || !app.includes('qr3FNiVVxAdThVBV6') || !app.includes('sJdMndLRPz9b228J7')) throw new Error('Hero maps missing');

if (!css.includes('.hero-office-maps{')) {
  css += `\n/* Hero office mini maps */\n.hero-card>div.hero-office-maps{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px}\n.hero-office-map{position:relative;display:block;min-height:150px;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#0a0f0c;isolation:isolate}\n.hero-office-map iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;filter:saturate(.72) brightness(.72) contrast(1.06)}\n.hero-office-map:after{content:\"\";position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(5,8,6,.2) 48%,rgba(5,8,6,.95) 100%);z-index:1}\n.hero-office-map>span{position:absolute;z-index:2;left:12px;right:12px;bottom:10px;display:grid;gap:3px}\n.hero-office-map>span b{font-size:13px;line-height:1.15;color:var(--text)}\n.hero-office-map>span small{font-size:9px;line-height:1.3;color:var(--green2)}\n.hero-office-map:hover{border-color:rgba(32,227,143,.55)}\n@media(max-width:620px){.hero-card>div.hero-office-maps{grid-template-columns:1fr 1fr}.hero-office-map{min-height:132px}.hero-office-map>span b{font-size:11px}.hero-office-map>span small{font-size:8px}}\n`;
}

await writeFile(appPath, app, 'utf8');
await writeFile(cssPath, css, 'utf8');
console.log('Hero office mini maps applied');
