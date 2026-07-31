import { createContext, useContext, useEffect, useState } from 'react';
import { getDB, uid, put } from './db';
import { buildCashRegisterSummary } from './cashRegister';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const SAMPLE_PRODUCTS = [
  { name: 'Bread 700g', barcode: '6001234500011', category: 'Bakery', price: 16.99, cost: 9.50, stock: 40 },
  { name: 'Milk 1L', barcode: '6001234500028', category: 'Dairy', price: 22.50, cost: 17.00, stock: 30 },
  { name: 'White Sugar 2kg', barcode: '6001234500035', category: 'Grocery', price: 49.99, cost: 38.00, stock: 25 },
  { name: 'Maize Meal 5kg', barcode: '6001234500042', category: 'Grocery', price: 64.99, cost: 52.00, stock: 18 },
  { name: 'Cooking Oil 750ml', barcode: '6001234500059', category: 'Grocery', price: 39.99, cost: 31.00, stock: 22 },
  { name: 'Coca-Cola 2L', barcode: '5449000000996', category: 'Beverages', price: 24.99, cost: 17.50, stock: 35 },
  { name: 'Rice 2kg', barcode: '6001234500066', category: 'Grocery', price: 44.99, cost: 35.00, stock: 4 },
  { name: 'Eggs (dozen)', barcode: '6001234500073', category: 'Dairy', price: 29.99, cost: 22.00, stock: 12 },
];

export function LocalAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState(null);

  useEffect(() => {
    (async () => {
      const db = await getDB();
      // Seed default admin
      const users = await db.getAll('users');
      if (users.length === 0) {
        await db.put('users', { id: uid(), username: 'admin', password: 'admin123', fullName: 'Store Admin', role: 'admin', active: true });
        await db.put('users', { id: uid(), username: 'assistant', password: 'assist123', fullName: 'Shop Assistant', role: 'assistant', active: true });
      }
      // Seed settings
      if (!(await db.get('settings', 'shop'))) {
        await db.put('settings', { key: 'shop', shopName: "Memo's Mart", appName: 'Grocery_POS', developer: 'matefortechnology', commissionRate: 0 });
      }
      // Seed expense types
      if ((await db.getAll('expenseTypes')).length === 0) {
        for (const name of ['Rent', 'Utilities', 'Supplies', 'Salaries', 'Transport', 'Other']) {
          await db.put('expenseTypes', { id: uid(), name });
        }
      }
      // Seed sample products
      if ((await db.getAll('products')).length === 0) {
        for (const p of SAMPLE_PRODUCTS) {
          await db.put('products', { id: uid(), ...p, created_date: new Date().toISOString() });
        }
      }
      // Restore session
      const saved = localStorage.getItem('pos_session');
      if (saved) {
        const u = await db.get('users', saved);
        if (u) { setUser(stripPwd(u)); }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username, password) => {
    const db = await getDB();
    const all = await db.getAll('users');
    const u = all.find((x) => x.username.toLowerCase() === username.toLowerCase().trim() && x.password === password);
    if (!u) throw new Error('Invalid username or password');
    if (u.active === false) throw new Error('This account is deactivated. Contact an admin.');
    localStorage.setItem('pos_session', u.id);
    setUser(stripPwd(u));
    setRegisterOpen(true);
    return stripPwd(u);
  };

  const confirmCashRegister = async (amount) => {
    const amt = Number(amount) || 0;
    const now = new Date().toISOString();
    setOpeningCash(amt);
    setRegisterOpen(false);
    await put('cashRegister', {
      id: uid(),
      userId: user.id,
      userName: user.fullName,
      openingCash: amt,
      date: now,
      openedAt: now,
      cashSales: 0,
      cardSales: 0,
      creditSales: 0,
      cashOuts: 0,
      closingCash: amt,
      closedAt: null,
      status: 'open',
    });
  };

  const updateActiveRegister = async (updater) => {
    if (!user?.id) return null;
    const db = await getDB();
    const all = await db.getAll('cashRegister');
    const active = all
      .filter((entry) => entry.userId === user.id && !entry.closedAt)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

    if (!active) return null;

    const next = updater(active);
    await put('cashRegister', next);
    return next;
  };

  const recordSaleToRegister = async (sale) => {
    if (!sale) return null;
    const amount = Number(sale.total) || 0;
    return updateActiveRegister((active) => {
      const nextCashSales = Number(active.cashSales || 0) + (sale.paymentMethod === 'cash' ? amount : 0);
      const nextCardSales = Number(active.cardSales || 0) + (sale.paymentMethod === 'card' ? amount : 0);
      const nextCreditSales = Number(active.creditSales || 0) + (sale.paymentMethod === 'credit' ? amount : 0);
      const summary = buildCashRegisterSummary({
        openingCash: Number(active.openingCash) || 0,
        cashSales: nextCashSales,
        cardSales: nextCardSales,
        creditSales: nextCreditSales,
        cashOuts: Number(active.cashOuts) || 0,
      });
      return {
        ...active,
        ...summary,
        cashSales: nextCashSales,
        cardSales: nextCardSales,
        creditSales: nextCreditSales,
        status: 'open',
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const recordCashOutToRegister = async (amount) => {
    const value = Number(amount) || 0;
    if (!value) return null;
    return updateActiveRegister((active) => {
      const nextCashOuts = Number(active.cashOuts || 0) + value;
      const summary = buildCashRegisterSummary({
        openingCash: Number(active.openingCash) || 0,
        cashSales: Number(active.cashSales) || 0,
        cardSales: Number(active.cardSales) || 0,
        creditSales: Number(active.creditSales) || 0,
        cashOuts: nextCashOuts,
      });
      return {
        ...active,
        ...summary,
        cashOuts: nextCashOuts,
        status: 'open',
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const logout = async () => {
    if (user?.id) {
      const db = await getDB();
      const all = await db.getAll('cashRegister');
      const active = all
        .filter((entry) => entry.userId === user.id && !entry.closedAt)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))[0];

      if (active) {
        const summary = buildCashRegisterSummary({
          openingCash: Number(active.openingCash) || 0,
          cashSales: Number(active.cashSales) || 0,
          cardSales: Number(active.cardSales) || 0,
          creditSales: Number(active.creditSales) || 0,
          cashOuts: Number(active.cashOuts) || 0,
        });
        await put('cashRegister', {
          ...active,
          ...summary,
          status: 'closed',
          closedAt: new Date().toISOString(),
          closingCash: summary.closingCash,
        });
      }
    }

    localStorage.removeItem('pos_session');
    setUser(null);
    setOpeningCash(null);
    setRegisterOpen(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, registerOpen, openingCash, login, confirmCashRegister, recordSaleToRegister, recordCashOutToRegister, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function stripPwd(u) {
  const { password, ...rest } = u;
  return rest;
}
