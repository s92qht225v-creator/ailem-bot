import { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { essentialDataAPI, categoriesAPI, productsAPI, ordersAPI, reviewsAPI, usersAPI, storageAPI, extractStoragePath, isDefinitiveError } from '../services/api';
import { decreaseVariantStock, updateVariantStock, getTotalVariantStock } from '../utils/variants';
import { removeFromLocalStorage } from '../utils/helpers';
import { sortCategories, countProductsInCategory } from '../utils/categories';
import { categoryNameKey } from '../utils/validation';
import { newOperationId } from '../utils/operationId';
import { cleanupUnusedImage } from '../utils/storageCleanup';
import { logAuditAction, AUDIT_ACTIONS } from '../services/auditLog';

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

      // Shared display order comes from the database (categories.sort_order).
      // The old per-browser 'categoryOrder' preference is no longer used.
      setCategories(sortCategories(categoriesData || []));
      removeFromLocalStorage('categoryOrder');
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

  // On mount: load essential (unblocks UI for everyone). Phase 2 (orders + users)
  // contains customer PII, so it loads ONLY for authenticated admin sessions —
  // anonymous/customer sessions use the anon key with no Supabase Auth session and
  // must never fetch these tables. RLS also enforces this server-side; this gate
  // just prevents the request from ever being issued for non-admins.
  useEffect(() => {
    let cancelled = false;
    const isAdmin = window.location.search.includes('admin=true');

    loadEssentialData({ lightweight: !isAdmin });

    // Load PII data now if an admin session already exists (e.g. cached login),
    // otherwise mark admin data as "not loading" so nothing waits on it.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        if (session) {
          loadDeferredData();
        } else {
          setAdminLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setAdminLoading(false); });

    // React to admin auth changes: load PII data on sign-in, drop it on sign-out.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session && event === 'SIGNED_IN') {
        loadDeferredData();
      } else if (event === 'SIGNED_OUT') {
        setOrders([]);
        setUsers([]);
        setAdminLoading(false);
      }
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe?.();
    };
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
      const product = products.find(p => p.id === productId);

      // Clean up storage images (non-blocking)
      if (product) {
        const imageUrls = [];
        if (product.image) imageUrls.push(product.image);
        if (product.images?.length) imageUrls.push(...product.images);
        if (product.variants?.length) {
          product.variants.forEach(v => { if (v.image) imageUrls.push(v.image); });
        }
        const paths = imageUrls.map(extractStoragePath).filter(Boolean);
        if (paths.length) {
          await Promise.allSettled(paths.map(p => storageAPI.deleteImage(p)));
        }
      }

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
  // Membership is by name (products.category / category_name). Renames run as
  // one database transaction (admin_save_category RPC) that also moves the
  // products; deletion is refused while products remain. Storage cleanup only
  // runs after the database change has succeeded.

  // Reload products + categories from the server without toggling `loading`
  // (which would unmount the admin panel). Used after outcomes the client
  // cannot know (network failure mid-write) or that prove it is stale.
  const refreshCatalog = async () => {
    const { products: productsData, categories: categoriesData } =
      await essentialDataAPI.getAll({ lightweight: false });
    const catalog = { products: productsData || [], categories: sortCategories(categoriesData || []) };
    setProducts(catalog.products);
    setCategories(catalog.categories);
    return catalog;
  };

  // Refresh when the outcome is unknown or our copy is stale; returns an
  // accurate error for the caller either way.
  // 'Not found / nothing changed' can also mean our request already took
  // effect (a retried delivery after a lost response) — refresh for those too.
  const REFRESH_CODES = ['category_stale', 'category_not_deleted', 'category_not_updated', 'category_not_found'];
  const reconcileAfterFailure = async (err) => {
    if (isDefinitiveError(err) && !REFRESH_CODES.includes(err.code)) return err;
    let refreshed = false;
    try {
      refreshed = !!(await refreshCatalog());
    } catch (refreshErr) {
      console.error('❌ Failed to refresh catalog after an uncertain write:', refreshErr);
    }
    if (isDefinitiveError(err)) return err;
    return Object.assign(
      new Error(refreshed
        ? 'Saqlash natijasi aniq emas. Ma\'lumotlar serverdan qayta yuklandi — natijani tekshiring.'
        : 'Saqlash natijasi aniq emas va ma\'lumotlarni yangilab bo\'lmadi. Sahifani yangilang.'),
      { code: 'outcome_unknown', definitive: false, refreshed, cause: err }
    );
  };

  // Save through admin_save_category with an operation id. If the response
  // is lost, ask the database for the real outcome of that operation
  // (resolve_category_write waits while the save is still in flight):
  //   committed → refresh and report success; aborted → definitive failure;
  //   unknown   → propagate (reconcileAfterFailure → 'outcome_unknown').
  // Callers that hold images for this save keep the hold on 'outcome_unknown'.
  const saveCategoryRecord = async (payload) => {
    try {
      return { row: await categoriesAPI.save(payload), catalog: null };
    } catch (err) {
      if (isDefinitiveError(err)) throw err;
      const outcome = await categoriesAPI.resolveWrite(payload.opId);
      if (outcome === 'aborted') {
        throw Object.assign(new Error('Kategoriya saqlanmadi (aloqa uzildi). Qayta urinib ko\'ring.'),
          { code: 'category_not_saved', definitive: true, cause: err });
      }
      if (outcome !== 'committed') throw err;
      return { row: null, catalog: await refreshCatalog() };
    }
  };

  const addCategory = async (category, { opId = newOperationId() } = {}) => {
    try {
      const { row, catalog } = await saveCategoryRecord({ opId, name: category.name, image: category.image });
      const key = categoryNameKey(category.name);
      const newCategory = row || catalog.categories.find(c => categoryNameKey(c.name) === key);
      if (!newCategory) throw Object.assign(new Error('Saqlangan kategoriya topilmadi'), { code: 'outcome_unknown', definitive: false });
      if (row) setCategories(prev => sortCategories([...prev, newCategory]));
      await logAuditAction({
        action: AUDIT_ACTIONS.CATEGORY_CREATE,
        entityType: 'category',
        entityId: newCategory.id,
        newData: newCategory
      });
      return newCategory;
    } catch (err) {
      console.error('Failed to add category:', err);
      throw await reconcileAfterFailure(err);
    }
  };

  const updateCategory = async (categoryId, updates, { opId = newOperationId() } = {}) => {
    try {
      const oldCategory = categories.find(c => c.id === categoryId);
      // One transaction for the category and (on a rename) its products
      const { row, catalog } = await saveCategoryRecord({
        opId,
        id: categoryId,
        name: updates.name ?? oldCategory?.name,
        image: updates.image ?? oldCategory?.image,
        expectedName: oldCategory?.name ?? null
      });
      const updatedCategory = row || catalog.categories.find(c => c.id === categoryId);
      if (!updatedCategory) throw Object.assign(new Error('Saqlangan kategoriya topilmadi'), { code: 'outcome_unknown', definitive: false });

      if (row) {
        if (oldCategory && updatedCategory.name !== oldCategory.name) {
          setProducts(prev => prev.map(p =>
            p.category === oldCategory.name
              ? { ...p, category: updatedCategory.name, category_name: updatedCategory.name }
              : p
          ));
        }
        setCategories(prev => sortCategories(
          prev.map(category => category.id === categoryId ? updatedCategory : category)
        ));
      }

      await logAuditAction({
        action: AUDIT_ACTIONS.CATEGORY_UPDATE,
        entityType: 'category',
        entityId: categoryId,
        oldData: oldCategory || null,
        newData: updatedCategory
      });

      // Replaced image: remove the old object only if nothing else uses it
      // (skipped while a caller still holds it for this save)
      if (oldCategory?.image && oldCategory.image !== updatedCategory.image) {
        cleanupUnusedImage(oldCategory.image).catch(() => {});
      }
      return updatedCategory;
    } catch (err) {
      console.error('Failed to update category:', err);
      throw await reconcileAfterFailure(err);
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (!category) throw new Error('Kategoriya topilmadi');

      // Refuse to orphan products (client state and database)
      const localCount = countProductsInCategory(products, category.name);
      const productCount = localCount > 0 ? localCount : await categoriesAPI.countProducts(category.name);
      if (productCount > 0) {
        throw Object.assign(
          new Error(`Bu kategoriyada ${productCount} ta mahsulot bor. Avval ularni boshqa kategoriyaga o'tkazing.`),
          { code: 'category_in_use', productCount }
        );
      }

      await categoriesAPI.delete(categoryId);
      setCategories(prev => prev.filter(c => c.id !== categoryId));

      await logAuditAction({
        action: AUDIT_ACTIONS.CATEGORY_DELETE,
        entityType: 'category',
        entityId: categoryId,
        oldData: category
      });

      // Record is gone; now clean up its image if unreferenced (never throws)
      if (category.image) {
        cleanupUnusedImage(category.image).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to delete category:', err);
      throw err.code === 'category_in_use' && err.productCount ? err : await reconcileAfterFailure(err);
    }
  };

  // Persist a new display order for everyone (reorder_categories RPC).
  // Optimistic; on any failure the local order is reverted (and refreshed
  // from the server when the outcome is unknown or the list was stale).
  // Only a confirmed success is audit-logged.
  const reorderCategories = async (reorderedCategories) => {
    const previous = categories;
    const withOrder = reorderedCategories.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCategories(withOrder);
    try {
      await categoriesAPI.reorder(withOrder.map(c => c.id));
    } catch (err) {
      console.error('Failed to reorder categories:', err);
      setCategories(previous);
      throw await reconcileAfterFailure(err);
    }
    await logAuditAction({
      action: AUDIT_ACTIONS.CATEGORY_REORDER,
      entityType: 'category',
      entityId: 'order',
      oldData: previous.map(c => c.id),
      newData: withOrder.map(c => c.id)
    });
  };

  const toggleCategoryVisibility = async (categoryId, visible) => {
    try {
      const oldCategory = categories.find(c => c.id === categoryId);
      const updatedCategory = await categoriesAPI.toggleVisibility(categoryId, visible);
      setCategories(prev =>
        prev.map(category =>
          category.id === categoryId ? updatedCategory : category
        )
      );
      await logAuditAction({
        action: AUDIT_ACTIONS.CATEGORY_VISIBILITY,
        entityType: 'category',
        entityId: categoryId,
        oldData: { visible: oldCategory?.visible !== false },
        newData: { visible }
      });
      return updatedCategory;
    } catch (err) {
      console.error('Failed to toggle category visibility:', err);
      throw await reconcileAfterFailure(err);
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
    refreshCatalog,
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
