const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccess, signRefresh, verifyRefresh, hashToken } = require('../utils/tokens');

const issue = async (user) => {
  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: { $each: [hashToken(refreshToken)], $slice: -5 } } });
  return { accessToken, refreshToken, user };
};

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, shopName } = req.body;
  if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already registered');
  const isSeller = role === 'seller';
  const user = await User.create({ name, email, password, phone, role: isSeller ? 'seller' : 'customer', shopName: isSeller ? shopName : undefined, isApproved: !isSeller });
  res.status(201).json({ success: true, message: isSeller ? 'Registered. Seller account awaits admin approval.' : 'Registered successfully', data: await issue(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');
  res.json({ success: true, data: await issue(user) });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try { payload = verifyRefresh(refreshToken); } catch { throw ApiError.unauthorized('Invalid or expired refresh token'); }
  const user = await User.findById(payload.sub).select('+refreshTokens');
  const h = hashToken(refreshToken);
  if (!user || !user.refreshTokens.includes(h)) throw ApiError.unauthorized('Refresh token revoked');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');
  await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: h } }); // rotation
  res.json({ success: true, data: await issue(user) });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.body.refreshToken) await User.updateOne({ _id: req.user._id }, { $pull: { refreshTokens: hashToken(req.body.refreshToken) } });
  res.json({ success: true, message: 'Logged out' });
});

exports.me = asyncHandler(async (req, res) => res.json({ success: true, data: req.user }));

exports.updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'shopName'];
  for (const k of allowed) if (req.body[k] !== undefined) req.user[k] = req.body[k];
  await req.user.save();
  res.json({ success: true, data: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = req.body.newPassword;
  user.refreshTokens = []; // sign out other sessions
  await user.save();
  res.json({ success: true, message: 'Password updated. Please log in again on other devices.' });
});
