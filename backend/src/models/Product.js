const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, maxlength: 3000 },
  price: { type: Number, required: true, min: [0.01, 'Price must be positive'] },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  stock: { type: Number, required: true, min: [0, 'Stock cannot be negative'], default: 0, validate: { validator: Number.isInteger, message: 'Stock must be an integer' } },
  lowStockThreshold: { type: Number, default: 5, min: 0 },
  sku: { type: String, trim: true },
  images: { type: [String], default: [] },
  isActive: { type: Boolean, default: true, index: true },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  soldCount: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ name: 'text', description: 'text' });
schema.index({ seller: 1, sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
schema.index({ price: 1 });
module.exports = mongoose.model('Product', schema);
