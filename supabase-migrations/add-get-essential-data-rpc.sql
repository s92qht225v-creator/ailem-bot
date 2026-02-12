-- RPC function: get_essential_data
-- Combines products + categories + reviews into a single database call
-- Saves 1 full network round-trip (~1.3s from Uzbekistan to Singapore)
--
-- Usage: supabase.rpc('get_essential_data', { lightweight: true })
-- Returns: { products: [...], categories: [...], reviews: [...] }

CREATE OR REPLACE FUNCTION get_essential_data(lightweight boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  products_data jsonb;
  categories_data jsonb;
  reviews_data jsonb;
BEGIN
  -- Fetch categories (ordered by created_at ascending)
  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb ORDER BY c.created_at ASC), '[]'::jsonb)
  INTO categories_data
  FROM categories c;

  -- Fetch reviews with product name and image (ordered by created_at descending)
  SELECT COALESCE(jsonb_agg(
    row_to_json(r)::jsonb || jsonb_build_object(
      'product_name', p.name,
      'product_image', p.image
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO reviews_data
  FROM reviews r
  LEFT JOIN products p ON r.product_id = p.id;

  -- Fetch products (lightweight excludes heavy columns)
  IF lightweight THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'original_price', p.original_price,
        'image', p.image,
        'stock', p.stock,
        'category_name', p.category_name,
        'material', p.material,
        'colors', p.colors,
        'sizes', p.sizes,
        'tags', p.tags,
        'badge', p.badge,
        'visible', p.visible,
        'variants', COALESCE(p.variants, '[]'::jsonb),
        'volume_pricing', p.volume_pricing,
        'rating', p.rating,
        'review_count', p.review_count,
        'barcode', p.barcode,
        'created_at', p.created_at
      )
      ORDER BY p.created_at DESC
    ), '[]'::jsonb)
    INTO products_data
    FROM products p;
  ELSE
    SELECT COALESCE(jsonb_agg(row_to_json(p)::jsonb ORDER BY p.created_at DESC), '[]'::jsonb)
    INTO products_data
    FROM products p;
  END IF;

  -- Combine into single response
  result := jsonb_build_object(
    'products', products_data,
    'categories', categories_data,
    'reviews', reviews_data
  );

  RETURN result;
END;
$$;
