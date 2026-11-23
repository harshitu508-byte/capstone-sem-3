const mongoose = require('mongoose');
const ApiError = require('./ApiError');
exports.round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
exports.assertId = (id, label = 'id') => {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest(`Invalid ${label}`);
  return id;
};
exports.paginate = (query) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 12, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};
exports.pageMeta = (total, page, limit) => ({ total, page, limit, pages: Math.ceil(total / limit) || 1 });
exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
