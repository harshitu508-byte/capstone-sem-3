const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['new_order', 'order_status', 'low_stock', 'out_of_stock', 'account', 'info'], required: true },
  title: { type: String, required: true },
  message: String,
  data: mongoose.Schema.Types.Mixed,
  read: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ user: 1, read: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', schema);
