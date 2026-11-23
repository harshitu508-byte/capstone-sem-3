// Integration tests: run against a real MongoDB replica set (see TESTING.md).  npm test
process.env.NODE_ENV = 'test';
require('dotenv').config();
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const http = require('http');
const app = require('../src/app');
const registerListeners = require('../src/services/listeners');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Coupon = require('../src/models/Coupon');
const Order = require('../src/models/Order');
const bus = require('../src/utils/events');

let server, base; const T = {};
const api = async (method, path, { token, body } = {}) => {
  const r = await fetch(base + '/api' + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body ? JSON.stringify(body) : undefined });
  let json = {}; try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};
const addr = { fullName: 'Test User', phone: '9999999999', street: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001' };
const mkUser = async (role, email, extra = {}) => {
  const r = await api('POST', '/auth/register', { body: { name: 'T ' + role, email, password: 'Passw0rd!', role, shopName: role === 'seller' ? 'Shop' : undefined } });
  assert.equal(r.status, 201); return { token: r.body.data.accessToken, refresh: r.body.data.refreshToken, id: r.body.data.user._id };
};
const mkProduct = (token, o = {}) => api('POST', '/products', { token, body: { name: 'Widget', description: 'A test widget', price: 100, category: T.cat, stock: 10, ...o } });
const cartAdd = (token, productId, quantity = 1) => api('POST', '/cart/items', { token, body: { productId, quantity } });
const checkout = (token, extra = {}) => api('POST', '/orders', { token, body: { shippingAddress: addr, paymentMethod: 'simulated_card', ...extra } });

before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Category, Product, Coupon, Order].map((m) => m.init()));
  registerListeners();
  server = http.createServer(app); await new Promise((r) => server.listen(0, r)); base = `http://127.0.0.1:${server.address().port}`;
  const admin = await User.create({ name: 'Admin', email: 'a@t.com', password: 'Passw0rd!', role: 'admin' });
  T.admin = (await api('POST', '/auth/login', { body: { email: 'a@t.com', password: 'Passw0rd!' } })).body.data.accessToken;
  T.seller = await mkUser('seller', 's1@t.com'); T.seller2 = await mkUser('seller', 's2@t.com');
  T.c1 = await mkUser('customer', 'c1@t.com'); T.c2 = await mkUser('customer', 'c2@t.com');
  for (const s of [T.seller, T.seller2]) await api('PATCH', `/users/${s.id}/approve`, { token: T.admin, body: { approved: true } });
  T.cat = (await api('POST', '/categories', { token: T.admin, body: { name: 'Gadgets' } })).body.data._id;
});
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); server.close(); });

test('auth: validation, duplicates, bad login, refresh rotation, RBAC', async () => {
  assert.equal((await api('POST', '/auth/register', { body: { name: 'x', email: 'bad', password: '1' } })).status, 400);
  assert.equal((await api('POST', '/auth/register', { body: { name: 'Dup', email: 'c1@t.com', password: 'Passw0rd!' } })).status, 409);
  assert.equal((await api('POST', '/auth/register', { body: { name: 'Adm', email: 'x@t.com', password: 'Passw0rd!', role: 'admin' } })).status, 400, 'admin role cannot self-register');
  assert.equal((await api('POST', '/auth/login', { body: { email: 'c1@t.com', password: 'wrong-pass' } })).status, 401);
  assert.equal((await api('GET', '/auth/me')).status, 401);
  assert.equal((await api('GET', '/auth/me', { token: 'garbage' })).status, 401);
  const r1 = await api('POST', '/auth/refresh', { body: { refreshToken: T.c2.refresh } });
  assert.equal(r1.status, 200);
  assert.equal((await api('POST', '/auth/refresh', { body: { refreshToken: T.c2.refresh } })).status, 401, 'old refresh token is revoked after rotation');
  T.c2.refresh = r1.body.data.refreshToken;
  const u = await User.findOne({ email: 'c1@t.com' }).select('+password'); assert.notEqual(u.password, 'Passw0rd!'); assert.match(u.password, /^\$2[aby]\$/);
  assert.equal((await api('GET', '/users', { token: T.c1.token })).status, 403);
  assert.equal((await api('GET', '/reports/summary', { token: T.c1.token })).status, 403);
});

test('unapproved seller cannot create products', async () => {
  const s = await mkUser('seller', 'pend@t.com');
  assert.equal((await mkProduct(s.token)).status, 403);
});

test('products: seller ownership, validation, filtering/sorting/pagination', async () => {
  assert.equal((await mkProduct(T.c1.token)).status, 403);
  assert.equal((await mkProduct(T.seller.token, { price: -5 })).status, 400);
  assert.equal((await mkProduct(T.seller.token, { stock: -1 })).status, 400);
  const p = (await mkProduct(T.seller.token, { name: 'Alpha Lamp', price: 300 })).body.data; T.pAlpha = p;
  assert.equal((await api('PUT', `/products/${p._id}`, { token: T.seller2.token, body: { price: 1 } })).status, 403, 'other seller cannot edit');
  assert.equal((await api('DELETE', `/products/${p._id}`, { token: T.seller2.token })).status, 403);
  assert.equal((await api('PUT', `/products/${p._id}`, { token: T.seller.token, body: { price: 250 } })).body.data.price, 250);
  await mkProduct(T.seller.token, { name: 'Beta Lamp', price: 100 }); await mkProduct(T.seller2.token, { name: 'Gamma Chair', price: 900 });
  const l = await api('GET', '/products?search=lamp&sort=price_asc&limit=1&page=1');
  assert.equal(l.body.meta.total, 2); assert.equal(l.body.data.length, 1); assert.equal(l.body.data[0].name, 'Beta Lamp');
  assert.equal((await api('GET', '/products?minPrice=500')).body.data.length, 1);
  assert.equal((await api('GET', '/products/not-an-id')).status, 400);
  assert.equal((await api('GET', '/products/' + new mongoose.Types.ObjectId())).status, 404);
  assert.equal((await api('GET', '/products/manage', { token: T.seller.token })).body.meta.total, 2, 'seller sees only own');
});

test('cart: server-side totals, stock cap, isolation', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Cart Item', price: 100, stock: 5 })).body.data;
  assert.equal((await cartAdd(T.c1.token, p._id, 6)).status, 409);
  assert.equal((await cartAdd(T.c1.token, p._id, 0)).status, 400);
  let r = await cartAdd(T.c1.token, p._id, 2); assert.equal(r.status, 201);
  assert.equal(r.body.data.totals.subtotal, 200); assert.equal(r.body.data.totals.shipping, 50); assert.equal(r.body.data.totals.tax, 10); assert.equal(r.body.data.totals.total, 260);
  assert.equal((await api('GET', '/cart', { token: T.c2.token })).body.data.items.length, 0, 'c2 cannot see c1 cart');
  r = await api('PUT', `/cart/items/${p._id}`, { token: T.c1.token, body: { quantity: 3 } }); assert.equal(r.body.data.totals.subtotal, 300);
  assert.equal((await api('PUT', `/cart/items/${p._id}`, { token: T.c1.token, body: { quantity: 99 } })).status, 409);
  assert.equal((await api('DELETE', `/cart/items/${p._id}`, { token: T.c1.token })).body.data.items.length, 0);
  assert.equal((await checkout(T.c1.token)).status, 400, 'empty cart checkout rejected');
});

test('coupons: validation, expiry, limits, min order, admin-only create', async () => {
  const mk = (o) => api('POST', '/coupons', { token: T.admin, body: { type: 'percent', value: 10, expiresAt: new Date(Date.now() + 864e5), ...o } });
  assert.equal((await api('POST', '/coupons', { token: T.seller.token, body: {} })).status, 403);
  assert.equal((await mk({ code: 'BADPCT', value: 150 })).status, 400);
  assert.equal((await mk({ code: 'TEN', maxDiscount: 15 })).status, 201);
  assert.equal((await mk({ code: 'TEN' })).status, 409, 'duplicate code');
  assert.equal((await mk({ code: 'OLD', expiresAt: new Date(Date.now() - 1000) })).status, 201);
  assert.equal((await mk({ code: 'BIG', minOrderValue: 5000 })).status, 201);
  const p = (await mkProduct(T.seller.token, { name: 'Coupon Item', price: 500, stock: 50 })).body.data; T.pCoupon = p;
  await cartAdd(T.c1.token, p._id, 1);
  const v = (code) => api('POST', '/cart/coupon', { token: T.c1.token, body: { code } });
  assert.equal((await v('NOPE')).status, 400);
  assert.match((await v('OLD')).body.message, /expired/i);
  assert.match((await v('BIG')).body.message, /Minimum order/i);
  const ok = await v('ten'); assert.equal(ok.status, 200); assert.equal(ok.body.data.totals.discount, 15, 'capped by maxDiscount');
  const o = await checkout(T.c1.token); assert.equal(o.status, 201); assert.equal(o.body.data.discount, 15); T.couponOrder = o.body.data;
  await cartAdd(T.c1.token, p._id, 1);
  assert.match((await v('TEN')).body.message, /already used/i, 'per-user limit');
  await api('DELETE', '/cart', { token: T.c1.token });
});

test('checkout: snapshots, stock decrement, payment simulation, status flow', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Snap', price: 1000, stock: 10 })).body.data;
  await cartAdd(T.c1.token, p._id, 2);
  const o = (await checkout(T.c1.token)).body.data;
  assert.equal(o.subtotal, 2000); assert.equal(o.shipping, 0); assert.equal(o.tax, 100); assert.equal(o.total, 2100); assert.equal(o.payment.simulated, true);
  assert.equal((await Product.findById(p._id)).stock, 8);
  await api('PUT', `/products/${p._id}`, { token: T.seller.token, body: { price: 5, name: 'Changed' } });
  const got = (await api('GET', `/orders/${o._id}`, { token: T.c1.token })).body.data;
  assert.equal(got.items[0].price, 1000, 'price snapshot'); assert.equal(got.items[0].name, 'Snap');
  assert.equal((await api('GET', `/orders/${o._id}`, { token: T.c2.token })).status, 403, 'other customer blocked');
  assert.equal((await api('GET', `/orders/${o._id}`, { token: T.seller2.token })).status, 403, 'unrelated seller blocked');
  const s = await api('PATCH', `/orders/${o._id}/status`, { token: T.seller.token, body: { status: 'confirmed' } });
  assert.equal(s.status, 409, 'cannot confirm unpaid simulated order');
  assert.equal((await api('PATCH', `/orders/${o._id}/status`, { token: T.seller.token, body: { status: 'delivered' } })).status, 400, 'invalid transition');
  assert.equal((await api('POST', '/payments/simulate', { token: T.c2.token, body: { orderId: o._id } })).status, 404, 'cannot pay for others');
  const f = await api('POST', '/payments/simulate', { token: T.c1.token, body: { orderId: o._id, outcome: 'failure' } }); assert.equal(f.status, 402);
  const pay = await api('POST', '/payments/simulate', { token: T.c1.token, body: { orderId: o._id } });
  assert.equal(pay.status, 200); assert.equal(pay.body.data.status, 'confirmed'); assert.match(pay.body.notice, /SIMULATED/);
  assert.equal((await api('POST', '/payments/simulate', { token: T.c1.token, body: { orderId: o._id } })).status, 409, 'duplicate payment');
  assert.equal((await api('PATCH', `/orders/${o._id}/status`, { token: T.c1.token, body: { status: 'shipped' } })).status, 403, 'customer cannot ship');
  assert.equal((await api('PATCH', `/orders/${o._id}/status`, { token: T.seller2.token, body: { status: 'shipped' } })).status, 403);
  assert.equal((await api('PATCH', `/orders/${o._id}/status`, { token: T.seller.token, body: { status: 'shipped' } })).status, 200);
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: T.c1.token })).status, 400, 'cannot cancel after shipping');
  assert.equal((await api('PATCH', `/orders/${o._id}/status`, { token: T.seller.token, body: { status: 'delivered' } })).body.data.status, 'delivered');
  T.delivered = { order: o, product: p };
});

test('reviews: only verified buyers, one per product, rating recalculated', async () => {
  const { product } = T.delivered;
  assert.equal((await api('POST', `/products/${product._id}/reviews`, { token: T.c2.token, body: { rating: 5 } })).status, 403);
  assert.equal((await api('POST', `/products/${product._id}/reviews`, { token: T.c1.token, body: { rating: 9 } })).status, 400);
  assert.equal((await api('POST', `/products/${product._id}/reviews`, { token: T.c1.token, body: { rating: 4, comment: 'ok' } })).status, 201);
  assert.equal((await api('POST', `/products/${product._id}/reviews`, { token: T.c1.token, body: { rating: 5 } })).status, 409);
  const p = await Product.findById(product._id); assert.equal(p.ratingAvg, 4); assert.equal(p.ratingCount, 1);
});

test('wishlist add / duplicate-safe / remove', async () => {
  const id = T.pAlpha._id;
  await api('POST', `/wishlist/${id}`, { token: T.c1.token }); const r = await api('POST', `/wishlist/${id}`, { token: T.c1.token });
  assert.equal(r.body.data.length, 1);
  assert.equal((await api('DELETE', `/wishlist/${id}`, { token: T.c1.token })).body.data.length, 0);
  assert.equal((await api('POST', `/wishlist/${id}`, { token: T.seller.token })).status, 403);
});

test('cancellation restores stock exactly once and refunds (simulated)', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Cancel Me', price: 100, stock: 10 })).body.data;
  await cartAdd(T.c1.token, p._id, 4);
  const o = (await checkout(T.c1.token)).body.data;
  assert.equal((await Product.findById(p._id)).stock, 6);
  await api('POST', '/payments/simulate', { token: T.c1.token, body: { orderId: o._id } });
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: T.c2.token })).status, 403);
  const c = await api('POST', `/orders/${o._id}/cancel`, { token: T.c1.token }); assert.equal(c.status, 200);
  assert.equal(c.body.data.payment.status, 'refunded');
  assert.equal((await Product.findById(p._id)).stock, 10, 'stock restored');
  assert.equal((await api('POST', `/orders/${o._id}/cancel`, { token: T.c1.token })).status, 400, 'second cancel rejected');
  assert.equal((await Product.findById(p._id)).stock, 10, 'no double restore');
  // concurrent double-cancel => restored once
  await cartAdd(T.c1.token, p._id, 3); const o2 = (await checkout(T.c1.token)).body.data;
  const rs = await Promise.all([1, 2, 3].map(() => api('POST', `/orders/${o2._id}/cancel`, { token: T.c1.token })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1); assert.equal((await Product.findById(p._id)).stock, 10);
});

test('coupon usage restored when order is cancelled', async () => {
  const before = (await Coupon.findOne({ code: 'TEN' })).usedCount;
  const r = await api('POST', `/orders/${T.couponOrder._id}/cancel`, { token: T.c1.token }); assert.equal(r.status, 200);
  assert.equal((await Coupon.findOne({ code: 'TEN' })).usedCount, before - 1);
});

test('CONCURRENCY: 10 customers race for 3 units -> exactly 3 succeed, stock never negative', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Hot Item', price: 100, stock: 3 })).body.data;
  const custs = [];
  for (let i = 0; i < 10; i++) { const c = await mkUser('customer', `race${i}@t.com`); await cartAdd(c.token, p._id, 1); custs.push(c); }
  const res = await Promise.all(custs.map((c) => checkout(c.token)));
  const ok = res.filter((r) => r.status === 201).length, conflict = res.filter((r) => r.status === 409).length;
  assert.equal(ok, 3, `expected 3 successes, got ${ok}`); assert.equal(conflict, 7);
  const after = await Product.findById(p._id); assert.equal(after.stock, 0); assert.equal(after.soldCount, 3);
  assert.equal(await Order.countDocuments({ 'items.product': p._id }), 3, 'failed checkouts left no orphan orders');
});

test('CONCURRENCY: coupon with usageLimit 1 used by 5 customers -> one wins, others fully rolled back', async () => {
  await api('POST', '/coupons', { token: T.admin, body: { code: 'ONCE', type: 'fixed', value: 10, usageLimit: 1, expiresAt: new Date(Date.now() + 864e5) } });
  const p = (await mkProduct(T.seller.token, { name: 'Coupon Race', price: 100, stock: 50 })).body.data;
  const custs = [];
  for (let i = 0; i < 5; i++) { const c = await mkUser('customer', `crace${i}@t.com`); await cartAdd(c.token, p._id, 1); await api('POST', '/cart/coupon', { token: c.token, body: { code: 'ONCE' } }); custs.push(c); }
  const res = await Promise.all(custs.map((c) => checkout(c.token)));
  assert.equal(res.filter((r) => r.status === 201).length, 1);
  assert.equal((await Coupon.findOne({ code: 'ONCE' })).usedCount, 1);
  assert.equal((await Product.findById(p._id)).stock, 49, 'losers did not keep reserved stock');
});

test('insufficient stock at checkout, price change detected, inactive product', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Low', price: 100, stock: 2 })).body.data;
  await cartAdd(T.c2.token, p._id, 2);
  await api('PATCH', `/inventory/${p._id}`, { token: T.seller.token, body: { mode: 'set', quantity: 1 } });
  const r = await checkout(T.c2.token); assert.equal(r.status, 409); assert.match(r.body.message, /Insufficient stock/);
  assert.equal((await Product.findById(p._id)).stock, 1);
  await api('DELETE', `/products/${p._id}`, { token: T.seller.token });
  assert.equal((await api('GET', '/cart', { token: T.c2.token })).body.data.items.length, 0, 'deactivated product dropped from cart');
});

test('inventory: negative guard, adjustments, ownership, low-stock alert + notification', async () => {
  const p = (await mkProduct(T.seller.token, { name: 'Inv', price: 10, stock: 10, lowStockThreshold: 5 })).body.data;
  assert.equal((await api('PATCH', `/inventory/${p._id}`, { token: T.seller.token, body: { mode: 'remove', quantity: 11 } })).status, 409);
  assert.equal((await api('PATCH', `/inventory/${p._id}`, { token: T.seller.token, body: { mode: 'set', quantity: -1 } })).status, 400);
  assert.equal((await api('PATCH', `/inventory/${p._id}`, { token: T.seller2.token, body: { mode: 'add', quantity: 1 } })).status, 403);
  assert.equal((await api('PATCH', `/inventory/${p._id}`, { token: T.seller.token, body: { mode: 'add', quantity: 5 } })).body.data.stock, 15);
  await api('PATCH', `/inventory/${p._id}`, { token: T.seller.token, body: { mode: 'remove', quantity: 12 } });
  await new Promise((r) => setTimeout(r, 300));
  const low = await api('GET', '/inventory/low-stock', { token: T.seller.token });
  assert.ok(low.body.data.some((x) => x._id === p._id));
  const n = await api('GET', '/notifications', { token: T.seller.token });
  assert.ok(n.body.data.some((x) => x.type === 'low_stock' && /Inv/.test(x.message)), 'low-stock notification created via EventEmitter');
  assert.equal((await api('PATCH', `/notifications/${n.body.data[0]._id}/read`, { token: T.seller.token })).body.data.read, true);
  assert.equal((await api('PATCH', `/notifications/${n.body.data[0]._id}/read`, { token: T.c1.token })).status, 404, 'cannot read others notification');
});

test('seller gets new-order notification via EventEmitter', async () => {
  const p = (await mkProduct(T.seller2.token, { name: 'Notify', price: 100, stock: 5 })).body.data;
  await cartAdd(T.c2.token, p._id, 1); await checkout(T.c2.token); await new Promise((r) => setTimeout(r, 300));
  assert.ok((await api('GET', '/notifications', { token: T.seller2.token })).body.data.some((x) => x.type === 'new_order'));
});

test('reports: aggregation scoping and values', async () => {
  const s = await api('GET', '/reports/summary', { token: T.seller.token }); assert.equal(s.status, 200); assert.ok(s.body.data.revenue >= 2000);
  const a = await api('GET', '/reports/summary', { token: T.admin }); assert.ok(a.body.data.revenue >= s.body.data.revenue); assert.ok(a.body.data.users.customer >= 2);
  const d = await api('GET', '/reports/sales-by-date?days=7', { token: T.admin }); assert.equal(d.body.data.length, 7);
  assert.ok(d.body.data.reduce((x, r) => x + r.revenue, 0) >= 2000);
  assert.ok((await api('GET', '/reports/revenue-by-category', { token: T.admin })).body.data.some((r) => r.category === 'Gadgets'));
  assert.equal((await api('GET', '/reports/best-sellers', { token: T.seller.token })).body.data[0].name, 'Snap');
  const inv = (await api('GET', '/reports/inventory', { token: T.seller.token })).body.data; assert.ok(inv.valuation > 0 && inv.products > 0);
  const s2 = await api('GET', '/reports/best-sellers', { token: T.seller2.token }); assert.ok(!s2.body.data.some((r) => r.name === 'Snap'), 'seller2 cannot see seller1 sales');
});

test('admin: user management, category guards, 404s', async () => {
  const u = await mkUser('customer', 'victim@t.com');
  assert.equal((await api('PATCH', `/users/${u.id}/status`, { token: T.admin, body: { isActive: false } })).status, 200);
  assert.equal((await api('GET', '/auth/me', { token: u.token })).status, 403, 'deactivated user blocked');
  assert.equal((await api('POST', '/auth/login', { body: { email: 'victim@t.com', password: 'Passw0rd!' } })).status, 403);
  assert.equal((await api('DELETE', `/categories/${T.cat}`, { token: T.admin })).status, 409, 'category with products protected');
  assert.equal((await api('POST', '/categories', { token: T.admin, body: { name: 'Gadgets' } })).status, 409);
  assert.equal((await api('GET', `/orders/${new mongoose.Types.ObjectId()}`, { token: T.admin })).status, 404);
  assert.equal((await api('GET', '/nope')).status, 404);
});
