/**
 * OptimizedImage Component
 * 
 * Provides automatic image optimization with:
 * - Lazy loading
 * - Cloudflare CDN proxy (optional)
 * - Responsive sizing
 * - Error fallback
 */

import { useState } from 'react';

/**
 * Optimize image URL with Cloudflare
 * If domain is on Cloudflare, use their image resizing
 * Otherwise, use original URL
 * 
 * @param {string} url - Original image URL
 * @param {object} options - Optimization options
 * @returns {string} Optimized image URL
 */
const optimizeImageUrl = (url, options = {}) => {
  if (!url) return '';
  
  const {
    width,
    height,
    quality = 85,
    format = 'auto', // auto, webp, avif, jpeg, png
    fit = 'cover' // cover, contain, scale-down, crop, pad
  } = options;
  
  // If it's a Supabase URL and we're using Cloudflare proxy
  // Note: This requires your domain to be on Cloudflare
  const useCloudflareProxy = import.meta.env.VITE_USE_CLOUDFLARE_IMAGES === 'true';
  
  if (useCloudflareProxy && url.includes('supabase.co')) {
    // Cloudflare Image Resizing
    // Format: /cdn-cgi/image/width=400,quality=85,format=auto/https://...
    const params = [];
    if (width) params.push(`width=${width}`);
    if (height) params.push(`height=${height}`);
    if (quality) params.push(`quality=${quality}`);
    if (format) params.push(`format=${format}`);
    if (fit) params.push(`fit=${fit}`);
    
    return `/cdn-cgi/image/${params.join(',')}/${url}`;
  }
  
  // Return original URL if no optimization available
  return url;
};

/**
 * OptimizedImage Component
 */
const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  quality = 85,
  format = 'auto',
  fit = 'cover',
  className = '',
  loading = 'lazy', // lazy, eager
  onLoad,
  onError,
  fallbackSrc = '/placeholder.png',
  ...props
}) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  // Optimize image URL
  const optimizedSrc = optimizeImageUrl(src, {
    width,
    height,
    quality,
    format,
    fit
  });
  
  const handleLoad = (e) => {
    setLoaded(true);
    if (onLoad) onLoad(e);
  };
  
  const handleError = (e) => {
    console.error('Image failed to load:', optimizedSrc);
    setError(true);
    if (onError) onError(e);
  };
  
  return (
    <img
      src={error ? fallbackSrc : optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      className={`${className} ${!loaded ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default OptimizedImage;

/**
 * Usage Examples:
 * 
 * // Basic usage
 * <OptimizedImage src={product.image} alt={product.name} />
 * 
 * // With size constraints
 * <OptimizedImage 
 *   src={product.image} 
 *   alt={product.name}
 *   width={400}
 *   height={400}
 *   quality={90}
 * />
 * 
 * // Eager loading for above-the-fold images
 * <OptimizedImage 
 *   src={banner.image} 
 *   alt="Banner"
 *   loading="eager"
 * />
 * 
 * // With error fallback
 * <OptimizedImage 
 *   src={product.image} 
 *   alt={product.name}
 *   fallbackSrc="/images/product-placeholder.png"
 * />
 */
