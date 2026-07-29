import { getDB, clearStore, put } from './db';
import { exportToExcel } from './excel';

const STORES = ['users', 'products', 'customers', 'sales', 'expenses', 'cashRegister', 'cashouts', 'expenseTypes', 'vouchers', 'cardCharges', 'settings'];

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportBackup() {
  const db = await getDB();
  const data = {};
  for (const s of STORES) data[s] = await db.getAll(s);
  download(`grocery_pos_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2), 'application/json');
}

export async function importBackup(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const db = await getDB();
  const data = parsed.data || parsed;
  for (const [store, rows] of Object.entries(data)) {
    if (!STORES.includes(store)) continue;
    await clearStore(store);
    for (const row of rows) await put(store, row);
  }
}

export async function clearAllData() {
  for (const s of STORES) await clearStore(s);
}

export async function exportDbToExcel() {
  const db = await getDB();
  const sheets = [];
  for (const s of STORES) {
    const rows = await db.getAll(s);
    if (rows.length) sheets.push({ name: s, rows });
  }
  if (!sheets.length) { alert('No data to export.'); return; }
  exportToExcel(`grocery_pos_database_${new Date().toISOString().slice(0, 10)}.xlsx`, sheets);
}
