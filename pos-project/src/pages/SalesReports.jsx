import { useEffect, useMemo, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, getOne } from '@/lib/db';
import { money, dateLabel, todayISO } from '@/lib/format';
import { exportToExcel } from '@/lib/excel';
import { useAuth } from '@/lib/LocalAuthContext';

export default function SalesReports() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cashouts, setCashouts] = useState([]);
  const [register, setRegister] = useState([]);
  const [users, setUsers] = useState([]);
  const [commissionRate, setCommissionRate] = useState(0);

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [method, setMethod] = useState('');
  const [salesperson, setSalesperson] = useState('');

  useEffect(() => {
    (async () => {
      setSales(await getAll('sales'));
      setExpenses(await getAll('expenses'));
      setCashouts(await getAll('cashouts'));
      setRegister(await getAll('cashRegister'));
      setUsers(await getAll('users'));
      const s = await getOne('settings', 'shop');
      setCommissionRate(Number(s?.commissionRate) || 0);
    })();
  }, []);

  const inRange = (iso) => {
    const d = iso?.slice(0, 10);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const filteredSales = useMemo(() => sales.filter((s) => {
    if (s.status === 'voided') return false;
    if (!inRange(s.date)) return false;
    if (method && s.paymentMethod !== method) return false;
    if (salesperson && s.cashierId !== salesperson) return false;
    return true;
  }), [sales, start, end, method, salesperson]);

  const periodExpenses = useMemo(() => expenses.filter((e) => inRange(e.date)), [expenses, start, end]);
  const periodCashouts = useMemo(() => cashouts.filter((c) => inRange(c.date)), [cashouts, start, end]);
  const periodRegister = useMemo(() => register.filter((r) => inRange(r.date)), [register, start, end]);

  const totals = useMemo(() => {
    const sum = (arr, key) => arr.reduce((a, x) => a + (Number(x[key]) || 0), 0);
    const profit = filteredSales.reduce((a, s) => a + (s.items || []).reduce((p, it) => p + ((it.price - (it.cost || 0)) * it.qty), 0), 0);
    const totalSales = sum(filteredSales, 'total');
    const cash = filteredSales.filter((s) => s.paymentMethod === 'cash').reduce((a, s) => a + (s.total || 0), 0);
    const card = filteredSales.filter((s) => s.paymentMethod === 'card').reduce((a, s) => a + (s.total || 0), 0);
    const credit = filteredSales.filter((s) => s.paymentMethod === 'credit').reduce((a, s) => a + (s.total || 0), 0);
    const commission = profit * (commissionRate / 100);
    const periodExp = sum(periodExpenses, 'amount');
    return {
      totalSales, cash, card, credit, profit, commission,
      periodExp, netIncome: profit - sum(periodExpenses, 'amount'),
      avg: filteredSales.length ? totalSales / filteredSales.length : 0,
      count: filteredSales.length,
    };
  }, [filteredSales, periodExpenses, commissionRate]);

  const bySalesperson = useMemo(() => {
    const map = {};
    filteredSales.forEach((s) => {
      const k = s.cashierName || 'Unknown';
      if (!map[k]) map[k] = { name: k, sales: 0, count: 0, profit: 0 };
      map[k].sales += s.total || 0;
      map[k].count += 1;
      map[k].profit += (s.items || []).reduce((p, it) => p + ((it.price - (it.cost || 0)) * it.qty), 0);
    });
    return Object.values(map);
  }, [filteredSales]);

  const cashoutsByReason = useMemo(() => {
    const map = {};
    periodCashouts.forEach((c) => {
      const k = c.reason || 'Other';
      if (!map[k]) map[k] = { reason: k, amount: 0, count: 0 };
      map[k].amount += Number(c.amount) || 0;
      map[k].count += 1;
    });
    return Object.values(map);
  }, [periodCashouts]);

  const handleExport = () => {
    exportToExcel(`sales_report_${todayISO()}.xlsx`, [
      { name: 'Summary', rows: [{ Metric: 'Transactions', Value: totals.count }, { Metric: 'Total Sales', Value: totals.totalSales }, { Metric: 'Cash Sales', Value: totals.cash }, { Metric: 'Card Sales', Value: totals.card }, { Metric: 'Credit Sales', Value: totals.credit }, { Metric: 'Profit', Value: totals.profit }, { Metric: 'Commission', Value: totals.commission }, { Metric: 'Period Expenses', Value: totals.periodExp }, { Metric: 'Net Income', Value: totals.netIncome }, { Metric: 'Average Sale', Value: totals.avg }] },
      { name: 'Salesperson', rows: bySalesperson },
      { name: 'Expenses', rows: periodExpenses.map((e) => ({ Date: e.date, Type: e.type, Description: e.description, Amount: e.amount })) },
      { name: 'Cashouts', rows: cashoutsByReason },
      { name: 'Register', rows: periodRegister.map((r) => ({ Date: r.date, User: r.userName, OpeningCash: r.openingCash, CashSales: r.cashSales, CardSales: r.cardSales, CreditSales: r.creditSales, CashOuts: r.cashOuts, ClosingCash: r.closingCash })) },
    ]);
  };

  const insight = (label, value, accent) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${accent || 'text-slate-900'}`}>{value}</div>
    </div>
  );

  const periodLabel = `${start || 'Start'} → ${end || 'Today'}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="Sales Reports" showBack actions={<Button onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export Summary</Button>} />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Performance insights */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Performance Insights</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {insight('Transactions', totals.count)}
            {insight('Period', periodLabel)}
            {insight('Average Sale', money(totals.avg))}
            {insight('Profit Margin', totals.totalSales ? `${((totals.profit / totals.totalSales) * 100).toFixed(1)}%` : '0%', 'text-emerald-600')}
            {insight('Cash vs Credit', `${money(totals.cash)} / ${money(totals.credit)}`)}
            {insight('Total Commission', money(totals.commission), 'text-indigo-600')}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-700 font-medium"><Filter className="w-4 h-4" /> Filters</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Payment Method</Label>
              <select className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="">All</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div className="space-y-1.5"><Label>Salesperson</Label>
              <select className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" value={salesperson} onChange={(e) => setSalesperson(e.target.value)}>
                <option value="">All</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {insight('Total Sales', money(totals.totalSales), 'text-emerald-600')}
          {insight('Cash Sales', money(totals.cash))}
          {insight('Card Sales', money(totals.card))}
          {insight('Credit Sales', money(totals.credit), 'text-amber-600')}
          {insight('Profit', money(totals.profit), 'text-emerald-600')}
          {insight('Commission', money(totals.commission))}
          {insight('Period Expenses', money(totals.periodExp), 'text-rose-600')}
          {insight('Net Income', money(totals.netIncome), 'text-emerald-700')}
        </div>

        {/* Salesperson performance */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-900">Salesperson Performance</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left font-medium px-4 py-2.5">Salesperson</th><th className="text-right font-medium px-4 py-2.5">Transactions</th><th className="text-right font-medium px-4 py-2.5">Sales</th><th className="text-right font-medium px-4 py-2.5">Profit</th><th className="text-right font-medium px-4 py-2.5">Commission</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {bySalesperson.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-6">No data.</td></tr>}
                {bySalesperson.map((s) => (
                  <tr key={s.name}><td className="px-4 py-2.5 font-medium">{s.name}</td><td className="px-4 py-2.5 text-right">{s.count}</td><td className="px-4 py-2.5 text-right">{money(s.sales)}</td><td className="px-4 py-2.5 text-right text-emerald-600">{money(s.profit)}</td><td className="px-4 py-2.5 text-right">{money(s.profit * (commissionRate / 100))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses by period + Cashouts + Register tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          <TableCard title="Expenses by Period" rows={periodExpenses} cols={[['Date', (e) => dateLabel(e.date)], ['Type', (e) => e.type], ['Description', (e) => e.description], ['Amount', (e) => money(e.amount), 'right']]} />
          <TableCard title="Cash Out by Reason" rows={cashoutsByReason} cols={[['Reason', (c) => c.reason], ['Count', (c) => c.count, 'right'], ['Amount', (c) => money(c.amount), 'right']]} />
          <TableCard title="Cash Register Activity" rows={periodRegister} cols={[['Date', (r) => dateLabel(r.date)], ['User', (r) => r.userName], ['Opening', (r) => money(r.openingCash), 'right'], ['Cash Sales', (r) => money(r.cashSales), 'right'], ['Card Sales', (r) => money(r.cardSales), 'right'], ['Credit Sales', (r) => money(r.creditSales), 'right'], ['Cash Outs', (r) => money(r.cashOuts), 'right'], ['Closing', (r) => money(r.closingCash), 'right']]} />
        </div>
      </main>
    </div>
  );
}

function TableCard({ title, rows, cols }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-900">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{cols.map((c, i) => <th key={i} className={`font-medium px-4 py-2.5 ${c[2] === 'right' ? 'text-right' : 'text-left'}`}>{c[0]}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && <tr><td colSpan={cols.length} className="text-center text-slate-400 py-6">No data.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i}>{cols.map((c, j) => <td key={j} className={`px-4 py-2.5 ${c[2] === 'right' ? 'text-right' : ''}`}>{c[1](r)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
