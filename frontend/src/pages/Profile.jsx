import { useState } from 'react';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, Spinner } from '../components/ui';

export default function Profile() {
  const { user, setUser } = useAuth(); const toast = useToast();
  const a = user.address || {};
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', shopName: user.shopName || '', street: a.street || '', city: a.city || '', state: a.state || '', postalCode: a.postalCode || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' }); const [busy, setBusy] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault(); setBusy('p');
    try { const body = { name: f.name, phone: f.phone, address: { street: f.street, city: f.city, state: f.state, postalCode: f.postalCode } }; if (user.role === 'seller') body.shopName = f.shopName; const r = await api.put('/auth/me', body); setUser(r.data); toast.success('Profile updated'); }
    catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(''); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setBusy('w');
    try { await api.put('/auth/password', pw); setPw({ currentPassword: '', newPassword: '' }); toast.success('Password changed'); } catch (e2) { toast.error(errMsg(e2)); } finally { setBusy(''); }
  };
  return (
    <div className="mx-auto max-w-2xl space-y-6"><h1 className="text-2xl font-extrabold">My profile</h1>
      <form onSubmit={save} className="card space-y-4 p-5"><div className="flex justify-between text-sm"><span className="text-slate-500">{user.email}</span><span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand-700">{user.role}</span></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Name"><input className="input" required minLength={2} value={f.name} onChange={set('name')} /></Field><Field label="Phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field></div>
        {user.role === 'seller' && <Field label="Shop name"><input className="input" value={f.shopName} onChange={set('shopName')} /></Field>}
        <Field label="Street"><input className="input" value={f.street} onChange={set('street')} /></Field>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="City"><input className="input" value={f.city} onChange={set('city')} /></Field><Field label="State"><input className="input" value={f.state} onChange={set('state')} /></Field><Field label="PIN"><input className="input" value={f.postalCode} onChange={set('postalCode')} /></Field></div>
        <button className="btn-primary" disabled={busy === 'p'}>{busy === 'p' && <Spinner className="!text-white h-4 w-4" />}Save changes</button></form>
      <form onSubmit={changePw} className="card space-y-4 p-5"><h2 className="font-semibold">Change password</h2>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Current password"><input className="input" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field><Field label="New password" hint="Min 8 characters"><input className="input" type="password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field></div>
        <button className="btn-outline" disabled={busy === 'w'}>Update password</button></form>
    </div>
  );
}
