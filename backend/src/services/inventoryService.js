const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const bus = require('../utils/events');

// Atomic adjust: delta may be negative; the filter guarantees stock never drops below 0.
exports.adjustStock = async (productId, delta, actorId) => {
  const filter = { _id: productId };
  if (delta < 0) filter.stock = { $gte: -delta };
  const p = await Product.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true });
  if (!p) throw ApiError.conflict('Insufficient stock for this adjustment');
  bus.emit(bus.EVENTS.INVENTORY_CHANGED, { product: p, actor: actorId });
  return p;
};
exports.setStock = async (productId, stock, actorId) => {
  const p = await Product.findByIdAndUpdate(productId, { stock }, { new: true, runValidators: true });
  bus.emit(bus.EVENTS.INVENTORY_CHANGED, { product: p, actor: actorId });
  return p;
};
