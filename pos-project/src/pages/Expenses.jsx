import { useEffect, useMemo, useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, put, uid } from '@/lib/db';
import { money, dateLabel, todayISO } from '@/lib/format';
import { useAuth } from '@/lib/LocalAuthContext';

export default function Expenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({ type: '', amount: '', date: todayISO(), description: '' });
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setExpenses(await getAll('expenses'));
    setTypes(await getAll('expenseTypes'));
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => {
        const d = e.date?.slice(0, 10);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        if (typeFilter && e.type !== typeFilter) return false;
        return true;
      })
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [expenses, start, end, typeFilter]);

  const total = filtered.reduce((a, e) => a + (Number(e.amount) || 0), 0);

  const addExpense = async () => {
    if (!form.type) return alert('Select an expense type.');
    if (!form.amount || Number(form.amount) <= 0) return alert('Enter a valid amount.');
    await put('expenses', {
      id: uid(),
      type: form.type,
      amount: Number(form.amount),
      date: new Date(form.date + 'T' + new Date().toTimeString().slice(0, 8)).toISOString(),
      description: form.description.trim(),
      userId: user.id,
      userName: user.fullName,
    });
    setForm({ type: '', amount: '', date: todayISO(), description: '' });
    await load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="Add Expenses" showBack />
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Add form */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Record an Expense</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>Expense Type</Label>
              <select className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="">Select type...</option>
                {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Amount (R)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={addExpense}><Plus className="w-4 h-4 mr-1" /> Add Expense</Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filter Expenses</div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Expense Type</Label>
              <select className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">All</option>
                {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <span className="font-semibold text-slate-900">Expenses</span>
            <span className="text-sm text-slate-500">Total: <span className="font-bold text-rose-600">{money(total)}</span></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left font-medium px-4 py-2.5">Date</th><th className="text-left font-medium px-4 py-2.5">Type</th><th className="text-left font-medium px-4 py-2.5">Description</th><th className="text-left font-medium px-4 py-2.5">Recorded By</th><th className="text-right font-medium px-4 py-2.5">Amount</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-10">No expenses found.</td></tr>}
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">{dateLabel(e.date)}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{e.type}</span></td>
                    <td className="px-4 py-2.5 text-slate-600">{e.description || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{e.userName || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-rose-600">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
