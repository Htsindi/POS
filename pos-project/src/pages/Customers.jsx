import { useEffect, useMemo, useState, useRef } from 'react';
import { Download, Upload, Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, put, remove, uid } from '@/lib/db';
import { money, dateLabel } from '@/lib/format';
import { exportToExcel, importFromExcel } from '@/lib/excel';
import { useAuth } from '@/lib/LocalAuthContext';

const EMPTY = { idNumber: '', name: '', contact: '', email: '', address: '', creditLimit: '', settleDate: '', balance: '', incomeSource: '' };

export default function Customers() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [owedOnly, setOwedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = async () => setCustomers(await getAll('customers'));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return customers
      .filter((c) => !q || [c.name, c.idNumber, c.contact, c.email, c.address].some((v) => String(v || '').toLowerCase().includes(q)))
      .filter((c) => !owedOnly || (Number(c.balance) || 0) > 0)
      .filter((c) => !overdueOnly || (c.settleDate && c.settleDate.slice(0, 10) < today && (Number(c.balance) || 0) > 0))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, query, owedOnly, overdueOnly, today]);

  const stats = useMemo(() => {
    const withCredit = customers.filter((c) => (Number(c.balance) || 0) > 0);
    const overdue = customers.filter((c) => c.settleDate && c.settleDate.slice(0, 10) < today && (Number(c.balance) || 0) > 0);
    return {
      total: customers.length,
      withCredit: withCredit.length,
      overdue: overdue.length,
      totalBalance: customers.reduce((a, c) => a + (Number(c.balance) || 0), 0),
      totalLimit: customers.reduce((a, c) => a + (Number(c.creditLimit) || 0), 0),
      avgBalance: customers.length ? customers.reduce((a, c) => a + (Number(c.balance) || 0), 0) / customers.length : 0,
    };
  }, [customers, today]);

  const openAdd = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const openEdit = (c) => { setEditing({ ...c }); setOpen(true); };

  const save = async () => {
    if (!editing.name?.trim()) return alert('Customer name is required.');
    const c = {
      id: editing.id || uid(),
      idNumber: editing.idNumber.trim(),
      name: editing.name.trim(),
      contact: editing.contact.trim(),
      email: editing.email.trim(),
      address: editing.address.trim(),
      creditLimit: Number(editing.creditLimit) || 0,
      settleDate: editing.settleDate || '',
      balance: Number(editing.balance) || 0,
      incomeSource: editing.incomeSource.trim(),
      created_date: editing.created_date || new Date().toISOString(),
    };
    await put('customers', c);
    setOpen(false); setEditing(null);
    await load();
  };

  const del = async (c) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await remove('customers', c.id);
    await load();
  };

  const handleExport = () => {
    exportToExcel(`customers_${new Date().toISOString().slice(0, 10)}.xlsx`, [{
      name: 'Customers',
      rows: customers.map((c) => ({ IDNumber: c.idNumber, Name: c.name, Contact: c.contact, Email: c.email, Address: c.address, CreditLimit: c.creditLimit, SettleDate: c.settleDate, Balance: c.balance, IncomeSource: c.incomeSource })),
    }]);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await importFromExcel(file);
      let count = 0;
      for (const r of rows) {
        if (!r.Name && !r.name) continue;
        await put('customers', {
          id: uid(),
          idNumber: String(r.IDNumber ?? r.idNumber ?? ''),
          name: String(r.Name ?? r.name ?? ''),
          contact: String(r.Contact ?? r.contact ?? ''),
          email: String(r.Email ?? r.email ?? ''),
          address: String(r.Address ?? r.address ?? ''),
          creditLimit: Number(r.CreditLimit ?? r.creditLimit ?? 0) || 0,
          settleDate: String(r.SettleDate ?? r.settleDate ?? ''),
          balance: Number(r.Balance ?? r.balance ?? 0) || 0,
          incomeSource: String(r.IncomeSource ?? r.incomeSource ?? ''),
          created_date: new Date().toISOString(),
        });
        count++;
      }
      await load();
      alert(`Imported ${count} customer(s).`);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const statCard = (label, value, color) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${color || 'text-slate-900'}`}>{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="Customer Management" showBack actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Import</Button>
          <Button onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          {isAdmin && <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>}
        </>
      } />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCard('Total Customers', stats.total)}
          {statCard('With Credit', stats.withCredit, 'text-amber-600')}
          {statCard('Overdue Accounts', stats.overdue, 'text-rose-600')}
          {statCard('Total Credit Balance', money(stats.totalBalance), 'text-amber-600')}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by name, ID, phone, email or address..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-11" />
            </div>
            <Button variant={owedOnly ? 'default' : 'outline'} onClick={() => setOwedOnly((v) => !v)}>Money Owed</Button>
            <Button variant={overdueOnly ? 'default' : 'outline'} onClick={() => setOverdueOnly((v) => !v)}>Overdue</Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr>
                <th className="text-left font-medium px-4 py-2.5">ID No.</th><th className="text-left font-medium px-4 py-2.5">Name</th><th className="text-left font-medium px-4 py-2.5">Contact</th><th className="text-right font-medium px-4 py-2.5">Credit Limit</th><th className="text-left font-medium px-4 py-2.5">Settle By</th><th className="text-right font-medium px-4 py-2.5">Balance</th><th className="text-left font-medium px-4 py-2.5">Income Source</th>{isAdmin && <th className="px-4 py-2.5"></th>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-slate-400 py-10">No customers found.</td></tr>}
                {filtered.map((c) => {
                  const overdue = c.settleDate && c.settleDate.slice(0, 10) < today && (Number(c.balance) || 0) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">{c.idNumber || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.contact || '—'}</td>
                      <td className="px-4 py-2.5 text-right">{money(c.creditLimit)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.settleDate ? dateLabel(c.settleDate) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${overdue ? 'text-rose-600' : (Number(c.balance) > 0 ? 'text-amber-600' : 'text-slate-700')}`}>{money(c.balance)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.incomeSource || '—'}</td>
                      {isAdmin && <td className="px-4 py-2.5"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => del(c)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCard('Total Credit Limit', money(stats.totalLimit))}
          {statCard('Average Balance', money(stats.avgBalance))}
          {statCard('Customers with Credit', stats.withCredit, 'text-amber-600')}
          {statCard('Overdue Accounts', stats.overdue, 'text-rose-600')}
        </div>
        {!isAdmin && <p className="text-xs text-slate-400 text-center">Assistant access: view only.</p>}
      </main>

      {/* Modal */}
      {open && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">{editing.id ? 'Edit' : 'Add'} Customer</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></div>
              <div className="space-y-1.5"><Label>ID Number</Label><Input value={editing.idNumber} onChange={(e) => setEditing({ ...editing, idNumber: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Contact (Phone)</Label><Input value={editing.contact} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Source of Income</Label><Input value={editing.incomeSource} onChange={(e) => setEditing({ ...editing, incomeSource: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Credit Limit (R)</Label><Input type="number" step="0.01" value={editing.creditLimit} onChange={(e) => setEditing({ ...editing, creditLimit: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Balance (R)</Label><Input type="number" step="0.01" value={editing.balance} onChange={(e) => setEditing({ ...editing, balance: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Date to Settle Bill</Label><Input type="date" value={editing.settleDate ? editing.settleDate.slice(0, 10) : ''} onChange={(e) => setEditing({ ...editing, settleDate: e.target.value })} /></div>
            </div>
            <Button className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={save}>Save Customer</Button>
          </div>
        </div>
      )}
    </div>
  );
}
