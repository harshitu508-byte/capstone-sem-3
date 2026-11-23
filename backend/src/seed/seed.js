// Usage: npm run seed   (WARNING: wipes all collections in the configured database)
const dns = require('node:dns'); 

dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Review = require('../models/Review');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');

const IMG = (seed) => `https://picsum.photos/seed/${seed}/600/600`;

async function seed() {
  await mongoose.connect(env.mongoUri);
  await Promise.all([User, Category, Product, Coupon, Order, Cart, Review, Wishlist, Notification].map((m) => m.deleteMany({})));
  await Promise.all([User, Category, Product, Coupon, Order, Review].map((m) => m.syncIndexes()));

  const mk = (d) => User.create(d); // create() so the bcrypt hook runs
  const admin = await mk({ name: 'Admin', email: 'admin@shop.com', password: 'Admin@123', role: 'admin' });
  const s1 = await mk({ name: 'Riya Sharma', email: 'seller1@shop.com', password: 'Seller@123', role: 'seller', shopName: 'TechNest', isApproved: true });
  const s2 = await mk({ name: 'Arjun Mehta', email: 'seller2@shop.com', password: 'Seller@123', role: 'seller', shopName: 'HomeAndHearth', isApproved: true });
  await mk({ name: 'Pending Seller', email: 'pending@shop.com', password: 'Seller@123', role: 'seller', shopName: 'NewShop', isApproved: false });
  const cust = await mk({ name: 'Demo Customer', email: 'customer@shop.com', password: 'Customer@123', role: 'customer', phone: '9876543210', address: { street: '12 MG Road', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' } });

  const cats = {};
  for (const [n, d] of [['Electronics', 'Gadgets and devices'], ['Home & Kitchen', 'Everything for your home'], ['Books', 'Fiction and non-fiction'], ['Fashion', 'Clothing and accessories']]) cats[n] = await Category.create({ name: n, description: d });

  const P = [
    [s1, 'Wireless Noise-Cancelling Headphones', 'Over-ear Bluetooth headphones with 30h battery and active noise cancellation.', 4999, 'Electronics', 40, 'hp'],
    [s1, 'Mechanical Keyboard RGB', 'Hot-swappable mechanical keyboard with tactile switches.', 3499, 'Electronics', 25, 'kb'],
    [s1, 'USB-C Fast Charger 65W', 'GaN charger for laptops and phones.', 1299, 'Electronics', 3, 'ch'],
    [s1, '27-inch 4K Monitor', 'IPS panel, 60Hz, HDR400, USB-C input.', 21999, 'Electronics', 8, 'mo'],
    [s1, 'Smart Fitness Band', 'Heart-rate, SpO2 and sleep tracking, 14-day battery.', 2199, 'Electronics', 60, 'fb'],
    [s2, 'Stainless Steel Cookware Set', '7-piece induction-friendly cookware set.', 5499, 'Home & Kitchen', 15, 'ck'],
    [s2, 'Ceramic Dinner Set (18 pcs)', 'Microwave-safe ceramic dinnerware for six.', 2999, 'Home & Kitchen', 20, 'dn'],
    [s2, 'Air Fryer 4.5L', 'Digital air fryer with 8 presets.', 6499, 'Home & Kitchen', 4, 'af'],
    [s2, 'Memory Foam Pillow (Pair)', 'Cooling gel memory foam pillows.', 1799, 'Home & Kitchen', 50, 'pl'],
    [s2, 'The Pragmatic Programmer', '20th anniversary edition. Classic software engineering guide.', 899, 'Books', 70, 'bk1'],
    [s2, 'Atomic Habits', 'An easy and proven way to build good habits.', 499, 'Books', 100, 'bk2'],
    [s1, 'Classic Cotton T-Shirt', '100% cotton regular-fit tee.', 599, 'Fashion', 120, 'ts'],
    [s1, 'Running Shoes', 'Lightweight breathable running shoes.', 2799, 'Fashion', 35, 'sh'],
  ];
  const prods = [];
  for (const [seller, name, description, price, cat, stock, im] of P) prods.push(await Product.create({ seller: seller._id, name, description, price, category: cats[cat]._id, stock, images: [IMG(im)], sku: im.toUpperCase() + '-001' }));

  const now = Date.now(), day = 86400000;
  await Coupon.create([
    { code: 'WELCOME10', type: 'percent', value: 10, maxDiscount: 500, expiresAt: new Date(now + 90 * day), perUserLimit: 1 },
    { code: 'FLAT200', type: 'fixed', value: 200, minOrderValue: 1500, expiresAt: new Date(now + 90 * day), usageLimit: 100, perUserLimit: 3 },
    { code: 'EXPIRED5', type: 'percent', value: 5, startsAt: new Date(now - 60 * day), expiresAt: new Date(now - 1 * day) },
  ]);

  // Historical delivered orders (spread over 14 days) so charts and reviews have real data.
  const addr = { fullName: cust.name, phone: cust.phone, street: '12 MG Road', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' };
  const history = [[0, 1, 2], [4, 2, 1], [9, 3, 1], [10, 1, 3], [11, 6, 1], [5, 0, 1], [12, 8, 2]];
  let n = 1;
  for (const [i, pi, qty] of history) {
    const p = prods[pi];
    const subtotal = p.price * qty, shipping = subtotal >= env.freeShippingAbove ? 0 : env.shippingFlat, tax = Math.round(subtotal * env.taxRate * 100) / 100;
    const created = new Date(now - (13 - i) * day);
    await Order.create({ orderNumber: `ORD-SEED${n++}`, customer: cust._id, items: [{ product: p._id, seller: p.seller, category: p.category, name: p.name, image: p.images[0], price: p.price, quantity: qty }],
      subtotal, discount: 0, shipping, tax, total: subtotal + shipping + tax, shippingAddress: addr, status: 'delivered',
      statusHistory: [{ status: 'pending' }, { status: 'confirmed' }, { status: 'shipped' }, { status: 'delivered' }],
      payment: { method: 'simulated_card', status: 'paid', simulated: true, transactionId: `SIM-SEED-${n}`, paidAt: created }, createdAt: created, updatedAt: created });
    await Product.updateOne({ _id: p._id }, { $inc: { soldCount: qty } });
  }
  await Review.create([{ product: prods[0]._id, user: cust._id, rating: 5, comment: 'Superb sound and comfort.' }, { product: prods[1]._id, user: cust._id, rating: 4, comment: 'Great typing feel.' }]);
  for (const p of [prods[0], prods[1]]) { const r = await Review.findOne({ product: p._id }); await Product.updateOne({ _id: p._id }, { ratingAvg: r.rating, ratingCount: 1 }); }

  console.log('Seed complete.\n  admin@shop.com / Admin@123\n  seller1@shop.com / Seller@123 (TechNest)\n  seller2@shop.com / Seller@123 (HomeAndHearth)\n  pending@shop.com / Seller@123 (awaiting approval)\n  customer@shop.com / Customer@123\n  Coupons: WELCOME10, FLAT200, EXPIRED5');
  await mongoose.disconnect();
}
seed().catch((e) => { console.error(e); process.exit(1); });
