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
