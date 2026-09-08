import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rentalDays, calculateRentalTotal, calculatePriceBreakdown, canTransitionBooking, rangesOverlap } from '../.build/domain/booking.js';
import { vehicles } from '../.build/domain/catalog.js';
import { detectBrowserLanguage } from '../.build/domain/i18n.js';
import { businessInfo } from '../.build/domain/business.js';
import { ENTITY_TABLES } from '../.build/domain/entities.js';

test('rental day calculation keeps a one-day minimum',()=>{assert.equal(rentalDays('2026-08-27','2026-08-27'),1);assert.equal(rentalDays('2026-08-27','2026-08-30'),3);});

test('published X-Max tiers are used for estimates',()=>{
  const v=vehicles.find(v=>v.id==='xmax-2024');assert.ok(v);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-08-30'),5400000);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-09-03'),8000000);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-09-26'),17000000);
  assert.deepEqual(calculatePriceBreakdown(v,'2026-08-27','2026-09-06'),{days:10,months:0,weeks:1,dailyDays:3,totalVnd:13400000});
});

test('booking lifecycle only allows explicit transitions',()=>{assert.equal(canTransitionBooking('new','contacted'),true);assert.equal(canTransitionBooking('new','completed'),false);assert.equal(canTransitionBooking('returned','completed'),true);});

test('date ranges detect conflicts inclusively',()=>{assert.equal(rangesOverlap('2026-09-01','2026-09-05','2026-09-05','2026-09-08'),true);assert.equal(rangesOverlap('2026-09-01','2026-09-04','2026-09-05','2026-09-08'),false);});

test('catalog contains only manager-confirmed public entries with sources',()=>{assert.equal(vehicles.length,5);for(const v of vehicles){assert.equal(v.availability,'manager_confirmation');assert.match(v.sourceUrl,/^https:\/\/uniqmoto\.com\//);assert.ok(v.photos.length>=1);assert.ok(v.pricing.dailyVnd>0);}});

test('browser language detection uses English fallback',()=>{assert.equal(detectBrowserLanguage('ru-RU'),'ru');assert.equal(detectBrowserLanguage('vi-VN'),'vi');assert.equal(detectBrowserLanguage('ko-KR'),'ko');assert.equal(detectBrowserLanguage('zh-CN'),'en');});

test('verified business facts expose two branches and public fleet count',()=>{assert.equal(businessInfo.branches.length,2);assert.equal(businessInfo.publicFleetCount,82);assert.equal(businessInfo.phone,'+84372112370');});

test('stage 2 defines all primary owner-platform entities',()=>{
  assert.deepEqual(ENTITY_TABLES,[
    'branches','employees','vehicles','customers','bookings','payments','transactions','service_records','promotions'
  ]);
});

test('stage 2 migration contains required operational and finance tables',async()=>{
  const sql=await readFile(new URL('../migrations/0003_business_platform.sql',import.meta.url),'utf8');
  for(const table of [
    'branches','employees','employee_permissions','vehicle_availability_blocks','vehicle_transfers',
    'booking_status_history','payments','transactions','rental_inspections','customer_documents',
    'service_records','promotions','promotion_branches','promotion_vehicles','integration_configs','business_settings'
  ]) assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));
  assert.match(sql,/branch-north/);
  assert.match(sql,/branch-center/);
  assert.match(sql,/integration-vietqr/);
  assert.match(sql,/integration-sbp/);
  assert.match(sql,/integration-yookassa/);
});


test('stage 3 owner fleet management contracts are present',async()=>{
  const migration=await readFile(new URL('../migrations/0004_owner_fleet_management.sql',import.meta.url),'utf8');
  const worker=await readFile(new URL('../src/api/ownerFleetWorker.ts',import.meta.url),'utf8');
  const ui=await readFile(new URL('../src/features/fleet/OwnerFleetManager.tsx',import.meta.url),'utf8');
  assert.ok(migration.includes('owner_managed'));
  assert.ok(worker.includes('/api/fleet-overrides'));
  assert.ok(worker.includes('owner_saved'));
  assert.ok(ui.includes('Добавить технику'));
  assert.ok(ui.includes('data-owner-save'));
});


test('stage 4 booking calendar and lifecycle contracts are present',async()=>{
  const migration=await readFile(new URL('../migrations/0005_booking_calendar.sql',import.meta.url),'utf8');
  const worker=await readFile(new URL('../src/api/bookingOperationsWorker.ts',import.meta.url),'utf8');
  const calendar=await readFile(new URL('../src/features/bookings/OwnerBookingCalendar.tsx',import.meta.url),'utf8');
  const ownerFleet=await readFile(new URL('../src/features/fleet/OwnerFleetManager.tsx',import.meta.url),'utf8');
  assert.ok(migration.includes('booking_extensions'));
  assert.ok(migration.includes('issued_at'));
  assert.ok(worker.includes('/api/owner/calendar'));
  assert.ok(worker.includes('/extend'));
  assert.ok(worker.includes('/lifecycle'));
  assert.ok(calendar.includes('КАЛЕНДАРЬ ЗАНЯТОСТИ'));
  assert.ok(ownerFleet.includes('data-owner-fleet-type-filter'));
});


test('stage 5 payment checkout contracts are present',async()=>{
  const migration=await readFile(new URL('../migrations/0006_payment_checkout.sql',import.meta.url),'utf8');
  const worker=await readFile(new URL('../src/api/paymentWorker.ts',import.meta.url),'utf8');
  const ui=await readFile(new URL('../src/features/payments/PaymentCheckout.tsx',import.meta.url),'utf8');
  for(const provider of ['vietqr','vnpay','momo','zalopay','sbp','yookassa','tbank']) assert.ok(worker.includes(provider));
  assert.ok(migration.includes('payment_events'));
  assert.ok(worker.includes('/api/payments/intents'));
  assert.ok(worker.includes('demo-confirm'));
  assert.ok(ui.includes('data-payment-provider'));
  assert.ok(ui.includes('data-payment-percent'));
});


test('stage 7 employees branches and transfers contracts are present',async()=>{
  const migration=await readFile(new URL('../migrations/0007_stage7_employees_branches.sql',import.meta.url),'utf8');
  const worker=await readFile(new URL('../src/api/teamWorker.ts',import.meta.url),'utf8');
  const ui=await readFile(new URL('../src/features/team/OwnerTeamBranches.tsx',import.meta.url),'utf8');
  const app=await readFile(new URL('../src/features/prototype/PrototypeApp.tsx',import.meta.url),'utf8');
  assert.ok(migration.includes('employee-demo-linh'));
  assert.ok(migration.includes('idx_vehicle_transfers_status'));
  assert.ok(worker.includes('/api/owner/team'));
  assert.ok(worker.includes('/api/owner/transfers'));
  assert.ok(ui.includes('data-stage7-team'));
  assert.ok(ui.includes('data-permission-grid'));
  assert.ok(ui.includes('data-create-transfer'));
  assert.ok(app.includes("employee: [['dashboard','Рабочий стол'],['requests','Заявки'],['fleet','Парк'],['calendar','Календарь'],['handover','Выдачи']]"));
});
