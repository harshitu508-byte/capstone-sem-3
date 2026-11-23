const { z } = require('zod');
const oid = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const money = z.coerce.number().positive();
const int0 = z.coerce.number().int().min(0);
const trimmed = (min, max) => z.string().trim().min(min).max(max);

exports.register = z.object({ name: trimmed(2, 80), email: z.string().trim().email(), password: z.string().min(8, 'Password must be at least 8 characters').max(72), role: z.enum(['customer', 'seller']).default('customer'), phone: z.string().trim().max(20).optional(), shopName: trimmed(2, 80).optional() })
  .refine((d) => d.role !== 'seller' || d.shopName, { message: 'shopName is required for sellers', path: ['shopName'] });
exports.login = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
exports.refresh = z.object({ refreshToken: z.string().min(10) });
exports.updateMe = z.object({ name: trimmed(2, 80).optional(), phone: z.string().trim().max(20).optional(), shopName: trimmed(2, 80).optional(),
  address: z.object({ street: z.string().max(200).optional(), city: z.string().max(80).optional(), state: z.string().max(80).optional(), postalCode: z.string().max(12).optional(), country: z.string().max(60).optional() }).optional() });
exports.password = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(72) });
exports.status = z.object({ isActive: z.boolean() });
exports.approve = z.object({ approved: z.boolean() });
exports.category = z.object({ name: trimmed(2, 60), description: z.string().max(300).optional(), isActive: z.boolean().optional() });
exports.categoryUpdate = exports.category.partial();
exports.productCreate = z.object({ name: trimmed(2, 150), description: trimmed(5, 3000), price: money, category: oid, stock: int0.default(0), lowStockThreshold: int0.optional(), sku: z.string().trim().max(40).optional(), images: z.array(z.string().url()).max(6).optional(), seller: oid.optional() });
exports.productUpdate = z.object({ name: trimmed(2, 150), description: trimmed(5, 3000), price: money, category: oid, lowStockThreshold: int0, sku: z.string().trim().max(40), images: z.array(z.string().url()).max(6), isActive: z.boolean() }).partial().strip();
exports.cartAdd = z.object({ productId: oid, quantity: z.coerce.number().int().min(1).max(99).default(1) });
exports.cartUpdate = z.object({ quantity: z.coerce.number().int().min(1).max(99) });
exports.coupon = z.object({ code: z.string().trim().min(1) });
exports.checkout = z.object({
  paymentMethod: z.enum(['simulated_card', 'simulated_upi', 'cod']).default('simulated_card'),
  shippingAddress: z.object({ fullName: trimmed(2, 80), phone: trimmed(7, 20), street: trimmed(3, 200), city: trimmed(2, 80), state: trimmed(2, 80), postalCode: trimmed(3, 12), country: z.string().trim().max(60).default('India') }),
});
exports.orderStatus = z.object({ status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']) });
exports.inventory = z.object({ mode: z.enum(['set', 'add', 'remove']).optional(), quantity: z.coerce.number().int().min(0).optional(), lowStockThreshold: int0.optional() })
  .refine((d) => !d.mode || d.quantity !== undefined, { message: 'quantity is required with mode', path: ['quantity'] });
exports.couponCreate = z.object({ code: z.string().trim().min(3).max(20), type: z.enum(['percent', 'fixed']), value: money, minOrderValue: z.coerce.number().min(0).optional(), maxDiscount: z.coerce.number().positive().optional(),
  startsAt: z.coerce.date().optional(), expiresAt: z.coerce.date(), usageLimit: z.coerce.number().int().min(1).optional(), perUserLimit: z.coerce.number().int().min(1).optional(), isActive: z.boolean().optional() });
exports.couponUpdate = exports.couponCreate.partial();
exports.couponValidate = z.object({ code: z.string().trim().min(1), subtotal: z.coerce.number().min(0) });
exports.payment = z.object({ orderId: oid, outcome: z.enum(['success', 'failure']).default('success') });
exports.review = z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(1000).optional() });
