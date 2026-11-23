import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, Store } from 'lucide-react';
import { api, errMsg } from '../lib/api';
import { date, money } from '../lib/format';
import { useAsync } from '../components/hooks';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { Empty, ErrorBox, PageLoader, ProductImage, Stars, Tag } from '../components/ui';

export default function ProductDetail() {
  const { id } = useParams(); const { user } = useAuth(); const { add, wishlist, toggleWishlist } = useCart(); const toast = useToast(); const nav = useNavigate();
  const [qty, setQty] = useState(1); const [img, setImg] = useState(0); const [busy, setBusy] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const prod = useAsync(() => api.get(`/products/${id}`), [id]);
  const revs = useAsync(() => api.get(`/products/${id}/reviews`, { limit: 20 }), [id]);
  if (prod.loading) return <PageLoader />;
  if (prod.error) return <Empty title="Product not found" hint={prod.error} action={<Link to="/products" className="btn-primary mt-2">Browse products</Link>} />;
  const p = prod.data.data; const out = p.stock === 0; const liked = wishlist.includes(p._id);
  const isCustomer = user?.role === 'customer';
  const guard = () => { if (!isCustomer) { toast.info('Please log in as a customer first'); nav('/login', { state: { from: `/products/${id}` } }); return false; } return true; };
  const addCart = async (buyNow) => { if (!guard()) return; setBusy(true); try { await add(p._id, qty); toast.success('Added to cart'); if (buyNow) nav('/cart'); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); } };
  const submitReview = async (e) => {
    e.preventDefault();
    try { await api.post(`/products/${id}/reviews`, review); toast.success('Thanks for your review!'); setReview({ rating: 5, comment: '' }); revs.reload(); prod.reload(); } catch (e2) { toast.error(errMsg(e2)); }
  };
  return (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div><ProductImage src={p.images?.[img]} alt={p.name} className="card aspect-square" />
          {p.images?.length > 1 && <div className="mt-3 flex gap-2">{p.images.map((s, i) => <button key={s} onClick={() => setImg(i)} className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === img ? 'border-brand-600' : 'border-transparent'}`}><img src={s} alt="" className="h-full w-full object-cover" /></button>)}</div>}</div>
        <div className="space-y-4">
          <Tag color="bg-brand-50 text-brand-700">{p.category?.name}</Tag>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{p.name}</h1>
          <Stars value={p.ratingAvg} count={p.ratingCount} />
          <p className="text-3xl font-extrabold">{money(p.price)}</p>
          <p className="whitespace-pre-line text-slate-600">{p.description}</p>
          <p className="flex items-center gap-2 text-sm text-slate-500"><Store className="h-4 w-4" />Sold by <b>{p.seller?.shopName || p.seller?.name}</b></p>
          <p className={`text-sm font-semibold ${out ? 'text-red-600' : p.stock <= p.lowStockThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>{out ? 'Out of stock' : p.stock <= p.lowStockThreshold ? `Hurry — only ${p.stock} left` : 'In stock'}</p>
          {!out && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border"><button className="p-2.5" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button><span className="w-10 text-center font-semibold">{qty}</span><button className="p-2.5" onClick={() => setQty((q) => Math.min(p.stock, q + 1))}><Plus className="h-4 w-4" /></button></div>
              <button className="btn-primary" disabled={busy} onClick={() => addCart(false)}><ShoppingCart className="h-4 w-4" />Add to cart</button>
              <button className="btn-outline" disabled={busy} onClick={() => addCart(true)}>Buy now</button>
              <button className="btn-ghost" onClick={async () => { if (guard()) try { await toggleWishlist(p._id); } catch (e) { toast.error(errMsg(e)); } }}><Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : ''}`} />{liked ? 'Saved' : 'Save'}</button>
            </div>)}
        </div>
      </div>
      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div><h2 className="mb-4 text-xl font-bold">Customer reviews</h2>
          {revs.loading ? <PageLoader /> : revs.error ? <ErrorBox message={revs.error} /> : revs.data.data.length === 0 ? <Empty title="No reviews yet" hint="Verified buyers can review after their order is delivered." /> :
            <div className="space-y-3">{revs.data.data.map((r) => <div key={r._id} className="card p-4"><div className="flex items-center justify-between"><span className="font-semibold">{r.user?.name}</span><span className="text-xs text-slate-400">{date(r.createdAt)}</span></div><Stars value={r.rating} /><p className="mt-1 text-sm text-slate-600">{r.comment}</p></div>)}</div>}
        </div>
        {isCustomer && (
          <form onSubmit={submitReview} className="card h-fit space-y-3 p-5"><h3 className="font-semibold">Write a review</h3><p className="text-xs text-slate-500">Only available after you've received this product.</p>
            <select className="input" value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 && 's'}</option>)}</select>
            <textarea className="input" rows={3} maxLength={1000} placeholder="Share your experience…" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
            <button className="btn-primary w-full">Submit review</button></form>)}
      </section>
    </div>
  );
}
