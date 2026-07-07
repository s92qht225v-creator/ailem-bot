import { createServerSupabaseClient } from './supabase-server';

// Server-side data fetching for SSR pages
// Replicates the mapping from src/services/api.js essentialDataAPI.getAll()

export async function getEssentialData({ lightweight = true } = {}) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_essential_data', { lightweight });

  if (error) throw error;

  // Map products to match app field names (same as api.js:24-31)
  const products = (data.products || []).map((product) => ({
    ...product,
    category: product.category_name,
    originalPrice: product.original_price,
    reviewCount: product.review_count,
    variants: product.variants || [],
    ...(product.a_plus_content !== undefined && { aPlusContent: product.a_plus_content }),
    ...(product.uzum_url !== undefined && { uzumUrl: product.uzum_url }),
  }));

  // Map reviews to match app field names (same as api.js:34-44)
  const reviews = (data.reviews || []).map((review) => ({
    ...review,
    productName: review.product_name || 'Unknown Product',
    productImage: review.product_image || null,
    date: review.created_at
      ? new Date(review.created_at).toISOString()
      : new Date().toISOString(),
    userId: review.user_id,
    productId: review.product_id,
    orderId: review.order_id,
    userName: review.user_name,
    createdAt: review.created_at,
  }));

  // Attach approved reviews to each product (same as api.js:47-60)
  const approvedReviews = reviews.filter((r) => r.approved);
  products.forEach((product) => {
    product.reviews = approvedReviews
      .filter((r) => r.product_id === product.id)
      .map((r) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        rating: r.rating,
        comment: r.comment,
        date: r.created_at?.split('T')[0],
        approved: r.approved,
      }));
  });

  return {
    products,
    categories: data.categories || [],
    reviews,
  };
}

export async function getProductById(id) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('id', id)
    .single();

  if (error) return null;

  return {
    ...data,
    category: data.categories?.name || null,
    originalPrice: data.original_price,
    reviewCount: data.review_count,
    variants: data.variants || [],
    ...(data.a_plus_content !== undefined && { aPlusContent: data.a_plus_content }),
  };
}

export async function getAllProductIds() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('visible', true);

  if (error) return [];

  return data.map((p) => p.id);
}

export async function getSettings() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('settings')
    .select('key, value');

  if (error) return {};

  const settings = {};
  (data || []).forEach((row) => {
    settings[row.key] = row.value;
  });

  return settings;
}

export async function getAppSettings() {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return { banners: [], sale_timer: null };

  return {
    banners: data.banners || (data.sale_banner ? [data.sale_banner] : []),
    sale_timer: data.sale_timer || null,
  };
}
