// import axios from "axios";
// import { logout } from "./logout";

// const api = axios.create({
//   baseURL: import.meta.env.VITE_USER_BASE_URL,
// });

// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error),
// );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       logout();
//     }
//     return Promise.reject(error);
//   },
// );

// export default api;

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { TokenStorage } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// ─── Request Interceptor ────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = TokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not a retry and not the login/refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = TokenStorage.getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        TokenStorage.clearAll();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/admin/auth/refresh`, {
          refreshToken,
        });

        const { accessToken: newAccess, refreshToken: newRefresh } = response.data.data;

        TokenStorage.setAccessToken(newAccess);
        TokenStorage.setRefreshToken(newRefresh);

        processQueue(null, newAccess);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenStorage.clearAll();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── API Service Functions ──────────────────────────────

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/admin/auth/login", data),

  refresh: (refreshToken: string) =>
    api.post("/admin/auth/refresh", { refreshToken }),

  logout: (refreshToken?: string) =>
    api.post("/admin/auth/logout", { refreshToken }),

  getMe: () => api.get("/admin/auth/me"),

  getMyPermissions: () => api.get("/admin/auth/me/permissions"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/admin/auth/change-password", data),
};

export const usersApi = {
  list: (params?: any) => api.get("/admin/users", { params }),
  get: (id: string) => api.get(`/admin/users/${id}`),
  create: (data: any) => api.post("/admin/users", data),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  getPermissions: (id: string) => api.get(`/admin/users/${id}/permissions`),
  updatePermissions: (id: string, data: any) => api.put(`/admin/users/${id}/permissions`, data),
};

export const wardsApi = {
  list: (params?: any) => api.get("/admin/wards", { params }),
  get: (id: string) => api.get(`/admin/wards/${id}`),
  create: (data: any) => api.post("/admin/wards", data),
  update: (id: string, data: any) => api.put(`/admin/wards/${id}`, data),
  delete: (id: string) => api.delete(`/admin/wards/${id}`),
};

export const grievancesApi = {
  list: (params?: any) => api.get("/admin/grievances", { params }),
  get: (id: string) => api.get(`/admin/grievances/${id}`),
  create: (data: any) => api.post("/admin/grievances", data),
  update: (id: string, data: any) => api.put(`/admin/grievances/${id}`, data),
  delete: (id: string) => api.delete(`/admin/grievances/${id}`),
  stats: () => api.get("/admin/grievances/stats"),
};

export const projectsApi = {
  list: (params?: any) => api.get("/admin/projects", { params }),
  get: (id: string) => api.get(`/admin/projects/${id}`),
  create: (data: any) => api.post("/admin/projects", data),
  update: (id: string, data: any) => api.put(`/admin/projects/${id}`, data),
  delete: (id: string) => api.delete(`/admin/projects/${id}`),
  stats: () => api.get("/admin/projects/stats"),
};

export const institutionsApi = {
  list: (params?: any) => api.get("/admin/institutions", { params }),
  get: (id: string) => api.get(`/admin/institutions/${id}`),
  create: (data: any) => api.post("/admin/institutions", data),
  update: (id: string, data: any) => api.put(`/admin/institutions/${id}`, data),
  delete: (id: string) => api.delete(`/admin/institutions/${id}`),
};

export const schemesApi = {
  list: (params?: any) => api.get("/admin/schemes", { params }),
  get: (id: string) => api.get(`/admin/schemes/${id}`),
  create: (data: any) => api.post("/admin/schemes", data),
  update: (id: string, data: any) => api.put(`/admin/schemes/${id}`, data),
  delete: (id: string) => api.delete(`/admin/schemes/${id}`),
};

export const demographicsApi = {
  list: (params?: any) => api.get("/admin/demographics", { params }),
  create: (data: any) => api.post("/admin/demographics", data),
  update: (id: string, data: any) => api.put(`/admin/demographics/${id}`, data),
};

export const departmentsApi = {
  list: (params?: any) => api.get("/admin/departments", { params }),
  create: (data: any) => api.post("/admin/departments", data),
  update: (id: string, data: any) => api.put(`/admin/departments/${id}`, data),
  delete: (id: string) => api.delete(`/admin/departments/${id}`),
};

export const dashboardApi = {
  get: () => api.get("/admin/dashboard"),
};

export const auditLogsApi = {
  list: (params?: any) => api.get("/admin/audit-logs", { params }),
  get: (id: string) => api.get(`/admin/audit-logs/${id}`),
};

export const permissionsApi = {
  list: () => api.get("/admin/permissions"),
  roleDefaults: () => api.get("/admin/permissions/role-defaults"),
};

export const settingsApi = {
  list: () => api.get("/admin/settings"),
  update: (data: any) => api.put("/admin/settings", data),
};