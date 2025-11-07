// Test endpoint to check stock deduction logic
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderNumber } = req.body;

  if (!orderNumber) {
    return res.status(400).json({ error: 'Order number required' });
  }

  console.log('🔍 Fetching order:', orderNumber);

  // Fetch order by order_number
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError);
    return res.status(404).json({ error: 'Order not found', details: orderError });
  }

  console.log('✅ Order found:', JSON.stringify(order, null, 2));
  console.log('🔍 Order items:', JSON.stringify(order.items, null, 2));

  const results = [];

  // Process each item
  for (const item of order.items || []) {
    console.log('🔍 Processing item:', JSON.stringify(item, null, 2));
    
    const productId = item.id || item.productId || item.product_id;
    console.log('🔍 Resolved product ID:', productId);

    if (!productId) {
      results.push({ item, error: 'No product ID found' });
      continue;
    }

    // Fetch product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.error(`❌ Product not found for ID ${productId}:`, productError);
      results.push({ item, productId, error: 'Product not found', details: productError });
      continue;
    }

    console.log(`✅ Product found: ${product.name}`);
    console.log(`   Current stock: ${product.stock}`);
    console.log(`   Order quantity: ${item.quantity}`);
    console.log(`   Has variants: ${product.variants?.length > 0}`);

    const itemColor = item.color || item.selectedColor;
    const itemSize = item.size || item.selectedSize;
    console.log(`   Item color: ${itemColor}`);
    console.log(`   Item size: ${itemSize}`);

    if (product.variants && product.variants.length > 0 && itemColor && itemSize) {
      console.log('🔍 Product has variants, checking variant stock...');
      const itemColorLower = itemColor.toLowerCase();
      const itemSizeLower = itemSize.toLowerCase();

      let variantFound = false;
      for (const v of product.variants) {
        const matchesColor = (
          v.color?.toLowerCase() === itemColorLower ||
          v.color_ru?.toLowerCase() === itemColorLower
        );
        const matchesSize = (
          v.size?.toLowerCase() === itemSizeLower ||
          v.size_ru?.toLowerCase() === itemSizeLower
        );

        if (matchesColor && matchesSize) {
          variantFound = true;
          console.log(`   ✅ Variant found: ${v.color} • ${v.size}, stock: ${v.stock}`);
          console.log(`   Would deduct: ${item.quantity} units`);
          console.log(`   New stock would be: ${Math.max(0, (v.stock || 0) - item.quantity)}`);
        }
      }

      if (!variantFound) {
        console.log(`   ❌ Variant not found for ${itemColor} • ${itemSize}`);
        console.log('   Available variants:');
        product.variants.forEach(v => {
          console.log(`      - ${v.color} (${v.color_ru}) • ${v.size} (${v.size_ru}): ${v.stock} units`);
        });
      }

      results.push({
        item,
        productId,
        productName: product.name,
        hasVariants: true,
        variantFound,
        requestedVariant: { color: itemColor, size: itemSize },
        availableVariants: product.variants
      });
    } else {
      console.log(`📦 Regular product, current stock: ${product.stock}`);
      console.log(`   Would deduct: ${item.quantity} units`);
      console.log(`   New stock would be: ${Math.max(0, (product.stock || 0) - item.quantity)}`);

      results.push({
        item,
        productId,
        productName: product.name,
        hasVariants: false,
        currentStock: product.stock,
        quantity: item.quantity,
        newStock: Math.max(0, (product.stock || 0) - item.quantity)
      });
    }
  }

  return res.json({
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      items: order.items
    },
    results
  });
}
