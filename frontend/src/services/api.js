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
    delete config.headers["Content-Type"];
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
  verify: (password) => api.post("/auth/verify", { password }),
  getUsers: (tenantId) =>
    api.get("/auth/users", { params: tenantId ? { tenantId } : {} }),
  getUiSettings: () => api.get("/auth/ui-settings"),
  setUiSettings: (patch) => api.put("/auth/ui-settings", patch),
};

// Manager account management (admin only)
export const managerAPI = {
  getManagerInfo: () => api.get("/tenants/managerList"),
  getAll: () => api.get("/auth/managers"),
  deactivate: (id) => api.patch(`/auth/managers/${id}/deactivate`),
  activate: (id) => api.patch(`/auth/managers/${id}/activate`),
  remove: (id) => api.delete(`/auth/managers/${id}`),
};

// Card API methods
export const cardAPI = {
  getAll: () => api.get("/cards"),
  getRegistrations: (tenantId) =>
    api.get("/cards/registrations", {
      params: {
        ...(tenantId ? { tenantId } : {}),
        _ts: Date.now(),
      },
    }),
  upsertOnScan: (data) => api.post("/cards/registrations/scan", data),
  updateRegistration: (tagId, data) =>
    api.put(`/cards/registrations/${encodeURIComponent(tagId)}`, data),
  deleteRegistration: (tagId) =>
    api.delete(`/cards/registrations/${encodeURIComponent(tagId)}`),
  getById: (tagId) => api.get(`/cards/${encodeURIComponent(tagId)}`),
  create: (cardData) => api.post("/cards", cardData),
  update: (tagId, cardData) =>
    api.put(`/cards/${encodeURIComponent(tagId)}`, cardData),
  delete: (tagId) => api.delete(`/cards/${encodeURIComponent(tagId)}`),
  bulkDelete: (tagIds) => api.delete("/cards/bulk", { data: { tagIds } }),
  getAnalytics: (tagId) =>
    api.get(`/cards/${encodeURIComponent(tagId)}/analytics`),
  importCards: (tenantId, file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("tenantId", tenantId);
    return api.post("/cards/import", form);
  },
  importZip: (tenantId, file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("tenantId", tenantId);
    return api.post("/cards/import-zip", form);
  },
};

// Tenant API methods
export const tenantAPI = {
  getAll: () => api.get("/tenants"),
  create: (tenantData) => api.post("/tenants", tenantData),
};
export const managerApi = {
  getAll: () => api.get("/tenants/managerList"),
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
    api.get(
      `/manager/organizations/${encodeURIComponent(tenantId)}/cards/${encodeURIComponent(tagId)}`,
    ),
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
  bulkDeleteCards: (tenantId, cardIds) =>
    api.delete(`/manager/organizations/${encodeURIComponent(tenantId)}/cards/bulk`, {
      data: { cardIds },
    }),
  bulkUpdateDesign: (tenantId, cardIds, designSettings) =>
    api.put(
      `/manager/organizations/${encodeURIComponent(tenantId)}/cards/bulk-design`,
      { cardIds, designSettings },
    ),
  exportCards: (tenantId) =>
    api.get(`/manager/organizations/${encodeURIComponent(tenantId)}/export`),
  getAvailableNfcTags: (tenantId) =>
    api.get(`/manager/organizations/${encodeURIComponent(tenantId)}/nfc-tags`),
  uploadPhotosZip: (tenantId, file, skipUnmatched = false) => {
    const form = new FormData();
    form.append("file", file);
    if (skipUnmatched) form.append("skipUnmatched", "true");
    return api.post(
      `/manager/organizations/${encodeURIComponent(tenantId)}/upload-photos`,
      form,
    );
  },

  // Tenant login account management
  getTenantAccount: (tenantId) =>
    api.get(
      `/manager/organizations/${encodeURIComponent(tenantId)}/tenant-account`,
    ),
  createTenantAccount: (tenantId, data) =>
    api.post(
      `/manager/organizations/${encodeURIComponent(tenantId)}/tenant-account`,
      data,
    ),
  resetCredentials: (tenantId) =>
    api.post(
      `/manager/organizations/${encodeURIComponent(tenantId)}/reset-credentials`,
    ),
};

// Public API — no auth token required, used for the read-only public card view
const publicApi = axios.create({ baseURL: API_BASE_URL });
export const publicAPI = {
  getCard: (tagId) =>
    publicApi.get(`/public/cardInfo/${encodeURIComponent(tagId)}`),
};

// Card Template API methods
export const cardTemplateAPI = {
  getAll: (tenantId) =>
    api.get("/card-templates", { params: tenantId ? { tenantId } : {} }),
  getById: (id, tenantId) =>
    api.get(`/card-templates/${id}`, { params: tenantId ? { tenantId } : {} }),
  create: (data) => api.post("/card-templates", data),
  update: (id, data) => api.put(`/card-templates/${id}`, data),
  delete: (id, tenantId) =>
    api.delete(`/card-templates/${id}`, { data: { tenantId } }),
  /** Upload Excel and get columns + first-5-row preview. Returns { columns, preview, totalRows } */
  previewExcel: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/card-templates/preview-excel", form);
  },
  /** Import cards using template field mapping */
  importFromExcel: (templateId, tenantId, file, mapping) => {
    const form = new FormData();
    form.append("file", file);
    form.append("tenantId", tenantId);
    form.append("mapping", JSON.stringify(mapping));
    return api.post(`/card-templates/${templateId}/import`, form);
  },
};

// Upload API methods — uses multipart/form-data
export const uploadAPI = {
  uploadProfile: (file, tenantId) => {
    const formData = new FormData();
    formData.append("image", file);
    if (tenantId) formData.append("tenantId", tenantId);
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

// Tenant portal API methods (tenant role — soft edit/delete only)
export const tenantPortalAPI = {
  getMe: () => api.get("/tenant/me"),
  updateLogo: (logoUrl) => api.put("/tenant/me/logo", { logoUrl }),
  getCards: () => api.get("/tenant/cards"),
  addCard: (data) => api.post("/tenant/cards", data),
  getCardByTag: (tagId) =>
    api.get(`/tenant/cards/by-tag/${encodeURIComponent(tagId)}`),
  getCard: (cardId) => api.get(`/tenant/cards/${cardId}`),
  updateCard: (cardId, data) => api.put(`/tenant/cards/${cardId}`, data),
  deactivateCard: (cardId) => api.delete(`/tenant/cards/${cardId}`),
  bulkDeleteCards: (cardIds) => api.delete("/tenant/cards/bulk", { data: { cardIds } }),
  bulkUpdateDesign: (cardIds, designSettings) =>
    api.put("/tenant/cards/bulk-design", { cardIds, designSettings }),
  changePassword: (currentPassword, newPassword) =>
    api.post("/tenant/change-password", { currentPassword, newPassword }),
};

export default api;
