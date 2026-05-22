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
    return localStorage.getItem("refreshToken");
  },

  setRefreshToken: (token: string | null): void => {
    if (token) {
      localStorage.setItem("refreshToken", token);
    } else {
      localStorage.removeItem("refreshToken");
    }
  },

  clearAll: (): void => {
    accessToken = null;
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("permissions");
  },

  // Persist user data for page refreshes
  getStoredUser: () => {
    try {
      const data = localStorage.getItem("user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredUser: (user: any) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  },

  getStoredPermissions: () => {
    try {
      const data = localStorage.getItem("permissions");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setStoredPermissions: (permissions: any) => {
    if (permissions) {
      localStorage.setItem("permissions", JSON.stringify(permissions));
    } else {
      localStorage.removeItem("permissions");
    }
  },
};