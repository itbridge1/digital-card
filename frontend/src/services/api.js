import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add tenant ID to all requests
api.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

// API methods
export const cardAPI = {
  // Get all cards for tenant
  getAll: () => api.get('/cards'),
  
  // Get single card by tag ID
  getById: (tagId) => api.get(`/cards/${tagId}`),
  
  // Register new card
  create: (cardData) => api.post('/cards', cardData),
  
  // Update card
  update: (tagId, cardData) => api.put(`/cards/${tagId}`, cardData),
  
  // Delete card
  delete: (tagId) => api.delete(`/cards/${tagId}`),
  
  // Get analytics
  getAnalytics: (tagId) => api.get(`/cards/${tagId}/analytics`)
};

export const tenantAPI = {
  // Get all tenants
  getAll: () => api.get('/tenants'),
  
  // Create new tenant
  create: (tenantData) => api.post('/tenants', tenantData)
};

export default api;
