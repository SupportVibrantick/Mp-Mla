// Token storage utilities
// Access token in memory (more secure), refresh token in localStorage

let accessToken: string | null = null;

export const TokenStorage = {
  getAccessToken: (): string | null => {
    return accessToken;
  },

  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem("platform_refreshToken");
  },

  setRefreshToken: (token: string | null): void => {
    if (token) {
      localStorage.setItem("platform_refreshToken", token);
    } else {
      localStorage.removeItem("platform_refreshToken");
    }
  },

  clearAll: (): void => {
    accessToken = null;
    localStorage.removeItem("platform_refreshToken");
    localStorage.removeItem("platform_user");
    localStorage.removeItem("platform_permissions");
  },

  // Persist user data for page refreshes
  getStoredUser: () => {
    try {
      const data = localStorage.getItem("platform_user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredUser: (user: any) => {
    if (user) {
      localStorage.setItem("platform_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("platform_user");
    }
  },

  getStoredPermissions: () => {
    try {
      const data = localStorage.getItem("platform_permissions");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredPermissions: (permissions: any) => {
    if (permissions) {
      localStorage.setItem("platform_permissions", JSON.stringify(permissions));
    } else {
      localStorage.removeItem("platform_permissions");
    }
  },
};