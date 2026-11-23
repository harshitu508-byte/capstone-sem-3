const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { assertId, paginate, pageMeta } = require('../utils/helpers');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { user: req.user._id };
  if (req.query.unread === 'true') f.read = false;
  const [data, total, unread] = await Promise.all([Notification.find(f).sort('-createdAt').skip(skip).limit(limit), Notification.countDocuments(f), Notification.countDocuments({ user: req.user._id, read: false })]);
  res.json({ success: true, data, meta: { ...pageMeta(total, page, limit), unread } });
});
exports.markRead = asyncHandler(async (req, res) => {
  assertId(req.params.id);
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, data: n });
});
exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'All notifications marked as read' });
});
