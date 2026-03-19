import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data - App.jsx will handle showing login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Trigger a storage event to notify other tabs/components
      window.dispatchEvent(new Event('storage'));
    }
    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  // Login
  login: (email, password) => api.post('/auth/login', { email, password }),
  
  // Register
  register: (userData) => api.post('/auth/register', userData),
  
  // Get current user
  me: () => api.get('/auth/me')
};

// Card API methods
export const cardAPI = {
  // Get all cards for authenticated user's tenant
  getAll: () => api.get('/cards'),
  
  // Get single card by tag ID
  getById: (tagId) => api.get(`/cards/${encodeURIComponent(tagId)}`),
  
  // Register new card
  create: (cardData) => api.post('/cards', cardData),
  
  // Update card
  update: (tagId, cardData) => api.put(`/cards/${encodeURIComponent(tagId)}`, cardData),
  
  // Delete card
  delete: (tagId) => api.delete(`/cards/${encodeURIComponent(tagId)}`),
  
  // Get analytics
  getAnalytics: (tagId) => api.get(`/cards/${encodeURIComponent(tagId)}/analytics`)
};

// Tenant API methods
export const tenantAPI = {
  // Get all tenants (public)
  getAll: () => api.get('/tenants'),
  
  // Create new tenant (admin only)
  create: (tenantData) => api.post('/tenants', tenantData)
};

export default api;
