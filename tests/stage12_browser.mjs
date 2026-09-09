import { chromium } from 'playwright';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('/tmp/stage12-ui.json', 'utf8'));
const base = process.env.BASE_URL ?? 'http://127.0.0.1:8787';
const browser = await chromium.launch({ headless: true });
const consoleErrors = [];

async function assertNoOverflow(page, label) {
  const sizes = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sizes.sw > sizes.cw + 2) throw new Error(`${label} horizontal overflow ${sizes.sw}/${sizes.cw}`);
}

async function assertOwnerAnalyticsVisible(page, label) {
  const nav = page.locator('.bottom-nav');
  if (await nav.locator('button').count() !== 10) throw new Error(`${label}: owner must expose 10 primary sections`);
  const analytics = page.locator('[data-go="analytics"]');
  await analytics.waitFor();
  const box = await analytics.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport || box.x < 0 || box.y < 0 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
    throw new Error(`${label}: analytics navigation is not visibly reachable`);
  }
  await analytics.click();
  await page.locator('[data-stage11-analytics]').waitFor();
  await page.getByText('Что приносит деньги — видно сразу.').waitFor();
}

async function seedClient(page) {
  await page.goto(base + '/');
  await page.evaluate((fixture) => {
    sessionStorage.setItem('uniq-role-v2', 'client');
    sessionStorage.setItem('uniq-demo-requests-v4-stage12', JSON.stringify([{
      id: 'stage12-ui-request',
      vehicleId: fixture.vehicleId,
      from: fixture.from,
      to: fixture.to,
      client: 'Stage 12 UI Client',
      contact: '@stage12',
      status: 'confirmed',
      estimate: fixture.totalVnd,
      createdAt: new Date().toISOString(),
      backendBookingId: fixture.bookingId,
      paymentStatus: 'partially_paid',
      paidVnd: fixture.paidVnd,
    }]));
  }, data);
  await page.reload();
  await page.locator('[data-go="requests"]').click();
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
desktop.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('maps.googleapis')) consoleErrors.push(message.text());
});
await desktop.goto(base + '/');
await desktop.locator('[data-role="owner"]').click();
await assertOwnerAnalyticsVisible(desktop, 'desktop owner');
await desktop.locator('[data-go="team"]').click();
await desktop.locator('[data-add-branch]').click();
await desktop.locator('[data-branch-name]').fill('Западный офис');
await desktop.locator('[data-branch-code]').fill('west-ui');
await desktop.locator('[data-branch-address]').fill('Nha Trang West');
await desktop.locator('[data-save-branch]').click();
await desktop.locator('[data-team-branch="branch-west-ui"]').waitFor();
await assertNoOverflow(desktop, 'desktop owner branches');

await seedClient(desktop);
const balanceButton = desktop.locator('[data-pay-booking="stage12-ui-request"]');
if (!(await balanceButton.textContent())?.includes('Доплатить остаток')) throw new Error('balance CTA missing');
await desktop.locator('[data-client-extend="stage12-ui-request"]').click();
await desktop.locator('[data-extension-to]').fill('2026-12-06');
await desktop.locator('[data-extension-submit]').click();
await desktop.locator('[data-payment-purpose="extension"]').waitFor();
await desktop.locator('[data-payment-balance-summary]').waitFor();
await desktop.locator('[data-create-payment]').click();
await desktop.locator('[data-payment-ready]').waitFor();
await desktop.locator('[data-demo-confirm-payment]').click();
await desktop.locator('[data-payment-success]').waitFor();
await assertNoOverflow(desktop, 'desktop client extension');

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
mobile.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('maps.googleapis')) consoleErrors.push(message.text());
});
await seedClient(mobile);
await mobile.locator('[data-client-extend="stage12-ui-request"]').waitFor();
await mobile.locator('[data-pay-booking="stage12-ui-request"]').waitFor();
await assertNoOverflow(mobile, 'mobile MY UNIQ');
await mobile.locator('[data-role="owner"]').click();
await assertOwnerAnalyticsVisible(mobile, 'mobile owner');
await assertNoOverflow(mobile, 'mobile owner analytics');
await mobile.locator('[data-go="team"]').click();
await mobile.locator('[data-add-branch]').waitFor();
await assertNoOverflow(mobile, 'mobile owner branches');

if (consoleErrors.length) throw new Error('Console errors: ' + consoleErrors.join(' | '));
await browser.close();
console.log('Stage 12 merged browser acceptance passed: analytics + operations + desktop + mobile');
