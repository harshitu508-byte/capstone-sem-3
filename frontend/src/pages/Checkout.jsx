import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Field, PageLoader, Spinner } from '../components/ui';
import { Summary } from './Cart';

export default function Checkout() {
  const { user } = useAuth(); const { cart, reload } = useCart(); const toast = useToast(); const nav = useNavigate();
  const a = user.address || {};
  const [f, setF] = useState({ fullName: user.name || '', phone: user.phone || '', street: a.street || '', city: a.city || '', state: a.state || '', postalCode: a.postalCode || '', country: a.country || 'India' });
  const [method, setMethod] = useState('simulated_card'); const [busy, setBusy] = useState(false); const [errors, setErrors] = useState({}); const [err, setErr] = useState('');
  if (!cart) return <PageLoader />;
  if (!cart.items.length) return <Navigate to="/cart" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setErrors({}); setBusy(true);
    try { const r = await api.post('/orders', { shippingAddress: f, paymentMethod: method }); await reload(); toast.success('Order placed!'); nav(`/orders/${r.data._id}`, { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); if (e2.errors) setErrors(Object.fromEntries(e2.errors.map((x) => [x.field.replace('shippingAddress.', ''), x.message]))); if (e2.status === 409) reload(); }
    finally { setBusy(false); }
  };
  const Inp = ({ k, label, ...r }) => <Field label={label} error={errors[k]}><input className="input" required value={f[k]} onChange={set(k)} {...r} /></Field>;
  return (
    <div><h1 className="mb-4 text-2xl font-extrabold">Checkout</h1>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="card space-y-4 p-5"><h2 className="font-semibold">Shipping address</h2>
            {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
            <div className="grid gap-4 sm:grid-cols-2"><Inp k="fullName" label="Full name" /><Inp k="phone" label="Phone" /></div>
            <Inp k="street" label="Street address" />
            <div className="grid gap-4 sm:grid-cols-3"><Inp k="city" label="City" /><Inp k="state" label="State" /><Inp k="postalCode" label="PIN code" /></div></section>
          <section className="card space-y-3 p-5"><h2 className="font-semibold">Payment method</h2>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Simulation only.</b> No real payment is processed; you will confirm a simulated payment on the next screen.</span></div>
            {[['simulated_card', 'Simulated card payment'], ['simulated_upi', 'Simulated UPI payment'], ['cod', 'Cash on delivery']].map(([v, l]) => (
              <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${method === v ? 'border-brand-600 bg-brand-50' : ''}`}><input type="radio" name="pm" checked={method === v} onChange={() => setMethod(v)} />{l}</label>))}</section>
        </div>
        <aside className="card h-fit space-y-4 p-5"><h2 className="font-semibold">Order summary</h2>
          <ul className="space-y-1 text-sm">{cart.items.map((i) => <li key={i.product._id} className="flex justify-between gap-2"><span className="truncate">{i.quantity} × {i.product.name}</span></li>)}</ul>
          <Summary cart={cart} />
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Place order</button></aside>
      </form>
    </div>
  );
}
