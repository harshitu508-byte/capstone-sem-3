# Database Schema (MongoDB / Mongoose)

| Collection | Key fields | References | Indexes / constraints |
|---|---|---|---|
| **users** | name, email, password(select:false, bcrypt), role, phone, address{}, shopName, isApproved, isActive, refreshTokens[] (SHA-256 hashes, select:false) | – | unique `email`; `role` |
| **categories** | name, slug, description, isActive | – | unique `name`, unique `slug` |
| **products** | seller, name, description, price(>0), category, stock(int ≥ 0), lowStockThreshold, sku, images[], isActive, ratingAvg, ratingCount, soldCount | `seller→users`, `category→categories` | text(name,description); `seller`; `category`; `price`; unique `(seller, sku)` when sku set |
| **carts** | user, items[{product, quantity≥1}], couponCode | `user→users`, `items.product→products` | unique `user` (one cart per user) |
| **orders** | orderNumber, customer, items[{product, seller, category, **name, image, price** (snapshots), quantity}], subtotal, discount, shipping, tax, total, couponCode, shippingAddress{}, status, statusHistory[], payment{method,status,simulated,transactionId,paidAt}, stockRestored | `customer→users`, `items.product/seller/category` | unique `orderNumber`; `customer`; `status`; `(items.seller, createdAt)`; `createdAt` |
| **coupons** | code, type, value, minOrderValue, maxDiscount, startsAt, expiresAt, usageLimit, perUserLimit, usedCount, isActive | – | unique `code`; percent ≤ 100 validator |
| **reviews** | product, user, rating 1-5, comment | `product→products`, `user→users` | unique `(product, user)` |
| **wishlists** | user, products[] | `user→users`, `products→products` | unique `user` |
| **notifications** | user, type, title, message, data, read | `user→users` | `(user, read, createdAt)` |

All collections use `timestamps: true`.

## Relationships
```
User 1──* Product (seller)        Category 1──* Product
User 1──1 Cart ──* Product         User 1──* Order (customer) ──* Product (snapshot lines, each with seller)
User 1──1 Wishlist ──* Product     User 1──* Review *──1 Product
User 1──* Notification             Coupon referenced from Order by code (+ cart.couponCode)
```

## Consistency rules enforced in code
- `stock` has `min: 0` **and** every decrement uses `findOneAndUpdate({stock: {$gte: qty}}, {$inc: {stock: -qty}})` → never negative, no overselling under concurrency.
- Checkout filter also includes `price: <price seen>` → a price change between read and reserve aborts the order.
- Orders keep immutable price/name snapshots; products are soft-deleted so history stays valid.
- Cancel is guarded by `{status: from, stockRestored: false}` → stock/coupon restored at most once even with concurrent cancels.
- Coupon usage: `findOneAndUpdate({usedCount: {$lt: usageLimit}}, {$inc: {usedCount: 1}})`.
