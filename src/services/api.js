import { supabase } from '../lib/supabase';

// ============================================
// CATEGORIES API
// ============================================

export const categoriesAPI = {
  // Get all categories
  async getAll() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Create category
  async create(category) {
    const { data, error } = await supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update category
  async update(id, updates) {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete category
  async delete(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// PRODUCTS API
// ============================================

export const productsAPI = {
  // Get all products
  async getAll() {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch reviews for all products
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('approved', true);

    if (reviewsError) console.error('Failed to fetch reviews:', reviewsError);

    // Map database fields to match app expectations and attach reviews
    return products.map(product => {
      const productReviews = reviews?.filter(r => r.product_id === product.id) || [];

      return {
        ...product,
        category: product.category_name, // Map category_name to category for compatibility
        originalPrice: product.original_price,
        reviewCount: product.review_count,
        variants: product.variants || [],
        reviews: productReviews.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          date: r.created_at?.split('T')[0], // Format: YYYY-MM-DD
          approved: r.approved
        }))
      };
    });
  },

  // Get single product
  async getById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Fetch reviews for this product
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .eq('approved', true);

    if (reviewsError) console.error('Failed to fetch reviews:', reviewsError);

    // Map database fields to match app expectations
    return {
      ...data,
      category: data.category_name,
      originalPrice: data.original_price,
      reviewCount: data.review_count,
      variants: data.variants || [],
      reviews: (reviews || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        rating: r.rating,
        comment: r.comment,
        date: r.created_at?.split('T')[0],
        approved: r.approved
      }))
    };
  },

  // Create product
  async create(product) {
    // Transform app fields to database fields
    const dbProduct = {
      name: product.name,
      description: product.description || null,
      price: product.price,
      original_price: product.originalPrice || (product.salePrice ? product.price : null),
      category_name: product.category,
      image: product.imageUrl || product.image,
      images: product.images || [],
      stock: product.stock || 0,
      weight: product.weight || null,
      badge: product.badge || null,
      material: product.material || null,
      colors: product.colors || [],
      sizes: product.sizes || [],
      tags: product.tags || [],
      variants: product.variants || [],
      rating: 0,
      review_count: 0
    };

    const { data, error} = await supabase
      .from('products')
      .insert([dbProduct])
      .select()
      .single();

    if (error) throw error;

    // Map database fields back to match app expectations
    return {
      ...data,
      category: data.category_name,
      originalPrice: data.original_price,
      reviewCount: data.review_count,
      variants: data.variants || [],
      reviews: []
    };
  },

  // Update product
  async update(id, updates) {
    // Transform app fields to database fields (same as create)
    const dbUpdates = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
    if (updates.category !== undefined) dbUpdates.category_name = updates.category;
    if (updates.imageUrl !== undefined) dbUpdates.image = updates.imageUrl;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.images !== undefined) dbUpdates.images = updates.images;
    if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
    if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
    if (updates.badge !== undefined) dbUpdates.badge = updates.badge;
    if (updates.material !== undefined) dbUpdates.material = updates.material;
    if (updates.colors !== undefined) dbUpdates.colors = updates.colors;
    if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.variants !== undefined) dbUpdates.variants = updates.variants;

    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Fetch reviews for this product
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .eq('approved', true);

    if (reviewsError) console.error('Failed to fetch reviews:', reviewsError);

    // Map database fields to match app expectations
    return {
      ...data,
      category: data.category_name,
      originalPrice: data.original_price,
      reviewCount: data.review_count,
      variants: data.variants || [],
      reviews: (reviews || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        rating: r.rating,
        comment: r.comment,
        date: r.created_at?.split('T')[0],
        approved: r.approved
      }))
    };
  },

  // Delete product
  async delete(id) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// USERS API
// ============================================

export const usersAPI = {
  // Helper function to map database fields to app format
  _mapUserFromDB(user) {
    return {
      ...user,
      telegramId: user.telegram_id,
      photoUrl: user.photo_url,
      bonusPoints: user.bonus_points,
      referralCode: user.referral_code,
      referredBy: user.referred_by,
      totalOrders: user.total_orders,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  },

  // Get user by ID
  async getById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return this._mapUserFromDB(data);
  },

  // Get or create user by email or phone
  async getOrCreateByEmailOrPhone(userData) {
    // Try to find existing user by email or phone
    let query = supabase.from('users').select('*');

    if (userData.email) {
      query = query.eq('email', userData.email);
    } else if (userData.phone) {
      query = query.eq('phone', userData.phone);
    } else {
      throw new Error('Email or phone is required');
    }

    const { data: existingUser } = await query.maybeSingle();

    if (existingUser) return this._mapUserFromDB(existingUser);

    // Create new user
    const newUser = {
      name: userData.name,
      email: userData.email || null,
      phone: userData.phone || null,
      username: userData.username || userData.email || userData.phone,
      referral_code: userData.referralCode,
      bonus_points: 0,
      total_orders: 0
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Get or create user by Telegram ID (legacy, keeping for compatibility)
  async getOrCreate(telegramUser) {
    // Try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramUser.telegramId)
      .maybeSingle();

    if (existingUser) {
      // Update existing user with latest Telegram data (name, photo, username might have changed)
      const updates = {
        name: telegramUser.name,
        username: telegramUser.username || existingUser.username,
        photo_url: telegramUser.photoUrl || existingUser.photo_url
      };

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update user:', updateError);
        return this._mapUserFromDB(existingUser); // Return existing user if update fails
      }

      return this._mapUserFromDB(updatedUser);
    }

    // Create new user
    const newUser = {
      telegram_id: telegramUser.telegramId,
      name: telegramUser.name,
      phone: telegramUser.phone || '',
      username: telegramUser.username || '',
      photo_url: telegramUser.photoUrl || '',
      referral_code: telegramUser.referralCode,
      referred_by: telegramUser.referredBy || null,
      bonus_points: 0,
      total_orders: 0
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Update bonus points
  async updateBonusPoints(userId, points) {
    const { data, error } = await supabase
      .from('users')
      .update({ bonus_points: points })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Update user favorites
  async updateFavorites(userId, favorites) {
    const { data, error } = await supabase
      .from('users')
      .update({ favorites: favorites })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Get all users (admin)
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(user => this._mapUserFromDB(user));
  },

  // Get user by ID (duplicate method, keeping for compatibility)
  async getById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Update user data
  async update(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return this._mapUserFromDB(data);
  },

  // Add favorite product
  async addFavorite(userId, productId) {
    // Get current favorites
    const user = await this.getById(userId);
    const favorites = user.favorites || [];

    if (!favorites.includes(productId)) {
      favorites.push(productId);
      return await this.update(userId, { favorites });
    }

    return user;
  },

  // Remove favorite product
  async removeFavorite(userId, productId) {
    const user = await this.getById(userId);
    const favorites = (user.favorites || []).filter(id => id !== productId);
    return await this.update(userId, { favorites });
  },

  // Increment referral count
  async incrementReferrals(userId) {
    const user = await this.getById(userId);
    const referrals = (user.referrals || 0) + 1;
    return await this.update(userId, { referrals });
  },

  // Get user by referral code
  async getByReferralCode(referralCode) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('referral_code', referralCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No user found with this referral code
        return null;
      }
      throw error;
    }
    return data;
  }
};

// ============================================
// ORDERS API
// ============================================

export const ordersAPI = {
  // Helper function to map database fields to app format
  _mapOrderFromDB(order) {
    return {
      ...order,
      // Map order_number to id for backward compatibility
      id: order.order_number || order.id,
      orderNumber: order.order_number,
      userId: order.user_id,
      userTelegramId: order.user_telegram_id, // Map Telegram ID for notifications
      userName: order.user_name,
      userPhone: order.user_phone,
      deliveryInfo: order.delivery_info,
      bonusDiscount: order.bonus_discount,
      bonusPointsUsed: order.bonus_points_used,
      deliveryFee: order.delivery_fee,
      paymentScreenshot: order.payment_screenshot,
      date: order.date || (order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : ''),
      createdAt: order.created_at
    };
  },

  // Get all orders
  async getAll() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(order => this._mapOrderFromDB(order));
  },

  // Get orders by user
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(order => this._mapOrderFromDB(order));
  },

  // Get single order
  async getById(id) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return this._mapOrderFromDB(data);
  },

  // Create order
  async create(order) {
    // Transform app fields to database fields
    const dbOrder = {
      // DO NOT set id - let Supabase auto-generate UUID
      order_number: order.id, // Store human-readable ID in order_number field
      user_id: order.userId,
      user_telegram_id: order.userTelegramId || null, // Add Telegram ID for notifications
      user_name: order.userName,
      user_phone: order.userPhone,
      items: order.items, // JSONB field
      delivery_info: order.deliveryInfo, // JSONB field
      courier: order.courier,
      subtotal: order.subtotal,
      bonus_discount: order.bonusDiscount || 0,
      bonus_points_used: order.bonusPointsUsed || 0,
      delivery_fee: order.deliveryFee,
      total: order.total,
      payment_screenshot: order.paymentScreenshot || null,
      status: order.status || 'pending',
      date: order.date || new Date().toISOString().split('T')[0], // Add date field
      created_at: order.createdAt || new Date().toISOString()
    };

    console.log('📤 Creating order in Supabase:', dbOrder);

    const { data, error } = await supabase
      .from('orders')
      .insert([dbOrder])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create order:', error);
      throw error;
    }

    console.log('✅ Order created successfully:', data);

    // Map database fields back to app format
    return this._mapOrderFromDB(data);
  },

  // Update order status
  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this._mapOrderFromDB(data); // Map fields including userTelegramId
  },

  // Delete order
  async delete(id) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// REVIEWS API
// ============================================

export const reviewsAPI = {
  // Helper function to map database fields to app format
  _mapReviewFromDB(review) {
    return {
      ...review,
      productName: review.products?.name || 'Unknown Product',
      productImage: review.products?.image || null,
      date: review.created_at ? new Date(review.created_at).toISOString() : new Date().toISOString(),
      userId: review.user_id,
      productId: review.product_id,
      orderId: review.order_id,
      userName: review.user_name,
      createdAt: review.created_at
    };
  },

  // Get all reviews
  async getAll() {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        products:product_id (name, image)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to include product name, image and mapped fields
    return data.map(review => this._mapReviewFromDB(review));
  },

  // Get reviews by product
  async getByProductId(productId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(review => this._mapReviewFromDB(review));
  },

  // Get approved reviews by product
  async getApprovedByProductId(productId) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(review => this._mapReviewFromDB(review));
  },

  // Create review
  async create(review) {
    const { data, error } = await supabase
      .from('reviews')
      .insert([review])
      .select()
      .single();

    if (error) throw error;
    return this._mapReviewFromDB(data);
  },

  // Approve review
  async approve(id) {
    const { data, error } = await supabase
      .from('reviews')
      .update({ approved: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this._mapReviewFromDB(data);
  },

  // Delete review
  async delete(id) {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// PICKUP POINTS API
// ============================================

export const pickupPointsAPI = {
  // Helper function to map database fields to app format
  _mapPickupPointFromDB(point) {
    return {
      id: point.id,
      courierService: point.courier_service,
      state: point.state,
      city: point.city,
      address: point.address,
      workingHours: point.working_hours,
      phone: point.phone,
      active: point.active
    };
  },

  // Get all active pickup points
  async getAll() {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .eq('active', true)
      .order('courier_service');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Get all pickup points (including inactive - for admin)
  async getAllIncludingInactive() {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .order('courier_service');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Get pickup points by courier service
  async getByCourier(courierService) {
    const { data, error } = await supabase
      .from('pickup_points')
      .select('*')
      .eq('courier_service', courierService)
      .eq('active', true)
      .order('city');

    if (error) throw error;

    return (data || []).map(point => this._mapPickupPointFromDB(point));
  },

  // Create pickup point
  async create(pickupPoint) {
    const dbPoint = {
      courier_service: pickupPoint.courierService,
      state: pickupPoint.state,
      city: pickupPoint.city,
      address: pickupPoint.address,
      working_hours: pickupPoint.workingHours,
      phone: pickupPoint.phone,
      active: pickupPoint.active !== false
    };

    const { data, error } = await supabase
      .from('pickup_points')
      .insert([dbPoint])
      .select()
      .single();

    if (error) throw error;

    return this._mapPickupPointFromDB(data);
  },

  // Update pickup point
  async update(id, updates) {
    const dbUpdates = {};
    if (updates.courierService !== undefined) dbUpdates.courier_service = updates.courierService;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.active !== undefined) dbUpdates.active = updates.active;

    const { data, error } = await supabase
      .from('pickup_points')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this._mapPickupPointFromDB(data);
  },

  // Delete pickup point
  async delete(id) {
    const { error } = await supabase
      .from('pickup_points')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// STORAGE API (Image Upload)
// ============================================

export const storageAPI = {
  // Upload image to Supabase Storage
  async uploadImage(file, folder = 'products', bucket = 'product-images') {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`📤 Uploading to Supabase Storage: ${bucket}/${fileName}`);

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      console.log('✅ Image uploaded successfully:', publicUrl);

      return {
        path: fileName,
        url: publicUrl,
        bucket: bucket
      };
    } catch (err) {
      console.error('❌ Failed to upload image:', err);
      throw err;
    }
  },

  // Upload payment screenshot to private bucket
  async uploadPaymentScreenshot(file) {
    const result = await this.uploadImage(file, 'payments', 'payment-screenshots');

    // Generate signed URL that expires in 1 year (for private bucket access)
    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .createSignedUrl(result.path, 31536000); // 1 year in seconds

    if (error) {
      console.error('Failed to create signed URL:', error);
      return result; // Fallback to public URL
    }

    return {
      ...result,
      url: data.signedUrl // Use signed URL instead of public URL
    };
  },

  // Upload product image to public bucket
  async uploadProductImage(file) {
    return await this.uploadImage(file, 'products', 'product-images');
  },

  // Get signed URL for private payment screenshot
  async getPaymentScreenshotUrl(path) {
    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .createSignedUrl(path, 31536000); // 1 year

    if (error) {
      console.error('Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  },

  // Upload multiple images
  async uploadMultipleImages(files, folder = 'products') {
    const uploadPromises = Array.from(files).map(file =>
      this.uploadImage(file, folder)
    );
    return await Promise.all(uploadPromises);
  },

  // Delete image from Supabase Storage
  async deleteImage(path) {
    try {
      console.log('🗑️ Deleting image from Supabase Storage:', path);

      const { error } = await supabase.storage
        .from('product-images')
        .remove([path]);

      if (error) throw error;

      console.log('✅ Image deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete image:', err);
      throw err;
    }
  },

  // Get public URL for existing image
  getPublicUrl(path) {
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    return publicUrl;
  }
};

// ============================================
// MIGRATION HELPERS
// ============================================

export const migrationAPI = {
  // Migrate products from localStorage to Supabase
  async migrateProducts(products) {
    // Transform products to match database schema
    const productsToInsert = products.map(product => ({
      name: product.name,
      description: product.description,
      price: product.price,
      original_price: product.originalPrice || null,
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
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (error) throw error;
    return data;
  }
};
