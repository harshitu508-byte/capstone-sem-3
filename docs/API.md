# REST API Reference

Base URL: `http://localhost:5000/api` · JSON everywhere · Auth header: `Authorization: Bearer <accessToken>`

**Success:** `{ "success": true, "data": ..., "meta": {pagination}? , "message"?: "..." }`
**Error:** `{ "success": false, "message": "...", "errors"?: [{ "field": "...", "message": "..." }] }`

| Code | Meaning |
|---|---|
| 200/201 | OK / created |
| 400 | Validation failed, bad id, invalid state transition, coupon rejected |
| 401 | Missing/invalid/expired token, bad credentials |
| 402 | Simulated payment failed |
| 403 | Role not allowed, not owner, account deactivated, seller unapproved |
| 404 | Resource not found (also used to hide other users' payments) |
| 409 | Duplicate value, insufficient stock, concurrent change, already paid |

Pagination query: `?page=1&limit=12` (limit ≤ 100) → `meta: { total, page, limit, pages }`.
Auth legend: **Public**, **Any** (logged in), or role list.

## Auth
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| POST `/auth/register` | Public | `name, email, password(≥8), role? customer\|seller, phone?, shopName (required for seller)` | 201 `{accessToken, refreshToken, user}` | 400, 409 |
| POST `/auth/login` | Public | `email, password` | 200 `{accessToken, refreshToken, user}` | 400, 401, 403 |
| POST `/auth/refresh` | Public | `refreshToken` | 200 new pair (old token revoked) | 401 |
| POST `/auth/logout` | Any | `refreshToken?` | 200 | 401 |
| GET `/auth/me` | Any | – | 200 user | 401, 403 |
| PUT `/auth/me` | Any | `name?, phone?, shopName?, address?{street,city,state,postalCode,country}` | 200 user | 400 |
| PUT `/auth/password` | Any | `currentPassword, newPassword` | 200 | 400 |

```json
// POST /auth/login → 200
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "eyJ...",
  "user": { "_id": "6af...", "name": "Demo Customer", "email": "customer@shop.com", "role": "customer", "isActive": true } } }
// POST /auth/register invalid → 400
{ "success": false, "message": "Validation failed", "errors": [{ "field": "email", "message": "Invalid email" }] }
```

## Users (admin)
| Method & URL | Auth | Body / params | Success | Errors |
|---|---|---|---|---|
| GET `/users` | Admin | `role?, approved=false?, search?, page, limit` | 200 list + meta | 401, 403 |
| PATCH `/users/:id/status` | Admin | `{isActive: bool}` | 200 user | 400 (self), 404 |
| PATCH `/users/:id/approve` | Admin | `{approved: bool}` (sellers) | 200 user, notifies seller | 404 |

## Categories
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| GET `/categories` | Public (`?all=true` admin) | – | 200 list | – |
| POST `/categories` | Admin | `name, description?, isActive?` | 201 | 400, 409 |
| PUT `/categories/:id` | Admin | partial | 200 | 400, 404, 409 |
| DELETE `/categories/:id` | Admin | – | 200 | 404, **409 if it has products** |

## Products
| Method & URL | Auth | Body / query | Success | Errors |
|---|---|---|---|---|
| GET `/products` | Public | `search, category, seller, minPrice, maxPrice, inStock=true, sort=newest\|price_asc\|price_desc\|rating\|popular, page, limit` | 200 list + meta (active only) | 400 |
| GET `/products/manage` | Seller (own incl. inactive) / Admin (all) | same filters | 200 | 403 |
| GET `/products/:id` | Public | – | 200 | 400, 404 |
| POST `/products` | Seller (approved) / Admin | `name, description, price>0, category, stock≥0 int, lowStockThreshold?, sku?, images?[url]` | 201 | 400, 403 |
| PUT `/products/:id` | Owner seller / Admin | partial (**stock excluded** – use inventory API) | 200 | 400, **403 not owner**, 404 |
| DELETE `/products/:id` | Owner seller / Admin | – | 200 (soft delete: `isActive=false`) | 403, 404 |

```json
// GET /products?search=lamp&limit=1 → 200
{ "success": true, "data": [ { "_id": "...", "name": "Beta Lamp", "price": 100, "stock": 10, "category": {"name":"Gadgets"}, "seller": {"shopName":"TechNest"}, "ratingAvg": 0 } ],
  "meta": { "total": 2, "page": 1, "limit": 1, "pages": 2 } }
```

## Reviews
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| GET `/products/:productId/reviews` | Public | page, limit | 200 | 400 |
| POST `/products/:productId/reviews` | Customer | `rating 1-5, comment?` | 201 | 400, **403 not a verified buyer**, **409 duplicate** |
| DELETE `/reviews/:id` | Author / Admin | – | 200 | 403, 404 |

## Cart (Customer only; always scoped to the caller)
| Method & URL | Body | Success | Errors |
|---|---|---|---|
| GET `/cart` | – | 200 `{items[{product,quantity,price,lineTotal,available,outOfStock}], couponCode, couponError, totals{subtotal,discount,shipping,tax,total}, itemCount}` | 401, 403 |
| POST `/cart/items` | `productId, quantity` | 201 cart | 400, 404, **409 exceeds stock** |
| PUT `/cart/items/:productId` | `quantity` | 200 cart | 404, 409 |
| DELETE `/cart/items/:productId` | – | 200 cart | 400 |
| DELETE `/cart` | – | 200 empty cart | – |
| POST `/cart/coupon` | `code` | 200 cart with discount | 400 (invalid / expired / limit / min order) |
| DELETE `/cart/coupon` | – | 200 | – |

Totals: `shipping = 0 if (subtotal − discount) ≥ FREE_SHIPPING_ABOVE else SHIPPING_FLAT`; `tax = TAX_RATE × (subtotal − discount)`.

## Orders
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| POST `/orders` | Customer | `shippingAddress{fullName,phone,street,city,state,postalCode,country?}, paymentMethod simulated_card\|simulated_upi\|cod` | 201 order (status `pending`) | 400 (empty cart), **409 stock/price changed** |
| GET `/orders` | Any (customer: own, seller: containing own products – items scoped, admin: all) | `status?, search?, page, limit` | 200 + meta | – |
| GET `/orders/:id` | Customer owner / involved seller / Admin | – | 200 | 400, **403**, 404 |
| PATCH `/orders/:id/status` | Seller (involved) / Admin | `{status}` | 200 | 400 (invalid transition), 403, 409 (unpaid / concurrent) |
| POST `/orders/:id/cancel` | Customer owner / Admin | – | 200 (stock restored, simulated refund) | 400, 403, 409 |

Valid transitions: `pending → confirmed | cancelled`, `confirmed → shipped | cancelled`, `shipped → delivered`; `delivered` and `cancelled` are terminal.

```json
// POST /orders → 201
{ "success": true, "message": "Order placed. Payment is simulated; no real transaction occurs.",
  "data": { "orderNumber": "ORD-LX3K9A1BC", "status": "pending", "subtotal": 2000, "discount": 0, "shipping": 0, "tax": 100, "total": 2100,
    "items": [{ "product": "...", "name": "Snap", "price": 1000, "quantity": 2 }],
    "payment": { "method": "simulated_card", "status": "pending", "simulated": true } } }
// stock race lost → 409
{ "success": false, "message": "\"Hot Item\" just sold out or its price changed. Please review your cart." }
```

## Payments (simulated)
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| POST `/payments/simulate` | Customer (own order) | `orderId, outcome success\|failure (default success)` | 200 paid + order → `confirmed`, `notice: "SIMULATED PAYMENT…"` | 402 (failure outcome), 404, 409 (already paid / not pending), 400 (COD) |
| GET `/payments/:orderId` | Customer owner / seller / admin | – | 200 payment object | 404 |

## Inventory
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| GET `/inventory/low-stock` | Seller (own) / Admin | page, limit | 200 products where `stock ≤ lowStockThreshold` | 403 |
| PATCH `/inventory/:productId` | Owner seller / Admin | `mode add\|remove\|set, quantity≥0, lowStockThreshold?` | 200 product | 400, 403, **409 would go below 0** |

## Coupons
| Method & URL | Auth | Body | Success | Errors |
|---|---|---|---|---|
| POST `/coupons/validate` | Customer | `code, subtotal` | 200 `{code,type,value,discount}` | 400 reason |
| GET `/coupons` · POST `/coupons` · PUT `/coupons/:id` · DELETE `/coupons/:id` | Admin | `code,type percent\|fixed,value,minOrderValue?,maxDiscount?,startsAt?,expiresAt,usageLimit?,perUserLimit?,isActive?` | 200/201 | 400 (e.g. percent > 100), 404, 409 duplicate code |

## Wishlist (Customer)
`GET /wishlist` · `POST /wishlist/:productId` (idempotent) · `DELETE /wishlist/:productId` → 200 array of products. Errors: 400, 403, 404.

## Notifications (Any)
`GET /notifications?unread=true&page&limit` → data + `meta.unread` · `PATCH /notifications/:id/read` (404 if not yours) · `PATCH /notifications/read-all`.

## Reports (Seller = own data, Admin = platform)
| URL | Query | Returns |
|---|---|---|
| GET `/reports/summary` | – | `revenue, unitsSold, paidOrders, pendingOrders, totalOrders, products, lowStock` (+ `users{}`, `pendingSellers` for admin) |
| GET `/reports/sales-by-date` | `days` (≤365) | `[{date, revenue, units, orders}]` zero-filled |
| GET `/reports/revenue-by-category` | `days` | `[{category, revenue, units}]` |
| GET `/reports/best-sellers` | `days, limit` | `[{productId, name, units, revenue}]` |
| GET `/reports/order-status` | – | `[{status, count}]` |
| GET `/reports/inventory` | – | `{products, units, valuation, lowStock, outOfStock, byCategory[]}` |

## Socket.IO
Connect with `io(url, { auth: { token: <accessToken> } })` (invalid token → `connect_error: Unauthorized`). Server emits: `notification` (persisted notification doc), `order:status {orderId, orderNumber, status, from}`, `inventory:changed {productId, stock}`; to admins: `order:new`, `inventory:lowStock`.
