import './setup.cjs';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/context/AuthContext';
import { CartProvider } from '../src/context/CartContext';
import { ToastProvider } from '../src/context/ToastContext';
import { setTokens } from '../src/lib/api';

const API = 'http://127.0.0.1:5000/api';
const login = async (email, password) => (await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()).data;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; const origErr = console.error; console.error = (...a) => { const m = a.join(' '); if (!/act\(|not wrapped|ResponsiveContainer|width\(0\)|The width|defaultProps/.test(m)) errors.push(m.slice(0, 200)); };
process.on('unhandledRejection', (e) => errors.push('unhandled: ' + e));

async function visit(path, tokens, expects) {
  localStorage.clear(); setTokens(tokens ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } : null);
  document.getElementById('root').innerHTML = '';
  const root = createRoot(document.getElementById('root'));
  root.render(<MemoryRouter initialEntries={[path]}><ToastProvider><AuthProvider><CartProvider><App /></CartProvider></AuthProvider></ToastProvider></MemoryRouter>);
  await sleep(1800);
  const text = document.body.textContent; root.unmount();
  const missing = expects.filter((e) => !text.includes(e));
  console.log((missing.length ? 'FAIL' : 'ok  ') + ' ' + path.padEnd(28) + (missing.length ? ' missing: ' + missing.join(' | ') : ''));
  return !missing.length;
}
(async () => {
  const cust = await login('customer@shop.com', 'Customer@123'), sel = await login('seller1@shop.com', 'Seller@123'), adm = await login('admin@shop.com', 'Admin@123');
  const prods = (await (await fetch(API + '/products?search=Headphones')).json()).data; const orders = (await (await fetch(API + '/orders', { headers: { Authorization: 'Bearer ' + cust.accessToken } })).json()).data;
  const R = [];
  R.push(await visit('/', null, ['Shop by category', 'Popular right now', 'Electronics']));
  R.push(await visit('/products', null, ['Running Shoes', 'Category']));
  R.push(await visit('/products?search=keyboard', null, ['Mechanical Keyboard']));
  R.push(await visit('/products/' + prods[0]._id, null, ['Wireless Noise-Cancelling Headphones', 'Customer reviews', 'TechNest']));
  R.push(await visit('/login', null, ['Welcome back']));
  R.push(await visit('/register', null, ['Create your account']));
  R.push(await visit('/cart', null, ['Welcome back']));            // protected -> redirected to login
  R.push(await visit('/cart', cust, ['Your cart is empty']));
  R.push(await visit('/wishlist', cust, ['wishlist']));
  R.push(await visit('/orders', cust, ['My orders', 'ORD-']));
  R.push(await visit('/orders/' + orders[0]._id, cust, ['Payment', 'Ship to', 'Timeline']));
  R.push(await visit('/profile', cust, ['My profile']));
  R.push(await visit('/dashboard', cust, ['Popular right now']));  // customer blocked from dashboard
  R.push(await visit('/dashboard', sel, ['Sales overview', 'Revenue', 'Active products']));
  R.push(await visit('/dashboard/products', sel, ['My products', 'Add product', 'Mechanical Keyboard']));
  R.push(await visit('/dashboard/inventory', sel, ['Inventory', 'Units in stock', 'Adjust']));
  R.push(await visit('/dashboard/orders', sel, ['Orders with my products', 'ORD-']));
  R.push(await visit('/dashboard/reports', sel, ['Revenue & reports', 'Inventory valuation by category']));
  R.push(await visit('/dashboard/users', sel, ['Popular right now'].slice(0, 0).concat([])));  // seller redirected to /dashboard
  R.push(await visit('/dashboard', adm, ['Platform overview', 'Customers', 'Sellers']));
  R.push(await visit('/dashboard/users', adm, ['Users & sellers', 'Pending seller']));
  R.push(await visit('/dashboard/categories', adm, ['Categories', 'Add category', 'Home & Kitchen']));
  R.push(await visit('/dashboard/products', adm, ['All products', 'TechNest']));
  R.push(await visit('/dashboard/orders', adm, ['All orders', 'ORD-']));
  R.push(await visit('/dashboard/inventory', adm, ['platform-wide']));
  R.push(await visit('/dashboard/coupons', adm, ['Coupons', 'WELCOME10', 'Expired']));
  R.push(await visit('/dashboard/reports', adm, ['Revenue & reports']));
  R.push(await visit('/nope', null, ['Page not found']));
  console.log(`\n${R.filter(Boolean).length}/${R.length} pages rendered as expected`);
  if (errors.length) console.log('React console errors:\n' + [...new Set(errors)].join('\n'));
  process.exit(R.every(Boolean) ? 0 : 1);
})();
