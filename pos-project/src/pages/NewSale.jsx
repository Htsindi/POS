import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Plus, Minus, ArrowLeft, Wallet, CreditCard, BookOpen, Printer, X, DollarSign } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, put, uid } from '@/lib/db';
import { money } from '@/lib/format';
import { printReceipt, getSettings } from '@/lib/print';
import { useAuth } from '@/lib/LocalAuthContext';
import { calculateVoucherBasketAmount } from '@/lib/voucherCharges';

export default function NewSale() {
  const { user, recordSaleToRegister, recordCashOutToRegister } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState('');
  const [payMethod, setPayMethod] = useState(null); // 'cash'|'card'|'credit'
  const [creditCustomer, setCreditCustomer] = useState('');
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  useEffect(() => {
    (async () => {
      setProducts(await getAll('products'));
      setCustomers(await getAll('customers'));
    })();
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter((p) => (p.name?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)) && (Number(p.stock) || 0) > 0)
      .slice(0, 8);
  }, [products, query]);

  const subtotal = cart.reduce((a, it) => a + it.price * it.qty, 0);
  const total = subtotal;

  const addProduct = (p) => {
    setCart((c) => {
      const ex = c.find((i) => i.productId === p.id);
      if (ex) {
        if (ex.qty >= p.stock) return c;
        return c.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { productId: p.id, name: p.name, price: p.price, cost: p.cost || 0, qty: 1, stock: p.stock }];
    });
    setQuery('');
  };

  const setQty = (productId, delta) => {
    setCart((c) => c.flatMap((i) => {
      if (i.productId !== productId) return [i];
      const next = i.qty + delta;
      if (next <= 0) return [];
      if (i.stock != null && next > i.stock) return [i];
      return [{ ...i, qty: next }];
    }));
  };

  const removeItem = (productId) => setCart((c) => c.filter((i) => i.productId !== productId));

  const reset = () => { setCart([]); setPaid(''); setPayMethod(null); setCreditCustomer(''); };

  const completeSale = async (method) => {
    if (cart.length === 0) return alert('Cart is empty.');
    setPayMethod(method);
  };

  const finalize = async () => {
    if (cart.length === 0) return;
    let paidAmount = 0, change = 0, creditBalance = 0, customerId = null;
    if (payMethod === 'cash') {
      paidAmount = Number(paid) || 0;
      if (paidAmount < total) return alert('Cash amount is less than total.');
      change = paidAmount - total;
    } else if (payMethod === 'card') {
      paidAmount = total;
    } else if (payMethod === 'credit') {
      if (!creditCustomer) return alert('Select a customer for credit sale.');
      customerId = creditCustomer;
      creditBalance = total;
      paidAmount = 0;
    }
    const sale = {
      id: uid(),
      items: cart.map(({ stock, ...rest }) => rest),
      subtotal, total,
      paymentMethod: payMethod,
      paidAmount, change, creditBalance,
      customerId: customerId || null,
      cashierId: user.id,
      cashierName: user.fullName,
      date: new Date().toISOString(),
      status: 'completed',
    };
    await put('sales', sale);
    await recordSaleToRegister(sale);

    // decrement stock
    for (const it of cart) {
      const p = products.find((x) => x.id === it.productId);
      if (p) await put('products', { ...p, stock: Math.max(0, (Number(p.stock) || 0) - it.qty) });
    }
    // update customer credit balance
    if (customerId) {
      const c = customers.find((x) => x.id === customerId);
      if (c) {
        await put('customers', { ...c, balance: (Number(c.balance) || 0) + creditBalance });
        setCustomers((cs) => cs.map((x) => (x.id === customerId ? { ...x, balance: (Number(x.balance) || 0) + creditBalance } : x)));
      }
    }
    setLastSale(sale);
    reset();
  };

  const settleCredit = async () => {
    if (!creditCustomer) return alert('Select a customer.');
    const amt = Number(paid) || 0;
    if (amt <= 0) return alert('Enter amount to settle.');
    const c = customers.find((x) => x.id === creditCustomer);
    if (!c) return;
    const newBal = Math.max(0, (Number(c.balance) || 0) - amt);
    await put('customers', { ...c, balance: newBal });
    await put('cashouts', { id: uid(), amount: amt, reason: `Credit settlement: ${c.name}`, date: new Date().toISOString(), userId: user.id, userName: user.fullName });
    await recordCashOutToRegister(amt);
    setCustomers((cs) => cs.map((x) => (x.id === c.id ? { ...x, balance: newBal } : x)));
    alert(`${money(amt)} settled. New balance: ${money(newBal)}`);
    reset();
  };

  const addChargeLine = async (amount, label) => {
    const voucherCharges = await getAll('vouchers');
    const basketAmount = calculateVoucherBasketAmount(amount, voucherCharges);
    setCart((c) => [...c, { productId: `${label.toLowerCase().replace(/\s+/g, '-')}-${uid()}`, name: label, price: basketAmount, cost: 0, qty: 1, stock: 999 }]);
  };

  const addVoucherLine = async (amount) => {
    await addChargeLine(amount, 'Voucher');
  };

  const recordCashback = async (amount, reason) => {
    await addChargeLine(amount, 'Cash Back');
    await put('cashouts', { id: uid(), amount, reason: reason || 'Cash back', date: new Date().toISOString(), userId: user.id, userName: user.fullName });
    await recordCashOutToRegister(amount);
    alert(`${money(amount)} cash back recorded.`);
  };

  const doPrint = async () => {
    const settings = await getSettings();
    printReceipt(lastSale, settings);
  };

  const owed = payMethod === 'credit' ? total : 0;
  const changeDue = payMethod === 'cash' && Number(paid) >= total ? (Number(paid) - total) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar
        title="Point of Sale"
        showBack
        actions={
          <Button variant="outline" onClick={() => setVoucherOpen(true)}><Wallet className="w-4 h-4 mr-1" /> Voucher / Cash Back</Button>
        }
      />
      <main className="max-w-7xl mx-auto w-full px-4 md:px-6 py-4 grid lg:grid-cols-3 gap-4 flex-1">
        {/* Left: search + cart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search product by name or barcode..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12"
              autoFocus
            />
            {results.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {results.map((p) => (
                  <button key={p.id} onClick={() => addProduct(p)} className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-slate-50 text-left">
                    <span className="text-sm font-medium text-slate-800">{p.name} <span className="text-xs text-slate-400">({p.stock} in stock)</span></span>
                    <span className="text-sm font-semibold text-emerald-600">{money(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Item</th>
                    <th className="text-right font-medium px-4 py-2.5">Price</th>
                    <th className="text-center font-medium px-4 py-2.5">Qty</th>
                    <th className="text-right font-medium px-4 py-2.5">Subtotal</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-slate-400 py-10">Cart is empty. Search products above to add.</td></tr>
                  )}
                  {cart.map((it) => (
                    <tr key={it.productId}>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{it.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{money(it.price)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(it.productId, -1)}><Minus className="w-3 h-3" /></Button>
                          <span className="w-8 text-center font-medium">{it.qty}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQty(it.productId, 1)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{money(it.price * it.qty)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeItem(it.productId)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: order summary + payment */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Order Summary</h3>
            <div className="flex justify-between text-xs text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-100 pt-2"><span>Total</span><span className="text-emerald-600">{money(total)}</span></div>
            <div className="text-[11px] text-slate-400">Opening cash: {money(openingCash || 0)}</div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Payment Method</h3>
            {cart.length === 0 ? (
              <p className="text-sm text-slate-400">Add items to start a sale.</p>
            ) : !payMethod ? (
              <div className="grid grid-cols-1 gap-2">
                <Button className="justify-start h-9 text-sm bg-emerald-600 hover:bg-emerald-700" onClick={() => completeSale('cash')}><DollarSign className="w-4 h-4 mr-2" /> Cash Payment</Button>
                <Button className="justify-start h-9 text-sm bg-indigo-600 hover:bg-indigo-700" onClick={() => completeSale('card')}><CreditCard className="w-4 h-4 mr-2" /> Card Payment</Button>
                <Button className="justify-start h-9 text-sm bg-amber-600 hover:bg-amber-700" onClick={() => completeSale('credit')}><BookOpen className="w-4 h-4 mr-2" /> Buy with Credit</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">{payMethod} Payment</span>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setPayMethod(null); setPaid(''); setCreditCustomer(''); }}>Change</Button>
                </div>

                {payMethod === 'credit' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Customer (credit account)</Label>
                    <select className="w-full h-9 rounded-md border border-slate-200 px-3 text-sm" value={creditCustomer} onChange={(e) => setCreditCustomer(e.target.value)}>
                      <option value="">Select customer...</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — Bal: {money(c.balance || 0)}</option>)}
                    </select>
                    {customers.length === 0 && <p className="text-xs text-amber-600">No customers yet. Add customers from the Customers page.</p>}
                  </div>
                )}

                {(payMethod === 'cash' || payMethod === 'credit') && (
                  <div className="space-y-1">
                    <Label className="text-xs">{payMethod === 'cash' ? 'Cash Received' : 'Amount to Settle'}</Label>
                    <Input type="number" step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0.00" className="h-9" autoFocus />
                  </div>
                )}

                {payMethod === 'cash' && (
                  <div className="flex justify-between text-xs"><span>Change Due</span><span className="font-bold text-emerald-600">{money(changeDue)}</span></div>
                )}
                {payMethod === 'credit' && (
                  <div className="flex justify-between text-xs"><span>Balance Owed</span><span className="font-bold text-amber-600">{money(total)}</span></div>
                )}

                <Button className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700" onClick={finalize}>
                  {payMethod === 'credit' ? 'Record Credit Sale' : payMethod === 'card' ? 'Complete Card Sale' : 'Complete Cash Sale'}
                </Button>
                {payMethod === 'cash' && creditCustomer && (
                  <Button variant="outline" className="w-full h-9 text-sm" onClick={settleCredit}>Settle This Customer's Credit</Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="sticky bottom-0 z-30 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm text-slate-300">Total</span>
            <span className="text-xl font-bold">{money(total)}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            {changeDue > 0 && <div className="text-emerald-300">Change: <span className="font-bold">{money(changeDue)}</span></div>}
            {owed > 0 && <div className="text-amber-300">Owed: <span className="font-bold">{money(owed)}</span></div>}
            {lastSale && (
            <Button variant="outline" className="bg-transparent border-slate-600 text-white hover:bg-slate-800" onClick={doPrint}><Printer className="w-4 h-4 mr-1" /> Print Last Receipt</Button>
          )}
          </div>
        </div>
      </div>

      {/* Voucher / Cashback modal */}
      {voucherOpen && (
        <VoucherModal
          onClose={() => setVoucherOpen(false)}
          onVoucher={(amt) => { addVoucherLine(amt); setVoucherOpen(false); }}
          onCashback={(amt, reason) => { recordCashback(amt, reason); setVoucherOpen(false); }}
        />
      )}
    </div>
  );
}

function VoucherModal({ onClose, onVoucher, onCashback }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState('voucher');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Voucher / Cash Back</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button variant={mode === 'voucher' ? 'default' : 'outline'} onClick={() => setMode('voucher')}>Sell Voucher</Button>
          <Button variant={mode === 'cashback' ? 'default' : 'outline'} onClick={() => setMode('cashback')}>Give Cash Back</Button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Amount (R)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus placeholder="0.00" />
          </div>
          {mode === 'cashback' && (
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Airtime, change, etc." />
            </div>
          )}
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            disabled={!amount || Number(amount) <= 0}
            onClick={() => mode === 'voucher' ? onVoucher(Number(amount)) : onCashback(Number(amount), reason)}
          >
            {mode === 'voucher' ? 'Add Voucher to Cart' : 'Record Cash Back'}
          </Button>
        </div>
      </div>
    </div>
  );
}
