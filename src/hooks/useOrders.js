import { useContext } from 'react';
import { AdminContext } from '../context/AdminContext';
import { UserContext } from '../context/UserContext';

export const useOrders = () => {
  const { orders, addOrder } = useContext(AdminContext);
  const { user } = useContext(UserContext);

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
