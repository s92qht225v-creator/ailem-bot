#!/usr/bin/env node

// Manually test stock deduction for a Click order
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Same deductStock function from webhook
async function deductStock(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.log('⚠️ No items found in order, skipping stock deduction');
    return;
  }

  try {
    for (const item of order.items) {
      // Get product ID - support both 'id' and 'productId' field names
      const productId = item.id || item.productId;
      
      if (!productId) {
        console.error('❌ Item missing product ID:', item);
        continue;
      }

      console.log(`\n🔍 Processing item: ${item.productName || 'Unknown'}`);
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Color: ${item.color || item.selectedColor || 'N/A'}`);
      console.log(`   Size: ${item.size || item.selectedSize || 'N/A'}`);

      // Fetch the product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        console.error(`❌ Product not found for ID ${productId}:`, productError);
        continue;
      }

      console.log(`\n✅ Found product: ${product.name}`);
      console.log(`   Current regular stock: ${product.stock || 0}`);
      console.log(`   Has variants: ${product.variants?.length > 0 ? 'Yes' : 'No'}`);

      // Check if product uses variant tracking
      // Support both 'color'/'size' and 'selectedColor'/'selectedSize'
      const itemColor = item.color || item.selectedColor;
      const itemSize = item.size || item.selectedSize;
      
      if (product.variants && product.variants.length > 0 && itemColor && itemSize) {
        // Deduct variant stock
        console.log(`\n📦 Deducting variant stock for: ${itemColor} • ${itemSize}`);
        
        const matchingVariant = product.variants.find(v => 
          v.color?.toLowerCase() === itemColor.toLowerCase() &&
          v.size?.toLowerCase() === itemSize.toLowerCase()
        );

        if (matchingVariant) {
          console.log(`   Current variant stock: ${matchingVariant.stock || 0}`);
          console.log(`   After deduction: ${Math.max(0, (matchingVariant.stock || 0) - item.quantity)}`);
        } else {
          console.log(`   ❌ Variant not found!`);
          console.log(`   Available variants:`, product.variants.map(v => `${v.color} • ${v.size} (${v.stock})`));
          continue;
        }

        const updatedVariants = product.variants.map(v => {
          if (v.color?.toLowerCase() === itemColor.toLowerCase() &&
              v.size?.toLowerCase() === itemSize.toLowerCase()) {
            return { ...v, stock: Math.max(0, (v.stock || 0) - item.quantity) };
          }
          return v;
        });

        const { error: updateError } = await supabase
          .from('products')
          .update({ variants: updatedVariants })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Failed to update variant stock for ${product.name}:`, updateError);
        } else {
          console.log(`✅ Successfully deducted ${item.quantity} units from ${itemColor} • ${itemSize} variant of ${product.name}`);
        }
      } else {
        // Deduct regular stock
        const newStock = Math.max(0, (product.stock || 0) - item.quantity);
        console.log(`\n📦 Deducting regular stock`);
        console.log(`   ${product.stock} → ${newStock}`);

        const { error: updateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Failed to update stock for ${product.name}:`, updateError);
        } else {
          console.log(`✅ Successfully deducted ${item.quantity} units from ${product.name} stock`);
        }
      }
    }

    console.log('\n✅ Stock deduction completed');
  } catch (error) {
    console.error('❌ Failed to deduct stock:', error);
  }
}

async function testStockDeduction() {
  // Get the most recent Click order
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .not('click_order_id', 'is', null)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !orders || orders.length === 0) {
    console.error('❌ No approved Click orders found');
    return;
  }

  const order = orders[0];
  console.log('═══════════════════════════════════════════════');
  console.log('🧪 TESTING STOCK DEDUCTION');
  console.log('═══════════════════════════════════════════════');
  console.log(`Order: ${order.order_number}`);
  console.log(`Status: ${order.status}`);
  console.log(`Items: ${order.items?.length || 0}`);
  console.log('═══════════════════════════════════════════════');

  await deductStock(order);
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Test completed. Re-run check script to verify.');
  console.log('═══════════════════════════════════════════════');
}

testStockDeduction().catch(console.error);
