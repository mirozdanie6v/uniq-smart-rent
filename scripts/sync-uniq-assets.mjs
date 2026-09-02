import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://uniqmoto.com';
const OUT = path.resolve('assets');
const FLEET_OUT = path.join(OUT, 'fleet');
const UA = 'Mozilla/5.0 (compatible; UNIQSmartRentAssetSync/1.0)';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const uniq = values => [...new Set(values.filter(Boolean))];
const clean = value => String(value ?? '').replace(/&nbsp;/g, ' ').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&').replace(/\u0026/g, '&').replace(/\\u0026/g, '&');
const strip = html => clean(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const slugify = value => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function request(url, kind = 'text') {
  const response = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return kind === 'buffer' ? Buffer.from(await response.arrayBuffer()) : await response.text();
}

function detailLinks(html) {
  const normalized = clean(html).replace(/\\\//g, '/');
  const matches = normalized.match(/\/ru\/rentals\/(?:motorcycles|cars)\/[a-z0-9-]+/gi) ?? [];
  return uniq(matches).map(href => new URL(href, SITE).href);
}

function titleFromHtml(html, fallback) {
  const match = clean(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return strip(match?.[1] || fallback);
}

function vndAfter(text, label) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index < 0) return 0;
  const chunk = text.slice(index, index + 500);
  const match = chunk.match(/(?:≈\s*)?([0-9][0-9.\s]{2,})\s*₫/);
  return match ? Number(match[1].replace(/[^0-9]/g, '')) : 0;
}

function specAfter(text, label) {
  const re = new RegExp(`${label}\\s+([^|]{1,45}?)(?=\\s+(?:Weight|Cruise speed|Fuel use|Capacity|Цена|Депозит|Неделя|Месяц|Профиль|Engine)|$)`, 'i');
  return text.match(re)?.[1]?.trim() || '';
}

function originalImageUrls(html) {
  const normalized = clean(html).replace(/\\\//g, '/');
  const urls = [];
  for (const match of normalized.matchAll(/url=(https?%3A%2F%2F[^&"'<>]+?\.(?:jpg|jpeg|png|webp))/gi)) {
    try { urls.push(decodeURIComponent(match[1])); } catch {}
  }
  for (const match of normalized.matchAll(/https:\/\/ahodwykbyoytwtpfoxgi\.supabase\.co\/storage\/v1\/object\/public\/public-assets\/vehicles\/[^"'<>\\ ]+?\.(?:jpg|jpeg|png|webp)/gi)) urls.push(match[0]);
  for (const match of normalized.matchAll(/https:\/\/uniqmoto\.com\/assets\/[^"'<>\\ ]+?\.(?:jpg|jpeg|png|webp)/gi)) urls.push(match[0]);
  return uniq(urls.map(u => clean(u).replace(/\\/g, '')));
}

function extFor(url, contentType = '') {
  const pathname = new URL(url).pathname.toLowerCase();
  const ext = path.extname(pathname);
  if (['.jpg','.jpeg','.png','.webp','.avif'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('png')) return '.png';
  return '.jpg';
}

async function downloadImage(url, targetBase) {
  const response = await fetch(url, { headers: { 'user-agent': UA, referer: `${SITE}/ru` } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`Not image: ${contentType} ${url}`);
  const ext = extFor(url, contentType);
  const target = `${targetBase}${ext}`;
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target.replaceAll('\\', '/');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await rm(FLEET_OUT, { recursive: true, force: true });
  await mkdir(FLEET_OUT, { recursive: true });

  const catalogs = [
    `${SITE}/ru/rentals/motorcycles`,
    `${SITE}/ru/rentals/cars`
  ];
  const catalogHtml = await Promise.all(catalogs.map(url => request(url)));
  let pages = uniq(catalogHtml.flatMap(detailLinks));
  if (pages.length < 70) {
    const home = await request(`${SITE}/ru`);
    pages = uniq([...pages, ...detailLinks(home)]);
  }
  if (pages.length < 70) throw new Error(`Only ${pages.length} vehicle detail links discovered; refusing incomplete sync.`);

  const fleet = [];
  const failures = [];
  let imageCount = 0;

  for (let i = 0; i < pages.length; i++) {
    const sourceUrl = pages[i];
    const pageSlug = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
    try {
      const html = await request(sourceUrl);
      const text = strip(html);
      const title = titleFromHtml(html, pageSlug.replaceAll('-', ' '));
      const type = sourceUrl.includes('/cars/') ? 'car' : (/Scooter/i.test(text) ? 'scooter' : 'motorcycle');
      const yearMatch = text.match(/\b(20\d{2})\b/);
      const sourceImages = originalImageUrls(html);
      const vehicleDir = path.join(FLEET_OUT, pageSlug);
      await mkdir(vehicleDir, { recursive: true });
      const localPhotos = [];
      for (let p = 0; p < sourceImages.length; p++) {
        try {
          const local = await downloadImage(sourceImages[p], path.join(vehicleDir, String(p + 1).padStart(2, '0')));
          localPhotos.push(`./${local}`);
          imageCount++;
        } catch (error) {
          failures.push({ sourceUrl, image: sourceImages[p], error: String(error.message || error) });
        }
      }
      fleet.push({
        id: pageSlug,
        slug: pageSlug,
        sourceUrl,
        type,
        title,
        year: yearMatch ? Number(yearMatch[1]) : null,
        engine: specAfter(text, 'Engine'),
        weight: specAfter(text, 'Weight'),
        cruiseSpeed: specAfter(text, 'Cruise speed'),
        fuelUse: specAfter(text, 'Fuel use'),
        capacity: specAfter(text, 'Capacity'),
        dailyVnd: vndAfter(text, 'Цена в день'),
        depositVnd: vndAfter(text, 'Депозит'),
        weeklyVnd: vndAfter(text, 'Неделя'),
        monthlyVnd: vndAfter(text, 'Месяц'),
        photos: localPhotos,
        sourcePhotoCount: sourceImages.length
      });
      process.stdout.write(`\r${i + 1}/${pages.length} ${title} · ${localPhotos.length} photos`);
      await sleep(60);
    } catch (error) {
      failures.push({ sourceUrl, error: String(error.message || error) });
    }
  }

  fleet.sort((a,b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  const generatedAt = new Date().toISOString();
  await writeFile(path.join(OUT, 'fleet-manifest.js'), `window.UNIQ_FLEET=${JSON.stringify(fleet)};\nwindow.UNIQ_ASSET_SYNC=${JSON.stringify({ generatedAt, vehicleCount: fleet.length, imageCount, failureCount: failures.length })};\n`, 'utf8');
  await writeFile(path.join(OUT, 'fleet-manifest.json'), JSON.stringify({ generatedAt, fleet }, null, 2), 'utf8');
  await writeFile(path.join(OUT, 'sync-report.json'), JSON.stringify({ generatedAt, vehicleCount: fleet.length, imageCount, failureCount: failures.length, failures }, null, 2), 'utf8');

  console.log(`\nSynced ${fleet.length} vehicles and ${imageCount} images; failures: ${failures.length}.`);
  if (fleet.length < 70 || imageCount < 50) throw new Error(`Sync quality gate failed: ${fleet.length} vehicles / ${imageCount} images.`);
}

main().catch(error => { console.error(error); process.exit(1); });
