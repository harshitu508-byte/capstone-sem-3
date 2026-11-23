import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search } from 'lucide-react';
import { api } from '../lib/api';
import { useAsync, useDebounce } from '../components/hooks';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, Pagination, PageLoader } from '../components/ui';

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const get = (k, d = '') => sp.get(k) || d;
  const [search, setSearch] = useState(get('search')); const dSearch = useDebounce(search);
  const [price, setPrice] = useState({ min: get('minPrice'), max: get('maxPrice') }); const dPrice = useDebounce(price, 600);
  const [show, setShow] = useState(false);
  const cats = useAsync(() => api.get('/categories'), []);

  const update = (patch) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); setSp(n, { replace: true }); };
  useEffect(() => { setSearch(sp.get('search') || ''); }, [sp.get('search')]); // eslint-disable-line
  useEffect(() => { if (dSearch !== get('search')) update({ search: dSearch }); }, [dSearch]); // eslint-disable-line
  useEffect(() => { if (dPrice.min !== get('minPrice') || dPrice.max !== get('maxPrice')) update({ minPrice: dPrice.min, maxPrice: dPrice.max }); }, [dPrice]); // eslint-disable-line

  const q = Object.fromEntries(['search', 'category', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page'].map((k) => [k, get(k)]));
  const list = useAsync(() => api.get('/products', { ...q, limit: 12 }), [sp.toString()]);
  const clear = () => { setSearch(''); setPrice({ min: '', max: '' }); setSp({}); };

  const filters = (
    <div className="space-y-5">
      <div><label className="label">Category</label>
        <div className="space-y-1"><button onClick={() => update({ category: '' })} className={`block w-full rounded px-2 py-1.5 text-left text-sm ${!q.category ? 'bg-brand-50 font-semibold text-brand-700' : 'hover:bg-slate-100'}`}>All categories</button>
          {cats.data?.data.map((c) => <button key={c._id} onClick={() => update({ category: c._id })} className={`block w-full rounded px-2 py-1.5 text-left text-sm ${q.category === c._id ? 'bg-brand-50 font-semibold text-brand-700' : 'hover:bg-slate-100'}`}>{c.name}</button>)}</div></div>
      <div><label className="label">Price (₹)</label><div className="flex gap-2"><input className="input" type="number" min="0" placeholder="Min" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} /><input className="input" type="number" min="0" placeholder="Max" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} /></div></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.inStock === 'true'} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} />In stock only</label>
      <button className="btn-outline w-full" onClick={clear}>Clear all filters</button>
    </div>);
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block"><div className="card sticky top-20 p-4">{filters}</div></aside>
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="input !w-auto" value={q.sort || 'newest'} onChange={(e) => update({ sort: e.target.value })}>
            <option value="newest">Newest</option><option value="popular">Most popular</option><option value="rating">Top rated</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
          <button className="btn-outline lg:hidden" onClick={() => setShow((s) => !s)}><SlidersHorizontal className="h-4 w-4" />Filters</button>
        </div>
        {show && <div className="card mb-4 p-4 lg:hidden">{filters}</div>}
        {list.loading ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> :
          list.data.data.length === 0 ? <Empty title="No products match your filters" hint="Try a different search or clear filters." action={<button className="btn-primary mt-2" onClick={clear}>Clear filters</button>} /> : (
            <><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{list.data.data.map((p) => <ProductCard key={p._id} p={p} />)}</div>
              <Pagination meta={list.data.meta} onPage={(page) => update({ page: String(page) })} /></>)}
      </div>
    </div>
  );
}
