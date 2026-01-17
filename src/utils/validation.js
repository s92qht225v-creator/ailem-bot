/**
 * Validation Utilities for API Endpoints
 * Ensures data integrity before sending to the database
 */

// Custom validation error class
export class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate a string field
 */
export const validateString = (value, fieldName, { required = false, minLength = 0, maxLength = Infinity, pattern = null } = {}) => {
  if (required && (!value || (typeof value === 'string' && !value.trim()))) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value) {
    if (typeof value !== 'string') {
      throw new ValidationError(fieldName, `${fieldName} must be a string`);
    }

    const trimmed = value.trim();

    if (trimmed.length < minLength) {
      throw new ValidationError(fieldName, `${fieldName} must be at least ${minLength} characters`);
    }

    if (trimmed.length > maxLength) {
      throw new ValidationError(fieldName, `${fieldName} must be no more than ${maxLength} characters`);
    }

    if (pattern && !pattern.test(trimmed)) {
      throw new ValidationError(fieldName, `${fieldName} has invalid format`);
    }
  }

  return value?.trim() || null;
};

/**
 * Validate a number field
 */
export const validateNumber = (value, fieldName, { required = false, min = -Infinity, max = Infinity, integer = false } = {}) => {
  if (required && (value === null || value === undefined || value === '')) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value !== null && value !== undefined && value !== '') {
    const num = Number(value);

    if (isNaN(num)) {
      throw new ValidationError(fieldName, `${fieldName} must be a valid number`);
    }

    if (integer && !Number.isInteger(num)) {
      throw new ValidationError(fieldName, `${fieldName} must be a whole number`);
    }

    if (num < min) {
      throw new ValidationError(fieldName, `${fieldName} must be at least ${min}`);
    }

    if (num > max) {
      throw new ValidationError(fieldName, `${fieldName} must be no more than ${max}`);
    }

    return num;
  }

  return null;
};

/**
 * Validate an email field
 */
export const validateEmail = (value, fieldName, { required = false } = {}) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (required && !value) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value && !emailPattern.test(value)) {
    throw new ValidationError(fieldName, `${fieldName} must be a valid email address`);
  }

  return value?.toLowerCase()?.trim() || null;
};

/**
 * Validate a phone number field
 */
export const validatePhone = (value, fieldName, { required = false } = {}) => {
  // Allow digits, spaces, dashes, parentheses, and + for international format
  const phonePattern = /^[\d\s\-\(\)\+]+$/;

  if (required && !value) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value) {
    const cleaned = value.replace(/\s/g, '');
    if (!phonePattern.test(cleaned) || cleaned.length < 7 || cleaned.length > 20) {
      throw new ValidationError(fieldName, `${fieldName} must be a valid phone number`);
    }
  }

  return value?.trim() || null;
};

/**
 * Validate a URL field
 */
export const validateUrl = (value, fieldName, { required = false } = {}) => {
  if (required && !value) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value) {
    try {
      new URL(value);
    } catch {
      throw new ValidationError(fieldName, `${fieldName} must be a valid URL`);
    }
  }

  return value?.trim() || null;
};

/**
 * Validate an array field
 */
export const validateArray = (value, fieldName, { required = false, minItems = 0, maxItems = Infinity, itemValidator = null } = {}) => {
  if (required && (!value || !Array.isArray(value) || value.length === 0)) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value) {
    if (!Array.isArray(value)) {
      throw new ValidationError(fieldName, `${fieldName} must be an array`);
    }

    if (value.length < minItems) {
      throw new ValidationError(fieldName, `${fieldName} must have at least ${minItems} item(s)`);
    }

    if (value.length > maxItems) {
      throw new ValidationError(fieldName, `${fieldName} must have no more than ${maxItems} item(s)`);
    }

    if (itemValidator) {
      value.forEach((item, index) => {
        try {
          itemValidator(item, `${fieldName}[${index}]`);
        } catch (e) {
          throw e;
        }
      });
    }
  }

  return value || [];
};

/**
 * Validate a UUID field
 */
export const validateUUID = (value, fieldName, { required = false } = {}) => {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (required && !value) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value && !uuidPattern.test(value)) {
    throw new ValidationError(fieldName, `${fieldName} must be a valid UUID`);
  }

  return value || null;
};

/**
 * Validate a date field
 */
export const validateDate = (value, fieldName, { required = false, minDate = null, maxDate = null } = {}) => {
  if (required && !value) {
    throw new ValidationError(fieldName, `${fieldName} is required`);
  }

  if (value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(fieldName, `${fieldName} must be a valid date`);
    }

    if (minDate && date < new Date(minDate)) {
      throw new ValidationError(fieldName, `${fieldName} must be after ${minDate}`);
    }

    if (maxDate && date > new Date(maxDate)) {
      throw new ValidationError(fieldName, `${fieldName} must be before ${maxDate}`);
    }

    return date.toISOString();
  }

  return null;
};

/**
 * Sanitize a string to prevent XSS
 */
export const sanitizeString = (value) => {
  if (!value || typeof value !== 'string') return value;

  // Basic HTML entity encoding for common XSS vectors
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// ============================================
// ENTITY-SPECIFIC VALIDATORS
// ============================================

/**
 * Validate product data
 */
export const validateProduct = (product) => {
  const errors = [];

  try {
    validateString(product.name, 'name', { required: true, minLength: 1, maxLength: 200 });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateNumber(product.price, 'price', { required: true, min: 0 });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    if (product.originalPrice || product.salePrice) {
      const original = validateNumber(product.originalPrice || product.price, 'originalPrice', { min: 0 });
      const sale = validateNumber(product.salePrice || product.price, 'salePrice', { min: 0 });

      if (sale >= original) {
        errors.push('Sale price must be less than original price');
      }
    }
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(product.category, 'category', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    if (product.stock !== undefined) {
      validateNumber(product.stock, 'stock', { min: 0, integer: true });
    }
  } catch (e) {
    errors.push(e.message);
  }

  try {
    if (product.weight) {
      validateNumber(product.weight, 'weight', { min: 0 });
    }
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('product', errors.join('; '));
  }

  return true;
};

/**
 * Validate order data
 */
export const validateOrder = (order) => {
  const errors = [];

  try {
    validateString(order.userName, 'userName', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validatePhone(order.userPhone, 'userPhone', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateArray(order.items, 'items', { required: true, minItems: 1 });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateNumber(order.total, 'total', { required: true, min: 0 });
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('order', errors.join('; '));
  }

  return true;
};

/**
 * Validate category data
 */
export const validateCategory = (category) => {
  const errors = [];

  try {
    validateString(category.name, 'name', { required: true, minLength: 1, maxLength: 100 });
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('category', errors.join('; '));
  }

  return true;
};

/**
 * Validate shipping rate data
 */
export const validateShippingRate = (rate) => {
  const errors = [];

  try {
    validateString(rate.courier, 'courier', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(rate.state, 'state', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateNumber(rate.firstKg, 'firstKg', { required: true, min: 0 });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateNumber(rate.additionalKg, 'additionalKg', { min: 0 });
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('shippingRate', errors.join('; '));
  }

  return true;
};

/**
 * Validate pickup point data
 */
export const validatePickupPoint = (point) => {
  const errors = [];

  try {
    validateString(point.name, 'name', { required: true, minLength: 1 });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(point.address, 'address', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(point.courierService, 'courierService', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(point.state, 'state', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateString(point.city, 'city', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('pickupPoint', errors.join('; '));
  }

  return true;
};

/**
 * Validate review data
 */
export const validateReview = (review) => {
  const errors = [];

  try {
    validateUUID(review.product_id || review.productId, 'productId', { required: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    validateNumber(review.rating, 'rating', { required: true, min: 1, max: 5, integer: true });
  } catch (e) {
    errors.push(e.message);
  }

  try {
    if (review.comment) {
      validateString(review.comment, 'comment', { maxLength: 1000 });
    }
  } catch (e) {
    errors.push(e.message);
  }

  if (errors.length > 0) {
    throw new ValidationError('review', errors.join('; '));
  }

  return true;
};
