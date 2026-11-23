import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Tag, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../lib/api';
import { money } from '../lib/format';
import { Empty, PageLoader, ProductImage } from '../components/ui';

export function Summary({ cart }) {
  const t = cart.totals;
  const Row = ({ l, v, cls = '' }) => <div className={`flex justify-between text-sm ${cls}`}><span className="text-slate-500">{l}</span><span className="font-medium">{v}</span></div>;
  return (
    <div className="space-y-2">
      <Row l={`Subtotal (${cart.itemCount} items)`} v={money(t.subtotal)} />
      {t.discount > 0 && <Row l={`Discount${cart.couponCode ? ` (${cart.couponCode})` : ''}`} v={`− ${money(t.discount)}`} cls="text-emerald-600" />}
      <Row l="Shipping" v={t.shipping === 0 ? 'Free' : money(t.shipping)} /><Row l="Tax" v={money(t.tax)} />
      <div className="flex justify-between border-t pt-3 text-lg font-extrabold"><span>Total</span><span>{money(t.total)}</span></div>
    </div>);
}

export default function Cart() {
  const { cart, update, remove, applyCoupon, removeCoupon } = useCart(); const toast = useToast(); const nav = useNavigate();
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false);
  if (!cart) return <PageLoader />;
  const run = async (fn, ok) => { setBusy(true); try { await fn(); if (ok) toast.success(ok); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  if (cart.items.length === 0) return <Empty icon={ShoppingCart} title="Your cart is empty" hint="Looks like you haven't added anything yet." action={<Link to="/products" className="btn-primary mt-2">Start shopping</Link>} />;
  const blocked = cart.items.some((i) => i.outOfStock);
  return (
    <div><h1 className="mb-4 text-2xl font-extrabold">Shopping cart</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {cart.items.map((i) => (
            <div key={i.product._id} className="card flex gap-4 p-4">
              <Link to={`/products/${i.product._id}`}><ProductImage src={i.product.images?.[0]} alt="" className="h-24 w-24 shrink-0 rounded-lg" /></Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${i.product._id}`} className="line-clamp-2 font-semibold hover:text-brand-700">{i.product.name}</Link>
                <p className="text-sm text-slate-500">{money(i.price)} each</p>
                {i.outOfStock && <p className="text-sm font-semibold text-red-600">Only {i.available} available — reduce quantity</p>}
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border"><button disabled={busy || i.quantity <= 1} className="p-2 disabled:opacity-40" onClick={() => run(() => update(i.product._id, i.quantity - 1))}><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm font-semibold">{i.quantity}</span><button disabled={busy || i.quantity >= i.available} className="p-2 disabled:opacity-40" onClick={() => run(() => update(i.product._id, i.quantity + 1))}><Plus className="h-4 w-4" /></button></div>
                  <button className="text-sm text-red-600 hover:underline" onClick={() => run(() => remove(i.product._id), 'Removed from cart')}><Trash2 className="inline h-4 w-4" /> Remove</button>
                </div>
              </div>
              <p className="font-bold">{money(i.lineTotal)}</p>
            </div>))}
        </div>
        <aside className="card h-fit space-y-4 p-5">
          <div><label className="label">Coupon code</label>
            {cart.couponCode ? <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm"><span className="font-semibold text-emerald-700"><Tag className="mr-1 inline h-4 w-4" />{cart.couponCode} applied</span><button className="text-xs font-semibold text-red-600" onClick={() => run(removeCoupon)}>Remove</button></div> :
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) run(() => applyCoupon(code.trim()), 'Coupon applied').then(() => setCode('')); }}><input className="input" placeholder="e.g. WELCOME10" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-outline" disabled={busy}>Apply</button></form>}
            {cart.couponError && <p className="mt-1 text-xs text-red-600">Coupon no longer valid: {cart.couponError}</p>}</div>
          <Summary cart={cart} />
          <button className="btn-primary w-full" disabled={blocked} onClick={() => nav('/checkout')}>Proceed to checkout</button>
          <p className="text-center text-xs text-slate-400">Prices and stock are re-verified on the server at checkout.</p>
        </aside>
      </div>
    </div>
  );
}
