import { useContext, useState, useEffect } from 'react';
import { AdminContext } from '../context/AdminContext';
import { UserContext } from '../context/UserContext';
import { ordersAPI } from '../services/api';

export const useOrders = () => {
  const { orders: adminOrders, addOrder } = useContext(AdminContext);
  const { user } = useContext(UserContext);
  const [selfOrders, setSelfOrders] = useState([]);

  // Admin sessions load ALL orders into AdminContext (Phase 2). Customers use the
  // anon key, for which blanket SELECT on `orders` is blocked by RLS — so a
  // logged-in customer fetches only their OWN orders via the get_user_orders RPC.
  useEffect(() => {
    let active = true;
    const uid = user?.id;
    if (uid && !user?.isGuest && !String(uid).startsWith('guest-')) {
      ordersAPI.getUserOrdersSelf(uid)
        .then(o => { if (active) setSelfOrders(o); })
        .catch(err => console.error('❌ Failed to load your orders:', err));
    } else {
      setSelfOrders([]);
    }
    return () => { active = false; };
  }, [user?.id, user?.isGuest]);

  // Prefer the admin-loaded full list when present (admin views); otherwise fall
  // back to the customer's own fetched orders.
  const orders = adminOrders.length > 0 ? adminOrders : selfOrders;

  const getUserOrders = () => {
    return orders.filter(order => order.userId === user.id);
  };

  const getOrderById = (orderId) => {
    // Search by id (order_number) first, then fallback to dbId (UUID)
    return orders.find(order => order.id === orderId || order.dbId === orderId);
  };

  const getOrdersByStatus = (status) => {
    return orders.filter(order => order.status === status);
  };

  const getPendingOrders = () => {
    return getOrdersByStatus('pending');
  };

  return {
    orders,
    addOrder,
    getUserOrders,
    getOrderById,
    getOrdersByStatus,
    getPendingOrders
  };
};
