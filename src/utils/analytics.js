/**
 * Analytics utility functions for calculating business metrics
 */

/**
 * Calculate sales analytics from orders
 * @param {Array} orders - Array of all orders
 * @param {Array} users - Array of all users
 * @param {Array} products - Array of all products
 * @returns {Object} Analytics data
 */
export const calculateAnalytics = (orders = [], users = [], products = []) => {
  // Filter out demo/test orders if needed
  const realOrders = orders.filter(order =>
    order.userId && !String(order.userId).startsWith('demo-')
  );

  // Total revenue (only approved, shipped, delivered orders)
  const completedOrders = realOrders.filter(order =>
    ['approved', 'shipped', 'delivered'].includes(order.status)
  );

  const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  // Pending orders (orders waiting for approval)
  const pendingOrders = realOrders.filter(order => order.status === 'pending');
  const pendingRevenue = pendingOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  // Average order value
  const avgOrderValue = completedOrders.length > 0
    ? totalRevenue / completedOrders.length
    : 0;

  // Total customers (unique users who placed orders)
  const uniqueCustomers = new Set(
    realOrders.map(order => order.userId).filter(Boolean)
  ).size;

  // Orders by status
  const ordersByStatus = {
    pending: realOrders.filter(o => o.status === 'pending').length,
    approved: realOrders.filter(o => o.status === 'approved').length,
    shipped: realOrders.filter(o => o.status === 'shipped').length,
    delivered: realOrders.filter(o => o.status === 'delivered').length,
    rejected: realOrders.filter(o => o.status === 'rejected').length,
  };

  // Revenue by time period
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)

  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayOrders = completedOrders.filter(order => {
    const orderDate = new Date(order.created_at || order.date);
    return orderDate >= today;
  });

  const weekOrders = completedOrders.filter(order => {
    const orderDate = new Date(order.created_at || order.date);
    return orderDate >= thisWeekStart;
  });

  const monthOrders = completedOrders.filter(order => {
    const orderDate = new Date(order.created_at || order.date);
    return orderDate >= thisMonthStart;
  });

  const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  // Top selling products with variant tracking
  const productSales = {};
  const variantSales = {};
  
  completedOrders.forEach(order => {
    order.items?.forEach(item => {
      const productKey = item.productId || item.id;
      
      // Track by product
      if (!productSales[productKey]) {
        // Try to get product name from item first, then lookup in products array
        let productName = item.productName || item.name;
        if (!productName || productName === productKey) {
          const product = products.find(p => p.id === productKey);
          productName = product?.name || `Product #${productKey}`;
        }

        productSales[productKey] = {
          productId: productKey,
          name: productName,
          quantity: 0,
          revenue: 0,
          variants: {}
        };
      }
      productSales[productKey].quantity += item.quantity || 1;
      productSales[productKey].revenue += (item.price || 0) * (item.quantity || 1);
      
      // Track by variant if color and size exist
      const hasVariant = item.color && item.size;
      if (hasVariant) {
        const variantKey = `${productKey}:${item.color}:${item.size}`;
        
        if (!variantSales[variantKey]) {
          variantSales[variantKey] = {
            productId: productKey,
            productName: productSales[productKey].name,
            color: item.color,
            size: item.size,
            quantity: 0,
            revenue: 0
          };
        }
        
        variantSales[variantKey].quantity += item.quantity || 1;
        variantSales[variantKey].revenue += (item.price || 0) * (item.quantity || 1);
        
        // Also track variants within the product
        const variantLabel = `${item.color} • ${item.size}`;
        if (!productSales[productKey].variants[variantLabel]) {
          productSales[productKey].variants[variantLabel] = {
            color: item.color,
            size: item.size,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productKey].variants[variantLabel].quantity += item.quantity || 1;
        productSales[productKey].variants[variantLabel].revenue += (item.price || 0) * (item.quantity || 1);
      }
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(product => ({
      ...product,
      variants: Object.entries(product.variants)
        .map(([label, data]) => ({ label, ...data }))
        .sort((a, b) => b.quantity - a.quantity) // Sort variants by quantity sold
    }));
    
  const topVariants = Object.values(variantSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Recent orders (last 10)
  const recentOrders = [...realOrders]
    .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
    .slice(0, 10);

  // Customer metrics
  const totalUsers = users.filter(u => !String(u.id).startsWith('demo-')).length;
  const usersWithOrders = uniqueCustomers;
  const conversionRate = totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0;

  // Referral metrics
  const totalReferrals = users.reduce((sum, user) => sum + (user.referrals || 0), 0);
  const usersWithReferrals = users.filter(u => (u.referrals || 0) > 0).length;

  // Product metrics
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => (p.stock || 0) < 10);
  const outOfStockProducts = products.filter(p => (p.stock || 0) === 0);

  // Calculate growth (comparing this month vs last month)
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const lastMonthOrders = completedOrders.filter(order => {
    const orderDate = new Date(order.created_at || order.date);
    return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
  });

  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const revenueGrowth = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : monthRevenue > 0 ? 100 : 0;

  return {
    // Revenue metrics
    totalRevenue,
    pendingRevenue,
    avgOrderValue,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    revenueGrowth,

    // Order metrics
    totalOrders: completedOrders.length,
    pendingOrdersCount: pendingOrders.length,
    todayOrdersCount: todayOrders.length,
    weekOrdersCount: weekOrders.length,
    monthOrdersCount: monthOrders.length,
    ordersByStatus,
    recentOrders,

    // Customer metrics
    totalCustomers: uniqueCustomers,
    totalUsers,
    conversionRate,

    // Referral metrics
    totalReferrals,
    usersWithReferrals,

    // Product metrics
    totalProducts,
    lowStockProducts: lowStockProducts.length,
    outOfStockProducts: outOfStockProducts.length,
    topProducts,
    topVariants,

    // Low stock items (for alerts)
    lowStockItems: lowStockProducts.slice(0, 5),
  };
};

/**
 * Get revenue data for chart (last 7 days)
 * @param {Array} orders - Array of all orders
 * @returns {Array} Array of {date, revenue} objects
 */
export const getRevenueChartData = (orders = []) => {
  const completedOrders = orders.filter(order =>
    ['approved', 'shipped', 'delivered'].includes(order.status) &&
    !String(order.userId).startsWith('demo-')
  );

  const last7Days = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const dayOrders = completedOrders.filter(order => {
      const orderDate = new Date(order.created_at || order.date);
      return orderDate >= date && orderDate < nextDay;
    });

    const revenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    last7Days.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue,
      orders: dayOrders.length,
    });
  }

  return last7Days;
};

/**
 * Format currency for display
 * @param {number} amount - Amount in currency
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `$${amount.toFixed(2)}`;
};

/**
 * Format percentage for display
 * @param {number} percentage - Percentage value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (percentage) => {
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};
