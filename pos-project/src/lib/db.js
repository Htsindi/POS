import { openDB } from 'idb';

const DB_NAME = 'grocery_pos';
const DB_VERSION = 1;

let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('users')) {
          const u = db.createObjectStore('users', { keyPath: 'id' });
          u.createIndex('username', 'username', { unique: true });
        }
        if (!db.objectStoreNames.contains('products')) {
          const p = db.createObjectStore('products', { keyPath: 'id' });
          p.createIndex('barcode', 'barcode');
          p.createIndex('category', 'category');
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales')) {
          const s = db.createObjectStore('sales', { keyPath: 'id' });
          s.createIndex('date', 'date');
          s.createIndex('cashierId', 'cashierId');
        }
        if (!db.objectStoreNames.contains('expenses')) {
          db.createObjectStore('expenses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cashRegister')) {
          db.createObjectStore('cashRegister', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cashouts')) {
          db.createObjectStore('cashouts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenseTypes')) {
          db.createObjectStore('expenseTypes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vouchers')) {
          db.createObjectStore('vouchers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cardCharges')) {
          db.createObjectStore('cardCharges', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function getAll(store) {
  return (await getDB()).getAll(store);
}
export async function getOne(store, id) {
  return (await getDB()).get(store, id);
}
export async function put(store, value) {
  await (await getDB()).put(store, value);
  return value;
}
export async function remove(store, id) {
  await (await getDB()).delete(store, id);
}
export async function clearStore(store) {
  await (await getDB()).clear(store);
}

export async function getByIndex(store, indexName, value) {
  return (await getDB()).getAllFromIndex(store, indexName, value);
}
