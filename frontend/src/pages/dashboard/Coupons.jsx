import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { date } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { Confirm, Empty, ErrorBox, Field, Modal, PageLoader, Spinner, Table, Tag } from '../../components/ui';
import { useAsync } from '../../components/hooks';

const toInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const blank = () => ({ code: '', type: 'percent', value: 10, minOrderValue: 0, maxDiscount: '', expiresAt: toInput(Date.now() + 30 * 864e5), usageLimit: '', perUserLimit: 1, isActive: true });

export default function Coupons() {
  const toast = useToast(); const list = useAsync(() => api.get('/coupons'), []);
  const [form, setForm] = useState(null); const [del, setDel] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const b = { code: form.code, type: form.type, value: Number(form.value), minOrderValue: Number(form.minOrderValue || 0), perUserLimit: Number(form.perUserLimit || 1), expiresAt: new Date(form.expiresAt + 'T23:59:59').toISOString(), isActive: form.isActive };
    if (form.maxDiscount) b.maxDiscount = Number(form.maxDiscount); if (form.usageLimit) b.usageLimit = Number(form.usageLimit);
    try { if (form._id) await api.put(`/coupons/${form._id}`, b); else await api.post('/coupons', b); toast.success('Coupon saved'); setForm(null); list.reload(); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await api.del(`/coupons/${del._id}`); toast.success('Coupon deleted'); list.reload(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setDel(null); } };
  const state = (c) => (!c.isActive ? ['Disabled', ''] : new Date(c.expiresAt) < new Date() ? ['Expired', 'bg-red-100 text-red-700'] : c.usageLimit && c.usedCount >= c.usageLimit ? ['Exhausted', 'bg-amber-100 text-amber-800'] : ['Live', 'bg-emerald-100 text-emerald-800']);
  return (
    <div className="space-y-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Coupons</h1><button className="btn-primary" onClick={() => { setErr(''); setForm(blank()); }}><Plus className="h-4 w-4" />New coupon</button></div>
      {list.loading ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <Table head={['Code', 'Discount', 'Min order', 'Used', 'Expires', 'State', '']} empty={!list.data.data.length && <Empty title="No coupons yet" />}>
          {list.data.data.map((c) => { const [l, cls] = state(c); return (
            <tr key={c._id}><td className="td font-mono font-bold">{c.code}</td><td className="td">{c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ₹${c.maxDiscount})` : ''}` : `₹${c.value}`}</td><td className="td">₹{c.minOrderValue}</td><td className="td">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td className="td">{date(c.expiresAt)}</td><td className="td"><Tag color={cls}>{l}</Tag></td>
              <td className="td"><div className="flex justify-end gap-1"><button className="btn-ghost !p-2" onClick={() => { setErr(''); setForm({ ...c, expiresAt: toInput(c.expiresAt), maxDiscount: c.maxDiscount ?? '', usageLimit: c.usageLimit ?? '' }); }}><Edit className="h-4 w-4" /></button><button className="btn-ghost !p-2" onClick={() => setDel(c)}><Trash2 className="h-4 w-4 text-red-500" /></button></div></td></tr>); })}</Table>)}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit coupon' : 'New coupon'} wide>
        {form && <form onSubmit={save} className="space-y-4">{err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Code"><input className="input uppercase" required minLength={3} maxLength={20} value={form.code} onChange={set('code')} /></Field>
            <Field label="Type"><select className="input" value={form.type} onChange={set('type')}><option value="percent">Percent (%)</option><option value="fixed">Fixed (₹)</option></select></Field>
            <Field label="Value"><input className="input" type="number" min="0.01" step="0.01" required value={form.value} onChange={set('value')} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-3"><Field label="Min order (₹)"><input className="input" type="number" min="0" value={form.minOrderValue} onChange={set('minOrderValue')} /></Field>
            <Field label="Max discount (₹)" hint="Optional cap"><input className="input" type="number" min="0" value={form.maxDiscount} onChange={set('maxDiscount')} /></Field>
            <Field label="Expires on"><input className="input" type="date" required value={form.expiresAt} onChange={set('expiresAt')} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Total usage limit" hint="Blank = unlimited"><input className="input" type="number" min="1" value={form.usageLimit} onChange={set('usageLimit')} /></Field><Field label="Uses per customer"><input className="input" type="number" min="1" value={form.perUserLimit} onChange={set('perUserLimit')} /></Field></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Enabled</label>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Save</button></div></form>}</Modal>
      <Confirm open={!!del} danger title="Delete coupon?" message={`Coupon ${del?.code} will be removed. Past orders keep their discount.`} confirmLabel="Delete" busy={busy} onClose={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
