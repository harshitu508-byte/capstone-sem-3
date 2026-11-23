const env = require('../config/env');
const { round2 } = require('../utils/helpers');
// All money maths happens here on the server. Clients never send prices.
exports.computeTotals = (lines, discount = 0) => {
  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  const disc = Math.min(round2(discount), subtotal);
  const afterDiscount = round2(subtotal - disc);
  const shipping = subtotal === 0 || afterDiscount >= env.freeShippingAbove ? 0 : env.shippingFlat;
  const tax = round2(afterDiscount * env.taxRate);
  return { subtotal, discount: disc, shipping, tax, total: round2(afterDiscount + shipping + tax) };
};
