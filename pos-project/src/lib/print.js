import { money, dateLabel } from './format';

export async function getSettings() {
  const { getOne } = await import('./db');
  const s = await getOne('settings', 'shop');
  return s || { shopName: "Memo's Mart", appName: 'Grocery_POS', developer: 'matefortechnology' };
}

export function printReceipt(sale, settings) {
  const shop = settings || { shopName: "Memo's Mart", appName: 'Grocery_POS', developer: 'matefortechnology' };
  const rows = (sale.items || [])
    .map((it) => `<tr><td style="padding:2px 0">${escapeHtml(it.name)} x${it.qty}</td><td style="text-align:right;white-space:nowrap">${money(it.price * it.qty)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${sale.id}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; margin: 0 auto; }
    h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
    .center { text-align: center; }
    .muted { font-size: 10px; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .tot { border-top: 1px dashed #000; margin-top: 6px; padding-top: 4px; }
    .row { display:flex; justify-content: space-between; }
  </style></head><body>
    <h1>${escapeHtml(shop.shopName)}</h1>
    <div class="center muted">${escapeHtml(shop.appName)} &middot; ${escapeHtml(shop.developer)}</div>
    <div class="center muted">${dateLabel(sale.date)}</div>
    <div class="muted">Cashier: ${escapeHtml(sale.cashierName || '')}</div>
    <div class="muted">Receipt: ${escapeHtml(sale.id)}</div>
    <table>${rows}</table>
    <div class="row"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
    <div class="row tot"><strong><span>TOTAL</span></strong><strong>${money(sale.total)}</strong></div>
    <div class="row"><span>Payment (${escapeHtml(sale.paymentMethod)})</span><span>${money(sale.paidAmount || 0)}</span></div>
    ${sale.change ? `<div class="row"><span>Change</span><span>${money(sale.change)}</span></div>` : ''}
    ${sale.creditBalance ? `<div class="row"><span>Balance Owed</span><span>${money(sale.creditBalance)}</span></div>` : ''}
    <div class="center muted" style="margin-top:8px">Thank you for shopping with us!</div>
  </body></html>`;
  const w = window.open('', '_blank', 'width=360,height=640');
  if (!w) {
    alert('Please allow popups to print receipts.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 300);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
