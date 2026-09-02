import { readFile, writeFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const write = (path, content) => writeFile(path, content, 'utf8');

function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Missing expected text for ${label}`);
  return text.replace(from, to);
}

function replaceLineContaining(text, needle, replacement, label) {
  const lines = text.split('\n');
  const indexes = lines.map((line, i) => line.includes(needle) ? i : -1).filter(i => i >= 0);
  if (indexes.length !== 1) throw new Error(`Expected one line for ${label}, found ${indexes.length}`);
  lines[indexes[0]] = replacement;
  return lines.join('\n');
}

let app = await read('public/app-v2.js');

app = mustReplace(app, "  const sync = window.UNIQ_ASSET_SYNC || {};\n", '', 'remove sync UI state');
app = mustReplace(app,
  "    owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк'],['system','Система']]",
  "    owner: [['overview','Обзор'],['requests','Заявки'],['fleet','Парк']]",
  'owner navigation');
app = mustReplace(app,
  "  const stateLabel = s => ({manager:'Подтверждает менеджер',ready:'Готов к выдаче · DEMO',service:'Сервис · DEMO',hold:'Резерв · DEMO'}[s] || s);",
  "  const stateLabel = s => ({manager:'Подтверждает менеджер',ready:'Готов к выдаче',service:'В сервисе',hold:'Резерв'}[s] || s);",
  'fleet state labels');
app = mustReplace(app,
  "    const map={home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉',system:'⚙'}; return map[id]||'•';",
  "    const map={home:'⌂',catalog:'▦',requests:'◫',contacts:'◎',dashboard:'⌘',fleet:'◆',handover:'↔',overview:'◉'}; return map[id]||'•';",
  'system icon');

app = replaceLineContaining(app, 'Фото локально',
  "    return hero('UNIQ SMART RENT · NHA TRANG','Весь парк UNIQ — прямо в Telegram.','Выбор техники, реальные фотографии, опубликованные цены и заявка менеджеру в одном Mini App.',`<div class=\"hero-card\"><b>${fleet.length}</b><span>единиц техники</span><div>${metric('Точки выдачи','2','Нячанг')}${metric('Связь','Telegram · Zalo')}</div></div>`) +",
  'client hero technical metrics');
app = replaceLineContaining(app, 'Каталог и фотографии синхронизированы',
  "      `<section class=\"proof\"><b>Актуальный парк UNIQ</b><span>Наличие конкретной единицы и выбранные даты подтверждает менеджер.</span></section>`;",
  'client sync proof');
app = app.replaceAll('локальными фотографиями', 'реальными фотографиями');
app = app.replaceAll('Live-доступность пока не подключена к backend. Финальное подтверждение делает менеджер UNIQ.', 'Наличие техники и выбранные даты подтверждает менеджер UNIQ.');
app = app.replaceAll('Открыть источник ↗', 'Подробнее о модели ↗');
app = replaceLineContaining(app, 'демонстрационного сеанса',
  "    return hero('ЗАЯВКИ',title,state.role==='client'?'Ваши заявки на аренду.':'Заявки клиентов и их текущие статусы.') +",
  'request page technical copy');

const contactsStart = app.indexOf('  function contacts() {');
const contactsEnd = app.indexOf('\n\n  function employeeDashboard()', contactsStart);
if (contactsStart < 0 || contactsEnd < 0) throw new Error('Contacts function boundary not found');
const contactsFn = `  function contacts() {
    return hero('UNIQ MOTO','Контакты и выдача.','Связь с менеджером и две точки UNIQ в Нячанге.')+
      \`<section class="contact-grid">
        <article class="contact-card"><span>Связь с менеджером</span><a class="contact-phone" href="tel:+84372112370">+84 37 211 2370</a><div class="contact-actions"><a class="primary" href="https://t.me/RikRent1" target="_blank" rel="noreferrer">Telegram · @RikRent1</a><a class="primary secondary-action" href="https://zalo.me/84372112370" target="_blank" rel="noreferrer">Zalo</a><a class="text-link" href="https://wa.me/84372112370" target="_blank" rel="noreferrer">WhatsApp</a></div></article>
        <article><span>Северный филиал</span><b>312 Đ. 2/4, Bắc Nha Trang</b><a class="text-link" href="https://maps.app.goo.gl/qr3FNiVVxAdThVBV6" target="_blank" rel="noreferrer">Открыть в Google Maps ↗</a></article>
        <article><span>Центр города</span><b>254 Nguyễn Thị Minh Khai, Nha Trang</b><a class="text-link" href="https://maps.app.goo.gl/sJdMndLRPz9b228J7" target="_blank" rel="noreferrer">Открыть в Google Maps ↗</a></article>
      </section>
      <section class="map-panel"><div class="section-head"><div><span class="eyebrow">GOOGLE MAPS</span><h2>UNIQ Moto в Нячанге</h2></div></div><iframe title="Google Maps — UNIQ Moto, Nha Trang" src="https://www.google.com/maps?q=UNIQ%20Moto%20312%20%C4%90.%202%2F4%20Nha%20Trang&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></section>\`;
  }`;
app = app.slice(0, contactsStart) + contactsFn + app.slice(contactsEnd);

app = mustReplace(app,
  "    const demoReady=Object.values(fleetState).filter(x=>x==='ready').length;",
  "    const ready=Object.values(fleetState).filter(x=>x==='ready').length;",
  'employee ready variable');
app = replaceLineContaining(app, "metric('Фото'",
  "      `<section class=\"metrics\">${metric('Открытые заявки',open.length)}${metric('Парк',fleet.length)}${metric('Готовы к выдаче',ready)}</section>`+",
  'employee technical photo metric');

app = app.replaceAll('Статусы ниже демонстрационные и хранятся только в текущем сеансе.', 'Сотрудник видит весь парк и может быстро обновлять рабочий статус техники.');
app = app.replaceAll('Готов к выдаче · DEMO', 'Готов к выдаче');
app = app.replaceAll('Сервис · DEMO', 'В сервисе');
app = app.replaceAll('Резерв · DEMO', 'Резерв');
app = app.replaceAll('Готовы · DEMO', 'Готовы к выдаче');
app = app.replaceAll('Сервис · DEMO', 'В сервисе');

app = app.replaceAll('Только показатели, которые реально следуют из текущего каталога и заявок прототипа.', 'Ключевые показатели по парку и заявкам в одном экране.');
app = app.replaceAll("metric('Парк',fleet.length,'позиции из источника')", "metric('Парк',fleet.length,'единиц техники')");
app = app.replaceAll("metric('Потенциал заявок',money(estimate),'сумма опубликованных тарифов')", "metric('Потенциал заявок',money(estimate),'по текущим тарифам')");
app = replaceLineContaining(app, 'Качество данных',
  "      `<section class=\"panel\"><span class=\"eyebrow\">ЗАЯВКИ</span><h2>Статусы заявок</h2>${statusBreakdown()}</section>`;",
  'owner data quality panel');
app = app.replaceAll('Каталог — реальный; оперативные статусы остаются DEMO до подключения live-базы.', 'Сводка по состоянию парка и готовности техники к выдаче.');
app = app.replaceAll('Полный каталог доступен сотруднику и клиенту; Owner показывает агрегированный оперативный срез.', 'Владелец видит общий срез по парку и текущим статусам техники.');
app = app.replaceAll('OWNER · FLEET', 'ПАРК ВЛАДЕЛЬЦА');
app = app.replaceAll('EMPLOYEE · FLEET', 'ПАРК СОТРУДНИКА');
app = app.replaceAll('EMPLOYEE · HANDOVER', 'ВЫДАЧИ');

app = app.replace(/\n  function systemPage\(\) \{[\s\S]*?\n  \}\n\n  function page\(\)/, '\n\n  function page()');
app = mustReplace(app,
  "    return state.route==='requests'?requestsPage():state.route==='fleet'?ownerFleet():state.route==='system'?systemPage():ownerOverview();",
  "    return state.route==='requests'?requestsPage():state.route==='fleet'?ownerFleet():ownerOverview();",
  'owner system route');

for (const banned of ['Фото локально','локальных фото','Качество данных','Cloudflare Worker','D1 schema','Production API','готова к backend',' · DEMO']) {
  if (app.includes(banned)) throw new Error(`Technical UI text still present: ${banned}`);
}
if (app.includes('sync.')) throw new Error('Sync developer data still referenced in UI');
if (!app.includes('https://t.me/RikRent1') || !app.includes('https://zalo.me/84372112370') || !app.includes('output=embed')) throw new Error('Contact links or Google map missing');
if (app.includes("['system','Система']") || app.includes("data-go=\"system\"")) throw new Error('Owner system section still reachable');
await write('public/app-v2.js', app);

let css = await read('styles.css');
if (!css.includes('.map-panel{')) {
  css += `\n\n/* Contact actions and Google Maps */\n.contact-card .contact-phone{font-size:clamp(22px,4vw,34px);font-weight:800;color:var(--text);text-decoration:none}\n.contact-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;align-items:center}\n.contact-actions .primary{width:auto;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}\n.secondary-action{background:transparent!important;color:var(--green)!important;border:1px solid rgba(32,227,143,.45)!important}\n.text-link{color:var(--green);text-decoration:none;font-weight:700}\n.map-panel{margin:22px 0 110px;padding:18px;border:1px solid var(--line);border-radius:24px;background:var(--panel)}\n.map-panel iframe{display:block;width:100%;height:min(52vh,460px);min-height:320px;border:0;border-radius:18px;background:#111}\n@media(max-width:640px){.contact-actions{align-items:stretch}.contact-actions .primary,.contact-actions .text-link{width:100%;text-align:center}.map-panel{padding:12px;border-radius:20px}.map-panel iframe{min-height:360px}}\n`;
}
await write('styles.css', css);

let audit = await read('scripts/audit-candidate.mjs');
audit = audit.replace("'function ownerOverview()','function ownerFleet()','function systemPage()','function openBooking(id)',", "'function ownerOverview()','function ownerFleet()','function openBooking(id)',");
audit = audit.replace("ownerPages:['overview','requests','fleet','system']", "ownerPages:['overview','requests','fleet']");
if (!audit.includes("function contacts()")) throw new Error('Audit structure unexpectedly changed');
audit = audit.replace("  'function clientHome()','function catalog()','function vehicleDetail()','function requestsPage()','function contacts()',", "  'function clientHome()','function catalog()','function vehicleDetail()','function requestsPage()','function contacts()',\n  'https://t.me/RikRent1','https://zalo.me/84372112370','output=embed',");
await write('scripts/audit-candidate.mjs', audit);

let e2e = await read('tests/e2e.py');
e2e = e2e.replace("assert page.locator('text=Готов к выдаче · DEMO').count()>=1", "assert page.locator('text=Готов к выдаче').count()>=1");
e2e = e2e.replace("        page.locator('[data-role=\"owner\"]').click(); page.wait_for_timeout(80)\n        assert page.locator('text=Пульс бизнеса').count()>=1\n        assert page.locator('text=Качество данных').count()>=1\n        page.locator('[data-go=\"system\"]').last.click(); page.wait_for_timeout(80)\n        assert page.locator('text=Cloudflare Worker').count()>=1\n        assert page.locator('text=D1 schema').count()>=1\n        assert page.locator('text=Telegram WebApp').count()>=1\n", "        page.locator('[data-role=\"client\"]').click(); page.wait_for_timeout(80)\n        page.locator('[data-go=\"contacts\"]').last.click(); page.wait_for_timeout(120)\n        assert page.locator('a[href=\"https://t.me/RikRent1\"]').count()==1\n        assert page.locator('a[href=\"https://zalo.me/84372112370\"]').count()==1\n        assert page.locator('.map-panel iframe').count()==1\n        page.locator('[data-role=\"owner\"]').click(); page.wait_for_timeout(80)\n        assert page.locator('text=Пульс бизнеса').count()>=1\n        assert page.locator('text=Качество данных').count()==0\n        assert page.locator('[data-go=\"system\"]').count()==0\n");
e2e = e2e.replace('"owner_system":"ok"', '"contacts":"ok","owner_clean":"ok"');
await write('tests/e2e.py', e2e);

let distE2E = await read('tests/candidate_dist_e2e.py');
distE2E = distE2E.replace("assert page.locator('text=Готов к выдаче · DEMO').count()>=1", "assert page.locator('text=Готов к выдаче').count()>=1");
distE2E = distE2E.replace("            page.locator('[data-role=\"owner\"]').click(); page.wait_for_timeout(100)\n            assert page.locator('text=OWNER').count()>=1\n            assert page.locator('.owner-metrics').count()==1\n            page.locator('[data-go=\"system\"]').last.click(); page.wait_for_timeout(80)\n            assert page.locator('text=Cloudflare Worker').count()==1\n", "            external_images=[u for u in image_hosts if not u.startswith('http://127.0.0.1:8766/')]\n            assert not external_images, external_images\n            image_hosts.clear()\n            page.locator('[data-role=\"client\"]').click(); page.wait_for_timeout(80)\n            page.locator('[data-go=\"contacts\"]').last.click(); page.wait_for_timeout(120)\n            assert page.locator('a[href=\"https://t.me/RikRent1\"]').count()==1\n            assert page.locator('a[href=\"https://zalo.me/84372112370\"]').count()==1\n            assert page.locator('.map-panel iframe').count()==1\n            page.locator('[data-role=\"owner\"]').click(); page.wait_for_timeout(100)\n            assert page.locator('text=OWNER').count()>=1\n            assert page.locator('.owner-metrics').count()==1\n            assert page.locator('text=Качество данных').count()==0\n            assert page.locator('[data-go=\"system\"]').count()==0\n");
distE2E = distE2E.replace("            external_images=[u for u in image_hosts if not u.startswith('http://127.0.0.1:8766/')]\n            assert not external_images, external_images\n", '');
distE2E = distE2E.replace("'owner_system':'ok'", "'contacts':'ok','owner_clean':'ok'");
await write('tests/candidate_dist_e2e.py', distE2E);

let capture = await read('scripts/capture-main-pages.py');
capture = capture.replace("        page.locator('[data-go=\"system\"]').last.click()\n        page.wait_for_timeout(200)\n        snap(page, '08-owner-system.png')", "        page.locator('[data-role=\"client\"]').click()\n        page.wait_for_timeout(200)\n        page.locator('[data-go=\"contacts\"]').last.click()\n        page.wait_for_timeout(500)\n        snap(page, '08-client-contacts.png')");
await write('scripts/capture-main-pages.py', capture);

console.log('Production UI cleanup patch applied successfully');
