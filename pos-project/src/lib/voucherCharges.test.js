import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVoucherBasketAmount, calculateAppliedChargeAmount } from './voucherCharges.js';

test('adds configured voucher interest to the basket amount', () => {
  const result = calculateVoucherBasketAmount(100, [{ percentage: 5 }]);
  assert.equal(result, 105);
});

test('rounds the charge basket total to the nearest whole rand', () => {
  const result = calculateVoucherBasketAmount(87.5, [{ percentage: 5 }]);
  assert.equal(result, 92);
});

test('sums multiple configured percentages for the basket amount', () => {
  const result = calculateVoucherBasketAmount(200, [{ percentage: 2 }, { percentage: 3 }]);
  assert.equal(result, 210);
});

test('caps the applied charge amount at the configured maximum', () => {
  const result = calculateVoucherBasketAmount(100, [{ percentage: 60, maxChargeAmount: 50 }]);
  assert.equal(result, 150);
});

test('returns the rounded applied charge amount for the configured percentages', () => {
  const result = calculateAppliedChargeAmount(87.5, [{ percentage: 5 }]);
  assert.equal(result, 4);
});
