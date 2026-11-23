# Testing documentation

## What exists
| Suite | Location | Count | How to run |
|---|---|---|---|
| Backend integration tests (node:test, real MongoDB) | `backend/tests/api.test.js` | 17 tests | `cd backend && npm test` |
| Same suite, non-transaction fallback | – | 17 tests | `USE_TRANSACTIONS=false npm test` |
| Postman/Newman collection | `postman/` | 87 requests, 110 assertions | seed, start API, `npx newman run postman/ecommerce.postman_collection.json` |
| Frontend render smoke test (jsdom) | `frontend/smoke/` | 28 route/role checks | `cd frontend && npm run smoke` (API + seed running) |

## Results recorded while building (Linux sandbox, MongoDB 8 single-node replica set)
- Backend: **17/17 pass** with transactions on and with `USE_TRANSACTIONS=false`.
- Newman: **87/87 requests, 110/110 assertions pass**.
- Socket.IO smoke script: seller received `new_order`, customer received `order:status confirmed`; unauthenticated socket rejected.
- Frontend: `vite build` succeeds; jsdom smoke renders all 28 role/route checks with expected content (incl. protected-route redirects).

## Coverage matrix (requirement → where tested)
| Requirement | Test |
|---|---|
| Successful requests | all suites |
| Invalid / missing input | auth, products, cart, coupons, checkout (zod → 400) |
| Unauthorized | `GET /auth/me` no/garbage token → 401 |
| Insufficient role | customer→/users, seller→/categories, etc. → 403 |
| Non-existent resources | product / order / bad id → 404 / 400 |
| Duplicate requests | duplicate email, coupon code, payment, review, cancel → 409/400 |
| Invalid order transitions | pending→delivered, cancel after ship → 400 |
| Insufficient inventory | add > stock, checkout after stock drop → 409 |
| **Concurrent purchases** | `CONCURRENCY: 10 customers race for 3 units` → exactly 3 succeed, stock = 0, no orphan orders |
| **Concurrent coupon use** | 5 customers, `usageLimit 1` → 1 order, losers fully rolled back |
| Concurrent cancel | 3 simultaneous cancels → one succeeds, stock restored once |
| Coupon validation / expiry | expired, unknown, min-order, cap, per-user limit |
| Cancellation & stock restore | stock back to original, no double restore, coupon usage restored |
| Seller ownership | seller2 cannot edit/delete/adjust seller1 product; cannot view seller1 order |
| Notifications via EventEmitter | low-stock + new-order notifications created |

## Known limitations (not tested / not claimed)
- **Postman cannot fire truly parallel requests.** The Postman folder checks the sequential sold-out behaviour; real parallel races are proven by the Node test.
- No browser-level (click-through) automated UI tests; the UI was verified by production build + jsdom render of every route per role, **not** by manual visual QA in a real browser. Charts could not be size-checked in jsdom. Please click through each role once before your viva.
- No load/performance testing; no automated test of refresh-token expiry timing.
- Tests assume a MongoDB replica set (or `USE_TRANSACTIONS=false`) and **drop the database named in `MONGO_URI`** — use a throwaway DB (e.g. `ecommerce_test`).
