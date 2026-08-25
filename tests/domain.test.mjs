import test from 'node:test';
import assert from 'node:assert/strict';
import { rentalDays, calculateRentalTotal, calculatePriceBreakdown, canTransitionBooking, rangesOverlap } from '../.build/domain/booking.js';
import { vehicles } from '../.build/domain/catalog.js';
import { detectBrowserLanguage } from '../.build/domain/i18n.js';
import { businessInfo } from '../.build/domain/business.js';

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
