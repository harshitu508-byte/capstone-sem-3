import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../components/hooks';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, PageLoader } from '../components/ui';

export default function Wishlist() {
  const { wishlist } = useCart();
  const w = useAsync(() => api.get('/wishlist'), [wishlist.length]);
  return (
    <div><h1 className="mb-4 text-2xl font-extrabold">My wishlist</h1>
      {w.loading ? <PageLoader /> : w.error ? <ErrorBox message={w.error} onRetry={w.reload} /> : w.data.data.length === 0 ?
        <Empty icon={Heart} title="Your wishlist is empty" hint="Tap the heart on any product to save it here." action={<Link to="/products" className="btn-primary mt-2">Browse products</Link>} /> :
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{w.data.data.map((p) => <ProductCard key={p._id} p={{ ...p, category: null, lowStockThreshold: 0 }} />)}</div>}
    </div>
  );
}
