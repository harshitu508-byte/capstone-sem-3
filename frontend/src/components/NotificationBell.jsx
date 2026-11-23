import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { dateTime } from '../lib/format';
import { useSocketEvent } from './hooks';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const toast = useToast();
  const nav = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => api.get('/notifications', { limit: 15 }).then((r) => { setItems(r.data); setUnread(r.meta.unread); }).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false); document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const onNotif = useCallback((n) => { setItems((l) => [n, ...l].slice(0, 15)); setUnread((u) => u + 1); toast.info(n.title + (n.message ? `: ${n.message}` : '')); }, [toast]);
  useSocketEvent('notification', onNotif);

  const click = async (n) => {
    if (!n.read) { await api.patch(`/notifications/${n.id || n._id}/read`); setItems((l) => l.map((x) => (x._id === n._id ? { ...x, read: true } : x))); setUnread((u) => Math.max(0, u - 1)); }
    setOpen(false);
    if (n.data?.orderId) nav(user.role === 'customer' ? `/orders/${n.data.orderId}` : `/dashboard/orders`);
    else if (n.data?.productId) nav('/dashboard/inventory');
  };
  const readAll = async () => { await api.patch('/notifications/read-all'); setItems((l) => l.map((x) => ({ ...x, read: true }))); setUnread(0); };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notifications">
        <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2"><span className="text-sm font-semibold">Notifications</span>{unread > 0 && <button onClick={readAll} className="text-xs font-semibold text-brand-600">Mark all read</button>}</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="p-6 text-center text-sm text-slate-500">You're all caught up.</p>}
            {items.map((n) => (
              <button key={n._id} onClick={() => click(n)} className={`block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50 ${n.read ? '' : 'bg-brand-50/60'}`}>
                <p className="text-sm font-semibold">{n.title}</p><p className="text-xs text-slate-600">{n.message}</p><p className="mt-1 text-[11px] text-slate-400">{dateTime(n.createdAt)}</p>
              </button>))}
          </div>
        </div>)}
    </div>
  );
}
