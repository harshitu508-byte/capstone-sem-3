import { useState } from 'react';
import { AlertTriangle, Boxes, DollarSign, Package, Search } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { money } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorBox, Field, Modal, PageLoader, Pagination, Spinner, StatCard, Table, Tag } from '../../components/ui';
import { useAsync, useDebounce, useSocketEvent } from '../../components/hooks';

export default function Inventory() {
  const { user } = useAuth(); const toast = useToast(); const admin = user.role === 'admin';
  const [page, setPage] = useState(1); const [lowOnly, setLowOnly] = useState(false); const [search, setSearch] = useState(''); const dq = useDebounce(search);
  const sum = useAsync(() => api.get('/reports/inventory'), []);
  const list = useAsync(() => (lowOnly ? api.get('/inventory/low-stock', { page, limit: 10 }) : api.get('/products/manage', { page, limit: 10, search: dq })), [page, lowOnly, dq]);
  const [adj, setAdj] = useState(null); const [busy, setBusy] = useState(false);
  useSocketEvent('inventory:changed', () => { list.reload(); sum.reload(); });

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.patch(`/inventory/${adj.p._id}`, { mode: adj.mode, quantity: Number(adj.qty), lowStockThreshold: Number(adj.threshold) }); toast.success('Inventory updated'); setAdj(null); list.reload(); sum.reload(); }
    catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(false); }
  };
  const d = sum.data?.data;
  return (
    <div className="space-y-6"><h1 className="text-2xl font-extrabold">Inventory {admin && <span className="text-base font-medium text-slate-400">· platform-wide</span>}</h1>
      {d && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Products" value={d.products} icon={Package} /><StatCard label="Units in stock" value={d.units} icon={Boxes} tone="bg-blue-50 text-blue-600" /><StatCard label="Stock value" value={money(d.valuation)} icon={DollarSign} tone="bg-emerald-50 text-emerald-600" /><StatCard label="Needs attention" value={d.lowStock + d.outOfStock} icon={AlertTriangle} tone="bg-amber-50 text-amber-600" sub={`${d.lowStock} low · ${d.outOfStock} out`} /></div>}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-white p-1 text-sm font-semibold">{[[false, 'All products'], [true, 'Low / out of stock']].map(([v, l]) => <button key={l} onClick={() => { setLowOnly(v); setPage(1); }} className={`rounded-md px-3 py-1.5 ${lowOnly === v ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>{l}</button>)}</div>
        {!lowOnly && <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>}</div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <><Table head={['Product', ...(admin ? ['Seller'] : []), 'Price', 'Stock', 'Alert at', 'Value', '']} empty={!list.data.data.length && <Empty title={lowOnly ? 'Nothing is running low 🎉' : 'No products'} />}>
          {list.data.data.map((p) => (
            <tr key={p._id}><td className="td font-medium">{p.name}{!p.isActive && <Tag> inactive</Tag>}</td>{admin && <td className="td">{p.seller?.shopName || p.seller?.name}</td>}
              <td className="td">{money(p.price)}</td>
              <td className="td"><Tag color={p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= p.lowStockThreshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}>{p.stock === 0 ? 'Out' : p.stock}</Tag></td>
              <td className="td">{p.lowStockThreshold}</td><td className="td">{money(p.price * p.stock)}</td>
              <td className="td text-right"><button className="btn-outline !py-1" onClick={() => setAdj({ p, mode: 'add', qty: 1, threshold: p.lowStockThreshold })}>Adjust</button></td></tr>))}</Table>
          <Pagination meta={list.data.meta} onPage={setPage} /></>)}
      <Modal open={!!adj} onClose={() => setAdj(null)} title={`Adjust stock — ${adj?.p.name || ''}`}>
        {adj && <form onSubmit={save} className="space-y-4"><p className="text-sm text-slate-500">Current stock: <b>{adj.p.stock}</b>. Stock can never go below zero.</p>
          <Field label="Action"><select className="input" value={adj.mode} onChange={(e) => setAdj({ ...adj, mode: e.target.value })}><option value="add">Add stock (restock)</option><option value="remove">Remove stock (damaged/lost)</option><option value="set">Set exact quantity</option></select></Field>
          <Field label="Quantity"><input className="input" type="number" min="0" step="1" required value={adj.qty} onChange={(e) => setAdj({ ...adj, qty: e.target.value })} /></Field>
          <Field label="Low-stock alert threshold"><input className="input" type="number" min="0" step="1" required value={adj.threshold} onChange={(e) => setAdj({ ...adj, threshold: e.target.value })} /></Field>
          <div className="flex justify-end gap-2"><button type="button" className="btn-outline" onClick={() => setAdj(null)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Apply</button></div></form>}
      </Modal>
    </div>
  );
}
