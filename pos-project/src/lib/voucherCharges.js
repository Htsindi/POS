export function calculateVoucherBasketAmount(amount, charges = []) {
  const baseAmount = Number(amount) || 0;
  const totalPercentage = charges.reduce((sum, charge) => sum + (Number(charge?.percentage) || 0), 0);
  return baseAmount * (1 + totalPercentage / 100);
}
