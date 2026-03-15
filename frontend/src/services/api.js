import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// API methods
export const cardAPI = {
  // Get all cards for tenant
  getAll: (tenantId) => api.get('/cards', {
    headers: { 'x-tenant-id': tenantId }
  }),
  
  // Get single card by tag ID
  getById: (tagId, tenantId) => api.get(`/cards/${encodeURIComponent(tagId)}`, {
    headers: { 'x-tenant-id': tenantId }
  }),
  
  // Register new card
  create: (cardData, tenantId) => api.post('/cards', cardData, {
    headers: { 'x-tenant-id': tenantId }
  }),
  
  // Update card
  update: (tagId, cardData, tenantId) => api.put(`/cards/${encodeURIComponent(tagId)}`, cardData, {
    headers: { 'x-tenant-id': tenantId }
  }),
  
  // Delete card
  delete: (tagId, tenantId) => api.delete(`/cards/${encodeURIComponent(tagId)}`, {
    headers: { 'x-tenant-id': tenantId }
  }),
  
  // Get analytics
  getAnalytics: (tagId, tenantId) => api.get(`/cards/${encodeURIComponent(tagId)}/analytics`, {
    headers: { 'x-tenant-id': tenantId }
  })
};

export const tenantAPI = {
  // Get all tenants
  getAll: () => api.get('/tenants'),
  
  // Create new tenant
  create: (tenantData) => api.post('/tenants', tenantData)
};

export default api;
