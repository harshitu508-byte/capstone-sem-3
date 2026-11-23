// Subscribes to internal domain events -> creates notifications and pushes realtime updates.
const bus = require('../utils/events');
const { notify } = require('./notificationService');
const { emitToUser, emitToAdmins } = require('../sockets');
const logger = require('../utils/logger');

const safe = (fn) => async (...a) => { try { await fn(...a); } catch (e) { logger.error('listener error', e); } };
const sellerIds = (order) => [...new Set(order.items.map((i) => i.seller.toString()))];

module.exports = function registerListeners() {
  bus.on(bus.EVENTS.ORDER_PLACED, safe(async ({ order }) => {
    for (const sid of sellerIds(order)) {
      const mine = order.items.filter((i) => i.seller.toString() === sid);
      await notify(sid, { type: 'new_order', title: 'New order received', message: `${order.orderNumber}: ${mine.length} of your product(s)`, data: { orderId: order._id } });
    }
    emitToAdmins('order:new', { orderId: order._id, orderNumber: order.orderNumber, total: order.total });
  }));

  bus.on(bus.EVENTS.ORDER_STATUS, safe(async ({ order, from }) => {
    const payload = { orderId: order._id, orderNumber: order.orderNumber, status: order.status, from };
    emitToUser(order.customer, 'order:status', payload);
    for (const sid of sellerIds(order)) emitToUser(sid, 'order:status', payload);
    await notify(order.customer, { type: 'order_status', title: `Order ${order.status}`, message: `${order.orderNumber} is now ${order.status}`, data: { orderId: order._id } });
  }));

  bus.on(bus.EVENTS.ORDER_CANCELLED, safe(async ({ order, actor }) => {
    for (const sid of sellerIds(order)) {
      if (actor && sid === actor._id.toString()) continue;
      await notify(sid, { type: 'order_status', title: 'Order cancelled', message: `${order.orderNumber} was cancelled; stock restored`, data: { orderId: order._id } });
    }
  }));

  bus.on(bus.EVENTS.INVENTORY_CHANGED, safe(async ({ product }) => {
    if (!product) return;
    emitToUser(product.seller, 'inventory:changed', { productId: product._id, stock: product.stock });
    if (product.stock <= product.lowStockThreshold) bus.emit(bus.EVENTS.LOW_STOCK, { product });
  }));

  bus.on(bus.EVENTS.LOW_STOCK, safe(async ({ product }) => {
    const out = product.stock === 0;
    await notify(product.seller, { type: out ? 'out_of_stock' : 'low_stock', title: out ? 'Out of stock' : 'Low stock alert', message: `${product.name}: ${product.stock} left (threshold ${product.lowStockThreshold})`, data: { productId: product._id } });
    emitToAdmins('inventory:lowStock', { productId: product._id, name: product.name, stock: product.stock });
  }));
  logger.info('Event listeners registered');
};
