/**
 * Variant Inventory Management Utilities
 * Handles stock tracking for color+size combinations
 */

/**
 * Generate all possible variants from colors and sizes
 * @param {Array} colors - Array of color strings
 * @param {Array} sizes - Array of size strings
 * @param {number} defaultStock - Default stock per variant
 * @returns {Array} Array of variant objects
 */
export const generateVariants = (colors = [], sizes = [], defaultStock = 0) => {
  const variants = [];

  if (colors.length === 0 || sizes.length === 0) {
    return variants;
  }

  colors.forEach(color => {
    sizes.forEach(size => {
      variants.push({
        color: color.trim(),
        size: size.trim(),
        stock: defaultStock,
        sku: generateSKU(color, size)
      });
    });
  });

  return variants;
};

/**
 * Generate SKU (Stock Keeping Unit) from color and size
 * @param {string} color - Color name
 * @param {string} size - Size name
 * @returns {string} SKU string
 */
export const generateSKU = (color, size) => {
  const colorCode = color.substring(0, 3).toUpperCase();
  const sizeCode = size.substring(0, 1).toUpperCase();
  return `${colorCode}-${sizeCode}`;
};

/**
 * Find a specific variant by color and size
 * @param {Array} variants - Array of variants
 * @param {string} color - Color to find
 * @param {string} size - Size to find
 * @returns {Object|null} Variant object or null
 */
export const findVariant = (variants = [], color, size) => {
  if (!variants || variants.length === 0 || !color || !size) {
    return null;
  }

  return variants.find(v =>
    v.color?.toLowerCase() === color.toLowerCase() &&
    v.size?.toLowerCase() === size.toLowerCase()
  );
};

/**
 * Get stock for a specific variant
 * @param {Array} variants - Array of variants
 * @param {string} color - Color
 * @param {string} size - Size
 * @returns {number} Stock count (0 if not found)
 */
export const getVariantStock = (variants = [], color, size) => {
  const variant = findVariant(variants, color, size);
  return variant ? variant.stock : 0;
};

/**
 * Update stock for a specific variant
 * @param {Array} variants - Array of variants
 * @param {string} color - Color
 * @param {string} size - Size
 * @param {number} newStock - New stock value
 * @returns {Array} Updated variants array
 */
export const updateVariantStock = (variants = [], color, size, newStock) => {
  return variants.map(v => {
    if (v.color?.toLowerCase() === color.toLowerCase() &&
        v.size?.toLowerCase() === size.toLowerCase()) {
      return { ...v, stock: newStock };
    }
    return v;
  });
};

/**
 * Decrease stock for a specific variant
 * @param {Array} variants - Array of variants
 * @param {string} color - Color
 * @param {string} size - Size
 * @param {number} quantity - Quantity to decrease
 * @returns {Array} Updated variants array
 */
export const decreaseVariantStock = (variants = [], color, size, quantity) => {
  return variants.map(v => {
    if (v.color?.toLowerCase() === color.toLowerCase() &&
        v.size?.toLowerCase() === size.toLowerCase()) {
      return { ...v, stock: Math.max(0, v.stock - quantity) };
    }
    return v;
  });
};

/**
 * Calculate total stock across all variants
 * @param {Array} variants - Array of variants
 * @returns {number} Total stock
 */
export const getTotalVariantStock = (variants = []) => {
  return variants.reduce((total, v) => total + (v.stock || 0), 0);
};

/**
 * Get low stock variants (stock < threshold)
 * @param {Array} variants - Array of variants
 * @param {number} threshold - Stock threshold (default: 10)
 * @returns {Array} Array of low stock variants
 */
export const getLowStockVariants = (variants = [], threshold = 10) => {
  return variants.filter(v => v.stock < threshold && v.stock > 0);
};

/**
 * Get out of stock variants
 * @param {Array} variants - Array of variants
 * @returns {Array} Array of out of stock variants
 */
export const getOutOfStockVariants = (variants = []) => {
  return variants.filter(v => v.stock === 0);
};

/**
 * Check if a variant is available
 * @param {Array} variants - Array of variants
 * @param {string} color - Color
 * @param {string} size - Size
 * @param {number} quantity - Desired quantity
 * @returns {boolean} True if available
 */
export const isVariantAvailable = (variants = [], color, size, quantity = 1) => {
  const stock = getVariantStock(variants, color, size);
  return stock >= quantity;
};

/**
 * Get available colors (colors that have stock in at least one size)
 * @param {Array} variants - Array of variants
 * @returns {Array} Array of available color strings
 */
export const getAvailableColors = (variants = []) => {
  const colorsWithStock = variants
    .filter(v => v.stock > 0)
    .map(v => v.color);

  return [...new Set(colorsWithStock)];
};

/**
 * Get available sizes for a specific color
 * @param {Array} variants - Array of variants
 * @param {string} color - Color to check
 * @returns {Array} Array of available size strings
 */
export const getAvailableSizesForColor = (variants = [], color) => {
  return variants
    .filter(v =>
      v.color?.toLowerCase() === color.toLowerCase() &&
      v.stock > 0
    )
    .map(v => v.size);
};

/**
 * Validate variants array structure
 * @param {Array} variants - Array to validate
 * @returns {boolean} True if valid
 */
export const validateVariants = (variants) => {
  if (!Array.isArray(variants)) return false;

  return variants.every(v =>
    v.color &&
    v.size &&
    typeof v.stock === 'number' &&
    v.stock >= 0
  );
};

/**
 * Merge old variants with new color/size arrays
 * Preserves stock from old variants where matches exist
 * @param {Array} oldVariants - Existing variants
 * @param {Array} newColors - New colors array
 * @param {Array} newSizes - New sizes array
 * @returns {Array} Merged variants
 */
export const mergeVariants = (oldVariants = [], newColors = [], newSizes = []) => {
  const newVariants = generateVariants(newColors, newSizes, 0);

  return newVariants.map(newV => {
    const existing = findVariant(oldVariants, newV.color, newV.size);
    return existing ? { ...newV, stock: existing.stock } : newV;
  });
};

/**
 * Format variant for display
 * @param {Object} variant - Variant object
 * @returns {string} Formatted string
 */
export const formatVariantName = (variant) => {
  if (!variant) return '';
  return `${variant.color} - ${variant.size}`;
};

/**
 * Get variant display info with stock status
 * @param {Object} variant - Variant object
 * @returns {Object} Display info
 */
export const getVariantDisplayInfo = (variant) => {
  if (!variant) {
    return {
      label: '',
      stockStatus: 'unavailable',
      stockText: 'Not available',
      canOrder: false
    };
  }

  const { stock } = variant;

  return {
    label: formatVariantName(variant),
    stockStatus: stock === 0 ? 'out' : stock < 10 ? 'low' : 'available',
    stockText: stock === 0 ? 'Out of stock' : stock < 10 ? `Only ${stock} left` : `${stock} in stock`,
    canOrder: stock > 0
  };
};
