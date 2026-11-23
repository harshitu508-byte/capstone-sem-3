// Generates ecommerce.postman_collection.json  (node build-collection.js)
const folders = [];
let cur;
const folder = (name) => { cur = { name, item: [] }; folders.push(cur); };
const req = (name, method, path, { auth, body, tests = [], pre = [] } = {}) => {
  const item = { name, request: { method, header: [{ key: 'Content-Type', value: 'application/json' }], url: { raw: `{{baseUrl}}${path}`, host: ['{{baseUrl}}'], path: path.replace(/^\//, '').split('/') } },
    event: [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }] };
  if (pre.length) item.event.unshift({ listen: 'prerequest', script: { type: 'text/javascript', exec: pre } });
  if (auth) item.request.auth = { type: 'bearer', bearer: [{ key: 'token', value: `{{${auth}}}`, type: 'string' }] };
  if (body) item.request.body = { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body, null, 2) };
  cur.item.push(item);
};
const status = (code, extra = []) => [`pm.test('status is ${code}', () => pm.response.to.have.status(${code}));`, ...extra];
const save = (v, expr) => `pm.collectionVariables.set('${v}', ${expr});`;
const addr = { fullName: 'Postman User', phone: '9999999999', street: '1 Test Street', city: 'Delhi', state: 'Delhi', postalCode: '110001' };

folder('01 Authentication');
req('Login admin', 'POST', '/auth/login', { body: { email: 'admin@shop.com', password: 'Admin@123' }, tests: status(200, [save('adminToken', 'pm.response.json().data.accessToken')]) });
req('Login seller1', 'POST', '/auth/login', { body: { email: 'seller1@shop.com', password: 'Seller@123' }, tests: status(200, [save('sellerToken', 'pm.response.json().data.accessToken')]) });
req('Login seller2', 'POST', '/auth/login', { body: { email: 'seller2@shop.com', password: 'Seller@123' }, tests: status(200, [save('seller2Token', 'pm.response.json().data.accessToken')]) });
req('Login customer', 'POST', '/auth/login', { body: { email: 'customer@shop.com', password: 'Customer@123' }, tests: status(200, [save('custToken', 'pm.response.json().data.accessToken'), save('custRefresh', 'pm.response.json().data.refreshToken')]) });
req('Login pending seller (not approved)', 'POST', '/auth/login', { body: { email: 'pending@shop.com', password: 'Seller@123' }, tests: status(200, [save('pendingToken', 'pm.response.json().data.accessToken')]) });
req('Register new customer (success)', 'POST', '/auth/register', { pre: [`pm.collectionVariables.set('newEmail', 'pm_' + Date.now() + '@test.com');`], body: '{"name":"Postman Customer","email":"{{newEmail}}","password":"Passw0rd!"}', tests: status(201, [save('cust2Token', 'pm.response.json().data.accessToken')]) });
req('Register duplicate email -> 409', 'POST', '/auth/register', { body: '{"name":"Dup","email":"{{newEmail}}","password":"Passw0rd!"}', tests: status(409) });
req('Register invalid input -> 400', 'POST', '/auth/register', { body: { name: 'x', email: 'not-an-email', password: '1' }, tests: status(400, ["pm.test('has field errors', () => pm.expect(pm.response.json().errors).to.be.an('array').that.is.not.empty);"]) });
req('Register as admin -> 400', 'POST', '/auth/register', { body: { name: 'Evil', email: 'evil@test.com', password: 'Passw0rd!', role: 'admin' }, tests: status(400) });
req('Login wrong password -> 401', 'POST', '/auth/login', { body: { email: 'customer@shop.com', password: 'wrongwrong' }, tests: status(401) });
req('Login missing fields -> 400', 'POST', '/auth/login', { body: {}, tests: status(400) });
req('Get me without token -> 401', 'GET', '/auth/me', { tests: status(401) });
req('Get me with garbage token -> 401', 'GET', '/auth/me', { auth: 'garbage', tests: status(401) });
req('Get me (customer)', 'GET', '/auth/me', { auth: 'custToken', tests: status(200, ["pm.test('password never exposed', () => pm.expect(pm.response.json().data.password).to.be.undefined);"]) });
req('Refresh token (rotation)', 'POST', '/auth/refresh', { body: '{"refreshToken":"{{custRefresh}}"}', tests: status(200, [save('custRefresh2', 'pm.response.json().data.refreshToken')]) });
req('Reuse old refresh token -> 401', 'POST', '/auth/refresh', { body: '{"refreshToken":"{{custRefresh}}"}', tests: status(401) });

folder('02 RBAC / permissions');
req('Customer lists users -> 403', 'GET', '/users', { auth: 'custToken', tests: status(403) });
req('Customer opens reports -> 403', 'GET', '/reports/summary', { auth: 'custToken', tests: status(403) });
req('Seller creates category -> 403', 'POST', '/categories', { auth: 'sellerToken', body: { name: 'Hack' }, tests: status(403) });
req('Seller reads coupons -> 403', 'GET', '/coupons', { auth: 'sellerToken', tests: status(403) });
req('Seller uses cart -> 403', 'GET', '/cart', { auth: 'sellerToken', tests: status(403) });
req('Unapproved seller creates product -> 403', 'POST', '/products', { auth: 'pendingToken', body: { name: 'X', description: 'desc here', price: 10, category: '{{categoryId}}', stock: 1 }, tests: status(403) });
req('Admin lists users', 'GET', '/users?role=seller', { auth: 'adminToken', tests: status(200) });

folder('03 Catalog');
req('List categories (public)', 'GET', '/categories', { tests: status(200, [save('categoryId', 'pm.response.json().data[0]._id')]) });
req('Create duplicate category -> 409', 'POST', '/categories', { auth: 'adminToken', body: { name: 'Electronics' }, tests: status(409) });
req('Search + sort + paginate products', 'GET', '/products?search=lamp&sort=price_asc&page=1&limit=5&minPrice=1', { tests: status(200, ["pm.test('has pagination meta', () => pm.expect(pm.response.json().meta).to.have.keys('total','page','limit','pages'));"]) });
req('Create product with negative price -> 400', 'POST', '/products', { auth: 'sellerToken', body: { name: 'Bad', description: 'desc here', price: -1, category: '{{categoryId}}', stock: 1 }, tests: status(400) });
req('Create product with negative stock -> 400', 'POST', '/products', { auth: 'sellerToken', body: { name: 'Bad', description: 'desc here', price: 10, category: '{{categoryId}}', stock: -3 }, tests: status(400) });
req('Seller1 creates product (stock 2)', 'POST', '/products', { auth: 'sellerToken', pre: [`pm.collectionVariables.set('sku', 'PM' + Date.now());`], body: '{"name":"Postman Gadget","description":"Created by Postman","price":1000,"category":"{{categoryId}}","stock":2,"sku":"{{sku}}"}', tests: status(201, [save('productId', 'pm.response.json().data._id')]) });
req('Seller2 edits seller1 product -> 403', 'PUT', '/products/{{productId}}', { auth: 'seller2Token', body: { price: 1 }, tests: status(403) });
req('Seller2 deletes seller1 product -> 403', 'DELETE', '/products/{{productId}}', { auth: 'seller2Token', tests: status(403) });
req('Product invalid id -> 400', 'GET', '/products/not-an-id', { tests: status(400) });
req('Product non-existent -> 404', 'GET', '/products/000000000000000000000000', { tests: status(404) });
req('Get product', 'GET', '/products/{{productId}}', { tests: status(200) });

folder('04 Cart and coupons');
req('Add more than stock -> 409', 'POST', '/cart/items', { auth: 'custToken', body: '{"productId":"{{productId}}","quantity":5}', tests: status(409) });
req('Add quantity 0 -> 400', 'POST', '/cart/items', { auth: 'custToken', body: '{"productId":"{{productId}}","quantity":0}', tests: status(400) });
req('Add 1 to cart (server totals)', 'POST', '/cart/items', { auth: 'custToken', body: '{"productId":"{{productId}}","quantity":1}', tests: status(201, ["const t = pm.response.json().data.totals;", "pm.test('subtotal computed on server', () => pm.expect(t.subtotal).to.eql(1000));", "pm.test('free shipping >= 1000', () => pm.expect(t.shipping).to.eql(0));", "pm.test('tax 5%', () => pm.expect(t.tax).to.eql(50));"]) });
req('Customer2 cart is isolated', 'GET', '/cart', { auth: 'cust2Token', tests: status(200, ["pm.test('empty for other user', () => pm.expect(pm.response.json().data.items).to.have.lengthOf(0));"]) });
req('Apply expired coupon -> 400', 'POST', '/cart/coupon', { auth: 'custToken', body: { code: 'EXPIRED5' }, tests: status(400, ["pm.test('mentions expiry', () => pm.expect(pm.response.json().message).to.match(/expired/i));"]) });
req('Apply unknown coupon -> 400', 'POST', '/cart/coupon', { auth: 'custToken', body: { code: 'NOPE123' }, tests: status(400) });
req('Apply valid coupon WELCOME10', 'POST', '/cart/coupon', { auth: 'custToken', body: { code: 'welcome10' }, tests: status(200, ["pm.test('10% off capped at 500', () => pm.expect(pm.response.json().data.totals.discount).to.eql(100));"]) });

folder('05 Orders, payment, cancellation');
req('Checkout with invalid address -> 400', 'POST', '/orders', { auth: 'custToken', body: { shippingAddress: { fullName: 'A' } }, tests: status(400) });
req('Checkout (order 1)', 'POST', '/orders', { auth: 'custToken', body: { paymentMethod: 'simulated_card', shippingAddress: addr }, tests: status(201, [save('orderId', 'pm.response.json().data._id'), "const o = pm.response.json().data;", "pm.test('payment flagged simulated', () => pm.expect(o.payment.simulated).to.be.true);", "pm.test('discount applied from coupon', () => pm.expect(o.discount).to.eql(100));"]) });
req('Stock decreased after checkout', 'GET', '/products/{{productId}}', { tests: status(200, ["pm.test('stock 2 -> 1', () => pm.expect(pm.response.json().data.stock).to.eql(1));"]) });
req('Empty cart checkout -> 400', 'POST', '/orders', { auth: 'custToken', body: { paymentMethod: 'simulated_card', shippingAddress: addr }, tests: status(400) });
req('Other customer reads order -> 403', 'GET', '/orders/{{orderId}}', { auth: 'cust2Token', tests: status(403) });
req('Unrelated seller reads order -> 403', 'GET', '/orders/{{orderId}}', { auth: 'seller2Token', tests: status(403) });
req('Non-existent order -> 404', 'GET', '/orders/000000000000000000000000', { auth: 'adminToken', tests: status(404) });
req('Seller confirms unpaid order -> 409', 'PATCH', '/orders/{{orderId}}/status', { auth: 'sellerToken', body: { status: 'confirmed' }, tests: status(409) });
req('Invalid transition pending->delivered -> 400', 'PATCH', '/orders/{{orderId}}/status', { auth: 'sellerToken', body: { status: 'delivered' }, tests: status(400) });
req('Other customer pays my order -> 404', 'POST', '/payments/simulate', { auth: 'cust2Token', body: '{"orderId":"{{orderId}}"}', tests: status(404) });
req('Simulated payment fails -> 402', 'POST', '/payments/simulate', { auth: 'custToken', body: '{"orderId":"{{orderId}}","outcome":"failure"}', tests: status(402) });
req('Simulated payment succeeds', 'POST', '/payments/simulate', { auth: 'custToken', body: '{"orderId":"{{orderId}}"}', tests: status(200, ["pm.test('SIMULATED notice present', () => pm.expect(pm.response.json().notice).to.include('SIMULATED'));", "pm.test('order auto-confirmed', () => pm.expect(pm.response.json().data.status).to.eql('confirmed'));"]) });
req('Duplicate payment -> 409', 'POST', '/payments/simulate', { auth: 'custToken', body: '{"orderId":"{{orderId}}"}', tests: status(409) });
req('Customer tries to ship -> 403', 'PATCH', '/orders/{{orderId}}/status', { auth: 'custToken', body: { status: 'shipped' }, tests: status(403) });
req('Seller2 tries to ship -> 403', 'PATCH', '/orders/{{orderId}}/status', { auth: 'seller2Token', body: { status: 'shipped' }, tests: status(403) });
req('Seller ships order', 'PATCH', '/orders/{{orderId}}/status', { auth: 'sellerToken', body: { status: 'shipped' }, tests: status(200) });
req('Cancel shipped order -> 400', 'POST', '/orders/{{orderId}}/cancel', { auth: 'custToken', tests: status(400) });
req('Insufficient inventory: add 2 when 1 left -> 409', 'POST', '/cart/items', { auth: 'custToken', body: '{"productId":"{{productId}}","quantity":2}', tests: status(409) });
req('Add last unit to cart', 'POST', '/cart/items', { auth: 'custToken', body: '{"productId":"{{productId}}","quantity":1}', tests: status(201) });
req('Checkout (order 2, takes last unit)', 'POST', '/orders', { auth: 'custToken', body: { paymentMethod: 'cod', shippingAddress: addr }, tests: status(201, [save('order2Id', 'pm.response.json().data._id')]) });
req('Product now out of stock (0)', 'GET', '/products/{{productId}}', { tests: status(200, ["pm.test('stock is exactly 0, never negative', () => pm.expect(pm.response.json().data.stock).to.eql(0));"]) });
req('Late buyer cannot add sold-out item -> 409', 'POST', '/cart/items', { auth: 'cust2Token', body: '{"productId":"{{productId}}","quantity":1}', tests: status(409) });
req('Cancel order 2 (restores stock)', 'POST', '/orders/{{order2Id}}/cancel', { auth: 'custToken', tests: status(200, ["pm.test('status cancelled', () => pm.expect(pm.response.json().data.status).to.eql('cancelled'));"]) });
req('Stock restored to 1', 'GET', '/products/{{productId}}', { tests: status(200, ["pm.test('stock restored', () => pm.expect(pm.response.json().data.stock).to.eql(1));"]) });
req('Cancel again (duplicate) -> 400, no double restore', 'POST', '/orders/{{order2Id}}/cancel', { auth: 'custToken', tests: status(400) });
req('Stock still 1 after duplicate cancel', 'GET', '/products/{{productId}}', { tests: status(200, ["pm.test('no double restore', () => pm.expect(pm.response.json().data.stock).to.eql(1));"]) });
req('Seller delivers order 1', 'PATCH', '/orders/{{orderId}}/status', { auth: 'sellerToken', body: { status: 'delivered' }, tests: status(200) });
req('Review product (verified buyer)', 'POST', '/products/{{productId}}/reviews', { auth: 'custToken', body: { rating: 5, comment: 'Great' }, tests: status(201) });
req('Duplicate review -> 409', 'POST', '/products/{{productId}}/reviews', { auth: 'custToken', body: { rating: 4 }, tests: status(409) });
req('Non-buyer review -> 403', 'POST', '/products/{{productId}}/reviews', { auth: 'cust2Token', body: { rating: 5 }, tests: status(403) });

folder('06 Inventory and notifications');
req('Remove more than available -> 409', 'PATCH', '/inventory/{{productId}}', { auth: 'sellerToken', body: { mode: 'remove', quantity: 999 }, tests: status(409) });
req('Negative set -> 400', 'PATCH', '/inventory/{{productId}}', { auth: 'sellerToken', body: { mode: 'set', quantity: -1 }, tests: status(400) });
req('Other seller adjusts stock -> 403', 'PATCH', '/inventory/{{productId}}', { auth: 'seller2Token', body: { mode: 'add', quantity: 1 }, tests: status(403) });
req('Seller restocks +10', 'PATCH', '/inventory/{{productId}}', { auth: 'sellerToken', body: { mode: 'add', quantity: 10 }, tests: status(200, ["pm.test('stock 11', () => pm.expect(pm.response.json().data.stock).to.eql(11));"]) });
req('Low-stock list', 'GET', '/inventory/low-stock', { auth: 'sellerToken', tests: status(200) });
req('Seller notifications', 'GET', '/notifications', { auth: 'sellerToken', tests: status(200, ["pm.test('has new_order notification', () => pm.expect(pm.response.json().data.map(n => n.type)).to.include('new_order'));"]) });

folder('07 Coupons (admin)');
req('Create coupon with 150% -> 400', 'POST', '/coupons', { auth: 'adminToken', body: { code: 'BAD150', type: 'percent', value: 150, expiresAt: '2030-01-01' }, tests: status(400) });
req('Create coupon', 'POST', '/coupons', { auth: 'adminToken', pre: [`pm.collectionVariables.set('cpn', 'PM' + Date.now().toString().slice(-8));`], body: '{"code":"{{cpn}}","type":"fixed","value":50,"expiresAt":"2030-01-01","usageLimit":5}', tests: status(201, [save('couponId', 'pm.response.json().data._id')]) });
req('Duplicate coupon code -> 409', 'POST', '/coupons', { auth: 'adminToken', body: '{"code":"{{cpn}}","type":"fixed","value":50,"expiresAt":"2030-01-01"}', tests: status(409) });
req('Delete coupon', 'DELETE', '/coupons/{{couponId}}', { auth: 'adminToken', tests: status(200) });

folder('08 Reports');
req('Seller summary', 'GET', '/reports/summary', { auth: 'sellerToken', tests: status(200) });
req('Admin summary (platform-wide)', 'GET', '/reports/summary', { auth: 'adminToken', tests: status(200, ["pm.test('includes user counts', () => pm.expect(pm.response.json().data.users).to.be.an('object'));"]) });
req('Sales by date', 'GET', '/reports/sales-by-date?days=14', { auth: 'adminToken', tests: status(200, ["pm.test('14 daily buckets', () => pm.expect(pm.response.json().data).to.have.lengthOf(14));"]) });
req('Revenue by category', 'GET', '/reports/revenue-by-category', { auth: 'adminToken', tests: status(200) });
req('Best sellers', 'GET', '/reports/best-sellers?limit=5', { auth: 'adminToken', tests: status(200) });
req('Inventory valuation', 'GET', '/reports/inventory', { auth: 'adminToken', tests: status(200, ["pm.test('has valuation', () => pm.expect(pm.response.json().data.valuation).to.be.a('number'));"]) });

const collection = { info: { name: 'ShopSphere E-Commerce API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: 'Run the whole collection in order with the Collection Runner (or newman) against a freshly seeded database (npm run seed). True parallel purchase races are covered by backend/tests/api.test.js.' },
  variable: [{ key: 'baseUrl', value: 'http://localhost:5000/api' }], item: folders };
require('fs').writeFileSync(__dirname + '/ecommerce.postman_collection.json', JSON.stringify(collection, null, 2));
console.log('requests:', folders.reduce((n, f) => n + f.item.length, 0));
