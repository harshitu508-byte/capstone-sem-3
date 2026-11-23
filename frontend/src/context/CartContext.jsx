import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const isCustomer = user?.role === 'customer';
  const reload = useCallback(async () => {
    if (!isCustomer) { setCart(null); setWishlist([]); return; }
    const [c, w] = await Promise.all([api.get('/cart'), api.get('/wishlist')]);
    setCart(c.data); setWishlist(w.data.map((p) => p._id));
  }, [isCustomer]);
  useEffect(() => { reload().catch(() => {}); }, [reload]);

  const act = async (fn) => { const r = await fn(); if (r?.data?.items) setCart(r.data); return r; };
  const value = {
    cart, itemCount: cart?.itemCount || 0, wishlist, reload,
    add: (productId, quantity = 1) => act(() => api.post('/cart/items', { productId, quantity })),
    update: (productId, quantity) => act(() => api.put(`/cart/items/${productId}`, { quantity })),
    remove: (productId) => act(() => api.del(`/cart/items/${productId}`)),
    applyCoupon: (code) => act(() => api.post('/cart/coupon', { code })),
    removeCoupon: () => act(() => api.del('/cart/coupon')),
    toggleWishlist: async (productId) => {
      const r = wishlist.includes(productId) ? await api.del(`/wishlist/${productId}`) : await api.post(`/wishlist/${productId}`);
      setWishlist(r.data.map((p) => p._id));
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
