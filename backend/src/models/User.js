const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer', index: true },
  phone: { type: String, trim: true },
  address: { street: String, city: String, state: String, postalCode: String, country: { type: String, default: 'India' } },
  shopName: { type: String, trim: true },
  isApproved: { type: Boolean, default: true },   // sellers start false
  isActive: { type: Boolean, default: true },
  refreshTokens: { type: [String], select: false, default: [] }, // SHA-256 hashes
}, { timestamps: true });

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
schema.methods.comparePassword = function (plain) { return bcrypt.compare(plain, this.password); };
schema.methods.toJSON = function () { const o = this.toObject(); delete o.password; delete o.refreshTokens; delete o.__v; return o; };
module.exports = mongoose.model('User', schema);
