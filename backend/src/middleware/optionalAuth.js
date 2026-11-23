const { verifyAccess } = require('../utils/tokens');
const User = require('../models/User');
// Attaches req.user when a valid token is present; never rejects.
exports.optionalAuth = async (req, res, next) => {
  try {
    const h = req.headers.authorization || '';
    if (h.startsWith('Bearer ')) req.user = await User.findById(verifyAccess(h.slice(7)).sub);
  } catch { /* ignore */ }
  next();
};
