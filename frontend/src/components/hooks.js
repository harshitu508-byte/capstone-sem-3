import { useCallback, useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';
import { errMsg } from '../lib/api';

// Generic loader: const { data, loading, error, reload, setData } = useAsync(() => api.get(...), [deps])
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return fn().then((data) => setState({ data, loading: false, error: null })).catch((e) => setState({ data: null, loading: false, error: errMsg(e) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) };
}
export function useSocketEvent(event, handler) {
  useEffect(() => {
    const s = getSocket(); if (!s) return;
    s.on(event, handler); return () => s.off(event, handler);
  }, [event, handler]);
}
export const useDebounce = (value, ms = 400) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};
