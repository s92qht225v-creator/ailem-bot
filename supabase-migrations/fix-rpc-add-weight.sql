-- Fix: add weight to get_essential_data RPC lightweight query
-- Weight was missing, causing admin panel to load products without weight
-- and then save null weight when editing any product field.
--
-- Run this in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION get_essential_data(lightweight boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  products_data jsonb;
  categories_data jsonb;
  reviews_data jsonb;
BEGIN
  IF lightweight THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price,
        'original_price', p.original_price,
        'image', p.image,
        'stock', p.stock,
        'weight', p.weight,
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

  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb ORDER BY c.id), '[]'::jsonb)
  INTO categories_data
  FROM categories c;

  SELECT COALESCE(jsonb_agg(row_to_json(r)::jsonb ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO reviews_data
  FROM reviews r
  WHERE r.approved = true;

  RETURN jsonb_build_object(
    'products', products_data,
    'categories', categories_data,
    'reviews', reviews_data
  );
END;
$$;
