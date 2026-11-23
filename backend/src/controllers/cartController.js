const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/helpers');
const { getCartView } = require('../services/cartService');
const couponService = require('../services/couponService');
const { computeTotals } = require('../services/pricingService');

const getCart = async (uid) => (await Cart.findOne({ user: uid })) || Cart.create({ user: uid, items: [] });
const view = async (req, res, code = 200) => res.status(code).json({ success: true, data: await getCartView(req.user._id) });

exports.get = asyncHandler((req, res) => view(req, res));

exports.addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  assertId(productId, 'productId');
  const p = await Product.findById(productId);
  if (!p || !p.isActive) throw ApiError.notFound('Product not found');
  const cart = await getCart(req.user._id);
  const existing = cart.items.find((i) => i.product.equals(productId));
  const newQty = (existing?.quantity || 0) + quantity;
  if (newQty > p.stock) throw ApiError.conflict(`Only ${p.stock} unit(s) of "${p.name}" in stock`);
  if (existing) existing.quantity = newQty; else cart.items.push({ product: productId, quantity });
  await cart.save();
  await view(req, res, 201);
});

exports.updateItem = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  const cart = await getCart(req.user._id);
  const item = cart.items.find((i) => i.product.equals(req.params.productId));
  if (!item) throw ApiError.notFound('Item not in cart');
  const p = await Product.findById(req.params.productId);
  if (!p || !p.isActive) throw ApiError.notFound('Product not found');
  if (req.body.quantity > p.stock) throw ApiError.conflict(`Only ${p.stock} unit(s) in stock`);
  item.quantity = req.body.quantity;
  await cart.save();
  await view(req, res);
});

exports.removeItem = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  const cart = await getCart(req.user._id);
  cart.items = cart.items.filter((i) => !i.product.equals(req.params.productId));
  await cart.save();
  await view(req, res);
});

exports.clear = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { items: [], couponCode: null }, { upsert: true });
  await view(req, res);
});

exports.applyCoupon = asyncHandler(async (req, res) => {
  const v = await getCartView(req.user._id);
  if (!v.items.length) throw ApiError.badRequest('Cart is empty');
  const { coupon } = await couponService.validate(req.body.code, req.user._id, computeTotals(v.items).subtotal);
  await Cart.updateOne({ user: req.user._id }, { couponCode: coupon.code });
  await view(req, res);
});
exports.removeCoupon = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { couponCode: null });
  await view(req, res);
});
