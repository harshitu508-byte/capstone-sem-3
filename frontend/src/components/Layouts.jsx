import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, User, LogOut, Search, Store, LayoutDashboard, Package, Boxes, ClipboardList, BarChart3, Users, Tags, TicketPercent, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationBell from './NotificationBell';
import { PageLoader } from './ui';

export function Protected({ roles, children }) {
  const { user, loading } = useAuth(); const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === 'customer' ? '/' : '/dashboard'} replace />;
  return children;
}

export function StoreLayout() {
  const { user, logout } = useAuth(); const { itemCount } = useCart(); const nav = useNavigate();
  const [q, setQ] = useState(''); const [menu, setMenu] = useState(false);
  const submit = (e) => { e.preventDefault(); nav(`/products?search=${encodeURIComponent(q)}`); setMenu(false); };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-700"><Store className="h-6 w-6" />ShopSphere</Link>
          <form onSubmit={submit} className="relative hidden flex-1 md:block md:max-w-xl">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <nav className="ml-auto flex items-center gap-1">
            <Link to="/products" className="btn-ghost hidden sm:inline-flex">Shop</Link>
            {user?.role === 'customer' && <>
              <Link to="/wishlist" className="rounded-full p-2 hover:bg-slate-100" aria-label="Wishlist"><Heart className="h-5 w-5" /></Link>
              <Link to="/cart" className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Cart"><ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{itemCount}</span>}</Link></>}
            {user && <NotificationBell />}
            {user ? (
              <div className="hidden items-center gap-1 sm:flex">
                {user.role === 'customer' ? <><Link to="/orders" className="btn-ghost">Orders</Link><Link to="/profile" className="btn-ghost"><User className="h-4 w-4" />{user.name.split(' ')[0]}</Link></>
                  : <Link to="/dashboard" className="btn-outline"><LayoutDashboard className="h-4 w-4" />Dashboard</Link>}
                <button onClick={logout} className="btn-ghost" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
              </div>
            ) : <div className="hidden gap-2 sm:flex"><Link to="/login" className="btn-outline">Log in</Link><Link to="/register" className="btn-primary">Sign up</Link></div>}
            <button className="rounded p-2 hover:bg-slate-100 sm:hidden" onClick={() => setMenu((m) => !m)}>{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </nav>
        </div>
        {menu && (
          <div className="space-y-2 border-t bg-white p-4 sm:hidden">
            <form onSubmit={submit}><input className="input" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} /></form>
            <Link onClick={() => setMenu(false)} to="/products" className="block py-2 font-medium">Shop</Link>
            {user?.role === 'customer' && <><Link onClick={() => setMenu(false)} to="/orders" className="block py-2 font-medium">My orders</Link><Link onClick={() => setMenu(false)} to="/profile" className="block py-2 font-medium">Profile</Link></>}
            {user && user.role !== 'customer' && <Link onClick={() => setMenu(false)} to="/dashboard" className="block py-2 font-medium">Dashboard</Link>}
            {user ? <button onClick={logout} className="block py-2 font-medium text-red-600">Log out</button> : <><Link to="/login" onClick={() => setMenu(false)} className="block py-2 font-medium">Log in</Link><Link to="/register" onClick={() => setMenu(false)} className="block py-2 font-medium">Sign up</Link></>}
          </div>)}
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6"><Outlet /></main>
     </div>
  );
}

const SELLER_NAV = [['/dashboard', 'Overview', LayoutDashboard, true], ['/dashboard/products', 'Products', Package], ['/dashboard/inventory', 'Inventory', Boxes], ['/dashboard/orders', 'Orders', ClipboardList], ['/dashboard/reports', 'Reports', BarChart3]];
const ADMIN_NAV = [['/dashboard', 'Overview', LayoutDashboard, true], ['/dashboard/users', 'Users & Sellers', Users], ['/dashboard/categories', 'Categories', Tags], ['/dashboard/products', 'Products', Package], ['/dashboard/orders', 'Orders', ClipboardList], ['/dashboard/inventory', 'Inventory', Boxes], ['/dashboard/coupons', 'Coupons', TicketPercent], ['/dashboard/reports', 'Revenue', BarChart3]];

export function DashboardLayout() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false);
  const nav = user.role === 'admin' ? ADMIN_NAV : SELLER_NAV;
  const links = (
    <nav className="space-y-1 p-3">
      {nav.map(([to, label, Icon, end]) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}><Icon className="h-4 w-4" />{label}</NavLink>))}
      <Link to="/" className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><Store className="h-4 w-4" />View storefront</Link>
    </nav>);
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r bg-white lg:block"><div className="flex h-16 items-center gap-2 border-b px-5 font-extrabold text-brand-700"><Store className="h-6 w-6" />ShopSphere</div>{links}</aside>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>{links}</aside></div>}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur">
          <button className="rounded p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{user.role === 'admin' ? 'Administrator' : user.shopName || 'Seller'} <span className="font-normal text-slate-400">· {user.name}</span></p></div>
          <div className="ml-auto flex items-center gap-1"><NotificationBell /><button onClick={logout} className="btn-ghost"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span></button></div>
        </header>
        {user.role === 'seller' && !user.isApproved && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Your seller account is awaiting admin approval. You can browse the dashboard but cannot list products or process orders yet.</div>}
        <main className="p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
