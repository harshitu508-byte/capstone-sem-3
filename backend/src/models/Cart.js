const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    _id: false,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  }],
  couponCode: { type: String, uppercase: true, trim: true },
}, { timestamps: true });
module.exports = mongoose.model('Cart', schema);
