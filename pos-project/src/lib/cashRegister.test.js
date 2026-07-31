import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCashRegisterSummary } from './cashRegister.js';

test('builds register summary from opening cash and sales', () => {
  const summary = buildCashRegisterSummary({
    openingCash: 1000,
    cashSales: 250,
    cardSales: 400,
    creditSales: 150,
    cashOuts: 50,
  });

  assert.equal(summary.openingCash, 1000);
  assert.equal(summary.cashSales, 250);
  assert.equal(summary.cardSales, 400);
  assert.equal(summary.creditSales, 150);
  assert.equal(summary.cashOuts, 50);
  assert.equal(summary.cashInTill, 1200);
  assert.equal(summary.closingCash, 1200);
});
