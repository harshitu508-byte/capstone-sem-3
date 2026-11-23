import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync } from '../components/hooks';
import ProductCard from '../components/ProductCard';
import { ErrorBox, PageLoader, Empty } from '../components/ui';

export default function Home() {
  const prods = useAsync(() => api.get('/products', { sort: 'popular', limit: 8 }), []);
  const cats = useAsync(() => api.get('/categories'), []);
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 px-6 py-12 text-white sm:px-12 sm:py-16">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-100">New season, new finds</p>
        <h1 className="max-w-xl text-3xl font-extrabold leading-tight sm:text-5xl">Everything you need, from sellers you can trust.</h1>
        <p className="mt-4 max-w-lg text-brand-100">Shop electronics, home, books and fashion with live stock, secure checkout and real-time order tracking.</p>
        <Link to="/products" className="btn mt-6 bg-white text-brand-700 hover:bg-brand-50">Shop now <ArrowRight className="h-4 w-4" /></Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[[Truck, 'Free shipping', 'On orders above ₹1,000'], [ShieldCheck, 'Safe checkout', 'Server-verified prices & stock'], [RotateCcw, 'Easy cancellations', 'Stock & refund handled automatically']].map(([I, t, s]) => (
          <div key={t} className="card flex items-center gap-4 p-4"><I className="h-8 w-8 text-brand-600" /><div><p className="font-semibold">{t}</p><p className="text-sm text-slate-500">{s}</p></div></div>))}
      </section>
      {cats.data?.data?.length > 0 && (
        <section><h2 className="mb-4 text-xl font-bold">Shop by category</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{cats.data.data.map((c) => <Link key={c._id} to={`/products?category=${c._id}`} className="card p-5 text-center font-semibold transition hover:border-brand-500 hover:text-brand-700">{c.name}</Link>)}</div></section>)}
      <section>
        <div className="mb-4 flex items-end justify-between"><h2 className="text-xl font-bold">Popular right now</h2><Link to="/products" className="text-sm font-semibold text-brand-600">View all</Link></div>
        {prods.loading ? <PageLoader /> : prods.error ? <ErrorBox message={prods.error} onRetry={prods.reload} /> :
          prods.data.data.length === 0 ? <Empty title="No products yet" hint="Run the seed script or ask a seller to list products." /> :
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{prods.data.data.map((p) => <ProductCard key={p._id} p={p} />)}</div>}
      </section>
    </div>
  );
}
