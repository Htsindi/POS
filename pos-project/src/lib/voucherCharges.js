export function calculateAppliedChargeAmount(amount, charges = []) {
  const baseAmount = Number(amount) || 0;

  const totalCharge = charges.reduce((sum, charge) => {
    const percentage = Number(charge?.percentage) || 0;
    const maxChargeAmount = Number(charge?.maxChargeAmount);
    const chargeAmount = baseAmount * (percentage / 100);
    const cappedCharge = Number.isFinite(maxChargeAmount) && maxChargeAmount >= 0
      ? Math.min(chargeAmount, maxChargeAmount)
      : chargeAmount;

    return sum + cappedCharge;
  }, 0);

  return Math.round(totalCharge);
}

export function calculateVoucherBasketAmount(amount, charges = []) {
  const baseAmount = Number(amount) || 0;
  const appliedCharge = calculateAppliedChargeAmount(baseAmount, charges);
  return Math.round(baseAmount + appliedCharge);
}
