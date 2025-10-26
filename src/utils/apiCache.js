/**
 * API Response Caching Utility
 * 
 * Provides smart caching for API responses with:
 * - Time-to-live (TTL) expiration
 * - localStorage persistence
 * - Automatic cache invalidation
 * - Memory + disk caching
 */

import { loadFromLocalStorage, saveToLocalStorage } from './helpers';

// In-memory cache for faster access
const memoryCache = new Map();

// Default TTL values (in milliseconds)
const DEFAULT_TTL = {
  products: 5 * 60 * 1000,      // 5 minutes
  categories: 30 * 60 * 1000,   // 30 minutes
  orders: 2 * 60 * 1000,        // 2 minutes
  reviews: 10 * 60 * 1000,      // 10 minutes
  user: 5 * 60 * 1000,          // 5 minutes
  settings: 60 * 60 * 1000      // 1 hour
};

/**
 * Generate cache key
 */
const getCacheKey = (namespace, identifier = 'default') => {
  return `cache_${namespace}_${identifier}`;
};

/**
 * Get cached data
 * @param {string} namespace - Cache namespace (e.g., 'products', 'categories')
 * @param {string} identifier - Specific cache identifier
 * @returns {any|null} Cached data or null if expired/not found
 */
export const getCachedData = (namespace, identifier = 'default') => {
  const cacheKey = getCacheKey(namespace, identifier);
  
  // Try memory cache first (fastest)
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (Date.now() < cached.expiresAt) {
      console.log(`📦 Cache HIT (memory): ${namespace}/${identifier}`);
      return cached.data;
    } else {
      // Expired in memory
      memoryCache.delete(cacheKey);
    }
  }
  
  // Try localStorage (slower but persists)
  const cached = loadFromLocalStorage(cacheKey);
  if (cached && cached.expiresAt && Date.now() < cached.expiresAt) {
    console.log(`📦 Cache HIT (disk): ${namespace}/${identifier}`);
    // Also store in memory for next time
    memoryCache.set(cacheKey, cached);
    return cached.data;
  }
  
  // Cache miss
  console.log(`❌ Cache MISS: ${namespace}/${identifier}`);
  return null;
};

/**
 * Set cached data
 * @param {string} namespace - Cache namespace
 * @param {any} data - Data to cache
 * @param {string} identifier - Specific cache identifier
 * @param {number} ttl - Time to live in milliseconds (optional)
 */
export const setCachedData = (namespace, data, identifier = 'default', ttl = null) => {
  const cacheKey = getCacheKey(namespace, identifier);
  const cacheTTL = ttl || DEFAULT_TTL[namespace] || 5 * 60 * 1000; // Default 5 min
  
  const cached = {
    data,
    expiresAt: Date.now() + cacheTTL,
    cachedAt: Date.now()
  };
  
  // Store in both memory and disk
  memoryCache.set(cacheKey, cached);
  saveToLocalStorage(cacheKey, cached);
  
  console.log(`💾 Cached: ${namespace}/${identifier} (TTL: ${cacheTTL / 1000}s)`);
};

/**
 * Invalidate (delete) cached data
 * @param {string} namespace - Cache namespace
 * @param {string} identifier - Specific cache identifier (optional, defaults to all)
 */
export const invalidateCache = (namespace, identifier = null) => {
  if (identifier) {
    // Invalidate specific cache
    const cacheKey = getCacheKey(namespace, identifier);
    memoryCache.delete(cacheKey);
    localStorage.removeItem(cacheKey);
    console.log(`🗑️  Invalidated cache: ${namespace}/${identifier}`);
  } else {
    // Invalidate all caches for namespace
    const pattern = `cache_${namespace}_`;
    
    // Clear memory cache
    for (const key of memoryCache.keys()) {
      if (key.startsWith(pattern)) {
        memoryCache.delete(key);
      }
    }
    
    // Clear localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(pattern)) {
        localStorage.removeItem(key);
      }
    }
    
    console.log(`🗑️  Invalidated all cache: ${namespace}/*`);
  }
};

/**
 * Cached fetch wrapper
 * Automatically handles caching for API calls
 * 
 * @param {string} namespace - Cache namespace
 * @param {Function} fetchFn - Async function that fetches data
 * @param {string} identifier - Cache identifier
 * @param {number} ttl - Custom TTL (optional)
 * @returns {Promise<any>} Cached or fresh data
 */
export const cachedFetch = async (namespace, fetchFn, identifier = 'default', ttl = null) => {
  // Try cache first
  const cached = getCachedData(namespace, identifier);
  if (cached !== null) {
    return cached;
  }
  
  // Cache miss - fetch fresh data
  console.log(`🌐 Fetching fresh data: ${namespace}/${identifier}`);
  const data = await fetchFn();
  
  // Cache the result
  setCachedData(namespace, data, identifier, ttl);
  
  return data;
};

/**
 * Clear all caches
 */
export const clearAllCaches = () => {
  memoryCache.clear();
  
  // Clear all localStorage caches
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  console.log(`🗑️  Cleared all caches (${keysToRemove.length} items)`);
};

/**
 * Get cache stats
 */
export const getCacheStats = () => {
  const diskCaches = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      diskCaches.push(key);
    }
  }
  
  return {
    memorySize: memoryCache.size,
    diskSize: diskCaches.length,
    caches: diskCaches.map(key => {
      const cached = loadFromLocalStorage(key);
      return {
        key,
        expired: cached ? Date.now() > cached.expiresAt : true,
        age: cached ? Math.floor((Date.now() - cached.cachedAt) / 1000) : 0
      };
    })
  };
};

/**
 * Usage Examples:
 * 
 * // Basic caching
 * const products = await cachedFetch('products', async () => {
 *   return await productsAPI.getAll();
 * });
 * 
 * // With custom identifier
 * const product = await cachedFetch('products', async () => {
 *   return await productsAPI.getById(productId);
 * }, productId);
 * 
 * // With custom TTL (10 minutes)
 * const settings = await cachedFetch('settings', async () => {
 *   return await settingsAPI.get();
 * }, 'default', 10 * 60 * 1000);
 * 
 * // Invalidate after update
 * await productsAPI.update(id, data);
 * invalidateCache('products'); // Clear all product caches
 * 
 * // Clear everything (e.g., on logout)
 * clearAllCaches();
 */

export default {
  getCachedData,
  setCachedData,
  invalidateCache,
  cachedFetch,
  clearAllCaches,
  getCacheStats
};
