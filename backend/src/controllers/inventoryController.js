const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const inv = require('../services/inventoryService');
const { assertId, paginate, pageMeta } = require('../utils/helpers');

const scope = (req) => (req.user.role === 'seller' ? { seller: req.user._id } : {});

exports.lowStock = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { ...scope(req), isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } };
  const [data, total] = await Promise.all([Product.find(f).populate('category', 'name').populate('seller', 'shopName name').sort('stock').skip(skip).limit(limit), Product.countDocuments(f)]);
  res.json({ success: true, data, meta: pageMeta(total, page, limit) });
});

exports.update = asyncHandler(async (req, res) => {
  assertId(req.params.productId);
  const p = await Product.findById(req.params.productId);
  if (!p) throw ApiError.notFound('Product not found');
  if (req.user.role === 'seller' && !p.seller.equals(req.user._id)) throw ApiError.forbidden('You can only manage your own inventory');
  const { mode, quantity, lowStockThreshold } = req.body;
  if (lowStockThreshold !== undefined) await Product.updateOne({ _id: p._id }, { lowStockThreshold });
  let updated;
  if (mode === 'set') updated = await inv.setStock(p._id, quantity, req.user._id);
  else if (mode === 'add') updated = await inv.adjustStock(p._id, quantity, req.user._id);
  else if (mode === 'remove') updated = await inv.adjustStock(p._id, -quantity, req.user._id);
  else updated = await Product.findById(p._id);
  res.json({ success: true, data: updated });
});
