import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/LocalAuthContext';

const QUICK = [0, 100, 200, 500, 1000];

export default function CashRegister() {
  const { confirmCashRegister } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await confirmCashRegister(amount);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-7">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 mb-4">
          <Wallet className="w-7 h-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Open Cash Register</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">Enter the amount of cash currently in the till to start your shift.</p>

        <div className="space-y-2">
          <Label htmlFor="cash">Opening Cash</Label>
          <Input
            id="cash"
            type="number"
            min="0"
            step="0.01"
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK.map((q) => (
            <Button key={q} type="button" variant="outline" size="sm" onClick={() => setAmount(String(q))}>
              R{q}
            </Button>
          ))}
        </div>

        <Button className="w-full h-11 mt-6 bg-emerald-600 hover:bg-emerald-700" disabled={loading} onClick={submit}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</> : 'Start Shift'}
        </Button>
      </div>
    </div>
  );
}
