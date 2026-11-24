import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

// Orders live in D1 behind /api/orders. This context keeps the same public
// API (orders / addOrder / removeOrder / updateOrderStatus) the admin pages
// already use, so only the persistence layer changed.
const OrdersContext = createContext(null);

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/orders');
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch {
      // not logged in (401) or offline — keep whatever we have
    }
  }, []);

  // Load once on mount; admin pages re-fetch via refresh() when opened.
  useEffect(() => { refresh(); }, [refresh]);

  const addOrder = useCallback(async (order) => {
    const payload = {
      customer: {
        name: order.customer.fullName,
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city,
        note: order.customer.notes,
      },
      payment: order.payment,
      items: order.items.map((it) => ({ id: it.id, qty: it.qty, size: it.size, color: it.color })),
    };
    const data = await api('/api/orders', { method: 'POST', body: payload });
    setOrders((prev) => [data.order, ...prev]);
    return data.order;
  }, []);

  const removeOrder = useCallback(async (id) => {
    setOrders((list) => list.filter((o) => o.id !== id));
    try {
      await api(`/api/orders/${id}`, { method: 'DELETE' });
    } catch {
      refresh(); // restore on failure
    }
  }, [refresh]);

  const updateOrderStatus = useCallback(async (id, status) => {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await api(`/api/orders/${id}`, { method: 'PATCH', body: { status } });
    } catch {
      refresh();
    }
  }, [refresh]);

  const value = useMemo(
    () => ({ orders, addOrder, removeOrder, updateOrderStatus }),
    [orders, addOrder, removeOrder, updateOrderStatus]
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export const useOrders = () => useContext(OrdersContext);