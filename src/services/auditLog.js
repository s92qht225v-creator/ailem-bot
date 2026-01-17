import { supabase } from '../lib/supabase';

/**
 * Audit Trail Service
 * Logs all admin actions for accountability and debugging
 */

// Action types for categorization
export const AUDIT_ACTIONS = {
  // Product actions
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',

  // Order actions
  ORDER_APPROVE: 'order.approve',
  ORDER_REJECT: 'order.reject',
  ORDER_SHIP: 'order.ship',
  ORDER_DELIVER: 'order.deliver',
  ORDER_BULK_ACTION: 'order.bulk_action',

  // Category actions
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

  // Shipping rate actions
  SHIPPING_RATE_CREATE: 'shipping_rate.create',
  SHIPPING_RATE_UPDATE: 'shipping_rate.update',
  SHIPPING_RATE_DELETE: 'shipping_rate.delete',

  // Pickup point actions
  PICKUP_POINT_CREATE: 'pickup_point.create',
  PICKUP_POINT_UPDATE: 'pickup_point.update',
  PICKUP_POINT_DELETE: 'pickup_point.delete',
  PICKUP_POINT_TOGGLE: 'pickup_point.toggle',

  // User actions
  USER_UPDATE: 'user.update',
  USER_BONUS_ADJUST: 'user.bonus_adjust',

  // Promotion actions
  PROMOTION_CREATE: 'promotion.create',
  PROMOTION_UPDATE: 'promotion.update',
  PROMOTION_DELETE: 'promotion.delete',

  // Settings actions
  SETTINGS_UPDATE: 'settings.update',
  BONUS_CONFIG_UPDATE: 'bonus_config.update',

  // Review actions
  REVIEW_DELETE: 'review.delete',
  REVIEW_MODERATE: 'review.moderate',
};

/**
 * Log an admin action to the audit trail
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type from AUDIT_ACTIONS
 * @param {string} params.entityType - Type of entity (product, order, etc.)
 * @param {string} params.entityId - ID of the affected entity
 * @param {Object} params.oldData - Previous state (for updates)
 * @param {Object} params.newData - New state (for creates/updates)
 * @param {Object} params.metadata - Additional context
 */
export const logAuditAction = async ({
  action,
  entityType,
  entityId,
  oldData = null,
  newData = null,
  metadata = {}
}) => {
  try {
    // Get current admin user
    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id || 'unknown';
    const adminEmail = session?.user?.email || 'unknown';

    const auditEntry = {
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      admin_id: adminId,
      admin_email: adminEmail,
      old_data: oldData ? JSON.stringify(oldData) : null,
      new_data: newData ? JSON.stringify(newData) : null,
      metadata: JSON.stringify(metadata),
      ip_address: null, // Can be populated server-side if needed
      user_agent: navigator?.userAgent || null,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);

    if (error) {
      console.error('Failed to log audit action:', error);
      // Don't throw - audit logging shouldn't break the main operation
    } else {
      console.log(`[AUDIT] ${action} on ${entityType}:${entityId} by ${adminEmail}`);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
    // Silent fail - don't break main operations
  }
};

/**
 * Get audit logs with optional filtering
 */
export const auditLogsAPI = {
  async getAll({ limit = 100, offset = 0, action = null, entityType = null, adminEmail = null, startDate = null, endDate = null } = {}) {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.eq('action', action);
    }
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (adminEmail) {
      query = query.ilike('admin_email', `%${adminEmail}%`);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data, count };
  },

  async getByEntity(entityType, entityId) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', String(entityId))
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByAdmin(adminId, limit = 50) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};

/**
 * Helper to format audit action for display
 */
export const formatAuditAction = (action) => {
  const actionLabels = {
    [AUDIT_ACTIONS.PRODUCT_CREATE]: 'Created product',
    [AUDIT_ACTIONS.PRODUCT_UPDATE]: 'Updated product',
    [AUDIT_ACTIONS.PRODUCT_DELETE]: 'Deleted product',
    [AUDIT_ACTIONS.ORDER_APPROVE]: 'Approved order',
    [AUDIT_ACTIONS.ORDER_REJECT]: 'Rejected order',
    [AUDIT_ACTIONS.ORDER_SHIP]: 'Marked order as shipped',
    [AUDIT_ACTIONS.ORDER_DELIVER]: 'Marked order as delivered',
    [AUDIT_ACTIONS.ORDER_BULK_ACTION]: 'Bulk order action',
    [AUDIT_ACTIONS.CATEGORY_CREATE]: 'Created category',
    [AUDIT_ACTIONS.CATEGORY_UPDATE]: 'Updated category',
    [AUDIT_ACTIONS.CATEGORY_DELETE]: 'Deleted category',
    [AUDIT_ACTIONS.SHIPPING_RATE_CREATE]: 'Created shipping rate',
    [AUDIT_ACTIONS.SHIPPING_RATE_UPDATE]: 'Updated shipping rate',
    [AUDIT_ACTIONS.SHIPPING_RATE_DELETE]: 'Deleted shipping rate',
    [AUDIT_ACTIONS.PICKUP_POINT_CREATE]: 'Created pickup point',
    [AUDIT_ACTIONS.PICKUP_POINT_UPDATE]: 'Updated pickup point',
    [AUDIT_ACTIONS.PICKUP_POINT_DELETE]: 'Deleted pickup point',
    [AUDIT_ACTIONS.PICKUP_POINT_TOGGLE]: 'Toggled pickup point status',
    [AUDIT_ACTIONS.USER_UPDATE]: 'Updated user',
    [AUDIT_ACTIONS.USER_BONUS_ADJUST]: 'Adjusted user bonus points',
    [AUDIT_ACTIONS.PROMOTION_CREATE]: 'Created promotion',
    [AUDIT_ACTIONS.PROMOTION_UPDATE]: 'Updated promotion',
    [AUDIT_ACTIONS.PROMOTION_DELETE]: 'Deleted promotion',
    [AUDIT_ACTIONS.SETTINGS_UPDATE]: 'Updated settings',
    [AUDIT_ACTIONS.BONUS_CONFIG_UPDATE]: 'Updated bonus configuration',
    [AUDIT_ACTIONS.REVIEW_DELETE]: 'Deleted review',
    [AUDIT_ACTIONS.REVIEW_MODERATE]: 'Moderated review',
  };

  return actionLabels[action] || action;
};
