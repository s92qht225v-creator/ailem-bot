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

    // Map database fields to match app expectations
    return products.map(product => {
      const productReviews = reviews?.filter(r => r.product_id === product.id) || [];

      return {
        ...product,
        category: product.category_name,
        originalPrice: product.original_price,
        reviewCount: product.review_count,
        variants: product.variants || [],
        reviews: productReviews.map(r => ({
          id: r.id,
          userId: r.user_id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          date: r.created_at?.split('T')[0],
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
      volume_pricing: product.volume_pricing || null,
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
    // Transform app fields to database fields
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
    if (updates.volume_pricing !== undefined) dbUpdates.volume_pricing = updates.volume_pricing;

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

  // Update user cart
  async updateCart(userId, cart) {
    const { data, error } = await supabase
      .from('users')
      .update({ cart: cart })
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
      // Keep database UUID as dbId for updates
      dbId: order.id,
      // Map order_number to id for display
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
      paymeOrderId: order.payme_order_id,
      clickOrderId: order.click_order_id,
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

    console.log('📦 Orders fetched from database (first 3):',
      (data || []).slice(0, 3).map(o => ({
        order_number: o.order_number,
        created_at: o.created_at,
        status: o.status
      }))
    );

    const mapped = (data || []).map(order => this._mapOrderFromDB(order));

    console.log('📦 Orders after mapping (first 3):',
      mapped.slice(0, 3).map(o => ({
        id: o.id,
        created_at: o.created_at,
        createdAt: o.createdAt,
        status: o.status
      }))
    );

    return mapped;
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
    // Check if ID looks like a UUID (contains dashes in UUID pattern)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let data, error;

    if (isUUID) {
      // Query by UUID id field
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      data = result.data;
      error = result.error;
    } else {
      // Query by order_number field (human-readable ID like "ORD-123-456")
      const result = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', id)
        .maybeSingle();

      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    if (!data) throw new Error(`Order not found: ${id}`);

    return this._mapOrderFromDB(data);
  },

  // Create order
  async create(order) {
    // Generate UUID for id field - with fallback for environments without crypto.randomUUID
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    // Transform app fields to database fields
    const dbOrder = {
      id: uuid, // Generate UUID for primary key
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
      payme_order_id: order.paymeOrderId || null,
      click_order_id: order.clickOrderId || null, // Click order ID
      status: order.status || 'pending'
      // created_at is auto-generated by Supabase with default value
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
    console.log('🔍 Updating order status. ID received:', id, 'Status:', status);
    
    // First, try to find the order by order_number (human-readable ID)
    const { data: foundOrders, error: findError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', id);
    
    if (findError) {
      console.error('❌ Error finding order:', findError);
      throw findError;
    }
    
    if (!foundOrders || foundOrders.length === 0) {
      // If not found by order_number, try by UUID id
      console.log('⚠️ Order not found by order_number, trying UUID...');
      const { data: uuidOrders, error: uuidError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id);
      
      if (uuidError) throw uuidError;
      if (!uuidOrders || uuidOrders.length === 0) {
        throw new Error(`Order not found with id: ${id}`);
      }
      
      // Update using UUID
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      console.log('✅ Order updated by UUID:', updated);
      return this._mapOrderFromDB(updated);
    }
    
    // Update using the found order's actual database id
    const actualDbId = foundOrders[0].id;
    console.log('📝 Found order. DB ID:', actualDbId);
    
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', actualDbId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }
    
    console.log('✅ Order status updated successfully');
    return this._mapOrderFromDB(updated);
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
    // Get the max display_order to append new point at the end
    const { data: maxOrderData } = await supabase
      .from('pickup_points')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const dbPoint = {
      courier_service: pickupPoint.courierService,
      state: pickupPoint.state,
      city: pickupPoint.city,
      address: pickupPoint.address,
      working_hours: pickupPoint.workingHours,
      phone: pickupPoint.phone,
      active: pickupPoint.active !== false,
      display_order: nextOrder
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
    console.log('🗑️ Attempting to delete pickup point:', id);
    const { data, error } = await supabase
      .from('pickup_points')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Delete failed with error:', error);
      throw error;
    }

    console.log('✅ Delete successful, deleted rows:', data);
    return data;
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
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`📤 Uploading to Supabase Storage: ${bucket}/${fileName}`);
      console.log(`📄 File type: ${file.type}, Extension: ${fileExt}`);

      // Determine content type
      let contentType = file.type;
      if (fileExt === 'svg') {
        contentType = 'image/svg+xml';
      }

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

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

  // Upload product image to public bucket
  async uploadProductImage(file) {
    return await this.uploadImage(file, 'products', 'product-images');
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
// APP SETTINGS API
// ============================================

export const settingsAPI = {
  // Get all settings
  async getSettings() {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Failed to fetch settings:', error);
      // Return defaults if table doesn't exist yet
      return {
        banners: [{
          title: 'Summer Sale',
          subtitle: 'Up to 50% Off on Selected Items',
          imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop',
          enabled: true
        }],
        sale_banner: {
          title: 'Summer Sale',
          subtitle: 'Up to 50% Off on Selected Items',
          imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=400&fit=crop',
          enabled: true
        },
        sale_timer: {
          endDate: '2025-12-31T23:59:59',
          enabled: true
        }
      };
    }

    return {
      banners: data.banners || (data.sale_banner ? [data.sale_banner] : []),
      sale_banner: data.sale_banner,
      sale_timer: data.sale_timer,
      bonus_config: data.bonus_config || { purchaseBonus: 10, referralCommission: 10 }
    };
  },

  // Update banners array (new format)
  async updateBanners(banners) {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ banners })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data.banners;
  },

  // Update single banner settings (legacy support)
  async updateBanner(banner) {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ sale_banner: banner })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data.sale_banner;
  },

  // Update timer settings
  async updateTimer(timer) {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ sale_timer: timer })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data.sale_timer;
  },

  // Update bonus configuration
  async updateBonusConfig(bonusConfig) {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ bonus_config: bonusConfig })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data.bonus_config;
  },

  // Update inventory settings
  async updateInventorySettings(inventorySettings) {
    const { data, error} = await supabase
      .from('app_settings')
      .update({ inventory: inventorySettings })
      .eq('id', 1)
      .select()
      .single();

    if (error) throw error;
    return data.inventory;
  }
};

// ============================================
// SHIPPING RATES API
// ============================================

export const shippingRatesAPI = {
  // Get all shipping rates
  async getAll() {
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('*')
      .order('courier', { ascending: true });

    if (error) {
      console.error('Failed to fetch shipping rates:', error);
      // Return defaults if table doesn't exist
      return [
        { id: 1, courier: 'BTS', state: 'Tashkent Region', firstKg: 15000, additionalKg: 5000 },
        { id: 2, courier: 'BTS', state: 'Samarkand Region', firstKg: 20000, additionalKg: 7000 },
        { id: 3, courier: 'Starex', state: 'Tashkent Region', firstKg: 18000, additionalKg: 6000 },
        { id: 4, courier: 'EMU', state: 'Tashkent Region', firstKg: 12000, additionalKg: 4000 },
        { id: 5, courier: 'UzPost', state: 'Tashkent Region', firstKg: 10000, additionalKg: 3000 },
        { id: 6, courier: 'Yandex', state: 'Tashkent', firstKg: 25000, additionalKg: 0 }
      ];
    }

    return data.map(rate => ({
      id: rate.id,
      courier: rate.courier,
      state: rate.state,
      firstKg: rate.first_kg,
      additionalKg: rate.additional_kg,
      paymentType: rate.payment_type || 'prepaid' // Default to prepaid for backward compatibility
    }));
  },

  // Create shipping rate
  async create(rate) {
    const dbRate = {
      courier: rate.courier,
      state: rate.state,
      first_kg: rate.firstKg,
      additional_kg: rate.additionalKg,
      payment_type: rate.paymentType || 'prepaid' // Default to prepaid
    };

    const { data, error } = await supabase
      .from('shipping_rates')
      .insert([dbRate])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      courier: data.courier,
      state: data.state,
      firstKg: data.first_kg,
      additionalKg: data.additional_kg,
      paymentType: data.payment_type || 'prepaid'
    };
  },

  // Update shipping rate
  async update(id, updates) {
    const dbUpdates = {};
    if (updates.courier !== undefined) dbUpdates.courier = updates.courier;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.firstKg !== undefined) dbUpdates.first_kg = updates.firstKg;
    if (updates.additionalKg !== undefined) dbUpdates.additional_kg = updates.additionalKg;
    if (updates.paymentType !== undefined) dbUpdates.payment_type = updates.paymentType;

    const { data, error } = await supabase
      .from('shipping_rates')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      courier: data.courier,
      state: data.state,
      firstKg: data.first_kg,
      additionalKg: data.additional_kg,
      paymentType: data.payment_type || 'prepaid'
    };
  },

  // Delete shipping rate
  async delete(id) {
    const { error } = await supabase
      .from('shipping_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
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

// ============================================
// REFERRALS API
// ============================================

export const referralsAPI = {
  // Create a new referral when a user signs up with a referral code
  async createReferral(referrerId, referredId, referralCode) {
    const { data, error } = await supabase
      .from('referrals')
      .insert([{
        referrer_id: referrerId,
        referred_id: referredId,
        referral_code: referralCode,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all referrals for a user (as referrer)
  async getUserReferrals(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referred:referred_id (
          id,
          name,
          telegram_id,
          created_at
        )
      `)
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Get referral stats for a user
  async getReferralStats(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select('status, reward_amount')
      .eq('referrer_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      rewarded: data.filter(r => r.status === 'rewarded').length,
      totalEarnings: data
        .filter(r => r.status === 'rewarded')
        .reduce((sum, r) => sum + (r.reward_amount || 0), 0)
    };

    return stats;
  },

  // Check if user was referred
  async getUserReferralInfo(userId) {
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:referrer_id (
          id,
          name,
          referral_code
        )
      `)
      .eq('referred_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  // Generate share link for product
  generateShareLink(botUsername, userId, productId = null) {
    const user = userId;
    // Format: /start=ref_USERID or /start=ref_USERID_prod_PRODUCTID
    const param = productId
      ? `ref_${user}_prod_${productId}`
      : `ref_${user}`;

    return `https://t.me/${botUsername}?start=${param}`;
  }
};

// ============================================
// STOCK NOTIFICATIONS API
// ============================================

export const stockNotificationsAPI = {
  // Subscribe user to stock notification
  async subscribe(userId, productId, variantColor = null, variantSize = null) {
    try {
      const { data, error} = await supabase
        .from('stock_notifications')
        .insert([{
          user_id: userId,
          product_id: productId,
          variant_color: variantColor,
          variant_size: variantSize,
          notified: false
        }])
        .select()
        .single();

      if (error) {
        // Handle duplicate subscription gracefully
        if (error.code === '23505') {
          console.log('User already subscribed to this product notification');
          return { alreadySubscribed: true };
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error subscribing to stock notification:', error);
      throw error;
    }
  },

  // Unsubscribe user from stock notification
  async unsubscribe(userId, productId, variantColor = null, variantSize = null) {
    let query = supabase
      .from('stock_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    // Add variant filters if specified
    if (variantColor !== null) {
      query = query.eq('variant_color', variantColor);
    } else {
      query = query.is('variant_color', null);
    }

    if (variantSize !== null) {
      query = query.eq('variant_size', variantSize);
    } else {
      query = query.is('variant_size', null);
    }

    const { error } = await query;
    if (error) throw error;
    return true;
  },

  // Check if user is subscribed
  async isSubscribed(userId, productId, variantColor = null, variantSize = null) {
    let query = supabase
      .from('stock_notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('notified', false);

    // Add variant filters if specified
    if (variantColor !== null) {
      query = query.eq('variant_color', variantColor);
    } else {
      query = query.is('variant_color', null);
    }

    if (variantSize !== null) {
      query = query.eq('variant_size', variantSize);
    } else {
      query = query.is('variant_size', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return !!data;
  },

  // Get all active notifications for a user
  async getUserNotifications(userId) {
    const { data, error } = await supabase
      .from('stock_notifications')
      .select(`
        *,
        product:products (
          id,
          name,
          image,
          price
        )
      `)
      .eq('user_id', userId)
      .eq('notified', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get all users waiting for a specific product/variant
  async getSubscribersForProduct(productId, variantColor = null, variantSize = null) {
    let query = supabase
      .from('stock_notifications')
      .select(`
        *,
        user:users (
          id,
          telegram_id,
          name
        )
      `)
      .eq('product_id', productId)
      .eq('notified', false);

    // Filter by variant if specified
    if (variantColor !== null) {
      query = query.eq('variant_color', variantColor);
    }

    if (variantSize !== null) {
      query = query.eq('variant_size', variantSize);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Mark notifications as sent
  async markAsNotified(notificationIds) {
    const { error } = await supabase
      .from('stock_notifications')
      .update({ notified: true })
      .in('id', notificationIds);

    if (error) throw error;
    return true;
  }
};
