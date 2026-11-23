import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, hasTokens, setOnLogout, setTokens } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(hasTokens());

  const clear = useCallback(() => { setTokens(null); setUser(null); disconnectSocket(); }, []);
  useEffect(() => { setOnLogout(clear); }, [clear]);
  useEffect(() => {
    if (!hasTokens()) return;
    api.get('/auth/me').then((r) => { setUser(r.data); connectSocket(); }).catch(clear).finally(() => setLoading(false));
  }, [clear]);

  const finish = (r) => { setTokens({ accessToken: r.data.accessToken, refreshToken: r.data.refreshToken }); setUser(r.data.user); connectSocket(); return r.data.user; };
  const login = async (email, password) => finish(await api.post('/auth/login', { email, password }));
  const register = async (body) => { const r = await api.post('/auth/register', body); return { user: finish(r), message: r.message }; };
  const logout = async () => { try { const t = JSON.parse(localStorage.getItem('tokens')); await api.post('/auth/logout', { refreshToken: t?.refreshToken }); } catch { /* ignore */ } clear(); };
  return <Ctx.Provider value={{ user, setUser, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
