/**
 * Get the tier threshold (min_qty of first tier) for a product's volume pricing
 * Used for grouping products by same tier threshold
 * @param {Array} volumePricing - Array of volume pricing tiers [{min_qty, max_qty, price}, ...]
 * @returns {number|null} The min_qty of the first tier, or null if no volume pricing
 */
export const getTierThreshold = (volumePricing) => {
  if (!volumePricing || volumePricing.length === 0) {
    return null;
  }
  // Sort and get the first (lowest) tier threshold
  const sortedTiers = [...volumePricing].sort((a, b) => a.min_qty - b.min_qty);
  return sortedTiers[0].min_qty;
};

/**
 * Calculate the effective price per unit based on quantity and volume pricing tiers
 * @param {number} quantity - The quantity being purchased
 * @param {number} basePrice - The base price per unit
 * @param {Array} volumePricing - Array of volume pricing tiers [{min_qty, max_qty, price}, ...]
 * @returns {number} The effective price per unit for the given quantity
 */
export const getVolumePricedUnit = (quantity, basePrice, volumePricing) => {
  // If no volume pricing, return base price
  if (!volumePricing || volumePricing.length === 0) {
    return basePrice;
  }

  // Sort tiers by min_qty to ensure proper order
  const sortedTiers = [...volumePricing].sort((a, b) => a.min_qty - b.min_qty);

  // Find the applicable tier
  for (const tier of sortedTiers) {
    // Check if quantity falls within this tier
    if (quantity >= tier.min_qty) {
      // If max_qty is null or quantity is within max, this is the tier
      if (tier.max_qty === null || quantity <= tier.max_qty) {
        return tier.price;
      }
    }
  }

  // If no tier matched, return base price
  return basePrice;
};

/**
 * Calculate total price for an item considering volume pricing
 * @param {number} quantity - The quantity being purchased
 * @param {number} basePrice - The base price per unit
 * @param {Array} volumePricing - Array of volume pricing tiers
 * @returns {number} The total price for this item
 */
export const calculateItemTotal = (quantity, basePrice, volumePricing) => {
  const pricePerUnit = getVolumePricedUnit(quantity, basePrice, volumePricing);
  return pricePerUnit * quantity;
};

/**
 * Get formatted string describing the volume discount applied
 * @param {number} quantity - The quantity being purchased
 * @param {number} basePrice - The base price per unit
 * @param {Array} volumePricing - Array of volume pricing tiers
 * @returns {string|null} Description of the discount or null if none applied
 */
export const getVolumeDiscountDescription = (quantity, basePrice, volumePricing) => {
  if (!volumePricing || volumePricing.length === 0) {
    return null;
  }

  const discountedPrice = getVolumePricedUnit(quantity, basePrice, volumePricing);

  if (discountedPrice < basePrice) {
    const savings = basePrice - discountedPrice;
    const savingsTotal = savings * quantity;
    return { pricePerUnit: discountedPrice, savings, savingsTotal };
  }

  return null;
};

/**
 * Group cart items by their volume pricing tier threshold
 * Products with same min_qty threshold are grouped together
 * @param {Array} cartItems - Array of cart items
 * @returns {Object} Object with tier thresholds as keys and arrays of items as values
 */
export const groupItemsByTier = (cartItems) => {
  const tierGroups = {};

  cartItems.forEach(item => {
    const threshold = getTierThreshold(item.volume_pricing);

    if (threshold !== null) {
      if (!tierGroups[threshold]) {
        tierGroups[threshold] = [];
      }
      tierGroups[threshold].push(item);
    }
  });

  return tierGroups;
};

/**
 * Calculate combined quantity for a tier group
 * @param {Array} items - Array of cart items in the same tier group
 * @returns {number} Total quantity of all items in the group
 */
export const getTierGroupQuantity = (items) => {
  return items.reduce((total, item) => total + item.quantity, 0);
};

/**
 * Check if a tier group qualifies for volume discount
 * @param {Array} items - Array of cart items in the same tier group
 * @param {number} threshold - The tier threshold (min_qty required)
 * @returns {boolean} True if combined quantity meets threshold
 */
export const tierGroupQualifies = (items, threshold) => {
  const totalQty = getTierGroupQuantity(items);
  return totalQty >= threshold;
};

/**
 * Calculate item total considering tier-based volume pricing
 * Uses combined quantity from all items in the same tier group
 * @param {Object} item - The cart item
 * @param {Array} allCartItems - All items in the cart (for tier grouping)
 * @returns {number} The total price for this item
 */
export const calculateItemTotalWithTierGrouping = (item, allCartItems) => {
  const threshold = getTierThreshold(item.volume_pricing);

  // If no volume pricing, use regular price
  if (threshold === null) {
    return item.price * item.quantity;
  }

  // Get all items in the same tier group
  const tierGroups = groupItemsByTier(allCartItems);
  const sameThresholdItems = tierGroups[threshold] || [];

  // Calculate combined quantity for this tier
  const combinedQty = getTierGroupQuantity(sameThresholdItems);

  // Get price based on combined quantity
  const effectivePrice = getVolumePricedUnit(combinedQty, item.price, item.volume_pricing);

  return effectivePrice * item.quantity;
};

/**
 * Get the effective price per unit considering tier-based grouping
 * @param {Object} item - The cart item
 * @param {Array} allCartItems - All items in the cart (for tier grouping)
 * @returns {number} The effective price per unit
 */
export const getEffectivePriceWithTierGrouping = (item, allCartItems) => {
  const threshold = getTierThreshold(item.volume_pricing);

  // If no volume pricing, use regular price
  if (threshold === null) {
    return item.price;
  }

  // Get all items in the same tier group
  const tierGroups = groupItemsByTier(allCartItems);
  const sameThresholdItems = tierGroups[threshold] || [];

  // Calculate combined quantity for this tier
  const combinedQty = getTierGroupQuantity(sameThresholdItems);

  // Get price based on combined quantity
  return getVolumePricedUnit(combinedQty, item.price, item.volume_pricing);
};

/**
 * Get tier group info for an item (for UI display)
 * @param {Object} item - The cart item
 * @param {Array} allCartItems - All items in the cart
 * @returns {Object|null} Tier info or null if no volume pricing
 */
export const getTierGroupInfo = (item, allCartItems) => {
  const threshold = getTierThreshold(item.volume_pricing);

  if (threshold === null) {
    return null;
  }

  const tierGroups = groupItemsByTier(allCartItems);
  const sameThresholdItems = tierGroups[threshold] || [];
  const combinedQty = getTierGroupQuantity(sameThresholdItems);
  const qualifies = combinedQty >= threshold;
  const itemsInGroup = sameThresholdItems.length;

  return {
    threshold,
    combinedQty,
    qualifies,
    itemsInGroup,
    remaining: Math.max(0, threshold - combinedQty)
  };
};
