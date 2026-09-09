import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rentalDays, calculateRentalTotal, calculatePriceBreakdown, calculateRentalTotalForPricing, canTransitionBooking, rangesOverlap, normalizeBookingStatus } from '../.build/domain/booking.js';
import { normalizeContactKey } from '../.build/domain/customer.js';
import { normalizeFleetStatus } from '../.build/domain/fleet.js';
import { vehicles } from '../.build/domain/catalog.js';
import { detectBrowserLanguage } from '../.build/domain/i18n.js';
import { businessInfo } from '../.build/domain/business.js';
import worker from '../.build/worker.js';

const fleetManifest=JSON.parse(readFileSync(new URL('../assets/fleet-manifest.json',import.meta.url),'utf8'));
const assetOnlyEnv={ASSETS:{fetch:async()=>new Response(JSON.stringify(fleetManifest),{status:200,headers:{'content-type':'application/json'}})}};

test('rental day calculation keeps a one-day minimum',()=>{assert.equal(rentalDays('2026-08-27','2026-08-27'),1);assert.equal(rentalDays('2026-08-27','2026-08-30'),3);});

test('published X-Max tiers are used for estimates',()=>{
  const v=vehicles.find(v=>v.id==='xmax-2024');assert.ok(v);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-08-30'),5400000);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-09-03'),8000000);
  assert.equal(calculateRentalTotal(v,'2026-08-27','2026-09-26'),17000000);
  assert.deepEqual(calculatePriceBreakdown(v,'2026-08-27','2026-09-06'),{days:10,months:0,weeks:1,dailyDays:3,totalVnd:13400000});
});

test('generic synced-fleet pricing uses the same package rules',()=>{assert.equal(calculateRentalTotalForPricing({dailyVnd:100,weeklyVnd:500,monthlyVnd:1500},'2026-09-01','2026-09-08'),500);});

test('booking lifecycle only allows explicit transitions',()=>{assert.equal(canTransitionBooking('new','contacted'),true);assert.equal(canTransitionBooking('new','completed'),false);assert.equal(canTransitionBooking('returned','completed'),true);});

test('legacy booking status is normalized without losing data',()=>{assert.equal(normalizeBookingStatus('issued'),'vehicle_issued');assert.equal(normalizeBookingStatus('vehicle_issued'),'vehicle_issued');assert.equal(normalizeBookingStatus('unknown'),null);});

test('legacy fleet statuses normalize to canonical values',()=>{assert.equal(normalizeFleetStatus('manager'),'manager_confirmation');assert.equal(normalizeFleetStatus('ready'),'available');assert.equal(normalizeFleetStatus('hold'),'reserved');assert.equal(normalizeFleetStatus('service'),'service');assert.equal(normalizeFleetStatus('unknown'),null);});

test('customer contacts normalize to a stable lookup key',()=>{assert.equal(normalizeContactKey('+84 37 211-2370'),'+84372112370');assert.equal(normalizeContactKey('00 84 37 211 2370'),'+84372112370');assert.equal(normalizeContactKey(' @RikRent1 '),'@rikrent1');});

test('date ranges detect conflicts inclusively',()=>{assert.equal(rangesOverlap('2026-09-01','2026-09-05','2026-09-05','2026-09-08'),true);assert.equal(rangesOverlap('2026-09-01','2026-09-04','2026-09-05','2026-09-08'),false);});

test('catalog contains only manager-confirmed public entries with sources',()=>{assert.equal(vehicles.length,5);for(const v of vehicles){assert.equal(v.availability,'manager_confirmation');assert.match(v.sourceUrl,/^https:\/\/uniqmoto\.com\//);assert.ok(v.photos.length>=1);assert.ok(v.pricing.dailyVnd>0);}});

test('browser language detection uses English fallback',()=>{assert.equal(detectBrowserLanguage('ru-RU'),'ru');assert.equal(detectBrowserLanguage('vi-VN'),'vi');assert.equal(detectBrowserLanguage('ko-KR'),'ko');assert.equal(detectBrowserLanguage('zh-CN'),'en');});

test('verified business facts expose two branches and synced public fleet count',()=>{assert.equal(businessInfo.branches.length,2);assert.equal(businessInfo.publicFleetCount,89);assert.equal(businessInfo.phone,'+84372112370');});

test('Worker vehicle API exposes the same 89-unit manifest used by the UI',async()=>{const response=await worker.fetch(new Request('https://uniq.test/api/vehicles'),assetOnlyEnv);assert.equal(response.status,200);const data=await response.json();assert.equal(data.totalPublishedFleet,89);assert.equal(data.vehicles.length,89);assert.equal(data.vehicles[0].id,fleetManifest.fleet[0].id);});

test('Worker recognizes a manifest vehicle outside the legacy five-item subset',async()=>{const vehicle=fleetManifest.fleet.find(v=>!vehicles.some(old=>old.id===v.id));assert.ok(vehicle);const response=await worker.fetch(new Request('https://uniq.test/api/bookings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({vehicleId:vehicle.id,from:'2026-09-10',to:'2026-09-12',client:'QA Rider',contact:'+84000000000',channel:'other'})}),assetOnlyEnv);assert.equal(response.status,503);const data=await response.json();assert.equal(data.error,'persistence_not_configured');});
