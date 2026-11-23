// Thin fetch wrapper: attaches the access token and transparently refreshes it once on 401.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
let tokens = JSON.parse(localStorage.getItem('tokens') || 'null');
let onLogout = () => {};
export const setOnLogout = (fn) => { onLogout = fn; };
export const getAccessToken = () => tokens?.accessToken;
export const setTokens = (t) => { tokens = t; t ? localStorage.setItem('tokens', JSON.stringify(t)) : localStorage.removeItem('tokens'); };
export const hasTokens = () => !!tokens;

let refreshing = null;
async function refresh() {
  if (!tokens?.refreshToken) throw new Error('No session');
  refreshing ||= fetch(`${BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: tokens.refreshToken }) })
    .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); setTokens({ accessToken: j.data.accessToken, refreshToken: j.data.refreshToken }); })
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function request(method, path, body, retry = true) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(tokens?.accessToken && { Authorization: `Bearer ${tokens.accessToken}` }) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && retry && tokens?.refreshToken && !path.startsWith('/auth/')) {
    try { await refresh(); return request(method, path, body, false); } catch { setTokens(null); onLogout(); }
  }
  if (!res.ok) { const e = new Error(json.message || `Request failed (${res.status})`); e.status = res.status; e.errors = json.errors; e.payload = json; throw e; }
  return json;
}
export const api = {
  get: (p, params) => request('GET', p + (params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)) : '')),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};
export const errMsg = (e) => (e.errors?.length ? e.errors.map((x) => x.message).join('; ') : e.message);
