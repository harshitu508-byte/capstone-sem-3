// Central EventEmitter for internal domain events.
const { EventEmitter } = require('events');
const bus = new EventEmitter();
bus.EVENTS = {
  ORDER_PLACED: 'order.placed',
  ORDER_STATUS: 'order.statusChanged',
  ORDER_CANCELLED: 'order.cancelled',
  INVENTORY_CHANGED: 'inventory.changed',
  LOW_STOCK: 'inventory.lowStock',
};
module.exports = bus;
