const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notify } = require('../services/notificationService');
const { paginate, pageMeta, assertId, escapeRegex } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = {};
  if (['customer', 'seller', 'admin'].includes(req.query.role)) f.role = req.query.role;
  if (req.query.approved === 'false') { f.role = 'seller'; f.isApproved = false; }
  if (req.query.search) { const r = new RegExp(escapeRegex(req.query.search), 'i'); f.$or = [{ name: r }, { email: r }, { shopName: r }]; }
  const [data, total] = await Promise.all([User.find(f).sort('-createdAt').skip(skip).limit(limit), User.countDocuments(f)]);
  res.json({ success: true, data, meta: pageMeta(total, page, limit) });
});

exports.setStatus = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const u = await User.findById(req.params.id);
  if (!u) throw ApiError.notFound('User not found');
  if (u._id.equals(req.user._id)) throw ApiError.badRequest('You cannot deactivate your own account');
  u.isActive = req.body.isActive;
  await u.save();
  res.json({ success: true, data: u });
});

exports.approveSeller = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const u = await User.findOne({ _id: req.params.id, role: 'seller' });
  if (!u) throw ApiError.notFound('Seller not found');
  u.isApproved = req.body.approved;
  await u.save();
  await notify(u._id, { type: 'account', title: u.isApproved ? 'Seller account approved' : 'Seller approval revoked', message: u.isApproved ? 'You can now list products.' : 'Contact support for details.' });
  res.json({ success: true, data: u });
});
