import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, Pencil, Trash2, PackagePlus, X } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, put, remove, uid } from '@/lib/db';
import { money } from '@/lib/format';
import { useAuth } from '@/lib/LocalAuthContext';

const EMPTY = { name: '', barcode: '', category: '', price: '', cost: '', stock: '' };

export default function Inventory() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editing, setEditing] = useState(null); // product or null
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => setProducts(await getAll('products'));
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products
      .filter((p) => !q ||
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q))
      .filter((p) => !lowStockOnly || (Number(p.stock) || 0) <= 5)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products, query, lowStockOnly]);

  const openAdd = () => { setEditing({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (p) => { setEditing({ ...p }); setModalOpen(true); };

  const save = async () => {
    const p = {
      id: editing.id || uid(),
      name: editing.name.trim(),
      barcode: editing.barcode.trim(),
      category: editing.category.trim() || 'Uncategorised',
      price: Number(editing.price) || 0,
      cost: Number(editing.cost) || 0,
      stock: Number(editing.stock) || 0,
      created_date: editing.created_date || new Date().toISOString(),
    };
    if (!p.name) return alert('Product name is required.');
    await put('products', p);
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const del = async (p) => {
    if (!isAdmin) return;
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await remove('products', p.id);
    await load();
  };

  const addStock = async (p) => {
    const add = Number(prompt(`Add stock to "${p.name}". Current: ${p.stock}. Add amount:`, '1'));
    if (!add || isNaN(add) || add <= 0) return;
    await put('products', { ...p, stock: (Number(p.stock) || 0) + add });
    await load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        title="Inventory Management"
        showBack
        actions={isAdmin ? <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Product</Button> : null}
      />
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Search & filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, barcode or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Button
            variant={lowStockOnly ? 'default' : 'outline'}
            className="h-11"
            onClick={() => setLowStockOnly((v) => !v)}
          >
            <AlertTriangle className="w-4 h-4 mr-1" /> Low Stock (≤5)
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Name</th>
                  <th className="text-left font-medium px-4 py-3">Barcode</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-right font-medium px-4 py-3">Price</th>
                  <th className="text-right font-medium px-4 py-3">Cost</th>
                  <th className="text-right font-medium px-4 py-3">Stock</th>
                  <th className="text-right font-medium px-4 py-3">Profit/Unit</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-slate-400 py-10">No products found.</td></tr>
                )}
                {filtered.map((p) => {
                  const low = (Number(p.stock) || 0) <= 5;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.barcode || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-right font-medium">{money(p.price)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{money(p.cost)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${low ? 'text-red-600' : 'text-slate-700'}`}>{p.stock}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{money((p.price || 0) - (p.cost || 0))}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Add stock" onClick={() => addStock(p)}>
                            <PackagePlus className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Delete" onClick={() => del(p)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-400">{filtered.length} product(s). {!isAdmin && 'Assistant access: view and add stock only.'}</p>
      </main>

      {/* Product modal */}
      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing.id ? 'Edit Product' : 'Add Product'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} autoFocus /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Barcode</Label><Input value={editing.barcode} onChange={(e) => setEditing({ ...editing, barcode: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Price (R)</Label><Input type="number" step="0.01" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Cost (R)</Label><Input type="number" step="0.01" value={editing.cost} onChange={(e) => setEditing({ ...editing, cost: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Stock</Label><Input type="number" value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={save}>Save Product</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
