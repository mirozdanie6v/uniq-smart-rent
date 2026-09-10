import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless:true });

async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ scroll:document.documentElement.scrollWidth, client:document.documentElement.clientWidth }));
  if (size.scroll > size.client + 2) throw new Error(`${label}: horizontal overflow ${size.scroll}/${size.client}`);
}

async function seedClient(page) {
  await page.goto(base + '/');
  await page.evaluate(() => {
    sessionStorage.setItem('uniq-role-v2','client');
    sessionStorage.setItem('uniq-demo-requests-v4-stage12', JSON.stringify([{
      id:'ux-click-request', vehicleId:'yamaha-x-max-2024-76826', from:'2026-09-12', to:'2026-09-16', client:'Иван Петров', contact:'@ivan_petrov', status:'confirmed', estimate:7200000, createdAt:new Date().toISOString(), paymentStatus:'partially_paid', paidVnd:2160000, branchId:'branch-center', sourceChannel:'telegram_mini_app'
    }]));
  });
  await page.reload();
}

for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
  const page = await browser.newPage({ viewport });
  const errors=[];
  page.on('pageerror', error => errors.push(`pageerror:${error.message}`));
  page.on('response', response => {
    const type=response.request().resourceType();
    if (response.status() >= 400 && ['script','stylesheet','xhr','fetch'].includes(type) && !response.url().includes('maps.googleapis.com')) {
      errors.push(`${response.status()} ${type} ${response.url()}`);
    }
  });
  await page.route('**/api/fleet-overrides', route => route.fulfill({ status:200, contentType:'application/json', body:'{"vehicles":[]}' }));
  await seedClient(page);
  await page.getByText('Техника для Нячанга — бронь за пару минут.', { exact:true }).waitFor();
  if (await page.getByText('Связались', { exact:true }).count()) throw new Error('Связались is visible');

  await page.locator('[data-go="catalog"]').last().click();
  for (const kind of ['car','motorcycle','scooter']) {
    await page.locator('#typeFilter').selectOption(kind);
    const card=page.locator('.vehicle-card').first();
    await card.waitFor();
    await card.click();
    await page.locator('[data-vehicle-dossier]').waitFor();
    if (await page.locator('.source-link').count()) throw new Error(`external model source remains for ${kind}`);
    if (!(await page.locator('[data-vehicle-dossier]').innerText()).includes('Характеристики')) throw new Error(`dossier missing for ${kind}`);
    await page.locator('[data-go="catalog"]').first().click();
  }

  await page.locator('[data-go="requests"]').last().click();
  const card=page.locator('[data-request-card="ux-click-request"]');
  await card.waitFor();
  await card.click({ position:{ x:12, y:12 } });
  await page.locator('[data-request-detail-focus="request"]').waitFor();
  await page.locator('.request-detail-modal .modal-x').click();
  await page.locator('[data-request-client="ux-click-request"]').click();
  await page.locator('[data-request-detail-focus="client"]').waitFor();
  await page.getByText('Иван Петров', { exact:true }).last().waitFor();
  await page.locator('.request-detail-modal .modal-x').click();

  for (const role of ['employee','owner']) {
    await page.locator(`[data-role="${role}"]`).click();
    await page.locator('[data-go="requests"]').last().click();
    const roleCard=page.locator('[data-request-card]').first();
    await roleCard.waitFor();
    await roleCard.click({ position:{ x:12, y:12 } });
    await page.locator('[data-request-detail-focus="request"]').waitFor();
    await page.locator('.request-detail-modal .modal-x').click();
    const clientLink=page.locator('[data-request-client]').first();
    await clientLink.click();
    await page.locator('[data-request-detail-focus="client"]').waitFor();
    await page.locator('.request-detail-modal .modal-x').click();
  }

  if (await page.getByText('Связались', { exact:true }).count()) throw new Error('Связались remains in role UI');
  await noOverflow(page, `${viewport.width}x${viewport.height}`);
  if (errors.length) throw new Error('Critical browser errors: ' + errors.join(' | '));
  await page.close();
}

await browser.close();
console.log('UX request/model browser acceptance passed: client + employee + owner, car + motorcycle + scooter');
