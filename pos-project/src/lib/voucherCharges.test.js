import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVoucherBasketAmount } from './voucherCharges.js';

test('adds configured voucher interest to the basket amount', () => {
  const result = calculateVoucherBasketAmount(100, [{ percentage: 5 }]);
  assert.equal(result, 105);
});

test('sums multiple configured percentages for the basket amount', () => {
  const result = calculateVoucherBasketAmount(200, [{ percentage: 2 }, { percentage: 3 }]);
  assert.equal(result, 210);
});
