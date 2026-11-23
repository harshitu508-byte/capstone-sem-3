import { useCallback, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { dateTime, money, NEXT_STATUS } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge, Empty, ErrorBox, Modal, PageLoader, Pagination, Spinner, Table } from '../../components/ui';
import { useAsync, useDebounce, useSocketEvent } from '../../components/hooks';

const LABEL = { confirmed: 'Confirm order', shipped: 'Mark as shipped', delivered: 'Mark as delivered', cancelled: 'Cancel order' };

export default function DashOrders() {
  const { user } = useAuth(); const toast = useToast(); const admin = user.role === 'admin';
  const [page, setPage] = useState(1); const [status, setStatus] = useState(''); const [search, setSearch] = useState(''); const dq = useDebounce(search);
  const list = useAsync(() => api.get('/orders', { page, limit: 10, status, search: dq }), [page, status, dq]);
  const [sel, setSel] = useState(null); const [busy, setBusy] = useState('');
  const reload = useCallback(() => list.reload(), [list.reload]); // eslint-disable-line
  useSocketEvent('notification', reload); useSocketEvent('order:status', reload); useSocketEvent('order:new', reload);

  const change = async (next) => {
    setBusy(next);
    try { const r = await api.patch(`/orders/${sel._id}/status`, { status: next }); toast.success(`Order marked ${next}`); setSel({ ...sel, status: r.data.status, payment: r.data.payment }); list.reload(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">{admin ? 'All orders' : 'Orders with my products'}</h1>
        <div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Order #…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <><Table head={['Order', 'Customer', 'Date', 'Items', admin ? 'Total' : 'My subtotal', 'Payment', 'Status']} empty={!list.data.data.length && <Empty icon={ClipboardList} title="No orders found" />}>
          {list.data.data.map((o) => (
            <tr key={o._id} onClick={() => setSel(o)} className="cursor-pointer hover:bg-slate-50"><td className="td font-semibold text-brand-700">{o.orderNumber}</td><td className="td">{o.customer?.name}</td><td className="td">{dateTime(o.createdAt)}</td><td className="td">{o.items.length}</td>
              <td className="td font-medium">{money(admin ? o.total : o.sellerSubtotal)}</td><td className="td"><Badge value={o.payment.status} /></td><td className="td"><Badge value={o.status} /></td></tr>))}</Table>
          <Pagination meta={list.data.meta} onPage={setPage} /></>)}
      <Modal open={!!sel} onClose={() => setSel(null)} title={`Order ${sel?.orderNumber || ''}`} wide>
        {sel && <div className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center gap-2"><Badge value={sel.status} /><Badge value={sel.payment.status} /><span className="text-slate-500">{sel.payment.method.replace('_', ' ')} (simulated)</span></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="label">Customer</p>{sel.customer?.name}<br />{sel.customer?.email}</div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="label">Ship to</p>{sel.shippingAddress.fullName}, {sel.shippingAddress.street}, {sel.shippingAddress.city}, {sel.shippingAddress.state} {sel.shippingAddress.postalCode}<br />{sel.shippingAddress.phone}</div></div>
          <Table head={['Item', 'Qty', 'Price', 'Line']}>{sel.items.map((i) => <tr key={i.product}><td className="td">{i.name}</td><td className="td">{i.quantity}</td><td className="td">{money(i.price)}</td><td className="td">{money(i.price * i.quantity)}</td></tr>)}</Table>
          {!admin && sel.items.length > 0 && <p className="text-xs text-slate-500">You only see your own line items. Status changes apply to the whole order.</p>}
          {sel.payment.method !== 'cod' && sel.status === 'pending' && sel.payment.status !== 'paid' && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Waiting for the customer's simulated payment before this order can be confirmed.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {NEXT_STATUS[sel.status].length === 0 && <span className="text-slate-400">No further actions — order is {sel.status}.</span>}
            {NEXT_STATUS[sel.status].map((n) => <button key={n} disabled={!!busy || (n === 'confirmed' && sel.payment.method !== 'cod' && sel.payment.status !== 'paid')} onClick={() => change(n)} className={n === 'cancelled' ? 'btn-danger' : 'btn-primary'}>{busy === n && <Spinner className="!text-white h-4 w-4" />}{LABEL[n]}</button>)}</div>
        </div>}
      </Modal>
    </div>
  );
}
