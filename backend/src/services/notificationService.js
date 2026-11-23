const Notification = require('../models/Notification');
const { emitToUser } = require('../sockets');
exports.notify = async (userId, { type, title, message, data }) => {
  const n = await Notification.create({ user: userId, type, title, message, data });
  emitToUser(userId, 'notification', n);
  return n;
};
