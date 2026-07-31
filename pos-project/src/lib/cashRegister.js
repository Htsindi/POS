export function buildCashRegisterSummary({ openingCash = 0, cashSales = 0, cardSales = 0, creditSales = 0, cashOuts = 0 }) {
  const safeOpening = Number(openingCash) || 0;
  const safeCashSales = Number(cashSales) || 0;
  const safeCardSales = Number(cardSales) || 0;
  const safeCreditSales = Number(creditSales) || 0;
  const safeCashOuts = Number(cashOuts) || 0;

  const cashInTill = safeOpening + safeCashSales - safeCashOuts;

  return {
    openingCash: safeOpening,
    cashSales: safeCashSales,
    cardSales: safeCardSales,
    creditSales: safeCreditSales,
    cashOuts: safeCashOuts,
    cashInTill,
    closingCash: cashInTill,
  };
}
