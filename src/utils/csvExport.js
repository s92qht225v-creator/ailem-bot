/**
 * CSV Export Utilities
 * Handles conversion of data to CSV format and file download
 */

/**
 * Escape CSV field value
 * @param {any} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeCSVField = (value) => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @param {Array} columns - Array of column definitions {key, label}
 * @returns {string} CSV string
 */
export const arrayToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return columns.map(col => escapeCSVField(col.label)).join(',');
  }

  // Header row
  const header = columns.map(col => escapeCSVField(col.label)).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Handle nested values (e.g., 'user.name')
      if (col.key.includes('.')) {
        const keys = col.key.split('.');
        value = keys.reduce((obj, key) => obj?.[key], item);
      }
      
      // Apply formatter if provided
      if (col.formatter && value !== null && value !== undefined) {
        value = col.formatter(value, item);
      }
      
      return escapeCSVField(value);
    }).join(',');
  });
  
  return [header, ...rows].join('\n');
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV content string
 * @param {string} filename - Filename without extension
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export orders to CSV
 * @param {Array} orders - Array of order objects
 * @param {string} filename - Optional filename
 */
export const exportOrders = (orders, filename = 'orders') => {
  const columns = [
    { key: 'id', label: 'Order ID' },
    { key: 'createdAt', label: 'Date', formatter: (date) => new Date(date).toLocaleString() },
    { key: 'status', label: 'Status' },
    { key: 'userName', label: 'Customer' },
    { key: 'userPhone', label: 'Phone' },
    { key: 'items', label: 'Items', formatter: (items) => items?.length || 0 },
    { key: 'subtotal', label: 'Subtotal', formatter: (val) => val.toLocaleString() },
    { key: 'shippingFee', label: 'Shipping', formatter: (val) => val.toLocaleString() },
    { key: 'bonusDiscount', label: 'Bonus Used', formatter: (val) => val.toLocaleString() },
    { key: 'total', label: 'Total', formatter: (val) => val.toLocaleString() },
    { key: 'deliveryMethod', label: 'Delivery' },
    { key: 'courierName', label: 'Courier' },
    { key: 'recipientName', label: 'Recipient' },
    { key: 'recipientPhone', label: 'Recipient Phone' },
    { key: 'address', label: 'Address' },
    { key: 'state', label: 'State' },
    { key: 'city', label: 'City' }
  ];
  
  const csv = arrayToCSV(orders, columns);
  downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}`);
};

/**
 * Export products to CSV
 * @param {Array} products - Array of product objects
 * @param {string} filename - Optional filename
 */
export const exportProducts = (products, filename = 'products') => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', formatter: (val) => val.toLocaleString() },
    { key: 'originalPrice', label: 'Original Price', formatter: (val) => val ? val.toLocaleString() : '' },
    { key: 'stock', label: 'Stock' },
    { key: 'material', label: 'Material' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'badge', label: 'Badge' },
    { key: 'colors', label: 'Colors', formatter: (colors) => colors?.join(', ') || '' },
    { key: 'sizes', label: 'Sizes', formatter: (sizes) => sizes?.join(', ') || '' },
    { key: 'tags', label: 'Tags', formatter: (tags) => tags?.join(', ') || '' },
    { key: 'rating', label: 'Rating' },
    { key: 'reviewCount', label: 'Reviews' },
    { key: 'createdAt', label: 'Created', formatter: (date) => date ? new Date(date).toLocaleDateString() : '' }
  ];
  
  const csv = arrayToCSV(products, columns);
  downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}`);
};

/**
 * Export users to CSV
 * @param {Array} users - Array of user objects
 * @param {string} filename - Optional filename
 */
export const exportUsers = (users, filename = 'users') => {
  const columns = [
    { key: 'id', label: 'Telegram ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'username', label: 'Username' },
    { key: 'phone', label: 'Phone' },
    { key: 'bonusPoints', label: 'Bonus Points', formatter: (val) => val || 0 },
    { key: 'referralCode', label: 'Referral Code' },
    { key: 'referredBy', label: 'Referred By' },
    { key: 'totalOrders', label: 'Orders', formatter: (val) => val || 0 },
    { key: 'totalSpent', label: 'Total Spent', formatter: (val) => val ? val.toLocaleString() : 0 },
    { key: 'createdAt', label: 'Joined', formatter: (date) => date ? new Date(date).toLocaleDateString() : '' }
  ];
  
  const csv = arrayToCSV(users, columns);
  downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}`);
};

/**
 * Export order items detail to CSV
 * @param {Array} orders - Array of order objects
 * @param {string} filename - Optional filename
 */
export const exportOrderItems = (orders, filename = 'order_items') => {
  // Flatten order items into individual rows
  const flattenedItems = [];
  
  orders.forEach(order => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        flattenedItems.push({
          orderId: order.id,
          orderDate: order.createdAt,
          orderStatus: order.status,
          customerName: order.userName,
          productName: item.name,
          variant: item.selectedColor && item.selectedSize 
            ? `${item.selectedColor} - ${item.selectedSize}` 
            : '',
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        });
      });
    }
  });
  
  const columns = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'orderDate', label: 'Order Date', formatter: (date) => new Date(date).toLocaleString() },
    { key: 'orderStatus', label: 'Status' },
    { key: 'customerName', label: 'Customer' },
    { key: 'productName', label: 'Product' },
    { key: 'variant', label: 'Variant' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'unitPrice', label: 'Unit Price', formatter: (val) => val.toLocaleString() },
    { key: 'totalPrice', label: 'Total Price', formatter: (val) => val.toLocaleString() }
  ];
  
  const csv = arrayToCSV(flattenedItems, columns);
  downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}`);
};

/**
 * Export reviews to CSV
 * @param {Array} reviews - Array of review objects
 * @param {string} filename - Optional filename
 */
export const exportReviews = (reviews, filename = 'reviews') => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'productName', label: 'Product' },
    { key: 'userName', label: 'Customer' },
    { key: 'rating', label: 'Rating' },
    { key: 'comment', label: 'Comment' },
    { key: 'approved', label: 'Approved', formatter: (val) => val ? 'Yes' : 'No' },
    { key: 'createdAt', label: 'Date', formatter: (date) => date ? new Date(date).toLocaleDateString() : '' }
  ];
  
  const csv = arrayToCSV(reviews, columns);
  downloadCSV(csv, `${filename}_${new Date().toISOString().split('T')[0]}`);
};
