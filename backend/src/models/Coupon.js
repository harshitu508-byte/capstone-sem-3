const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: [/^[A-Z0-9_-]{3,20}$/, 'Code must be 3-20 chars: A-Z 0-9 _ -'] },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0.01 },
  minOrderValue: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  startsAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  usageLimit: { type: Number, min: 1 },
  perUserLimit: { type: Number, default: 1, min: 1 },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
schema.pre('validate', function (next) {
  if (this.type === 'percent' && this.value > 100) this.invalidate('value', 'Percent cannot exceed 100');
  next();
});
module.exports = mongoose.model('Coupon', schema);
