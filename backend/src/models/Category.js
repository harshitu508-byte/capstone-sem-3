const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, maxlength: 300 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
schema.pre('validate', function (next) {
  if (this.isModified('name')) this.slug = this.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  next();
});
module.exports = mongoose.model('Category', schema);
