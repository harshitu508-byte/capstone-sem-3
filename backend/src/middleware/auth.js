const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccess } = require('../utils/tokens');
const User = require('../models/User');

exports.protect = asyncHandler(async (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw ApiError.unauthorized('Missing access token');
  let payload;
  try { payload = verifyAccess(h.slice(7)); } catch { throw ApiError.unauthorized('Invalid or expired access token'); }
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is deactivated');
  req.user = user;
  next();
});

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient role permissions'));
  next();
};

// Sellers must be approved by an admin before they can sell.
exports.approvedSeller = (req, res, next) => {
  if (req.user.role === 'seller' && !req.user.isApproved) return next(ApiError.forbidden('Seller account pending admin approval'));
  next();
};
