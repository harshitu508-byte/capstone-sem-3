const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { computeTotals } = require('./pricingService');
const couponService = require('./couponService');

exports.getCartView = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) } }).select('name price stock images isActive seller');
  const map = new Map(products.map((p) => [p.id, p]));
  const items = [];
  const dropped = [];
  for (const i of cart.items) {
    const p = map.get(i.product.toString());
    if (!p || !p.isActive) { dropped.push(i.product); continue; }
    items.push({ product: p, quantity: i.quantity, price: p.price, lineTotal: Math.round(p.price * i.quantity * 100) / 100, available: p.stock, outOfStock: p.stock < i.quantity });
  }
  if (dropped.length) { cart.items = cart.items.filter((i) => !dropped.some((d) => d.equals(i.product))); await cart.save(); }
  let discount = 0, couponError = null;
  const base = computeTotals(items);
  if (cart.couponCode && items.length) {
    try { discount = (await couponService.validate(cart.couponCode, userId, base.subtotal)).discount; }
    catch (e) { couponError = e.message; }
  }
  return { items, couponCode: cart.couponCode || null, couponError, totals: computeTotals(items, discount), itemCount: items.reduce((s, i) => s + i.quantity, 0) };
};
