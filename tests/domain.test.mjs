import test from 'node:test';
import assert from 'node:assert/strict';
import { rentalDays, calculateRentalTotal, isBookable } from '../.build/domain/booking.js';
import { vehicles } from '../.build/domain/catalog.js';

test('rental day calculation has minimum of one day', () => {
  assert.equal(rentalDays('2026-08-27','2026-08-27'),1);
  assert.equal(rentalDays('2026-08-27','2026-08-30'),3);
});

test('X-MAX demo price calculation is deterministic', () => {
  const v=vehicles.find(v=>v.id==='xmax-24'); assert.ok(v); assert.equal(calculateRentalTotal(v,'2026-08-27','2026-08-30'),5400000);
});

test('only available vehicles can be directly booked', () => {
  assert.equal(isBookable(vehicles.find(v=>v.id==='adv-18')),true);
  assert.equal(isBookable(vehicles.find(v=>v.id==='mt09-07')),false);
});
