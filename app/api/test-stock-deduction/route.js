import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../src/lib/supabase-server';

export async function POST(request) {
  const supabase = createServerSupabaseClient();
  const { orderNumber } = await request.json();

  if (!orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: `Order ${orderNumber} not found` }, { status: 404 });
  }

  const results = [];

  for (const item of order.items || []) {
    const productId = item.id || item.productId || item.product_id;
    if (!productId) {
      results.push({ item, error: 'Missing product ID' });
      continue;
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      results.push({ item, error: `Product not found: ${productId}` });
      continue;
    }

    const itemColor = item.color || item.selectedColor;
    const itemSize = item.size || item.selectedSize;
    const hasVariants = product.variants && product.variants.length > 0 && itemColor && itemSize;

    if (hasVariants) {
      const matchedVariant = product.variants.find((v) => {
        const matchColor = v.color?.toLowerCase() === itemColor?.toLowerCase() || v.color_ru?.toLowerCase() === itemColor?.toLowerCase();
        const matchSize = v.size?.toLowerCase() === itemSize?.toLowerCase() || v.size_ru?.toLowerCase() === itemSize?.toLowerCase();
        return matchColor && matchSize;
      });

      results.push({
        product: product.name,
        variant: matchedVariant ? `${itemColor} / ${itemSize}` : 'NOT FOUND',
        currentStock: matchedVariant?.stock || 0,
        deductQty: item.quantity,
        newStock: matchedVariant ? Math.max(0, (matchedVariant.stock || 0) - item.quantity) : null,
      });
    } else {
      results.push({
        product: product.name,
        currentStock: product.stock || 0,
        deductQty: item.quantity,
        newStock: Math.max(0, (product.stock || 0) - item.quantity),
      });
    }
  }

  return NextResponse.json({
    order: { id: order.id, orderNumber: order.order_number, status: order.status, itemCount: order.items?.length || 0 },
    stockChanges: results,
    note: 'This is a DRY RUN — no stock was actually modified',
  });
}
