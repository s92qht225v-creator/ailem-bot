// Admin API client - calls backend API with service role key
const API_BASE_URL = import.meta.env.PROD
  ? '' // Same domain in production (Vercel)
  : 'http://localhost:3000'; // Local development

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'your-secure-admin-password-123';

async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': ADMIN_PASSWORD,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Pickup Points API
export const adminPickupPointsAPI = {
  async getAll() {
    return apiCall('/admin/pickup-points');
  },

  async create(data) {
    return apiCall('/admin/pickup-points', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return apiCall(`/admin/pickup-points?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return apiCall(`/admin/pickup-points?id=${id}`, {
      method: 'DELETE'
    });
  }
};

// Shipping Rates API
export const adminShippingRatesAPI = {
  async getAll() {
    return apiCall('/admin/shipping-rates');
  },

  async create(data) {
    return apiCall('/admin/shipping-rates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(id, data) {
    return apiCall(`/admin/shipping-rates?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async delete(id) {
    return apiCall(`/admin/shipping-rates?id=${id}`, {
      method: 'DELETE'
    });
  }
};
