import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Confirm, Empty, ErrorBox, Field, Modal, PageLoader, Spinner, Table, Tag } from '../../components/ui';
import { useAsync } from '../../components/hooks';

export default function Categories() {
  const toast = useToast();
  const list = useAsync(() => api.get('/categories', { all: 'true' }), []);
  const [form, setForm] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const body = { name: form.name, description: form.description, isActive: form.isActive }; if (form._id) await api.put(`/categories/${form._id}`, body); else await api.post('/categories', body); toast.success('Category saved'); setForm(null); list.reload(); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await api.del(`/categories/${del._id}`); toast.success('Category deleted'); setDel(null); list.reload(); } catch (e) { toast.error(errMsg(e)); setDel(null); } finally { setBusy(false); } };
  return (
    <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Categories</h1><button className="btn-primary" onClick={() => { setErr(''); setForm({ name: '', description: '', isActive: true }); }}><Plus className="h-4 w-4" />Add category</button></div>
      {list.loading ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <Table head={['Name', 'Slug', 'Description', 'Status', '']} empty={!list.data.data.length && <Empty title="No categories" />}>
          {list.data.data.map((c) => <tr key={c._id}><td className="td font-medium">{c.name}</td><td className="td font-mono text-xs">{c.slug}</td><td className="td text-slate-500">{c.description}</td><td className="td">{c.isActive ? <Tag color="bg-emerald-100 text-emerald-800">Active</Tag> : <Tag>Hidden</Tag>}</td>
            <td className="td"><div className="flex justify-end gap-1"><button className="btn-ghost !p-2" onClick={() => { setErr(''); setForm({ ...c }); }}><Edit className="h-4 w-4" /></button><button className="btn-ghost !p-2" onClick={() => setDel(c)}><Trash2 className="h-4 w-4 text-red-500" /></button></div></td></tr>)}</Table>)}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit category' : 'Add category'}>
        {form && <form onSubmit={save} className="space-y-4">{err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Field label="Name"><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Description"><textarea className="input" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Visible in storefront</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Save</button></div></form>}</Modal>
      <Confirm open={!!del} danger title="Delete category?" message={`"${del?.name}" will be permanently deleted. Categories that still contain products cannot be deleted — hide them instead.`} confirmLabel="Delete" busy={busy} onClose={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
