const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/helpers');

const get = async (uid) => Wishlist.findOneAndUpdate({ user: uid }, { $setOnInsert: { user: uid } }, { upsert: true, new: true }).populate({ path: 'products', match: { isActive: true }, select: 'name price images stock ratingAvg' });
exports.get = asyncHandler(async (req, res) => res.json({ success: true, data: (await get(req.user._id)).products }));
exports.add = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  if (!(await Product.exists({ _id: req.params.productId, isActive: true }))) throw ApiError.notFound('Product not found');
  await Wishlist.updateOne({ user: req.user._id }, { $addToSet: { products: req.params.productId } }, { upsert: true });
  res.status(201).json({ success: true, data: (await get(req.user._id)).products });
});
exports.remove = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: req.params.productId } });
  res.json({ success: true, data: (await get(req.user._id)).products });
});
