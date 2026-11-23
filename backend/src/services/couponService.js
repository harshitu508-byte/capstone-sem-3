const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const { round2 } = require('../utils/helpers');

// Returns { coupon, discount } or throws a 400 with the reason.
exports.validate = async (code, userId, subtotal, session = null) => {
  const coupon = await Coupon.findOne({ code: String(code || '').toUpperCase().trim() }).session(session);
  if (!coupon || !coupon.isActive) throw ApiError.badRequest('Invalid coupon code');
  const now = new Date();
  if (coupon.startsAt > now) throw ApiError.badRequest('Coupon is not active yet');
  if (coupon.expiresAt < now) throw ApiError.badRequest('Coupon has expired');
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw ApiError.badRequest('Coupon usage limit reached');
  if (subtotal < coupon.minOrderValue) throw ApiError.badRequest(`Minimum order value for this coupon is ${coupon.minOrderValue}`);
  const used = await Order.countDocuments({ customer: userId, couponCode: coupon.code, status: { $ne: 'cancelled' } }).session(session);
  if (used >= coupon.perUserLimit) throw ApiError.badRequest('You have already used this coupon the maximum number of times');
  let discount = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  return { coupon, discount: Math.min(round2(discount), subtotal) };
};

// Atomic usage increment: fails if limit was reached by a concurrent order.
exports.consume = async (coupon, session, undo) => {
  const filter = { _id: coupon._id };
  if (coupon.usageLimit) filter.usedCount = { $lt: coupon.usageLimit };
  const r = await Coupon.findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { session });
  if (!r) throw ApiError.badRequest('Coupon usage limit reached');
  undo.push(() => Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } }));
};
