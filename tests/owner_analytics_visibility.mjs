import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'https://uniq-smart-rent.viiversion.com';
const browser = await chromium.launch({ headless: true });
for (const viewport of [{width:390,height:844},{width:412,height:915},{width:1440,height:900}]) {
  const page = await browser.newPage({ viewport });
  await page.goto(base, { waitUntil:'networkidle' });
  await page.locator('[data-role="owner"]').click();
  await page.waitForTimeout(250);
  const nav = page.locator('.bottom-nav');
  const labels = await nav.locator('button b').allTextContents();
  if (labels.length !== 10) throw new Error(`owner nav count ${labels.length}: ${labels.join('|')}`);
  if (!labels.includes('Аналитика')) throw new Error(`Analytics label missing: ${labels.join('|')}`);
  const button = page.locator('[data-go="analytics"]').last();
  await button.waitFor({ state:'visible' });
  const rect = await button.boundingBox();
  if (!rect) throw new Error('Analytics button has no bounding box');
  const inside = rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= viewport.width + 1 && rect.y + rect.height <= viewport.height + 1;
  console.log(JSON.stringify({viewport,labels,rect,inside}));
  if (!inside) throw new Error(`Analytics is outside viewport at ${viewport.width}x${viewport.height}`);
  await button.click();
  await page.locator('[data-owner-analytics]').waitFor({ state:'visible' });
  await page.close();
}
await browser.close();
console.log('Owner analytics visibility production audit passed');
