import { useState } from 'react';
import { Search } from 'lucide-react';
import { api, errMsg } from '../../lib/api';
import { date } from '../../lib/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Empty, ErrorBox, PageLoader, Pagination, Table, Tag } from '../../components/ui';
import { useAsync, useDebounce } from '../../components/hooks';

const TABS = [['', 'All'], ['customer', 'Customers'], ['seller', 'Sellers'], ['pending', 'Pending sellers']];
export default function Users() {
  const { user: me } = useAuth(); const toast = useToast();
  const [tab, setTab] = useState(''); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const dq = useDebounce(search);
  const params = { page, limit: 10, search: dq, ...(tab === 'pending' ? { approved: 'false' } : tab ? { role: tab } : {}) };
  const list = useAsync(() => api.get('/users', params), [tab, page, dq]);
  const act = async (fn, ok) => { try { await fn(); toast.success(ok); list.reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="space-y-4"><h1 className="text-2xl font-extrabold">Users & sellers</h1>
      <div className="flex flex-wrap items-center gap-3"><div className="flex flex-wrap rounded-lg border bg-white p-1 text-sm font-semibold">{TABS.map(([v, l]) => <button key={l} onClick={() => { setTab(v); setPage(1); }} className={`rounded-md px-3 py-1.5 ${tab === v ? 'bg-brand-600 text-white' : 'text-slate-600'}`}>{l}</button>)}</div>
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Name, email or shop…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div></div>
      {list.loading && !list.data ? <PageLoader /> : list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : (
        <><Table head={['User', 'Role', 'Joined', 'Status', '']} empty={!list.data.data.length && <Empty title="No users found" />}>
          {list.data.data.map((u) => (
            <tr key={u._id}><td className="td"><p className="font-medium">{u.name}{u.shopName && <span className="text-slate-400"> · {u.shopName}</span>}</p><p className="text-xs text-slate-500">{u.email}</p></td>
              <td className="td capitalize">{u.role}</td><td className="td">{date(u.createdAt)}</td>
              <td className="td"><div className="flex flex-wrap gap-1">{u.isActive ? <Tag color="bg-emerald-100 text-emerald-800">Active</Tag> : <Tag color="bg-red-100 text-red-700">Deactivated</Tag>}{u.role === 'seller' && (u.isApproved ? <Tag color="bg-blue-100 text-blue-800">Approved</Tag> : <Tag color="bg-amber-100 text-amber-800">Pending approval</Tag>)}</div></td>
              <td className="td"><div className="flex justify-end gap-2">
                {u.role === 'seller' && <button className="btn-outline !py-1" onClick={() => act(() => api.patch(`/users/${u._id}/approve`, { approved: !u.isApproved }), u.isApproved ? 'Approval revoked' : 'Seller approved')}>{u.isApproved ? 'Revoke' : 'Approve'}</button>}
                {u._id !== me._id && <button className={u.isActive ? 'btn-outline !py-1 text-red-600' : 'btn-outline !py-1'} onClick={() => act(() => api.patch(`/users/${u._id}/status`, { isActive: !u.isActive }), u.isActive ? 'User deactivated' : 'User activated')}>{u.isActive ? 'Deactivate' : 'Activate'}</button>}</div></td></tr>))}</Table>
          <Pagination meta={list.data.meta} onPage={setPage} /></>)}
    </div>
  );
}
