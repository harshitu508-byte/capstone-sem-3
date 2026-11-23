const mongoose = require('mongoose');
const env = require('../config/env');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const bus = require('../utils/events');
const logger = require('../utils/logger');
const { computeTotals } = require('./pricingService');
const couponService = require('./couponService');

// Valid status transitions.
const TRANSITIONS = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
exports.TRANSITIONS = TRANSITIONS;

// Runs `work(session, undo)` in a MongoDB transaction when enabled; otherwise relies on
// atomic conditional updates plus compensating "undo" actions if something fails midway.
async function runAtomic(work) {
  if (env.useTransactions) {
    const session = await mongoose.startSession();
    try { let r; await session.withTransaction(async () => { r = await work(session, []); }); return r; }
    finally { await session.endSession(); }
  }
  const undo = [];
  try { return await work(null, undo); }
  catch (e) { for (const u of undo.reverse()) await u().catch((x) => logger.error('undo failed', x)); throw e; }
}

const newOrderNumber = () => `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

exports.placeOrder = async (user, { shippingAddress, paymentMethod }) => {
  const result = await runAtomic(async (session, undo) => {
    const cart = await Cart.findOne({ user: user._id }).session(session);
    if (!cart || !cart.items.length) throw ApiError.badRequest('Cart is empty');

    // Merge duplicates, then revalidate every product against the database.
    const wanted = new Map();
    for (const i of cart.items) wanted.set(i.product.toString(), (wanted.get(i.product.toString()) || 0) + i.quantity);
    const products = await Product.find({ _id: { $in: [...wanted.keys()] } }).session(session);
    const lines = [];
    for (const [pid, qty] of wanted) {
      const p = products.find((x) => x.id === pid);
      if (!p || !p.isActive) throw ApiError.conflict('A product in your cart is no longer available');
      if (p.stock < qty) throw ApiError.conflict(`Insufficient stock for "${p.name}" (available: ${p.stock})`);
      lines.push({ p, qty });
    }

    // Atomic reservation: the filter on stock AND price prevents overselling and stale prices,
    // even when several customers check out at the same moment.
    const reserved = [];
    for (const { p, qty } of lines) {
      const updated = await Product.findOneAndUpdate(
        { _id: p._id, isActive: true, price: p.price, stock: { $gte: qty } },
        { $inc: { stock: -qty, soldCount: qty } }, { new: true, session });
      if (!updated) throw ApiError.conflict(`"${p.name}" just sold out or its price changed. Please review your cart.`);
      undo.push(() => Product.updateOne({ _id: p._id }, { $inc: { stock: qty, soldCount: -qty } }));
      reserved.push(updated);
    }

    const items = lines.map(({ p, qty }) => ({ product: p._id, seller: p.seller, category: p.category, name: p.name, image: p.images[0], price: p.price, quantity: qty }));
    const base = computeTotals(items.map((i) => ({ price: i.price, quantity: i.quantity })));
    let discount = 0, couponCode;
    if (cart.couponCode) {
      const { coupon, discount: d } = await couponService.validate(cart.couponCode, user._id, base.subtotal, session);
      await couponService.consume(coupon, session, undo);
      discount = d; couponCode = coupon.code;
    }
    const totals = computeTotals(items, discount);
    const [order] = await Order.create([{
      orderNumber: newOrderNumber(), customer: user._id, items, ...totals, couponCode, shippingAddress,
      status: 'pending', statusHistory: [{ status: 'pending', by: user._id }],
      payment: { method: paymentMethod, status: 'pending', simulated: true },
    }], { session });
    undo.push(() => Order.deleteOne({ _id: order._id }));
    await Cart.updateOne({ _id: cart._id }, { $set: { items: [], couponCode: null } }, { session });
    return { order, reserved };
  });
  bus.emit(bus.EVENTS.ORDER_PLACED, { order: result.order });
  for (const p of result.reserved) bus.emit(bus.EVENTS.INVENTORY_CHANGED, { product: p, actor: user._id });
  return result.order;
};

const involvesSeller = (order, userId) => order.items.some((i) => i.seller.equals(userId));
exports.canView = (order, user) => user.role === 'admin' || (user.role === 'customer' && order.customer.equals(user._id)) || (user.role === 'seller' && involvesSeller(order, user._id));

exports.updateStatus = async (order, next, actor) => {
  const from = order.status;
  if (!Order.STATUSES.includes(next)) throw ApiError.badRequest('Unknown status');
  if (!TRANSITIONS[from].includes(next)) throw ApiError.badRequest(`Invalid transition: ${from} -> ${next}`);
  if (actor.role === 'customer' && !(next === 'cancelled' && order.customer.equals(actor._id))) throw ApiError.forbidden('Customers can only cancel their own orders');
  if (actor.role === 'seller' && !involvesSeller(order, actor._id)) throw ApiError.forbidden('This order has none of your products');
  if (next === 'confirmed' && order.payment.method !== 'cod' && order.payment.status !== 'paid') throw ApiError.conflict('Payment (simulated) must be completed before confirming');

  if (next === 'cancelled') return cancel(order, from, actor);

  const set = { status: next };
  if (next === 'delivered' && order.payment.method === 'cod') { set['payment.status'] = 'paid'; set['payment.paidAt'] = new Date(); set['payment.transactionId'] = `SIM-COD-${Date.now()}`; }
  // Conditional on current status: a concurrent change makes this fail instead of overwriting.
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: from }, { $set: set, $push: { statusHistory: { status: next, by: actor._id } } }, { new: true });
  if (!updated) throw ApiError.conflict('Order status changed concurrently. Refresh and retry.');
  bus.emit(bus.EVENTS.ORDER_STATUS, { order: updated, from, actor });
  return updated;
};

async function cancel(order, from, actor) {
  const updated = await runAtomic(async (session, undo) => {
    // stockRestored flag + status filter => stock can be restored at most once.
    const set = { status: 'cancelled', stockRestored: true };
    if (order.payment.status === 'paid') set['payment.status'] = 'refunded';
    const o = await Order.findOneAndUpdate({ _id: order._id, status: from, stockRestored: false },
      { $set: set, $push: { statusHistory: { status: 'cancelled', by: actor._id } } }, { new: true, session });
    if (!o) throw ApiError.conflict('Order cannot be cancelled (already changed or cancelled)');
    for (const i of o.items) {
      await Product.updateOne({ _id: i.product }, { $inc: { stock: i.quantity, soldCount: -i.quantity } }, { session });
      undo.push(() => Product.updateOne({ _id: i.product }, { $inc: { stock: -i.quantity, soldCount: i.quantity } }));
    }
    if (o.couponCode) await Coupon.updateOne({ code: o.couponCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
    return o;
  });
  bus.emit(bus.EVENTS.ORDER_CANCELLED, { order: updated, from, actor });
  bus.emit(bus.EVENTS.ORDER_STATUS, { order: updated, from, actor });
  const products = await Product.find({ _id: { $in: updated.items.map((i) => i.product) } });
  for (const p of products) bus.emit(bus.EVENTS.INVENTORY_CHANGED, { product: p, actor: actor._id });
  return updated;
}

exports.simulatePayment = async (order, outcome) => {
  if (order.payment.method === 'cod') throw ApiError.badRequest('Cash on delivery orders are paid on delivery');
  if (order.status !== 'pending') throw ApiError.conflict(`Cannot pay an order that is ${order.status}`);
  if (order.payment.status === 'paid') throw ApiError.conflict('Order is already paid');
  if (outcome === 'failure') {
    return Order.findByIdAndUpdate(order._id, { 'payment.status': 'failed' }, { new: true });
  }
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: 'pending', 'payment.status': { $ne: 'paid' } },
    { $set: { 'payment.status': 'paid', 'payment.paidAt': new Date(), 'payment.transactionId': `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, status: 'confirmed' },
      $push: { statusHistory: { status: 'confirmed' } } }, { new: true });
  if (!updated) throw ApiError.conflict('Order is already paid or changed');
  bus.emit(bus.EVENTS.ORDER_STATUS, { order: updated, from: 'pending', actor: null });
  return updated;
};
