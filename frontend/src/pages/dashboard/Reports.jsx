import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { useAsync } from '../../components/hooks';
import { ErrorBox, PageLoader, StatCard, Table } from '../../components/ui';
import { ChartCard } from './Overview';
import { Boxes, DollarSign, AlertTriangle, Package } from 'lucide-react';

export default function Reports() {
  const [days, setDays] = useState(30);
  const r = useAsync(async () => {
    const [sales, cat, best, inv] = await Promise.all([api.get('/reports/sales-by-date', { days }), api.get('/reports/revenue-by-category', { days }), api.get('/reports/best-sellers', { days, limit: 10 }), api.get('/reports/inventory')]);
    return { sales: sales.data, cat: cat.data, best: best.data, inv: inv.data };
  }, [days]);
  if (r.loading && !r.data) return <PageLoader />;
  if (r.error) return <ErrorBox message={r.error} onRetry={r.reload} />;
  const { sales, cat, best, inv } = r.data; const total = sales.reduce((s, x) => s + x.revenue, 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">Revenue & reports</h1>
        <select className="input !w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90, 180].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Revenue (${days}d)`} value={money(total)} icon={DollarSign} tone="bg-emerald-50 text-emerald-600" />
        <StatCard label="Inventory value" value={money(inv.valuation)} icon={Boxes} sub={`${inv.units} units in stock`} />
        <StatCard label="Low stock" value={inv.lowStock} icon={AlertTriangle} tone="bg-amber-50 text-amber-600" />
        <StatCard label="Out of stock" value={inv.outOfStock} icon={Package} tone="bg-red-50 text-red-600" />
      </div>
      <ChartCard title="Daily revenue & units" empty={!sales.some((s) => s.revenue > 0)}>
        <ResponsiveContainer><LineChart data={sales}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} /><YAxis yAxisId="l" fontSize={11} width={55} /><YAxis yAxisId="r" orientation="right" fontSize={11} width={30} /><Tooltip formatter={(v, n) => (n === 'Revenue' ? money(v) : v)} /><Legend />
          <Line yAxisId="l" type="monotone" dataKey="revenue" name="Revenue" stroke="#4f46e5" strokeWidth={2} dot={false} /><Line yAxisId="r" type="monotone" dataKey="units" name="Units" stroke="#10b981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></ChartCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue by category" empty={!cat.length}><ResponsiveContainer><BarChart data={cat}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="category" fontSize={11} /><YAxis fontSize={11} width={55} /><Tooltip formatter={(v) => money(v)} /><Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <div><h3 className="mb-2 font-semibold">Top products</h3><Table head={['Product', 'Units', 'Revenue']} empty={!best.length && <p className="p-6 text-center text-sm text-slate-500">No sales in this period.</p>}>{best.map((b) => <tr key={b.productId}><td className="td font-medium">{b.name}</td><td className="td">{b.units}</td><td className="td">{money(b.revenue)}</td></tr>)}</Table></div>
      </div>
      <div><h3 className="mb-2 font-semibold">Inventory valuation by category</h3><Table head={['Category', 'Products', 'Units', 'Valuation']} empty={!inv.byCategory.length && <p className="p-6 text-center text-sm text-slate-500">No products.</p>}>{inv.byCategory.map((c) => <tr key={c.category}><td className="td font-medium">{c.category}</td><td className="td">{c.products}</td><td className="td">{c.units}</td><td className="td">{money(c.valuation)}</td></tr>)}</Table></div>
    </div>
  );
}
