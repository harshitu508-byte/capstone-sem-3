import { useState } from 'react';
import { Edit, Plus, Power, Search } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { money } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Confirm, Empty, ErrorBox, Field, Modal, PageLoader, Pagination, ProductImage, Spinner, Table, Tag } from '../../components/ui';
import { useAsync, useDebounce } from '../../components/hooks';

const blank = { name: '', description: '', price: '', category: '', stock: 0, lowStockThreshold: 5, sku: '', image: '' };

export default function ManageProducts() {
  const { user } = useAuth(); const toast = useToast(); const admin = user.role === 'admin';
  const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const dq = useDebounce(search);
  const list = useAsync(() => api.get('/products/manage', { page, limit: 10, search: dq }), [page, dq]);
  const cats = useAsync(() => api.get('/categories'), []);
  const [form, setForm] = useState(null); const [busy, setBusy] = useState(false); const [toggle, setToggle] = useState(null); const [err, setErr] = useState('');

  const openEdit = (p) => { setErr(''); setForm({ _id: p._id, name: p.name, description: p.description, price: p.price, category: p.category?._id || '', stock: p.stock, lowStockThreshold: p.lowStockThreshold, sku: p.sku || '', image: p.images?.[0] || '' }); };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = { name: form.name, description: form.description, price: Number(form.price), category: form.category, lowStockThreshold: Number(form.lowStockThreshold), images: form.image ? [form.image] : [] };
    if (form.sku) body.sku = form.sku;
    try {
      if (form._id) await api.put(`/products/${form._id}`, body); else await api.post('/products', { ...body, stock: Number(form.stock) });
      toast.success(form._id ? 'Product updated' : 'Product created'); setForm(null); list.reload();
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  const doToggle = async () => {
    setBusy(true);
    try { if (toggle.isActive) await api.del(`/products/${toggle._id}`); else await api.put(`/products/${toggle._id}`, { isActive: true }); toast.success(toggle.isActive ? 'Product deactivated' : 'Product reactivated'); setToggle(null); list.reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">{admin ? 'All products' : 'My products'}</h1>
        <div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          {!admin && <button className="btn-primary" onClick={() => { setErr(''); setForm({ ...blank, category: cats.data?.data[0]?._id || '' }); }}><Plus className="h-4 w-4" />Add product</button>}</div></div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <><Table head={['Product', ...(admin ? ['Seller'] : []), 'Category', 'Price', 'Stock', 'Status', '']} empty={!list.data.data.length && <Empty title="No products found" hint={admin ? undefined : 'Add your first product to start selling.'} />}>
          {list.data.data.map((p) => (
            <tr key={p._id}>
              <td className="td"><div className="flex items-center gap-3"><ProductImage src={p.images?.[0]} alt="" className="h-10 w-10 shrink-0 rounded" /><span className="font-medium">{p.name}</span></div></td>
              {admin && <td className="td">{p.seller?.shopName || p.seller?.name}</td>}
              <td className="td">{p.category?.name}</td><td className="td">{money(p.price)}</td>
              <td className="td"><Tag color={p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= p.lowStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>{p.stock}</Tag></td>
              <td className="td">{p.isActive ? <Tag color="bg-emerald-100 text-emerald-800">Active</Tag> : <Tag>Inactive</Tag>}</td>
              <td className="td"><div className="flex justify-end gap-1"><button className="btn-ghost !p-2" title="Edit" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></button><button className="btn-ghost !p-2" title={p.isActive ? 'Deactivate' : 'Reactivate'} onClick={() => setToggle(p)}><Power className={`h-4 w-4 ${p.isActive ? 'text-red-500' : 'text-emerald-600'}`} /></button></div></td>
            </tr>))}</Table><Pagination meta={list.data.meta} onPage={setPage} /></>)}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit product' : 'Add product'} wide>
        {form && <form onSubmit={save} className="space-y-4">{err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Field label="Name"><input className="input" required minLength={2} value={form.name} onChange={set('name')} /></Field>
          <Field label="Description"><textarea className="input" required minLength={5} rows={3} value={form.description} onChange={set('description')} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Price (₹)"><input className="input" type="number" min="0.01" step="0.01" required value={form.price} onChange={set('price')} /></Field>
            <Field label="Category"><select className="input" required value={form.category} onChange={set('category')}><option value="" disabled>Select…</option>{cats.data?.data.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stock" hint={form._id ? 'Change via Inventory page' : undefined}><input className="input" type="number" min="0" step="1" required disabled={!!form._id} value={form.stock} onChange={set('stock')} /></Field>
            <Field label="Low-stock alert at"><input className="input" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} /></Field>
            <Field label="SKU (optional)"><input className="input" value={form.sku} onChange={set('sku')} /></Field></div>
          <Field label="Image URL (optional)"><input className="input" type="url" placeholder="https://…" value={form.image} onChange={set('image')} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Save</button></div></form>}
      </Modal>
      <Confirm open={!!toggle} danger={toggle?.isActive} title={toggle?.isActive ? 'Deactivate product?' : 'Reactivate product?'} message={toggle?.isActive ? 'It will be hidden from the storefront and removed from carts. Order history is kept.' : 'It will be visible in the storefront again.'} confirmLabel={toggle?.isActive ? 'Deactivate' : 'Reactivate'} busy={busy} onClose={() => setToggle(null)} onConfirm={doToggle} />
    </div>
  );
}
