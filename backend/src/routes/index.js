const router = require('express').Router();
const { protect, authorize, approvedSeller } = require('../middleware/auth');
const validate = require('../middleware/validate');
const S = require('./schemas');
const c = (n) => require(`../controllers/${n}Controller`);
const auth = c('auth'), user = c('user'), cat = c('category'), prod = c('product'), cart = c('cart'), order = c('order'),
  inv = c('inventory'), coupon = c('coupon'), pay = c('payment'), rev = c('review'), wish = c('wishlist'), notif = c('notification'), rep = c('report');
const { optionalAuth } = require('../middleware/optionalAuth');

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date() }));

// Auth
router.post('/auth/register', validate({ body: S.register }), auth.register);
router.post('/auth/login', validate({ body: S.login }), auth.login);
router.post('/auth/refresh', validate({ body: S.refresh }), auth.refresh);
router.post('/auth/logout', protect, auth.logout);
router.get('/auth/me', protect, auth.me);
router.put('/auth/me', protect, validate({ body: S.updateMe }), auth.updateMe);
router.put('/auth/password', protect, validate({ body: S.password }), auth.changePassword);

// Users (admin)
router.get('/users', protect, authorize('admin'), user.list);
router.patch('/users/:id/status', protect, authorize('admin'), validate({ body: S.status }), user.setStatus);
router.patch('/users/:id/approve', protect, authorize('admin'), validate({ body: S.approve }), user.approveSeller);

// Categories
router.get('/categories', optionalAuth, cat.list);
router.post('/categories', protect, authorize('admin'), validate({ body: S.category }), cat.create);
router.put('/categories/:id', protect, authorize('admin'), validate({ body: S.categoryUpdate }), cat.update);
router.delete('/categories/:id', protect, authorize('admin'), cat.remove);

// Products
router.get('/products', prod.listPublic);
router.get('/products/manage', protect, authorize('seller', 'admin'), prod.listManage);
router.get('/products/:id', prod.getOne);
router.post('/products', protect, authorize('seller', 'admin'), approvedSeller, validate({ body: S.productCreate }), prod.create);
router.put('/products/:id', protect, authorize('seller', 'admin'), approvedSeller, validate({ body: S.productUpdate }), prod.update);
router.delete('/products/:id', protect, authorize('seller', 'admin'), approvedSeller, prod.remove);

// Reviews
router.get('/products/:productId/reviews', rev.list);
router.post('/products/:productId/reviews', protect, authorize('customer'), validate({ body: S.review }), rev.create);
router.delete('/reviews/:id', protect, authorize('customer', 'admin'), rev.remove);

// Cart (customer only; always scoped to req.user)
router.use('/cart', protect, authorize('customer'));
router.get('/cart', cart.get);
router.post('/cart/items', validate({ body: S.cartAdd }), cart.addItem);
router.put('/cart/items/:productId', validate({ body: S.cartUpdate }), cart.updateItem);
router.delete('/cart/items/:productId', cart.removeItem);
router.delete('/cart', cart.clear);
router.post('/cart/coupon', validate({ body: S.coupon }), cart.applyCoupon);
router.delete('/cart/coupon', cart.removeCoupon);

// Orders
router.post('/orders', protect, authorize('customer'), validate({ body: S.checkout }), order.checkout);
router.get('/orders', protect, order.list);
router.get('/orders/:id', protect, order.getOne);
router.patch('/orders/:id/status', protect, authorize('seller', 'admin'), approvedSeller, validate({ body: S.orderStatus }), order.updateStatus);
router.post('/orders/:id/cancel', protect, authorize('customer', 'admin'), order.cancel);

// Payments (simulated)
router.post('/payments/simulate', protect, authorize('customer'), validate({ body: S.payment }), pay.simulate);
router.get('/payments/:orderId', protect, pay.get);

// Inventory
router.get('/inventory/low-stock', protect, authorize('seller', 'admin'), inv.lowStock);
router.patch('/inventory/:productId', protect, authorize('seller', 'admin'), approvedSeller, validate({ body: S.inventory }), inv.update);

// Coupons
router.post('/coupons/validate', protect, authorize('customer'), validate({ body: S.couponValidate }), coupon.validate);
router.get('/coupons', protect, authorize('admin'), coupon.list);
router.post('/coupons', protect, authorize('admin'), validate({ body: S.couponCreate }), coupon.create);
router.put('/coupons/:id', protect, authorize('admin'), validate({ body: S.couponUpdate }), coupon.update);
router.delete('/coupons/:id', protect, authorize('admin'), coupon.remove);

// Wishlist
router.get('/wishlist', protect, authorize('customer'), wish.get);
router.post('/wishlist/:productId', protect, authorize('customer'), wish.add);
router.delete('/wishlist/:productId', protect, authorize('customer'), wish.remove);

// Notifications
router.get('/notifications', protect, notif.list);
router.patch('/notifications/read-all', protect, notif.markAllRead);
router.patch('/notifications/:id/read', protect, notif.markRead);

// Reports (seller = own data, admin = platform)
router.use('/reports', protect, authorize('seller', 'admin'));
router.get('/reports/summary', rep.summary);
router.get('/reports/sales-by-date', rep.salesByDate);
router.get('/reports/revenue-by-category', rep.revenueByCategory);
router.get('/reports/best-sellers', rep.bestSellers);
router.get('/reports/order-status', rep.orderStatus);
router.get('/reports/inventory', rep.inventory);

module.exports = router;
