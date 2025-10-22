/**
 * Product Recommendation Engine
 * Provides related/similar product suggestions based on various strategies
 */

/**
 * Calculate similarity score between two products
 * @param {Object} product1 - First product
 * @param {Object} product2 - Second product
 * @returns {number} Similarity score (0-100)
 */
const calculateSimilarity = (product1, product2) => {
  let score = 0;
  
  // Same category (40 points)
  if (product1.category === product2.category) {
    score += 40;
  }
  
  // Similar tags (30 points max)
  if (product1.tags && product2.tags) {
    const tags1 = product1.tags.map(t => t.toLowerCase());
    const tags2 = product2.tags.map(t => t.toLowerCase());
    const commonTags = tags1.filter(t => tags2.includes(t));
    const tagScore = (commonTags.length / Math.max(tags1.length, tags2.length)) * 30;
    score += tagScore;
  }
  
  // Similar price range (20 points max)
  const priceDiff = Math.abs(product1.price - product2.price);
  const avgPrice = (product1.price + product2.price) / 2;
  const priceScore = Math.max(0, 20 - (priceDiff / avgPrice) * 20);
  score += priceScore;
  
  // Same material (10 points)
  if (product1.material && product2.material && 
      product1.material.toLowerCase() === product2.material.toLowerCase()) {
    score += 10;
  }
  
  return Math.round(score);
};

/**
 * Get related products for a given product
 * @param {Object} currentProduct - Current product being viewed
 * @param {Array} allProducts - All available products
 * @param {number} limit - Maximum number of recommendations (default: 6)
 * @returns {Array} Array of recommended products sorted by relevance
 */
export const getRelatedProducts = (currentProduct, allProducts, limit = 6) => {
  if (!currentProduct || !allProducts || allProducts.length === 0) {
    return [];
  }
  
  // Filter out current product and out of stock items
  const candidates = allProducts.filter(product => 
    product.id !== currentProduct.id && 
    product.stock > 0
  );
  
  // Calculate similarity scores
  const productsWithScores = candidates.map(product => ({
    ...product,
    similarityScore: calculateSimilarity(currentProduct, product)
  }));
  
  // Sort by similarity score (descending) and rating
  const sorted = productsWithScores.sort((a, b) => {
    // First by similarity score
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore;
    }
    // Then by rating
    return (b.rating || 0) - (a.rating || 0);
  });
  
  // Return top N products
  return sorted.slice(0, limit);
};

/**
 * Get products from the same category
 * @param {Object} currentProduct - Current product
 * @param {Array} allProducts - All available products
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of products from same category
 */
export const getSameCategoryProducts = (currentProduct, allProducts, limit = 6) => {
  if (!currentProduct || !allProducts) {
    return [];
  }
  
  return allProducts
    .filter(product => 
      product.id !== currentProduct.id &&
      product.category === currentProduct.category &&
      product.stock > 0
    )
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);
};

/**
 * Get products with similar tags
 * @param {Object} currentProduct - Current product
 * @param {Array} allProducts - All available products
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of products with similar tags
 */
export const getSimilarTagProducts = (currentProduct, allProducts, limit = 6) => {
  if (!currentProduct || !currentProduct.tags || !allProducts) {
    return [];
  }
  
  const currentTags = currentProduct.tags.map(t => t.toLowerCase());
  
  return allProducts
    .filter(product => {
      if (product.id === currentProduct.id || product.stock <= 0) {
        return false;
      }
      if (!product.tags || product.tags.length === 0) {
        return false;
      }
      
      const productTags = product.tags.map(t => t.toLowerCase());
      return productTags.some(tag => currentTags.includes(tag));
    })
    .sort((a, b) => {
      const aTagMatch = a.tags.filter(t => 
        currentTags.includes(t.toLowerCase())
      ).length;
      const bTagMatch = b.tags.filter(t => 
        currentTags.includes(t.toLowerCase())
      ).length;
      
      if (bTagMatch !== aTagMatch) {
        return bTagMatch - aTagMatch;
      }
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, limit);
};

/**
 * Get products in similar price range
 * @param {Object} currentProduct - Current product
 * @param {Array} allProducts - All available products
 * @param {number} priceVariance - Price variance percentage (default: 30%)
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of products in similar price range
 */
export const getSimilarPriceProducts = (currentProduct, allProducts, priceVariance = 0.3, limit = 6) => {
  if (!currentProduct || !allProducts) {
    return [];
  }
  
  const minPrice = currentProduct.price * (1 - priceVariance);
  const maxPrice = currentProduct.price * (1 + priceVariance);
  
  return allProducts
    .filter(product => 
      product.id !== currentProduct.id &&
      product.price >= minPrice &&
      product.price <= maxPrice &&
      product.stock > 0
    )
    .sort((a, b) => {
      const aPriceDiff = Math.abs(a.price - currentProduct.price);
      const bPriceDiff = Math.abs(b.price - currentProduct.price);
      
      if (aPriceDiff !== bPriceDiff) {
        return aPriceDiff - bPriceDiff;
      }
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, limit);
};

/**
 * Get best seller products (for fallback)
 * @param {Array} allProducts - All available products
 * @param {Object} currentProduct - Current product to exclude
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of best selling products
 */
export const getBestSellerProducts = (allProducts, currentProduct, limit = 6) => {
  if (!allProducts) {
    return [];
  }
  
  return allProducts
    .filter(product => 
      product.id !== currentProduct?.id &&
      product.stock > 0
    )
    .sort((a, b) => {
      // Sort by rating and review count
      const aScore = (a.rating || 0) * (a.reviewCount || 0);
      const bScore = (b.rating || 0) * (b.reviewCount || 0);
      return bScore - aScore;
    })
    .slice(0, limit);
};

/**
 * Get smart recommendations with fallback strategies
 * Tries multiple strategies and combines results
 * @param {Object} currentProduct - Current product
 * @param {Array} allProducts - All available products
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of recommended products
 */
export const getSmartRecommendations = (currentProduct, allProducts, limit = 6) => {
  // Safety check: ensure required data is available
  if (!currentProduct || !allProducts || !Array.isArray(allProducts) || allProducts.length === 0) {
    return [];
  }
  
  // Try primary strategy: similarity-based
  let recommendations = getRelatedProducts(currentProduct, allProducts, limit);
  
  // If not enough, add same category products
  if (recommendations.length < limit) {
    const categoryProducts = getSameCategoryProducts(
      currentProduct, 
      allProducts, 
      limit - recommendations.length
    );
    
    // Merge without duplicates
    const existingIds = new Set(recommendations.map(p => p.id));
    const uniqueCategoryProducts = categoryProducts.filter(p => !existingIds.has(p.id));
    recommendations = [...recommendations, ...uniqueCategoryProducts];
  }
  
  // If still not enough, add best sellers
  if (recommendations.length < limit) {
    const bestSellers = getBestSellerProducts(
      allProducts,
      currentProduct,
      limit - recommendations.length
    );
    
    const existingIds = new Set(recommendations.map(p => p.id));
    const uniqueBestSellers = bestSellers.filter(p => !existingIds.has(p.id));
    recommendations = [...recommendations, ...uniqueBestSellers];
  }
  
  return recommendations.slice(0, limit);
};

/**
 * Get "Frequently Bought Together" recommendations
 * Based on products commonly purchased with this item
 * @param {Object} currentProduct - Current product
 * @param {Array} allProducts - All available products
 * @param {Array} orders - Order history (for analysis)
 * @param {number} limit - Maximum number of recommendations
 * @returns {Array} Array of frequently bought together products
 */
export const getFrequentlyBoughtTogether = (currentProduct, allProducts, orders = [], limit = 3) => {
  if (!currentProduct || !allProducts || orders.length === 0) {
    // Fallback to related products if no order data
    return getRelatedProducts(currentProduct, allProducts, limit);
  }
  
  // Find orders containing the current product
  const ordersWithProduct = orders.filter(order => 
    order.items?.some(item => item.id === currentProduct.id)
  );
  
  if (ordersWithProduct.length === 0) {
    return getRelatedProducts(currentProduct, allProducts, limit);
  }
  
  // Count frequency of other products in these orders
  const productFrequency = {};
  
  ordersWithProduct.forEach(order => {
    order.items.forEach(item => {
      if (item.id !== currentProduct.id) {
        productFrequency[item.id] = (productFrequency[item.id] || 0) + 1;
      }
    });
  });
  
  // Sort by frequency and get product details
  const sortedProductIds = Object.entries(productFrequency)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
  
  const recommendations = sortedProductIds
    .map(id => allProducts.find(p => p.id === id))
    .filter(p => p && p.stock > 0)
    .slice(0, limit);
  
  // Fill with related products if not enough
  if (recommendations.length < limit) {
    const related = getRelatedProducts(currentProduct, allProducts, limit - recommendations.length);
    const existingIds = new Set(recommendations.map(p => p.id));
    const uniqueRelated = related.filter(p => !existingIds.has(p.id));
    recommendations.push(...uniqueRelated);
  }
  
  return recommendations;
};
