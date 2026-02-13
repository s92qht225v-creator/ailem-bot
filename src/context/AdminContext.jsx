import { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { essentialDataAPI, categoriesAPI, productsAPI, ordersAPI, reviewsAPI, usersAPI } from '../services/api';
import { decreaseVariantStock, updateVariantStock, getTotalVariantStock } from '../utils/variants';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/helpers';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 1: Essential data (products, categories, reviews) — single RPC call
  // lightweight=true (default) for customer browsing, false for admin panel
  const loadEssentialData = async ({ lightweight = true } = {}) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading essential data from Supabase (single RPC)...');

      const { products: productsData, categories: categoriesData, reviews: reviewsData } =
        await essentialDataAPI.getAll({ lightweight });

      console.log('✅ Essential data loaded:', {
        products: productsData?.length || 0,
        categories: categoriesData?.length || 0,
        reviews: reviewsData?.length || 0
      });

      setProducts(productsData || []);
      setReviews(reviewsData || []);

      // Apply saved category order from localStorage
      const savedOrder = loadFromLocalStorage('categoryOrder');
      if (savedOrder && Array.isArray(savedOrder)) {
        const orderedCategories = [];
        const categoryMap = new Map(categoriesData.map(cat => [cat.id, cat]));

        // Add categories in saved order
        savedOrder.forEach(id => {
          const cat = categoryMap.get(id);
          if (cat) {
            orderedCategories.push(cat);
            categoryMap.delete(id);
          }
        });

        // Add any new categories that weren't in saved order
        categoryMap.forEach(cat => orderedCategories.push(cat));

        setCategories(orderedCategories);
      } else {
        setCategories(categoriesData || []);
      }
    } catch (err) {
      console.error('❌ Failed to load essential data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      console.log('✅ Essential loading complete — UI unblocked');
    }
  };

  // Phase 2: Deferred data (orders, users) — loads silently in background
  const loadDeferredData = async () => {
    try {
      setAdminLoading(true);

      console.log('🔄 Loading deferred data (orders, users)...');

      const [ordersData, usersData] = await Promise.all([
        ordersAPI.getAll().catch(e => { console.error('Orders error:', e); return []; }),
        usersAPI.getAll().catch(e => { console.error('Users error:', e); return []; }),
      ]);

      console.log('✅ Deferred data loaded:', {
        orders: ordersData?.length || 0,
        users: usersData?.length || 0
      });

      setOrders(ordersData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('❌ Failed to load deferred data:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  // On mount: load essential first (unblocks UI), then deferred in background
  // Admin gets full data (needs description, images, a_plus_content for editing)
  useEffect(() => {
    let cancelled = false;
    const isAdmin = window.location.search.includes('admin=true');

    loadEssentialData({ lightweight: !isAdmin }).then(() => {
      if (!cancelled) loadDeferredData();
    });

    return () => { cancelled = true; };
  }, []);

  // Full refresh for admin panel refresh button (loads all columns for editing)
  const loadAllData = async () => {
    await loadEssentialData({ lightweight: false });
    await loadDeferredData();
  };

  // Product management
  const addProduct = async (product) => {
    try {
      const newProduct = await productsAPI.create(product);
      // Add new product at the beginning to match descending created_at order
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      console.error('Failed to add product:', err);
      throw err;
    }
  };

  const updateProduct = async (productId, updates) => {
    try {
      const updatedProduct = await productsAPI.update(productId, updates);
      setProducts(prev =>
        prev.map(product =>
          product.id === productId ? updatedProduct : product
        )
      );
      return updatedProduct;
    } catch (err) {
      console.error('Failed to update product:', err);
      throw err;
    }
  };

  const deleteProduct = async (productId) => {
    try {
      await productsAPI.delete(productId);
      setProducts(prev => prev.filter(product => product.id !== productId));
    } catch (err) {
      console.error('Failed to delete product:', err);
      throw err;
    }
  };

  // Order management
  const addOrder = async (order) => {
    try {
      const newOrder = await ordersAPI.create(order);
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (err) {
      console.error('Failed to add order:', err);
      throw err;
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const order = orders.find(o => o.id === orderId || o.dbId === orderId);
      const updatedOrder = await ordersAPI.updateStatus(orderId, status);
      
      setOrders(prev =>
        prev.map(order =>
          // Match by id (order_number) or dbId (UUID)
          (order.id === orderId || order.dbId === orderId) ? updatedOrder : order
        )
      );

      // Send notification to customer for shipped and delivered status
      if (order && (status === 'shipped' || status === 'delivered')) {
        try {
          const { notifyUserOrderStatus } = await import('../services/telegram');
          await notifyUserOrderStatus(updatedOrder, status);
          console.log(`✅ Customer notified about order ${status}`);
        } catch (notifError) {
          console.error('❌ Failed to send customer notification:', notifError);
          // Don't fail the status update if notification fails
        }
      }

      return updatedOrder;
    } catch (err) {
      console.error('Failed to update order status:', err);
      throw err;
    }
  };

  const approveOrder = async (orderId, onReferralReward) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await updateOrderStatus(orderId, 'approved');

      // Deduct stock for each item in the order
      if (order && order.items) {
        for (const item of order.items) {
          const product = products.find(p => p.id === item.id);
          if (!product) continue;

          // Check if product uses variant tracking
          if (product.variants && product.variants.length > 0 && item.selectedColor && item.selectedSize) {
            // Deduct variant stock
            const updatedVariants = decreaseVariantStock(
              product.variants,
              item.selectedColor,
              item.selectedSize,
              item.quantity
            );

            // Update product with new variant stock
            await updateProduct(product.id, { variants: updatedVariants });
            console.log(`📦 Deducted ${item.quantity} units from ${item.selectedColor} • ${item.selectedSize} variant of ${product.name}`);
          } else {
            // Deduct regular stock
            const newStock = Math.max(0, (product.stock || 0) - item.quantity);
            await updateProduct(product.id, { stock: newStock });
            console.log(`📦 Deducted ${item.quantity} units from ${product.name} stock`);
          }
        }
      }

      // Send notification to customer
      if (order) {
        try {
          const { notifyUserOrderStatus } = await import('../services/telegram');
          await notifyUserOrderStatus(order, 'approved');
          console.log('✅ Customer notified about order approval');
        } catch (notifError) {
          console.error('❌ Failed to send customer notification:', notifError);
          // Don't fail the approval if notification fails
        }
      }

      // Call referral reward callback if provided
      if (onReferralReward && order) {
        onReferralReward(order);
      }
    } catch (err) {
      console.error('Failed to approve order:', err);
      throw err;
    }
  };

  const rejectOrder = async (orderId, onRefundBonus) => {
    try {
      const order = orders.find(o => o.id === orderId);

      // If order was previously approved, restore stock
      if (order && order.status === 'approved' && order.items) {
        for (const item of order.items) {
          const product = products.find(p => p.id === item.id);
          if (!product) continue;

          // Check if product uses variant tracking
          if (product.variants && product.variants.length > 0 && item.selectedColor && item.selectedSize) {
            // Restore variant stock
            const updatedVariants = updateVariantStock(
              product.variants,
              item.selectedColor,
              item.selectedSize,
              (product.variants.find(v =>
                v.color?.toLowerCase() === item.selectedColor.toLowerCase() &&
                v.size?.toLowerCase() === item.selectedSize.toLowerCase()
              )?.stock || 0) + item.quantity
            );

            // Update product with restored variant stock
            await updateProduct(product.id, { variants: updatedVariants });
            console.log(`🔄 Restored ${item.quantity} units to ${item.selectedColor} • ${item.selectedSize} variant of ${product.name}`);
          } else {
            // Restore regular stock
            const newStock = (product.stock || 0) + item.quantity;
            await updateProduct(product.id, { stock: newStock });
            console.log(`🔄 Restored ${item.quantity} units to ${product.name} stock`);
          }
        }
      }

      await updateOrderStatus(orderId, 'rejected');

      // Send notification to customer
      if (order) {
        try {
          const { notifyUserOrderStatus } = await import('../services/telegram');
          await notifyUserOrderStatus(order, 'rejected');
          console.log('✅ Customer notified about order rejection');
        } catch (notifError) {
          console.error('❌ Failed to send customer notification:', notifError);
          // Don't fail the rejection if notification fails
        }
      }

      // Refund bonus points if callback provided
      if (onRefundBonus && order) {
        onRefundBonus(order);
      }
    } catch (err) {
      console.error('Failed to reject order:', err);
      throw err;
    }
  };

  const deleteOrder = async (orderId) => {
    try {
      await ordersAPI.delete(orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (err) {
      console.error('Failed to delete order:', err);
      throw err;
    }
  };

  // Review management
  const addReview = async (productId, review) => {
    try {
      const reviewData = {
        product_id: productId,
        user_id: review.userId || null,
        user_name: review.userName,
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        approved: false
      };

      const newReview = await reviewsAPI.create(reviewData);

      // Reload reviews to get full data with product name
      const allReviews = await reviewsAPI.getAll();
      setReviews(allReviews);

      return newReview;
    } catch (err) {
      console.error('Failed to add review:', err);
      throw err;
    }
  };

  const approveReview = async (reviewId) => {
    try {
      await reviewsAPI.approve(reviewId);

      // Update local state
      setReviews(prev =>
        prev.map(review =>
          review.id === reviewId ? { ...review, approved: true } : review
        )
      );
    } catch (err) {
      console.error('Failed to approve review:', err);
      throw err;
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await reviewsAPI.delete(reviewId);
      setReviews(prev => prev.filter(review => review.id !== reviewId));
    } catch (err) {
      console.error('Failed to delete review:', err);
      throw err;
    }
  };

  // User management
  const updateUserBonusPoints = async (userId, points) => {
    try {
      // Try in-memory first, fall back to DB fetch (users may not be loaded yet in Phase 2)
      let user = users.find(u => u.id === userId);
      if (!user) {
        user = await usersAPI.getById(userId);
      }
      if (!user) throw new Error('User not found');

      const newPoints = Math.max(0, (user.bonusPoints || user.bonus_points || 0) + points);
      await usersAPI.updateBonusPoints(userId, newPoints);

      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, bonusPoints: newPoints, bonus_points: newPoints }
            : u
        )
      );
    } catch (err) {
      console.error('Failed to update user bonus points:', err);
      throw err;
    }
  };

  // Category management
  const addCategory = async (category) => {
    try {
      const newCategory = await categoriesAPI.create(category);
      setCategories(prev => {
        const updated = [...prev, newCategory];
        // Update saved order
        saveToLocalStorage('categoryOrder', updated.map(cat => cat.id));
        return updated;
      });
      return newCategory;
    } catch (err) {
      console.error('Failed to add category:', err);
      throw err;
    }
  };

  const updateCategory = async (categoryId, updates) => {
    try {
      const updatedCategory = await categoriesAPI.update(categoryId, updates);
      setCategories(prev =>
        prev.map(category =>
          category.id === categoryId ? updatedCategory : category
        )
      );
      return updatedCategory;
    } catch (err) {
      console.error('Failed to update category:', err);
      throw err;
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      await categoriesAPI.delete(categoryId);
      setCategories(prev => {
        const updated = prev.filter(category => category.id !== categoryId);
        // Update saved order
        saveToLocalStorage('categoryOrder', updated.map(cat => cat.id));
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete category:', err);
      throw err;
    }
  };

  const reorderCategories = (reorderedCategories) => {
    setCategories(reorderedCategories);
    saveToLocalStorage('categoryOrder', reorderedCategories.map(cat => cat.id));
  };

  const toggleCategoryVisibility = async (categoryId, visible) => {
    try {
      const updatedCategory = await categoriesAPI.toggleVisibility(categoryId, visible);
      setCategories(prev =>
        prev.map(category =>
          category.id === categoryId ? updatedCategory : category
        )
      );
      return updatedCategory;
    } catch (err) {
      console.error('Failed to toggle category visibility:', err);
      throw err;
    }
  };

  const toggleProductVisibility = async (productId, visible) => {
    try {
      const updatedProduct = await productsAPI.toggleVisibility(productId, visible);
      setProducts(prev =>
        prev.map(product =>
          product.id === productId ? { ...product, visible } : product
        )
      );
      return updatedProduct;
    } catch (err) {
      console.error('Failed to toggle product visibility:', err);
      throw err;
    }
  };

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductVisibility,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    toggleCategoryVisibility,
    orders,
    addOrder,
    updateOrderStatus,
    approveOrder,
    rejectOrder,
    deleteOrder,
    reviews,
    addReview,
    approveReview,
    deleteReview,
    users,
    updateUserBonusPoints,
    loading,
    adminLoading,
    error,
    loadAllData
  }), [products, categories, orders, reviews, users, loading, adminLoading, error]);

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};
