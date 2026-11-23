import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../lib/api';
import { Field, Spinner } from '../components/ui';

function Shell({ title, sub, children }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 text-center"><Store className="mx-auto h-10 w-10 text-brand-600" /><h1 className="mt-2 text-2xl font-extrabold">{title}</h1><p className="text-sm text-slate-500">{sub}</p></div>
      <div className="card p-6">{children}</div>
    </div>
  );
}
const home = (u) => (u.role === 'customer' ? '/' : '/dashboard');

export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation(); const toast = useToast();
  const [f, setF] = useState({ email: '', password: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const u = await login(f.email, f.password); toast.success(`Welcome back, ${u.name.split(' ')[0]}!`); nav(loc.state?.from && u.role === 'customer' ? loc.state.from : home(u), { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome back" sub="Log in to continue shopping or manage your store">
      <form onSubmit={submit} className="space-y-4">
        {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
        <Field label="Password"><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Log in</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">New here? <Link to="/register" className="font-semibold text-brand-600">Create an account</Link></p>
      </Shell>
  );
}

export function Register() {
  const { register } = useAuth(); const nav = useNavigate(); const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '', role: 'customer', shopName: '' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters');
    setBusy(true);
    try { const body = { ...f }; if (f.role !== 'seller') delete body.shopName; if (!body.phone) delete body.phone; const r = await register(body); toast.success(r.message); nav(home(r.user), { replace: true }); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account" sub="Join as a customer or start selling">
      <form onSubmit={submit} className="space-y-4">
        {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <div className="grid grid-cols-2 gap-2">{['customer', 'seller'].map((r) => <button type="button" key={r} onClick={() => setF({ ...f, role: r })} className={`rounded-lg border px-3 py-2 text-sm font-semibold capitalize ${f.role === r ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300'}`}>{r === 'customer' ? 'I want to shop' : 'I want to sell'}</button>)}</div>
        <Field label="Full name"><input className="input" required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone (optional)"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
        {f.role === 'seller' && <Field label="Shop name" hint="New seller accounts must be approved by an admin before listing products."><input className="input" required minLength={2} value={f.shopName} onChange={set('shopName')} /></Field>}
        <Field label="Password" hint="At least 8 characters"><input className="input" type="password" required value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="!text-white h-4 w-4" />}Create account</button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-semibold text-brand-600">Log in</Link></p>
    </Shell>
  );
}
