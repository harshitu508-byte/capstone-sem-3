export const money = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
export const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const dateTime = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const STATUS_STYLE = { pending: 'bg-amber-100 text-amber-800', confirmed: 'bg-blue-100 text-blue-800', shipped: 'bg-indigo-100 text-indigo-800', delivered: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-100 text-red-700', paid: 'bg-emerald-100 text-emerald-800', failed: 'bg-red-100 text-red-700', refunded: 'bg-slate-200 text-slate-700' };
export const NEXT_STATUS = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
