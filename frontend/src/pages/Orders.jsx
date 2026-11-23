import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Circle } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { dateTime, money } from '../lib/format';
import { useAsync, useSocketEvent } from '../components/hooks';
import { useToast } from '../context/ToastContext';
import { Badge, Confirm, Empty, ErrorBox, PageLoader, Pagination, ProductImage, Spinner } from '../components/ui';

export function Orders() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState('');
  const l = useAsync(() => api.get('/orders', { page, limit: 8, status }), [page, status]);
  const live = useCallback(() => l.reload(), [l.reload]); // eslint-disable-line
  useSocketEvent('order:status', live);
  return (
    <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">My orders</h1>
      <select className="input !w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
      {l.loading ? <PageLoader /> : l.error ? <ErrorBox message={l.error} onRetry={l.reload} /> : l.data.data.length === 0 ? <Empty icon={ClipboardList} title="No orders found" action={<Link to="/products" className="btn-primary mt-2">Start shopping</Link>} /> : (
        <><div className="space-y-3">{l.data.data.map((o) => (
          <Link key={o._id} to={`/orders/${o._id}`} className="card block p-4 transition hover:border-brand-500">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{o.orderNumber}</p><p className="text-xs text-slate-500">{dateTime(o.createdAt)} · {o.items.length} item(s)</p></div><div className="flex items-center gap-3"><Badge value={o.status} /><span className="font-bold">{money(o.total)}</span></div></div>
            <div className="mt-3 flex gap-2">{o.items.slice(0, 5).map((i) => <ProductImage key={i.product} src={i.image} alt={i.name} className="h-12 w-12 rounded" />)}</div></Link>))}</div>
          <Pagination meta={l.data.meta} onPage={setPage} /></>)}
    </div>
  );
}

const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];
export function OrderDetail() {
  const { id } = useParams(); const toast = useToast();
  const o = useAsync(() => api.get(`/orders/${id}`), [id]);
  const [busy, setBusy] = useState(''); const [cancelOpen, setCancelOpen] = useState(false);
  const onLive = useCallback((e) => { if (e.orderId === id) { o.reload(); toast.info(`Order is now ${e.status}`); } }, [id]); // eslint-disable-line
  useSocketEvent('order:status', onLive);
  if (o.loading && !o.data) return <PageLoader />;
  if (o.error) return <ErrorBox message={o.error} />;
  const order = o.data.data;
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); toast.success(ok); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(''); o.reload(); setCancelOpen(false); } };
  const needsPay = order.status === 'pending' && order.payment.method !== 'cod' && order.payment.status !== 'paid';
  const cancelled = order.status === 'cancelled'; const idx = STEPS.indexOf(order.status);
  const sa = order.shippingAddress;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><Link to="/orders" className="text-sm text-brand-600">← All orders</Link><h1 className="text-2xl font-extrabold">{order.orderNumber}</h1><p className="text-sm text-slate-500">Placed {dateTime(order.createdAt)}</p></div><Badge value={order.status} className="!text-sm" /></div>

      {needsPay && (
        <div className="card border-amber-300 bg-amber-50 p-5"><div className="mb-3 flex items-start gap-2 text-amber-800"><AlertTriangle className="mt-0.5 h-5 w-5" /><div><p className="font-bold">Complete your (simulated) payment</p><p className="text-sm">This is a demo: no real money is charged. Choose an outcome to simulate.</p></div></div>
          <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={!!busy} onClick={() => run('pay', () => api.post('/payments/simulate', { orderId: id, outcome: 'success' }), 'Simulated payment successful')}>{busy === 'pay' && <Spinner className="!text-white h-4 w-4" />}Pay {money(order.total)} (simulated)</button>
            <button className="btn-outline" disabled={!!busy} onClick={async () => { setBusy('fail'); try { await api.post('/payments/simulate', { orderId: id, outcome: 'failure' }); } catch (e) { toast.error(e.message); } setBusy(''); o.reload(); }}>Simulate failed payment</button></div>
          {order.payment.status === 'failed' && <p className="mt-2 text-sm font-semibold text-red-600">Last simulated payment failed. You can retry.</p>}</div>)}

      {!cancelled && (
        <div className="card p-5"><div className="flex items-center">{STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none"><div className="flex flex-col items-center gap-1">{i <= idx ? <CheckCircle2 className="h-7 w-7 text-emerald-500" /> : <Circle className="h-7 w-7 text-slate-300" />}<span className={`text-xs font-semibold capitalize ${i <= idx ? 'text-slate-800' : 'text-slate-400'}`}>{s}</span></div>{i < STEPS.length - 1 && <div className={`mx-2 mb-5 h-1 flex-1 rounded ${i < idx ? 'bg-emerald-500' : 'bg-slate-200'}`} />}</div>))}</div></div>)}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card divide-y">{order.items.map((i) => (
          <div key={i.product} className="flex items-center gap-4 p-4"><ProductImage src={i.image} alt="" className="h-16 w-16 rounded-lg" /><div className="min-w-0 flex-1"><Link to={`/products/${i.product}`} className="font-semibold hover:text-brand-700">{i.name}</Link><p className="text-sm text-slate-500">{i.quantity} × {money(i.price)}</p></div><p className="font-bold">{money(i.price * i.quantity)}</p></div>))}</div>
        <div className="space-y-4">
          <div className="card space-y-2 p-5 text-sm"><h3 className="font-semibold">Payment</h3>
            <div className="flex justify-between"><span className="text-slate-500">Method</span><span>{order.payment.method.replace('_', ' ')}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><Badge value={order.payment.status} /></div>
            {order.payment.transactionId && <div className="flex justify-between"><span className="text-slate-500">Txn</span><span className="font-mono text-xs">{order.payment.transactionId}</span></div>}
            <p className="text-xs text-amber-700">Simulated — not a real transaction.</p>
            <hr /><div className="flex justify-between"><span className="text-slate-500">Subtotal</span>{money(order.subtotal)}</div>
            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount ({order.couponCode})</span>− {money(order.discount)}</div>}
            <div className="flex justify-between"><span className="text-slate-500">Shipping</span>{order.shipping ? money(order.shipping) : 'Free'}</div><div className="flex justify-between"><span className="text-slate-500">Tax</span>{money(order.tax)}</div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold"><span>Total</span>{money(order.total)}</div></div>
          <div className="card p-5 text-sm"><h3 className="mb-1 font-semibold">Ship to</h3><p>{sa.fullName}</p><p className="text-slate-500">{sa.street}, {sa.city}, {sa.state} {sa.postalCode}</p><p className="text-slate-500">{sa.phone}</p></div>
          {['pending', 'confirmed'].includes(order.status) && <button className="btn-danger w-full" onClick={() => setCancelOpen(true)}>Cancel order</button>}
          <div className="card p-5 text-sm"><h3 className="mb-2 font-semibold">Timeline</h3><ul className="space-y-1">{order.statusHistory.map((h, k) => <li key={k} className="flex justify-between"><span className="capitalize">{h.status}</span><span className="text-slate-400">{dateTime(h.at)}</span></li>)}</ul></div>
        </div>
      </div>
      <Confirm open={cancelOpen} danger title="Cancel this order?" message="Items will be returned to stock and any simulated payment will be marked refunded." confirmLabel="Yes, cancel order" busy={busy === 'cancel'} onClose={() => setCancelOpen(false)} onConfirm={() => run('cancel', () => api.post(`/orders/${id}/cancel`), 'Order cancelled')} />
    </div>
  );
}
