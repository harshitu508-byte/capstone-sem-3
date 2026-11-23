import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { money } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../lib/api';
import { ProductImage, Stars } from './ui';

export default function ProductCard({ p }) {
  const { user } = useAuth(); const { add, wishlist, toggleWishlist } = useCart(); const toast = useToast();
  const out = p.stock === 0; const liked = wishlist.includes(p._id);
  const needLogin = () => toast.info('Please log in as a customer to use the cart and wishlist');
  const addCart = async () => { if (user?.role !== 'customer') return needLogin(); try { await add(p._id, 1); toast.success('Added to cart'); } catch (e) { toast.error(errMsg(e)); } };
  const heart = async () => { if (user?.role !== 'customer') return needLogin(); try { await toggleWishlist(p._id); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:shadow-md">
      <Link to={`/products/${p._id}`} className="relative block">
        <ProductImage src={p.images?.[0]} alt={p.name} className="aspect-square" />
        {out && <span className="absolute left-2 top-2 rounded bg-slate-900/80 px-2 py-0.5 text-xs font-semibold text-white">Out of stock</span>}
        {!out && p.stock <= p.lowStockThreshold && <span className="absolute left-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">Only {p.stock} left</span>}
      </Link>
      <button onClick={heart} aria-label="Wishlist" className="absolute right-2 top-2 rounded-full bg-white/90 p-2 shadow hover:bg-white"><Heart className={`h-4 w-4 ${liked ? 'fill-red-500 text-red-500' : 'text-slate-500'}`} /></button>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs text-slate-400">{p.category?.name}</p>
        <Link to={`/products/${p._id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold hover:text-brand-700">{p.name}</Link>
        <Stars value={p.ratingAvg} count={p.ratingCount} />
        <div className="mt-auto flex items-center justify-between pt-2"><span className="text-lg font-bold">{money(p.price)}</span>
          <button onClick={addCart} disabled={out} className="btn-primary !px-3 !py-1.5" aria-label="Add to cart"><ShoppingCart className="h-4 w-4" /></button></div>
      </div>
    </div>
  );
}
