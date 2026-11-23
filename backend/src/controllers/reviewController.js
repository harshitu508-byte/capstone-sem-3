const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId, paginate, pageMeta } = require('../utils/helpers');
const mongoose = require('mongoose');

async function recalc(productId) {
  const [r] = await Review.aggregate([{ $match: { product: new mongoose.Types.ObjectId(productId) } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  await Product.updateOne({ _id: productId }, { ratingAvg: r ? Math.round(r.avg * 10) / 10 : 0, ratingCount: r ? r.n : 0 });
}

exports.list = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  const { page, limit, skip } = paginate(req.query);
  const f = { product: req.params.productId };
  const [data, total] = await Promise.all([Review.find(f).populate('user', 'name').sort('-createdAt').skip(skip).limit(limit), Review.countDocuments(f)]);
  res.json({ success: true, data, meta: pageMeta(total, page, limit) });
});

exports.create = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  const p = await Product.findById(req.params.productId);
  if (!p) throw ApiError.notFound('Product not found');
  // Only verified buyers (delivered orders) may review.
  const bought = await Order.exists({ customer: req.user._id, status: 'delivered', 'items.product': p._id });
  if (!bought) throw ApiError.forbidden('You can review a product only after receiving it');
  if (await Review.exists({ product: p._id, user: req.user._id })) throw ApiError.conflict('You have already reviewed this product');
  const review = await Review.create({ product: p._id, user: req.user._id, ...req.body });
  await recalc(p._id);
  res.status(201).json({ success: true, data: review });
});

exports.remove = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const r = await Review.findById(req.params.id);
  if (!r) throw ApiError.notFound('Review not found');
  if (req.user.role !== 'admin' && !r.user.equals(req.user._id)) throw ApiError.forbidden('Not your review');
  await r.deleteOne();
  await recalc(r.product);
  res.json({ success: true, message: 'Review deleted' });
});
