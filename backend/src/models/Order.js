const mongoose = require('mongoose');
const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const schema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Price/name snapshots: later product edits never change past orders.
  items: [{
    _id: false,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    name: String, image: String,
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
  subtotal: Number, discount: { type: Number, default: 0 }, shipping: Number, tax: Number, total: Number,
  couponCode: String,
  shippingAddress: { fullName: String, phone: String, street: String, city: String, state: String, postalCode: String, country: String },
  status: { type: String, enum: STATUSES, default: 'pending', index: true },
  statusHistory: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],
  payment: {
    method: { type: String, enum: ['simulated_card', 'simulated_upi', 'cod'], default: 'simulated_card' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    simulated: { type: Boolean, default: true }, // always true: no real money moves
    transactionId: String, paidAt: Date,
  },
  stockRestored: { type: Boolean, default: false },
}, { timestamps: true });
schema.index({ 'items.seller': 1, createdAt: -1 });
schema.index({ createdAt: -1 });
schema.statics.STATUSES = STATUSES;
module.exports = mongoose.model('Order', schema);
