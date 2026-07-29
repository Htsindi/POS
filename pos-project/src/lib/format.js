export const money = (n) => 'R' + (Number(n) || 0).toFixed(2);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const dateLabel = (iso) => new Date(iso).toLocaleString('en-ZA', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
