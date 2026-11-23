import { useEffect } from 'react';
import { Loader2, X, PackageOpen, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { STATUS_STYLE } from '../lib/format';

export const Spinner = ({ className = '' }) => <Loader2 className={`h-5 w-5 animate-spin text-brand-600 ${className}`} />;
export const PageLoader = () => <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>;
export const Empty = ({ title = 'Nothing here yet', hint, action, icon: Icon = PackageOpen }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
    <Icon className="h-12 w-12 text-slate-300" /><h3 className="text-base font-semibold text-slate-700">{title}</h3>
    {hint && <p className="max-w-sm text-sm text-slate-500">{hint}</p>}{action}
  </div>
);
export const ErrorBox = ({ message, onRetry }) => (
  <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}{onRetry && <button onClick={onRetry} className="ml-3 font-semibold underline">Retry</button>}</div>
);
export const Badge = ({ value, className = '' }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[value] || 'bg-slate-100 text-slate-700'} ${className}`}>{value}</span>;
export const Tag = ({ children, color = 'bg-slate-100 text-slate-700' }) => <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>{children}</span>;

export function Field({ label, error, children, hint }) {
  return <div><label className="label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>;
}
export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => { if (!open) return; const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-b-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-3"><h3 className="font-semibold">{title}</h3><button onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
export function Confirm({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, busy }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2"><button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={onConfirm}>{busy && <Spinner className="!text-white h-4 w-4" />}{confirmLabel}</button></div>
    </Modal>
  );
}
export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-1 py-4 text-sm text-slate-600">
      <span>Page {meta.page} of {meta.pages} · {meta.total} results</span>
      <div className="flex gap-2">
        <button className="btn-outline !px-2" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft className="h-4 w-4" /></button>
        <button className="btn-outline !px-2" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
export const StatCard = ({ label, value, icon: Icon, tone = 'bg-brand-50 text-brand-600', sub }) => (
  <div className="card flex items-center gap-4 p-5">
    <div className={`rounded-xl p-3 ${tone}`}><Icon className="h-6 w-6" /></div>
    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="truncate text-2xl font-bold">{value}</p>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div>
  </div>
);
export const Stars = ({ value = 0, count }) => (
  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{value ? value.toFixed(1) : 'New'}{count > 0 && <span>({count})</span>}
  </span>
);
export const ProductImage = ({ src, alt, className = '' }) => (
  <div className={`overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 ${className}`}>
    {src ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
  </div>
);
export const Table = ({ head, children, empty }) => (
  <div className="card overflow-x-auto"><table className="min-w-full divide-y divide-slate-200">
    <thead className="bg-slate-50"><tr>{head.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{children}</tbody></table>{empty}</div>
);
