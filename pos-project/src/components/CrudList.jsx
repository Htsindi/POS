import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { getAll, put, remove, uid } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CrudList({ store, fields, title, description }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const load = async () => setItems(await getAll(store));
  useEffect(() => { load(); }, []);

  const blank = () => fields.reduce((a, f) => ({ ...a, [f.key]: '' }), {});
  const openAdd = () => { setEditing(blank()); setOpen(true); };
  const openEdit = (it) => { setEditing({ ...it }); setOpen(true); };

  const save = async () => {
    const record = { id: editing.id || uid() };
    for (const f of fields) {
      record[f.key] = f.type === 'number' ? (Number(editing[f.key]) || 0) : (editing[f.key] ?? '');
    }
    await put(store, record);
    setOpen(false);
    setEditing(null);
    await load();
  };

  const del = async (it) => {
    if (!confirm(`Delete "${fields.map((f) => it[f.key]).join(' - ')}"?`)) return;
    await remove(store, it.id);
    await load();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-3">No entries yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between py-2.5">
              <div className="text-sm text-slate-700">
                {fields.map((f, i) => (
                  <span key={f.key}>{i > 0 && ' · '}{f.type === 'number' ? `${it[f.key]}${f.suffix || ''}` : it[f.key]}</span>
                ))}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(it)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => del(it)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editing.id ? 'Edit' : 'Add'} {title}</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  <Input
                    type={f.type || 'text'}
                    value={editing[f.key]}
                    onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    autoFocus={f === fields[0]}
                  />
                </div>
              ))}
            </div>
            <Button className="w-full mt-5 bg-emerald-600 hover:bg-emerald-700" onClick={save}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}

