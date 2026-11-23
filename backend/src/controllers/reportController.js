const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// "Revenue" = line items of confirmed / shipped / delivered orders (cancelled and unpaid-pending excluded).
const REVENUE_STATUSES = ['confirmed', 'shipped', 'delivered'];
const oid = (v) => new mongoose.Types.ObjectId(v);
const sellerMatch = (req) => (req.user.role === 'seller' ? { 'items.seller': req.user._id } : {});
const days = (req) => Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
const since = (n) => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - (n - 1)); return d; };

// Base pipeline: scoped, unwound line items of revenue orders (optionally date-limited).
const lines = (req, from) => [
  { $match: { status: { $in: REVENUE_STATUSES }, ...(from ? { createdAt: { $gte: from } } : {}) } },
  { $unwind: '$items' },
  ...(req.user.role === 'seller' ? [{ $match: { 'items.seller': req.user._id } }] : []),
  { $addFields: { lineRevenue: { $multiply: ['$items.price', '$items.quantity'] } } },
];

exports.summary = asyncHandler(async (req, res) => {
  const [agg] = await Order.aggregate([...lines(req), { $group: { _id: null, revenue: { $sum: '$lineRevenue' }, units: { $sum: '$items.quantity' }, orders: { $addToSet: '$_id' } } }]);
  const orderMatch = sellerMatch(req);
  const [pending, totalOrders] = await Promise.all([Order.countDocuments({ ...orderMatch, status: 'pending' }), Order.countDocuments(orderMatch)]);
  const pf = req.user.role === 'seller' ? { seller: req.user._id } : {};
  const [products, lowStock] = await Promise.all([Product.countDocuments({ ...pf, isActive: true }), Product.countDocuments({ ...pf, isActive: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } })]);
  const data = { revenue: Math.round((agg?.revenue || 0) * 100) / 100, unitsSold: agg?.units || 0, paidOrders: agg?.orders.length || 0, pendingOrders: pending, totalOrders, products, lowStock };
  if (req.user.role === 'admin') {
    const roles = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
    data.users = Object.fromEntries(roles.map((r) => [r._id, r.n]));
    data.pendingSellers = await User.countDocuments({ role: 'seller', isApproved: false });
  }
  res.json({ success: true, data });
});

exports.salesByDate = asyncHandler(async (req, res) => {
  const n = days(req);
  const rows = await Order.aggregate([...lines(req, since(n)),
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$lineRevenue' }, units: { $sum: '$items.quantity' }, orders: { $addToSet: '$_id' } } },
    { $project: { _id: 0, date: '$_id', revenue: { $round: ['$revenue', 2] }, units: 1, orders: { $size: '$orders' } } }, { $sort: { date: 1 } }]);
  // Fill missing days with zeros so charts show a continuous axis.
  const map = new Map(rows.map((r) => [r.date, r]));
  const out = [];
  for (let i = 0; i < n; i++) { const d = new Date(since(n)); d.setUTCDate(d.getUTCDate() + i); const k = d.toISOString().slice(0, 10); out.push(map.get(k) || { date: k, revenue: 0, units: 0, orders: 0 }); }
  res.json({ success: true, data: out });
});

exports.revenueByCategory = asyncHandler(async (req, res) => {
  const rows = await Order.aggregate([...lines(req, since(days(req))),
    { $group: { _id: '$items.category', revenue: { $sum: '$lineRevenue' }, units: { $sum: '$items.quantity' } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
    { $project: { _id: 0, category: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, 'Uncategorised'] }, revenue: { $round: ['$revenue', 2] }, units: 1 } }, { $sort: { revenue: -1 } }]);
  res.json({ success: true, data: rows });
});

exports.bestSellers = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const rows = await Order.aggregate([...lines(req, since(days(req))),
    { $group: { _id: '$items.product', name: { $first: '$items.name' }, units: { $sum: '$items.quantity' }, revenue: { $sum: '$lineRevenue' } } },
    { $sort: { units: -1, revenue: -1 } }, { $limit: limit },
    { $project: { _id: 0, productId: '$_id', name: 1, units: 1, revenue: { $round: ['$revenue', 2] } } }]);
  res.json({ success: true, data: rows });
});

exports.orderStatus = asyncHandler(async (req, res) => {
  const rows = await Order.aggregate([{ $match: sellerMatch(req) }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $project: { _id: 0, status: '$_id', count: 1 } }]);
  res.json({ success: true, data: rows });
});

exports.inventory = asyncHandler(async (req, res) => {
  const match = { isActive: true, ...(req.user.role === 'seller' ? { seller: req.user._id } : {}) };
  const [totals] = await Product.aggregate([{ $match: match }, { $group: { _id: null, products: { $sum: 1 }, units: { $sum: '$stock' }, valuation: { $sum: { $multiply: ['$price', '$stock'] } },
    low: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }, 1, 0] } }, out: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } } } }]);
  const byCategory = await Product.aggregate([{ $match: match }, { $group: { _id: '$category', products: { $sum: 1 }, units: { $sum: '$stock' }, valuation: { $sum: { $multiply: ['$price', '$stock'] } } } },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
    { $project: { _id: 0, category: { $arrayElemAt: ['$cat.name', 0] }, products: 1, units: 1, valuation: { $round: ['$valuation', 2] } } }, { $sort: { valuation: -1 } }]);
  res.json({ success: true, data: { products: totals?.products || 0, units: totals?.units || 0, valuation: Math.round((totals?.valuation || 0) * 100) / 100, lowStock: totals?.low || 0, outOfStock: totals?.out || 0, byCategory } });
});
