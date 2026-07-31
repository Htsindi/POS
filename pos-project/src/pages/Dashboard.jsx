import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, TrendingUp, CalendarDays, Users,
  ShoppingCart, Boxes, BarChart3, UserCog, Settings as SettingsIcon, Receipt, Wallet, X,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { getAll, put, uid } from '@/lib/db';
import { money, todayISO, yesterdayISO } from '@/lib/format';
import { useAuth } from '@/lib/LocalAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, today: 0, yesterday: 0, customers: 0 });
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState('');
  const [cashOutReason, setCashOutReason] = useState('');
  const [savingCashOut, setSavingCashOut] = useState(false);

  useEffect(() => {
    (async () => {
      const [products, sales, customers] = await Promise.all([
        getAll('products'),
        getAll('sales'),
        getAll('customers'),
      ]);
      const uid = user.id;
      const sumFor = (day) => sales
        .filter((s) => s.cashierId === uid && s.date && s.date.slice(0, 10) === day && s.status !== 'voided')
        .reduce((a, s) => a + (s.total || 0), 0);
      setStats({
        products: products.length,
        today: sumFor(todayISO()),
        yesterday: sumFor(yesterdayISO()),
        customers: customers.length,
      });
    })();
  }, [user.id]);

  const isAdmin = user.role === 'admin';

  const statCards = [
    { label: 'Total Products', value: stats.products, icon: Package, color: 'bg-violet-100 text-violet-700' },
    { label: "Yesterday's Sales", value: money(stats.yesterday), icon: TrendingUp, color: 'bg-amber-100 text-amber-700' },
    { label: "Today's Sales", value: money(stats.today), icon: CalendarDays, color: 'bg-emerald-100 text-emerald-700' },
    { label: 'Total Customers', value: stats.customers, icon: Users, color: 'bg-sky-100 text-sky-700' },
  ];

  const handleCashOut = async () => {
    const amount = Number(cashOutAmount);
    if (!amount || amount <= 0) return alert('Enter a valid cash-out amount.');
    if (!cashOutReason.trim()) return alert('Enter a reason for the cash out.');

    setSavingCashOut(true);
    try {
      await put('cashouts', {
        id: uid(),
        amount,
        reason: cashOutReason.trim(),
        date: new Date().toISOString(),
        userId: user.id,
        userName: user.fullName,
      });
      setCashOutOpen(false);
      setCashOutAmount('');
      setCashOutReason('');
      alert('Cash out recorded successfully.');
    } finally {
      setSavingCashOut(false);
    }
  };

  const actions = [
    { label: 'New Sale', desc: 'Point of Sale', icon: ShoppingCart, path: '/pos', roles: ['admin', 'assistant'], color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Record Cash Out', desc: 'Enter cash out details', icon: Wallet, onClick: () => setCashOutOpen(true), roles: ['admin', 'assistant'], color: 'bg-amber-600 hover:bg-amber-700' },
    { label: 'Manage Inventory', desc: 'Products & stock', icon: Boxes, path: '/inventory', roles: ['admin', 'assistant'], color: 'bg-slate-800 hover:bg-slate-900' },
    { label: 'Sales Reports', desc: 'Analytics', icon: BarChart3, path: '/reports', roles: ['admin'], color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'Manage Customers', desc: 'Credit & accounts', icon: UserCog, path: '/customers', roles: ['admin', 'assistant'], color: 'bg-sky-600 hover:bg-sky-700' },
    { label: 'Add Expenses', desc: 'Record costs', icon: Receipt, path: '/expenses', roles: ['admin'], color: 'bg-rose-600 hover:bg-rose-700' },
    { label: 'Settings', desc: 'System config', icon: SettingsIcon, path: '/settings', roles: ['admin'], color: 'bg-slate-600 hover:bg-slate-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="Dashboard" />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${c.color} mb-3`}>
                <c.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{c.value}</div>
              <div className="text-sm text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {actions.filter((a) => a.roles.includes(user.role)).map((a) => (
              <button
                key={a.label}
                onClick={() => (a.onClick ? a.onClick() : navigate(a.path))}
                disabled={!a.path && !a.onClick}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:shadow-md hover:border-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${a.color} text-white shrink-0`}>
                  <a.icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">{a.label}</div>
                  <div className="text-xs text-slate-500">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {cashOutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setCashOutOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Record Cash Out</h2>
              <Button variant="ghost" size="icon" onClick={() => setCashOutOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Amount (R)</Label>
                <Input type="number" step="0.01" value={cashOutAmount} onChange={(e) => setCashOutAmount(e.target.value)} autoFocus placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Input value={cashOutReason} onChange={(e) => setCashOutReason(e.target.value)} placeholder="e.g. Petty cash, refund, supply" />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCashOut} disabled={savingCashOut}>
                {savingCashOut ? 'Saving...' : 'Save Cash Out'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
