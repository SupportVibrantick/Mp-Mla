import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { TokenStorage } from "./auth";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
// export const API_BASE_URL = "https://api-mp-mla.vibrantick.org/api";
// const API_BASE_URL = "/api";

export const getFileUrl = (url?: string | null): string => {
  if (!url) return "#";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const backendBase = API_BASE_URL.replace(/\/api\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${backendBase}${cleanPath}`;
};

// Create axios instances

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.headers && !(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ───────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const reqUrl = originalRequest?.url || "";
    const isPublicOrVoterPortal =
      reqUrl.includes("/public/") ||
      reqUrl.includes("/voter-portal/") ||
      reqUrl.includes("/auth/login") ||
      reqUrl.includes("/auth/refresh");

    // If 401 and not a retry and not a public/voter-portal/auth endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isPublicOrVoterPortal
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
        const response = await axios.post(
          `${API_BASE_URL}/admin/auth/refresh`,
          {
            refreshToken,
          },
        );

        const { accessToken: newAccess, refreshToken: newRefresh } =
          response.data.data;

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
  },
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

  getMyModules: () => api.get("/admin/auth/me/modules"),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/admin/auth/change-password", data),

  updateMe: (data: any) => api.patch("/admin/auth/me", data),
};

export const accountApi = {
  getSubscription: () => api.get("/admin/account/subscription"),
  getInvoices: () => api.get("/admin/account/invoices"),
  getUsage: () => api.get("/admin/account/usage"),
  getPlans: () => api.get("/admin/account/plans"),
  requestUpgrade: (data: any) =>
    api.post("/admin/account/upgrade-requests", data),
  createPaymentOrder: (data: any) =>
    api.post("/admin/account/payments/order", data),
  verifyPayment: (data: any) =>
    api.post("/admin/account/payments/verify", data),
};

export const usersApi = {
  list: (params?: any) => api.get("/admin/users", { params }),
  get: (id: string) => api.get(`/admin/users/${id}`),
  create: (data: any) => api.post("/admin/users", data),
  update: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  getPermissions: (id: string) => api.get(`/admin/users/${id}/permissions`),
  updatePermissions: (id: string, data: any) =>
    api.put(`/admin/users/${id}/permissions`, data),
};

export const wardsApi = {
  list: (params?: any) => api.get("/admin/wards", { params }),

  get: (id: string) => api.get(`/admin/wards/${id}`),

  stats: () => api.get("/admin/wards/stats"),

  create: (data: any) => api.post("/admin/wards", data),

  update: (id: string, data: any) => api.put(`/admin/wards/${id}`, data),

  delete: (id: string) => api.delete(`/admin/wards/${id}`),

  bulkDelete: (ids: string[]) => api.post("/admin/wards/bulk-delete", { ids }),

  // areas
  listAreas: (wardId: string) => api.get(`/admin/wards/${wardId}/areas`),

  createArea: (wardId: string, data: any) =>
    api.post(`/admin/wards/${wardId}/areas`, data),

  updateArea: (wardId: string, areaId: string, data: any) =>
    api.put(`/admin/wards/${wardId}/areas/${areaId}`, data),

  deleteArea: (wardId: string, areaId: string) =>
    api.delete(`/admin/wards/${wardId}/areas/${areaId}`),

  // councillors
  listCouncillors: (wardId: string) =>
    api.get(`/admin/wards/${wardId}/councillors`),

  createCouncillor: (wardId: string, data: any) =>
    api.post(`/admin/wards/${wardId}/councillors`, data),

  updateCouncillor: (wardId: string, councillorId: string, data: any) =>
    api.put(`/admin/wards/${wardId}/councillors/${councillorId}`, data),

  // demographics
  demographics: (wardId: string) =>
    api.get(`/admin/wards/${wardId}/demographics`),
};

export const communityGroupsApi = {
  list: (params?: any) => api.get("/admin/community-groups", { params }),
  get: (id: string) => api.get(`/admin/community-groups/${id}`),
  stats: (wardId?: string) =>
    api.get("/admin/community-groups/stats", {
      params: wardId ? { wardId } : {},
    }),
  create: (data: any) => api.post("/admin/community-groups", data),
  update: (id: string, data: any) => api.put(`/admin/community-groups/${id}`, data),
  delete: (id: string) => api.delete(`/admin/community-groups/${id}`),
  bulkDelete: (ids: string[]) =>
    api.post("/admin/community-groups/bulk-delete", { ids }),
  toggleActive: (id: string) =>
    api.patch(`/admin/community-groups/${id}/toggle-active`),
  bulkCreate: (data: any[]) =>
    api.post("/admin/community-groups/bulk", data),
};

export const grievancesApi = {
  list: (params?: any) => api.get("/admin/grievances", { params }),

  get: (id: string) => api.get(`/admin/grievances/${id}`),

  create: (data: any) => api.post("/admin/grievances", data),

  update: (id: string, data: any) => api.put(`/admin/grievances/${id}`, data),

  delete: (id: string) => api.delete(`/admin/grievances/${id}`),

  stats: (wardId?: string) =>
    api.get("/admin/grievances/stats", {
      params: wardId ? { wardId } : {},
    }),

  analytics: (months?: number) =>
    api.get("/admin/grievances/analytics", {
      params: { months: months || 6 },
    }),

  changeStatus: (id: string, data: any) =>
    api.patch(`/admin/grievances/${id}/status`, data),

  assign: (id: string, data: any) =>
    api.patch(`/admin/grievances/${id}/assign`, data),

  addTimeline: (id: string, data: any) =>
    api.post(`/admin/grievances/${id}/timeline`, data),

  export: (params?: any) => api.get("/admin/grievances/export", { params }),

  bulk: (data: any[]) => api.post("/admin/grievances/bulk", data),

  bulkDelete: (ids: string[]) =>
    api.post("/admin/grievances/bulk-delete", { ids }),
};

export const projectsApi = {
  list: (params?: any) => api.get("/admin/projects", { params }),

  get: (id: string) => api.get(`/admin/projects/${id}`),

  create: (data: any) => api.post("/admin/projects", data),

  update: (id: string, data: any) => api.put(`/admin/projects/${id}`, data),

  delete: (id: string) => api.delete(`/admin/projects/${id}`),

  stats: (wardId?: string) =>
    api.get("/admin/projects/stats", {
      params: wardId ? { wardId } : {},
    }),

  changeStatus: (id: string, data: any) =>
    api.patch(`/admin/projects/${id}/status`, data),

  addMilestone: (id: string, data: any) =>
    api.post(`/admin/projects/${id}/milestones`, data),

  toggleMilestone: (id: string, msId: string) =>
    api.patch(`/admin/projects/${id}/milestones/${msId}/toggle`),

  deleteMilestone: (id: string, msId: string) =>
    api.delete(`/admin/projects/${id}/milestones/${msId}`),

  addUpdate: (id: string, data: any) =>
    api.post(`/admin/projects/${id}/updates`, data),

  updateMilestone: (id: string, msId: string, data: any) =>
    api.put(`/admin/projects/${id}/milestones/${msId}`, data),

  listAttachments: (id: string) => api.get(`/admin/projects/${id}/attachments`),

  addAttachment: (id: string, data: any) =>
    api.post(`/admin/projects/${id}/attachments`, data, {
      headers:
        data instanceof FormData
          ? { "Content-Type": "multipart/form-data" }
          : undefined,
    }),

  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`/admin/projects/${id}/attachments/${attachmentId}`),

  listTimeline: (id: string) => api.get(`/admin/projects/${id}/timeline`),
};

export const institutionsApi = {
  list: (params?: any) => api.get("/admin/institutions", { params }),
  get: (id: string) => api.get(`/admin/institutions/${id}`),
  create: (data: any) => api.post("/admin/institutions", data),
  update: (id: string, data: any) => api.put(`/admin/institutions/${id}`, data),
  delete: (id: string) => api.delete(`/admin/institutions/${id}`),
};

// export const schemesApi = {
//   list: (params?: any) => api.get("/admin/schemes", { params }),
//   get: (id: string) => api.get(`/admin/schemes/${id}`),
//   create: (data: any) => api.post("/admin/schemes", data),
//   update: (id: string, data: any) => api.put(`/admin/schemes/${id}`, data),
//   delete: (id: string) => api.delete(`/admin/schemes/${id}`),
// };

export const demographicsApi = {
  list: (params?: any) => api.get("/admin/demographics", { params }),
  create: (data: any) => api.post("/admin/demographics", data),
  update: (id: string, data: any) => api.put(`/admin/demographics/${id}`, data),
};

export const departmentsApi = {
  list: (params?: any) => api.get("/admin/departments", { params }),
  get: (id: string) => api.get(`/admin/departments/${id}`),
  stats: () => api.get("/admin/departments/stats"),
  create: (data: any) => api.post("/admin/departments", data),
  update: (id: string, data: any) => api.put(`/admin/departments/${id}`, data),
  delete: (id: string) => api.delete(`/admin/departments/${id}`),
  bulkDelete: (ids: string[]) =>
    api.post("/admin/departments/bulk-delete", { ids }),
  toggle: (id: string) => api.patch(`/admin/departments/${id}/toggle-active`),
  getUsers: (id: string) => api.get(`/admin/departments/${id}/users`),
  getGrievances: (id: string) => api.get(`/admin/departments/${id}/grievances`),
  getTasks: (id: string) => api.get(`/admin/departments/${id}/tasks`),
  getSlas: (id: string) => api.get(`/admin/departments/${id}/slas`),
  updateSlas: (id: string, data: any) =>
    api.put(`/admin/departments/${id}/slas`, data),
  getSingleStats: (id: string) => api.get(`/admin/departments/${id}/stats`),
};

export const dashboardApi = {
  get: () => api.get("/admin/dashboard"),
};

export const auditLogsApi = {
  list: (params?: any) => api.get("/admin/audit-logs", { params }),
};

export const recycleBinApi = {
  list: (params?: any) => api.get("/admin/recycle-bin", { params }),
  restore: (id: string) => api.post(`/admin/recycle-bin/${id}/restore`),
  delete: (id: string) => api.delete(`/admin/recycle-bin/${id}`),
  bulkRestore: (ids: string[]) =>
    api.post("/admin/recycle-bin/bulk-restore", { ids }),
  bulkDelete: (ids: string[]) =>
    api.post("/admin/recycle-bin/bulk-delete", { ids }),
  empty: () => api.post("/admin/recycle-bin/empty"),
};

export const permissionsApi = {
  list: () => api.get("/admin/permissions"),
  roleDefaults: () => api.get("/admin/permissions/role-defaults"),
  updateRoleDefaults: (data: { role: string; permissions: any[] }) =>
    api.put("/admin/permissions/role-defaults", data),
};

export const settingsApi = {
  list: () => api.get("/admin/settings"),
  update: (data: any) => api.put("/admin/settings", data),
  getPublicBranding: () =>
    api.get<{ success: boolean; data: Record<string, string> }>(
      "/admin/settings/public/branding",
    ),
};

export const voterListApi = {
  list: (params?: any) => api.get("/admin/voter-list", { params }),
  stats: (params?: any) => api.get("/admin/voter-list/stats", { params }),
  get: (id: string) => api.get(`/admin/voter-list/${id}`),
  create: (data: any) => api.post("/admin/voter-list", data),
  update: (id: string, data: any) => api.put(`/admin/voter-list/${id}`, data),
  toggleOurVoter: (id: string, isOurVoter?: boolean) =>
    api.patch(`/admin/voter-list/${id}/toggle-our-voter`, { isOurVoter }),
  updateLeaning: (
    id: string,
    data: { voterLeaning?: string; voterCadreNotes?: string; isOurVoter?: boolean },
  ) => api.patch(`/admin/voter-list/${id}/leaning`, data),
  bulkTag: (data: {
    ids: string[];
    isOurVoter?: boolean;
    voterLeaning?: string;
    voterCadreNotes?: string;
  }) => api.post("/admin/voter-list/bulk-tag", data),
  resetPassword: (id: string, data?: { newPassword?: string }) =>
    api.post(`/admin/voter-list/${id}/reset-password`, data),
  delete: (id: string) => api.delete(`/admin/voter-list/${id}`),
  bulkDelete: (ids: string[]) =>
    api.post("/admin/voter-list/bulk-delete", { ids }),
  bulkUpload: (data: any) => api.post("/admin/voter-list/bulk", data),
  listBulkJobs: (params?: any) =>
    api.get("/admin/voter-list/bulk/jobs", { params }),
  getBulkJob: (jobId: string) =>
    api.get(`/admin/voter-list/bulk/jobs/${jobId}`),
  exportCSV: (params?: any) =>
    api.get("/admin/voter-list/export", { params, responseType: "blob" }),
  downloadSampleCSV: () =>
    api.get("/admin/voter-list/sample", { responseType: "blob" }),
  downloadSampleExcel: () =>
    api.get("/admin/voter-list/sample/excel", { responseType: "blob" }),
};

export const voterFamilyApi = {
  getFamily: (voterId: string) => api.get(`/admin/voter-list/${voterId}/family`),
  createMember: (voterId: string, data: any) =>
    api.post(`/admin/voter-list/${voterId}/family`, data),
  updateMember: (familyMemberId: string, data: any) =>
    api.put(`/admin/voter-list/family/${familyMemberId}`, data),
  deleteMember: (familyMemberId: string) =>
    api.delete(`/admin/voter-list/family/${familyMemberId}`),
};

export const tasksApi = {
  list: (params?: any) => api.get("/admin/tasks", { params }),
  get: (id: string) => api.get(`/admin/tasks/${id}`),
  stats: () => api.get("/admin/tasks/stats"),
  create: (data: any) => api.post("/admin/tasks", data),
  update: (id: string, data: any) => api.put(`/admin/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/admin/tasks/${id}`),
  changeStatus: (id: string, status: string) =>
    api.patch(`/admin/tasks/${id}/status`, { status }),
  assign: (id: string, data: { assignedToId: string; departmentId?: string }) =>
    api.patch(`/admin/tasks/${id}/assign`, data),
  bulkAssign: (data: {
    taskIds: string[];
    assignedToId: string;
    departmentId?: string;
  }) => api.post("/admin/tasks/bulk-assign", data),
  bulkStatus: (data: { taskIds: string[]; status: string }) =>
    api.post("/admin/tasks/bulk-status", data),
};

export const websiteApi = {
  list: () => api.get("/admin/websites"),
  get: (id: string) => api.get(`/admin/websites/${id}`),
  create: (data: any) => api.post("/admin/websites", data),
  update: (id: string, data: any) => api.put(`/admin/websites/${id}`, data),
  delete: (id: string) => api.delete(`/admin/websites/${id}`),
  getTemplates: () => api.get("/admin/websites/templates"),
};

export const websitePagesApi = {
  list: (websiteId: string) => api.get(`/admin/websites/${websiteId}/pages`),
  get: (websiteId: string, pageId: string) =>
    api.get(`/admin/websites/${websiteId}/pages/${pageId}`),
  create: (websiteId: string, data: any) =>
    api.post(`/admin/websites/${websiteId}/pages`, data),
  update: (websiteId: string, pageId: string, data: any) =>
    api.put(`/admin/websites/${websiteId}/pages/${pageId}`, data),
  duplicate: (websiteId: string, pageId: string) =>
    api.post(`/admin/websites/${websiteId}/pages/${pageId}/duplicate`),
  delete: (websiteId: string, pageId: string) =>
    api.delete(`/admin/websites/${websiteId}/pages/${pageId}`),
};

export const websiteDomainsApi = {
  list: (websiteId: string) => api.get(`/admin/websites/${websiteId}/domains`),
  add: (websiteId: string, data: { domain: string; isPrimary?: boolean }) =>
    api.post(`/admin/websites/${websiteId}/domains`, data),
  verify: (websiteId: string, domainId: string) =>
    api.post(`/admin/websites/${websiteId}/domains/${domainId}/verify`),
  setPrimary: (websiteId: string, domainId: string) =>
    api.post(`/admin/websites/${websiteId}/domains/${domainId}/primary`),
  delete: (websiteId: string, domainId: string) =>
    api.delete(`/admin/websites/${websiteId}/domains/${domainId}`),
};

export const websiteDeploymentsApi = {
  publish: (websiteId: string, data?: { notes?: string }) =>
    api.post(`/admin/websites/${websiteId}/publish`, data || {}),
  list: (websiteId: string) =>
    api.get(`/admin/websites/${websiteId}/deployments`),
  rollback: (websiteId: string, deploymentId: string) =>
    api.post(`/admin/websites/${websiteId}/deployments/${deploymentId}/rollback`),
};

export const websiteMenusApi = {
  list: (websiteId: string) => api.get(`/admin/websites/${websiteId}/menus`),
  upsert: (websiteId: string, data: { name: string; items: any[] }) =>
    api.post(`/admin/websites/${websiteId}/menus`, data),
  delete: (websiteId: string, menuId: string) =>
    api.delete(`/admin/websites/${websiteId}/menus/${menuId}`),
};

export const websiteAssetsApi = {
  list: (websiteId: string) => api.get(`/admin/websites/${websiteId}/assets`),
  create: (websiteId: string, data: any) =>
    api.post(`/admin/websites/${websiteId}/assets`, data),
  delete: (websiteId: string, assetId: string) =>
    api.delete(`/admin/websites/${websiteId}/assets/${assetId}`),
};

export const websiteFormsApi = {
  list: (websiteId: string) => api.get(`/admin/websites/${websiteId}/forms`),
  create: (websiteId: string, data: any) =>
    api.post(`/admin/websites/${websiteId}/forms`, data),
  delete: (websiteId: string, formId: string) =>
    api.delete(`/admin/websites/${websiteId}/forms/${formId}`),
};

export const publicWebsiteApi = {
  resolve: (params?: { slug?: string; websiteId?: string }) =>
    axios.get(`${API_BASE_URL}/public/website/resolve`, { params }),
  submitForm: (websiteId: string, formId: string, data: any) =>
    axios.post(`${API_BASE_URL}/public/website/${websiteId}/forms/${formId}/submit`, data),
};

export const socialApi = {
  getAccounts: () => api.get("/admin/social/accounts"),
  disconnectAccount: (id: string) => api.delete(`/admin/social/accounts/${id}`),
  testConnection: (id: string) => api.post(`/admin/social/accounts/${id}/test`),

  // 1-Click Server-Side OAuth System
  startOAuth: (provider: string) => api.get(`/admin/social/oauth/${provider}/start`),
  getDiscoveredResources: (provider: string, connectionId: string) =>
    api.get(`/admin/social/oauth/${provider}/resources`, { params: { connectionId } }),
  selectResources: (provider: string, data: { connectionId: string; resourceIds: string[] }) =>
    api.post(`/admin/social/oauth/${provider}/select`, data),

  getPosts: () => api.get("/admin/social/posts"),
  getPost: (id: string) => api.get(`/admin/social/posts/${id}`),
  syncPostMetrics: (id: string) => api.post(`/admin/social/posts/${id}/sync-metrics`),
  syncAllMetrics: () => api.post("/admin/social/posts/sync-all-metrics"),
  createPost: (data: {
    title?: string;
    content: string;
    mediaUrls?: string[];
    mediaType?: string;
    accountIds: string[];
    scheduledAt?: string | null;
    customCaptions?: Record<string, string>;
    platformConfigs?: Record<string, any>;
    isAiGenerated?: boolean;
    complianceLabels?: string[];
  }) => api.post("/admin/social/posts", data),
  retryPost: (id: string) => api.post(`/admin/social/posts/${id}/retry`),
  deletePost: (id: string) => api.delete(`/admin/social/posts/${id}`),
};

export const helplinesApi = {
  getStats: () => api.get("/admin/helplines/stats"),
  list: (params?: { category?: string; search?: string; isEmergency?: boolean | string; isActive?: boolean | string }) =>
    api.get("/admin/helplines", { params }),
  get: (id: string) => api.get(`/admin/helplines/${id}`),
  create: (data: any) => api.post("/admin/helplines", data),
  update: (id: string, data: any) => api.put(`/admin/helplines/${id}`, data),
  toggleStatus: (id: string, isActive?: boolean) =>
    api.patch(`/admin/helplines/${id}/status`, { isActive }),
  seedDefaults: (overwrite = false) =>
    api.post("/admin/helplines/seed-defaults", { overwrite }),
  delete: (id: string) => api.delete(`/admin/helplines/${id}`),
  bulkDelete: (ids: string[]) => api.post("/admin/helplines/bulk-delete", { ids }),
};

export const publicHelplinesApi = {
  list: (params?: { category?: string; search?: string; emergencyOnly?: boolean; tenantId?: string }) =>
    axios.get(`${API_BASE_URL}/public/helplines`, { params }),
  getEmergencySpeedDial: (tenantId?: string) =>
    axios.get(`${API_BASE_URL}/public/helplines/emergency`, { params: { tenantId } }),
};

export const voterPortalSchemesApi = {
  list: (params?: { tenantId?: string; department?: string; level?: string; search?: string }, token?: string) =>
    api.get("/public/voter-portal/schemes", {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  get: (id: string, params?: { tenantId?: string }, token?: string) =>
    api.get(`/public/voter-portal/schemes/${id}`, {
      params,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
  apply: (id: string, data: any, token: string) =>
    api.post(`/public/voter-portal/schemes/${id}/apply`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getMyApplications: (token: string) =>
    api.get("/public/voter-portal/my-scheme-applications", {
      headers: { Authorization: `Bearer ${token}` },
    }),
};



