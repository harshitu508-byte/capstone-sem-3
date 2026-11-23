const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bus = require('../utils/events');
const { paginate, pageMeta, assertId, escapeRegex } = require('../utils/helpers');

const SORTS = { newest: '-createdAt', price_asc: 'price', price_desc: '-price', rating: '-ratingAvg', popular: '-soldCount' };

function buildFilter(q) {
  const f = {};
  if (q.search) { const r = new RegExp(escapeRegex(q.search), 'i'); f.$or = [{ name: r }, { description: r }]; }
  if (q.category) { assertId(q.category, 'category'); f.category = q.category; }
  if (q.seller) { assertId(q.seller, 'seller'); f.seller = q.seller; }
  if (q.minPrice || q.maxPrice) f.price = { ...(q.minPrice && { $gte: Number(q.minPrice) }), ...(q.maxPrice && { $lte: Number(q.maxPrice) }) };
  if (q.inStock === 'true') f.stock = { $gt: 0 };
  return f;
}
async function list(req, res, extra) {
  const { page, limit, skip } = paginate(req.query);
  const f = { ...buildFilter(req.query), ...extra };
  const [data, total] = await Promise.all([
    Product.find(f).populate('category', 'name slug').populate('seller', 'name shopName').sort(SORTS[req.query.sort] || SORTS.newest).skip(skip).limit(limit),
    Product.countDocuments(f)]);
  res.json({ success: true, data, meta: pageMeta(total, page, limit) });
}

exports.listPublic = asyncHandler((req, res) => list(req, res, { isActive: true }));
// Seller sees only own products (active + inactive); admin sees everything.
exports.listManage = asyncHandler((req, res) => list(req, res, req.user.role === 'seller' ? { seller: req.user._id } : {}));

exports.getOne = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const p = await Product.findById(req.params.id).populate('category', 'name slug').populate('seller', 'name shopName');
  if (!p || !p.isActive) throw ApiError.notFound('Product not found');
  res.json({ success: true, data: p });
});

exports.create = asyncHandler(async (req, res) => {
  if (!(await Category.exists({ _id: req.body.category, isActive: true }))) throw ApiError.badRequest('Category does not exist');
  const sellerId = req.user.role === 'admin' && req.body.seller ? req.body.seller : req.user._id;
  const p = await Product.create({ ...req.body, seller: sellerId });
  bus.emit(bus.EVENTS.INVENTORY_CHANGED, { product: p, actor: req.user._id });
  res.status(201).json({ success: true, data: p });
});

async function owned(req) {
  assertId(req.params.id);
  const p = await Product.findById(req.params.id);
  if (!p) throw ApiError.notFound('Product not found');
  if (req.user.role === 'seller' && !p.seller.equals(req.user._id)) throw ApiError.forbidden('You can only modify your own products');
  return p;
}
exports.update = asyncHandler(async (req, res) => {
  const p = await owned(req);
  const { stock, seller, ...rest } = req.body; // stock only via inventory endpoints (atomic); seller is immutable
  if (rest.category && !(await Category.exists({ _id: rest.category }))) throw ApiError.badRequest('Category does not exist');
  Object.assign(p, rest);
  await p.save();
  res.json({ success: true, data: p });
});
// Soft delete keeps order history intact.
exports.remove = asyncHandler(async (req, res) => {
  const p = await owned(req);
  p.isActive = false;
  await p.save();
  res.json({ success: true, message: 'Product deactivated' });
});

