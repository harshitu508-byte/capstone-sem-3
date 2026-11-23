import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4500);
  }, []);
  const toast = { success: (m) => push(m, 'success'), error: (m) => push(m, 'error'), info: (m) => push(m, 'info') };
  const Icon = { success: CheckCircle2, error: XCircle, info: Info };
  const color = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-brand-600' };
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => { const I = Icon[t.type]; return (
          <div key={t.id} className="card flex items-start gap-3 p-3 shadow-lg">
            <I className={`mt-0.5 h-5 w-5 shrink-0 ${color[t.type]}`} />
            <p className="flex-1 text-sm">{t.message}</p>
            <button onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}><X className="h-4 w-4 text-slate-400" /></button>
          </div>); })}
      </div>
    </Ctx.Provider>
  );
}
