import { supabase } from '../lib/supabase.js';
import { products } from '../data/products.js';

/**
 * Migration Script: Migrate products and reviews from localStorage to Supabase
 *
 * This script:
 * 1. Gets category IDs from Supabase (categories were pre-loaded via SQL)
 * 2. Transforms product data to match database schema
 * 3. Inserts products into Supabase
 * 4. Extracts and inserts reviews separately
 */

async function migrateProducts() {
  try {
    console.log('🚀 Starting migration to Supabase...\n');

    // Step 1: Get categories from Supabase to map category names to IDs
    console.log('📋 Fetching categories from Supabase...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    console.log(`✅ Found ${categories.length} categories`);

    // Create a map of category name to ID
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Step 2: Transform products to match database schema
    console.log('\n🔄 Transforming products...');
    const productsToInsert = products.map(product => {
      const categoryId = categoryMap[product.category];

      if (!categoryId) {
        console.warn(`⚠️  Category "${product.category}" not found for product "${product.name}"`);
      }

      return {
        name: product.name,
        description: product.description,
        price: product.price,
        original_price: product.originalPrice || null,
        category_id: categoryId || null,
        category_name: product.category,
        image: product.image,
        images: product.images || [product.image],
        stock: product.stock,
        badge: product.badge || null,
        material: product.material || null,
        colors: product.colors || [],
        sizes: product.sizes || [],
        tags: product.tags || [],
        rating: product.rating || 0,
        review_count: product.reviewCount || 0
      };
    });

    console.log(`✅ Transformed ${productsToInsert.length} products`);

    // Step 3: Insert products
    console.log('\n📦 Inserting products into Supabase...');
    const { data: insertedProducts, error: productsError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (productsError) {
      throw new Error(`Failed to insert products: ${productsError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedProducts.length} products`);

    // Step 4: Extract and insert reviews
    console.log('\n💬 Processing reviews...');
    const allReviews = [];

    products.forEach((product, index) => {
      if (product.reviews && product.reviews.length > 0) {
        const productId = insertedProducts[index].id;

        product.reviews.forEach(review => {
          allReviews.push({
            product_id: productId,
            user_id: null, // Will be filled when user system is connected
            user_name: review.userName,
            rating: review.rating,
            comment: review.comment,
            approved: review.approved || false,
            created_at: review.date ? new Date(review.date).toISOString() : new Date().toISOString()
          });
        });
      }
    });

    if (allReviews.length > 0) {
      console.log(`📝 Inserting ${allReviews.length} reviews...`);
      const { data: insertedReviews, error: reviewsError } = await supabase
        .from('reviews')
        .insert(allReviews)
        .select();

      if (reviewsError) {
        throw new Error(`Failed to insert reviews: ${reviewsError.message}`);
      }

      console.log(`✅ Successfully inserted ${insertedReviews.length} reviews`);
    } else {
      console.log('ℹ️  No reviews to migrate');
    }

    // Step 5: Display summary
    console.log('\n✨ Migration Summary:');
    console.log('─────────────────────────────────');
    console.log(`📦 Products migrated: ${insertedProducts.length}`);
    console.log(`💬 Reviews migrated: ${allReviews.length}`);
    console.log('─────────────────────────────────');
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('1. Verify data in Supabase Table Editor');
    console.log('2. Update AdminContext to use Supabase API');
    console.log('3. Update UserContext to use Supabase API');
    console.log('4. Test the application\n');

    return {
      success: true,
      productsCount: insertedProducts.length,
      reviewsCount: allReviews.length
    };

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateProducts().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { migrateProducts };
