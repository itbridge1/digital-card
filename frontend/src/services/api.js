import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const SOCKET_BASE_URL = (
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, "")
).replace(/\/$/, "");

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add JWT token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // For FormData, remove Content-Type so axios sets it with proper boundary
  if (config.data instanceof FormData) {
    console.log("📡 Sending FormData request to:", config.url);
    console.log("📦 FormData contents:", Array.from(config.data.entries()));
    delete config.headers['Content-Type'];
  }
  
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("storage"));
    }
    return Promise.reject(error);
  },
);

// Auth API methods
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (userData) => api.post("/auth/register", userData),
  me: () => api.get("/auth/me"),
  getUsers: (tenantId) =>
    api.get("/auth/users", { params: tenantId ? { tenantId } : {} }),
};

// Manager account management (admin only)
export const managerAPI = {
  getAll: () => api.get("/auth/managers"),
  deactivate: (id) => api.patch(`/auth/managers/${id}/deactivate`),
  activate: (id) => api.patch(`/auth/managers/${id}/activate`),
  remove: (id) => api.delete(`/auth/managers/${id}`),
};

// Card API methods
export const cardAPI = {
  getAll: () => api.get("/cards"),
  getRegistrations: (tenantId) =>
    api.get("/cards/registrations", { params: tenantId ? { tenantId } : {} }),
  getById: (tagId) => api.get(`/cards/${encodeURIComponent(tagId)}`),
  create: (cardData) => api.post("/cards", cardData),
  update: (tagId, cardData) =>
    api.put(`/cards/${encodeURIComponent(tagId)}`, cardData),
  delete: (tagId) => api.delete(`/cards/${encodeURIComponent(tagId)}`),
  getAnalytics: (tagId) =>
    api.get(`/cards/${encodeURIComponent(tagId)}/analytics`),
};

// Tenant API methods
export const tenantAPI = {
  getAll: () => api.get("/tenants"),
  create: (tenantData) => api.post("/tenants", tenantData),
};

// Manager role API methods
export const useraccessAPI = {
  getOrganizations: () => api.get("/manager/organizations"),
  createOrganization: (data) => api.post("/manager/organizations", data),
  updateOrganization: (tenantId, data) =>
    api.put(`/manager/organizations/${encodeURIComponent(tenantId)}`, data),
  deleteOrganization: (tenantId) =>
    api.delete(`/manager/organizations/${encodeURIComponent(tenantId)}`),

  getOrganizationCards: (tenantId) =>
    api.get(`/manager/organizations/${encodeURIComponent(tenantId)}/cards`),
  getOrganizationCard: (tenantId, tagId) =>
    api.get(`/manager/organizations/${encodeURIComponent(tenantId)}/cards/${encodeURIComponent(tagId)}`),
  addCard: (tenantId, data) =>
    api.post(
      `/manager/organizations/${encodeURIComponent(tenantId)}/cards`,
      data,
    ),
  updateCard: (tenantId, cardId, data) =>
    api.put(
      `/manager/organizations/${encodeURIComponent(tenantId)}/cards/${cardId}`,
      data,
    ),
  deleteCard: (tenantId, cardId) =>
    api.delete(
      `/manager/organizations/${encodeURIComponent(tenantId)}/cards/${cardId}`,
    ),
  exportCards: (tenantId) =>
    api.get(`/manager/organizations/${encodeURIComponent(tenantId)}/export`),
};

// Upload API methods — uses multipart/form-data
export const uploadAPI = {
  uploadProfile: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/upload/logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default api;
