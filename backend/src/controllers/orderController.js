const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/orderService');
const { paginate, pageMeta, assertId } = require('../utils/helpers');

exports.checkout = asyncHandler(async (req, res) => {
  const order = await svc.placeOrder(req.user, req.body);
  res.status(201).json({ success: true, message: 'Order placed. Payment is simulated; no real transaction occurs.', data: order });
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = {};
  if (req.user.role === 'customer') f.customer = req.user._id;
  else if (req.user.role === 'seller') f['items.seller'] = req.user._id;
  if (Order.STATUSES.includes(req.query.status)) f.status = req.query.status;
  if (req.query.search) f.orderNumber = new RegExp(req.query.search.replace(/[^A-Za-z0-9-]/g, ''), 'i');
  const [orders, total] = await Promise.all([
    Order.find(f).populate('customer', 'name email').sort('-createdAt').skip(skip).limit(limit), Order.countDocuments(f)]);
  // Sellers only see their own line items (and their own subtotal) of a shared order.
  const data = req.user.role === 'seller' ? orders.map((o) => scopeToSeller(o, req.user._id)) : orders;
  res.json({ success: true, data, meta: pageMeta(total, page, limit) });
});

function scopeToSeller(order, sellerId) {
  const o = order.toObject();
  o.items = o.items.filter((i) => i.seller.toString() === sellerId.toString());
  o.sellerSubtotal = Math.round(o.items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  return o;
}

async function load(req) {
  assertId(req.params.id);
  const order = await Order.findById(req.params.id).populate('customer', 'name email phone');
  if (!order) throw ApiError.notFound('Order not found');
  const plain = order.customer?._id ? order : order;
  // canView expects ObjectIds; populated customer has _id.
  const check = { ...order.toObject(), customer: order.customer._id, items: order.items };
  if (!svc.canView(check, req.user)) throw ApiError.forbidden('You do not have access to this order');
  return order;
}
exports.getOne = asyncHandler(async (req, res) => {
  const o = await load(req);
  res.json({ success: true, data: req.user.role === 'seller' ? scopeToSeller(o, req.user._id) : o });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const o = await load(req);
  const raw = await Order.findById(o._id);
  res.json({ success: true, data: await svc.updateStatus(raw, req.body.status, req.user) });
});
exports.cancel = asyncHandler(async (req, res) => {
  const o = await load(req);
  const raw = await Order.findById(o._id);
  res.json({ success: true, message: 'Order cancelled and stock restored', data: await svc.updateStatus(raw, 'cancelled', req.user) });
});
