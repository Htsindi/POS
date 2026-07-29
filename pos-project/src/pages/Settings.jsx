import { useEffect, useState, useRef } from 'react';
import { Save, Database, Download, Upload, Trash2, ShieldAlert } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAll, put, remove, uid, getOne } from '@/lib/db';
import { exportBackup, importBackup, clearAllData, exportDbToExcel } from '@/lib/backup';
import CrudList from '@/components/CrudList';
import { useAuth } from '@/lib/LocalAuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const [shop, setShop] = useState({ shopName: '', appName: 'Grocery_POS', developer: 'matefortechnology', commissionRate: 0 });
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [userOpen, setUserOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const backupRef = useRef(null);

  const load = async () => {
    const s = await getOne('settings', 'shop');
    if (s) setShop(s);
    setUsers(await getAll('users'));
  };
  useEffect(() => { load(); }, []);

  const saveShop = async () => {
    setSaving(true);
    try {
      await put('settings', { ...shop, key: 'shop' });
      alert('Shop settings saved.');
    } finally { setSaving(false); }
  };

  const openAddUser = () => { setEditingUser({ username: '', password: '', fullName: '', role: 'assistant', active: true }); setUserOpen(true); };
  const openEditUser = (u) => { setEditingUser({ ...u }); setUserOpen(true); };
  const saveUser = async () => {
    if (!editingUser.username?.trim() || !editingUser.fullName?.trim()) return alert('Username and full name are required.');
    if (!editingUser.id && !editingUser.password) return alert('Password required for new accounts.');
    const u = {
      id: editingUser.id || uid(),
      username: editingUser.username.trim(),
      password: editingUser.password,
      fullName: editingUser.fullName.trim(),
      role: editingUser.role || 'assistant',
      active: editingUser.active !== false,
    };
    // if editing and password blank, keep existing
    if (editingUser.id && !editingUser.password) {
      const existing = users.find((x) => x.id === editingUser.id);
      u.password = existing?.password || '';
    }
    await put('users', u);
    setUserOpen(false); setEditingUser(null);
    await load();
  };
  const delUser = async (u) => {
    if (u.id === user.id) return alert("You can't delete your own account while logged in.");
    if (!confirm(`Delete user "${u.fullName}"?`)) return;
    await remove('users', u.id);
    await load();
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing a backup will REPLACE all current data. Continue?')) { if (backupRef.current) backupRef.current.value = ''; return; }
    try {
      await importBackup(file);
      alert('Backup restored. The app will reload.');
      window.location.href = '/login';
    } catch (err) {
      alert('Restore failed: ' + err.message);
    } finally {
      if (backupRef.current) backupRef.current.value = '';
    }
  };

  const handleClear = async () => {
    if (!confirm('This will PERMANENTLY DELETE ALL DATA (products, sales, customers, users, etc.). This cannot be undone. Are you sure?')) return;
    if (!confirm('Last confirmation: clear ALL data?')) return;
    await clearAllData();
    alert('All data cleared. The app will reload.');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="System Settings" showBack />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Shop settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Shop Details</h3>
          <p className="text-xs text-slate-500 -mt-2">Displayed on the POS and printed receipts/reports.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Shop Name</Label><Input value={shop.shopName} onChange={(e) => setShop({ ...shop, shopName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>App Name</Label><Input value={shop.appName} onChange={(e) => setShop({ ...shop, appName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Developer</Label><Input value={shop.developer} onChange={(e) => setShop({ ...shop, developer: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Commission Rate (%)</Label><Input type="number" step="0.01" value={shop.commissionRate} onChange={(e) => setShop({ ...shop, commissionRate: Number(e.target.value) || 0 })} /></div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveShop} disabled={saving}><Save className="w-4 h-4 mr-1" /> Save Shop Settings</Button>
        </div>

        {/* User accounts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div><h3 className="font-semibold text-slate-900">Admin & Assistant Accounts</h3><p className="text-xs text-slate-500">Manage who can log in.</p></div>
            <Button size="sm" onClick={openAddUser}>Add User</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-900">{u.fullName} <span className={`text-[11px] px-2 py-0.5 rounded-full ml-1 ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{u.role}</span></div>
                  <div className="text-xs text-slate-500">@{u.username} {u.active === false && '· Inactive'}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditUser(u)}>Edit</Button>
                  <Button variant="ghost" size="icon" onClick={() => delUser(u)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Charges CRUD */}
        <CrudList store="vouchers" title="Voucher Charges / Interest" description="Charges applied when selling vouchers." fields={[{ key: 'name', label: 'Name' }, { key: 'percentage', label: 'Percentage (%)', type: 'number', suffix: '%' }]} />
        <CrudList store="cardCharges" title="Card Purchase Charges" description="Fees applied to card payments." fields={[{ key: 'name', label: 'Name' }, { key: 'percentage', label: 'Percentage (%)', type: 'number', suffix: '%' }]} />
        <CrudList store="expenseTypes" title="Expense Types" description="Categories for recording expenses." fields={[{ key: 'name', label: 'Name' }]} />

        {/* Data management */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Data Management</h3>
          <p className="text-xs text-slate-500 mb-4">Backup, restore, export and clear your local database.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start" onClick={exportDbToExcel}><Download className="w-4 h-4 mr-2" /> Export Database to Excel</Button>
            <Button variant="outline" className="justify-start" onClick={exportBackup}><Database className="w-4 h-4 mr-2" /> Backup to File</Button>
            <input ref={backupRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
            <Button variant="outline" className="justify-start" onClick={() => backupRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Import Backup File</Button>
            <Button variant="outline" className="justify-start text-red-600 border-red-200 hover:bg-red-50" onClick={handleClear}><Trash2 className="w-4 h-4 mr-2" /> Clear All Data</Button>
          </div>
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">"Backup to File" saves a JSON file you can copy to a USB stick. Keep it safe — it contains all your data including passwords.</p>
          </div>
        </div>
      </main>

      {/* User modal */}
      {userOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUserOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">{editingUser.id ? 'Edit' : 'Add'} User</h2>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Full Name</Label><Input value={editingUser.fullName} onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })} autoFocus /></div>
              <div className="space-y-1.5"><Label>Username</Label><Input value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Password {editingUser.id && '(leave blank to keep)'}</Label><Input type="password" value={editingUser.password || ''} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Role</Label>
                <select className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                  <option value="assistant">Assistant</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editingUser.active !== false} onChange={(e) => setEditingUser({ ...editingUser, active: e.target.checked })} /> Active</label>
            </div>
            <Button className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={saveUser}>Save User</Button>
          </div>
        </div>
      )}
    </div>
  );
}
