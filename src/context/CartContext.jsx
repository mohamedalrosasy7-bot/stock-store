import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAdmin } from './AdminContext';
import { effectivePrice } from '../data/products';
import { STORE } from '../config';

const CartContext = createContext(null);
const MAX_QTY = 10;

export function CartProvider({ children }) {
  // Only ids/options/qty are persisted; prices are always read from the catalog.
  const [items, setItems] = useLocalStorage('mv-cart', []);
  // Live catalog from D1 (admin-created products included). AdminProvider wraps
  // CartProvider, so this is always available.
  const { products } = useAdmin();

  const addItem = useCallback(
    (product, { size, color, qty = 1 }) => {
      if (
        product.soldOut === true ||
        (product.soldOutColors || []).includes(color) ||
        (product.soldOutSizes || []).includes(size)
      ) return false;
      const key = `${product.id}|${size}|${color}`;
      setItems((prev) => {
        const found = prev.find((i) => i.key === key);
        if (found) {
          return prev.map((i) => (i.key === key ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) } : i));
        }
        return [...prev, { key, id: product.id, size, color, qty: Math.min(MAX_QTY, qty) }];
      });
      return true;
    },
    [setItems]
  );

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), [setItems]);

  const setQty = useCallback(
    (key, qty) =>
      setItems((prev) =>
        prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : i))
      ),
    [setItems]
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  const value = useMemo(() => {
    const lines = items
      .map((i) => ({ ...i, product: products.find((p) => p.id === i.id) }))
      .filter((l) => l.product)
      .filter((l) =>
        l.product.soldOut !== true &&
        !(l.product.soldOutColors || []).includes(l.color) &&
        !(l.product.soldOutSizes || []).includes(l.size)
      )
      .map((l) => ({ ...l, unit: effectivePrice(l.product), total: effectivePrice(l.product) * l.qty }));
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    const shipping = subtotal === 0 || subtotal >= STORE.freeShippingThreshold ? 0 : STORE.shippingFee;
    return { lines, count, subtotal, shipping, total: subtotal + shipping, addItem, removeItem, setQty, clear, MAX_QTY };
  }, [items, products, addItem, removeItem, setQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
