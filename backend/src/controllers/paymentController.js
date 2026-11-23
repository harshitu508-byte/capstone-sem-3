const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/orderService');
const { assertId } = require('../utils/helpers');

const NOTICE = 'SIMULATED PAYMENT: no real money is charged or moved.';
exports.simulate = asyncHandler(async (req, res) => {
  assertId(req.body.orderId, 'orderId');
  const order = await Order.findById(req.body.orderId);
  if (!order || !order.customer.equals(req.user._id)) throw ApiError.notFound('Order not found');
  const updated = await svc.simulatePayment(order, req.body.outcome);
  const ok = updated.payment.status === 'paid';
  res.status(ok ? 200 : 402).json({ success: ok, notice: NOTICE, message: ok ? 'Simulated payment successful' : 'Simulated payment failed. You may retry.', data: updated });
});
exports.get = asyncHandler(async (req, res) => {
  assertId(req.params.orderId);
  const order = await Order.findById(req.params.orderId);
  if (!order || (req.user.role === 'customer' && !order.customer.equals(req.user._id))) throw ApiError.notFound('Order not found');
  res.json({ success: true, notice: NOTICE, data: order.payment });
});
