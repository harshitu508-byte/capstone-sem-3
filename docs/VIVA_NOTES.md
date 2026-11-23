# Viva cheat-sheet

**Q: How do you prevent overselling?** Stock is decremented with one atomic `findOneAndUpdate` whose filter requires `stock >= qty`. If two buyers race for the last unit, MongoDB serialises the writes and the second matches nothing → 409. Wrapped in a transaction so partial multi-item orders roll back.

**Q: Why recheck price at checkout?** Clients never send prices. The reserve filter includes the price we read, so a seller price change mid-checkout fails safely. Orders store price snapshots.

**Q: Cancellation?** Status + `stockRestored:false` in the filter makes restoration idempotent; coupon usage and simulated refund handled in the same transaction.

**Q: Auth design?** Short-lived access JWT (15m) + rotating refresh token (stored hashed; reuse rejected). bcrypt cost 12. RBAC middleware + ownership checks in controllers.

**Q: Where is EventEmitter used?** Services emit `order.placed`, `inventory.changed`, etc.; `listeners.js` turns them into DB notifications and Socket.IO pushes — services stay decoupled from notifications.

**Q: Why transactions optional?** They require a replica set; fallback uses the same atomic updates plus compensating undo actions.

**Q: Limitations?** Single status per multi-seller order; payments simulated; no image upload; refresh token in localStorage.
