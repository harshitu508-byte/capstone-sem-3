import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardList, DollarSign, Package, ShoppingBag, Users as UsersIcon } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../components/hooks';
import { ErrorBox, PageLoader, StatCard, Empty } from '../../components/ui';

export const PIE = ['#f59e0b', '#3b82f6', '#6366f1', '#10b981', '#ef4444'];
export const ChartCard = ({ title, children, empty }) => <div className="card p-5"><h3 className="mb-4 font-semibold">{title}</h3>{empty ? <Empty title="No data yet" hint="Charts appear once orders are confirmed." /> : <div className="h-64">{children}</div>}</div>;

export default function Overview() {
  const { user } = useAuth(); const admin = user.role === 'admin';
  const s = useAsync(() => api.get('/reports/summary'), []);
  const sales = useAsync(() => api.get('/reports/sales-by-date', { days: 30 }), []);
  const best = useAsync(() => api.get('/reports/best-sellers', { limit: 5, days: 90 }), []);
  const status = useAsync(() => api.get('/reports/order-status'), []);
  if (s.loading) return <PageLoader />;
  if (s.error) return <ErrorBox message={s.error} onRetry={s.reload} />;
  const d = s.data.data;
  const salesData = sales.data?.data || []; const hasSales = salesData.some((r) => r.revenue > 0);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{admin ? 'Platform overview' : 'Sales overview'}</h1>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(d.revenue)} icon={DollarSign} tone="bg-emerald-50 text-emerald-600" sub="Confirmed, shipped & delivered" />
        <StatCard label="Orders" value={d.totalOrders} icon={ShoppingBag} sub={`${d.pendingOrders} pending`} />
        <StatCard label="Units sold" value={d.unitsSold} icon={ClipboardList} tone="bg-blue-50 text-blue-600" />
        <StatCard label="Active products" value={d.products} icon={Package} tone="bg-violet-50 text-violet-600" sub={`${d.lowStock} low on stock`} />
        {admin && <><StatCard label="Customers" value={d.users?.customer || 0} icon={UsersIcon} tone="bg-sky-50 text-sky-600" /><StatCard label="Sellers" value={d.users?.seller || 0} icon={UsersIcon} tone="bg-orange-50 text-orange-600" sub={`${d.pendingSellers} awaiting approval`} /></>}
      </div>
      {d.lowStock > 0 && <Link to="/dashboard/inventory" className="card flex items-center gap-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"><AlertTriangle className="h-5 w-5" /><span><b>{d.lowStock}</b> product(s) are at or below their low-stock threshold. Review inventory →</span></Link>}
      {admin && d.pendingSellers > 0 && <Link to="/dashboard/users" className="card flex items-center gap-3 border-brand-300 bg-brand-50 p-4 text-sm text-brand-800"><UsersIcon className="h-5 w-5" /><span><b>{d.pendingSellers}</b> seller account(s) awaiting approval →</span></Link>}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><ChartCard title="Revenue — last 30 days" empty={!sales.loading && !hasSales}>
          <ResponsiveContainer><AreaChart data={salesData}><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} fontSize={11} /><YAxis fontSize={11} width={55} /><Tooltip formatter={(v) => money(v)} /><Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="url(#g)" strokeWidth={2} /></AreaChart></ResponsiveContainer></ChartCard></div>
        <ChartCard title="Orders by status" empty={!status.loading && !(status.data?.data.length)}>
          <ResponsiveContainer><PieChart><Pie data={status.data?.data || []} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} label={(e) => e.status}>{(status.data?.data || []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
      </div>
      <ChartCard title="Best-selling products (90 days, units)" empty={!best.loading && !(best.data?.data.length)}>
        <ResponsiveContainer><BarChart data={best.data?.data || []} layout="vertical" margin={{ left: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" fontSize={11} /><YAxis type="category" dataKey="name" width={150} fontSize={11} tickFormatter={(v) => (v.length > 22 ? v.slice(0, 21) + '…' : v)} /><Tooltip /><Bar dataKey="units" fill="#6366f1" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></ChartCard>
    </div>
  );
}
