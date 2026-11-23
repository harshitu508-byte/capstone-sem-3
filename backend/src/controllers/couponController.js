const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const couponService = require('../services/couponService');
const { assertId } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => res.json({ success: true, data: await Coupon.find().sort('-createdAt') }));
exports.create = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await Coupon.create(req.body) }));
exports.update = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const c = await Coupon.findById(req.params.id);
  if (!c) throw ApiError.notFound('Coupon not found');
  const { usedCount, ...rest } = req.body;
  Object.assign(c, rest);
  await c.save();
  res.json({ success: true, data: c });
});
exports.remove = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const c = await Coupon.findByIdAndDelete(req.params.id);
  if (!c) throw ApiError.notFound('Coupon not found');
  res.json({ success: true, message: 'Coupon deleted' });
});
exports.validate = asyncHandler(async (req, res) => {
  const { coupon, discount } = await couponService.validate(req.body.code, req.user._id, req.body.subtotal);
  res.json({ success: true, data: { code: coupon.code, type: coupon.type, value: coupon.value, discount } });
});
