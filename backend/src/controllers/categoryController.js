const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const f = req.query.all === 'true' && req.user?.role === 'admin' ? {} : { isActive: true };
  res.json({ success: true, data: await Category.find(f).sort('name') });
});
exports.create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await Category.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const c = await Category.findById(req.params.id);
  if (!c) throw ApiError.notFound('Category not found');
  Object.assign(c, req.body);
  await c.save();
  res.json({ success: true, data: c });
});
exports.remove = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  if (await Product.exists({ category: req.params.id })) throw ApiError.conflict('Category has products; deactivate it instead');
  const c = await Category.findByIdAndDelete(req.params.id);
  if (!c) throw ApiError.notFound('Category not found');
  res.json({ success: true, message: 'Category deleted' });
});
