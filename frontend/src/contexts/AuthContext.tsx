import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useContext,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import { TokenStorage } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

// ─── Types ──────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "SYSTEM_ADMIN" | "MLA_MP" | "OFFICE_STAFF";
  phone: string | null;
  avatarUrl: string | null;
  designation: string | null;
  department: string | null;
  departmentId?: string | null;
  departmentRef?: {
    id: string;
    name: string;
    code: string;
  } | null;
  bio: string | null;
  status?: string;
  forcePasswordChange: boolean;
  lastLoginAt: string | null;
  createdAt?: string | null;
  tenant?: {
    id: string;
    name: string;
    constituencyName: string;
    state: string;
    district: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    representativeName?: string | null;
    representativeTitle?: string | null;
    representativePhoto?: string | null;
    partyName?: string | null;
    partyLogoUrl?: string | null;
    termStartDate?: string | null;
    termEndDate?: string | null;
    status?: string | null;
    subscription?: {
      status: string;
      billingCycle: string;
      trialEndsAt?: string | null;
      currentPeriodStart?: string | null;
      currentPeriodEnd?: string | null;
      nextPaymentDue?: string | null;
      amountDue?: number | null;
      plan?: {
        id?: string;
        name: string;
        code: string;
        priceMonthly?: number;
        priceYearly?: number;
        maxUsers: number;
        maxVoters: number;
        storageLimitMB?: number;
      } | null;
    } | null;
  } | null;
}

export interface Permission {
  module: string;
  action: string;
  granted: boolean;
}

interface AuthState {
  user: User | null;
  permissions: Permission[];
  permissionsByModule: Record<string, string[]>;
  enabledModules: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (module: string, action: string) => boolean;
  canAny: (module: string) => boolean;
  hasModule: (module: string) => boolean;
  hasRole: (...roles: string[]) => boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isSubscriptionExpired: boolean;
  isSubscriptionSuspended: boolean;
  trialDaysRemaining: number;
}

// ─── Context ────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: [],
  permissionsByModule: {},
  enabledModules: [],
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  can: () => false,
  canAny: () => false,
  hasModule: () => true,
  hasRole: () => false,
  isTrialActive: false,
  isTrialExpired: false,
  isSubscriptionExpired: false,
  isSubscriptionSuspended: false,
  trialDaysRemaining: 0,
});

// ─── Provider ───────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<AuthState>({
    user: TokenStorage.getStoredUser(),
    permissions: TokenStorage.getStoredPermissions()?.permissions || [],
    permissionsByModule:
      TokenStorage.getStoredPermissions()?.permissionsByModule || {},
    enabledModules: [],
    isAuthenticated: !!TokenStorage.getRefreshToken(),
    isLoading: true,
  });

  // ─── Load permissions from API ──────────────────────
  const loadPermissions = useCallback(async () => {
    try {
      const [permRes, modRes] = await Promise.all([
        authApi.getMyPermissions(),
        authApi.getMyModules(),
      ]);
      const { permissions, permissionsByModule } = permRes.data.data;
      const enabledModules: string[] = modRes.data.data?.modules ?? [];

      TokenStorage.setStoredPermissions({ permissions, permissionsByModule });

      setState((prev) => ({
        ...prev,
        permissions,
        permissionsByModule,
        enabledModules,
      }));
    } catch (error) {
      console.error("Failed to load permissions:", error);
    }
  }, []);

  // ─── Initialize: Check if user has valid session ────
  useEffect(() => {
    const init = async () => {
      const refreshToken = TokenStorage.getRefreshToken();

      if (!refreshToken) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
          user: null,
        }));
        return;
      }

      try {
        // Try to get fresh access token
        const refreshRes = await authApi.refresh(refreshToken);
        const { accessToken, refreshToken: newRefresh } = refreshRes.data.data;

        TokenStorage.setAccessToken(accessToken);
        TokenStorage.setRefreshToken(newRefresh);

        // Fetch current user
        const meRes = await authApi.getMe();
        const user = meRes.data.data;

        TokenStorage.setStoredUser(user);

        // Load permissions
        await loadPermissions();

        setState((prev) => ({
          ...prev,
          user,
          isAuthenticated: true,
          isLoading: false,
        }));
      } catch (error) {
        // Refresh failed — clear everything
        TokenStorage.clearAll();
        setState({
          user: null,
          permissions: [],
          permissionsByModule: {},
          enabledModules: [],
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    init();
  }, [loadPermissions]);

  // ─── Login ──────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      const { accessToken, refreshToken } = res.data.data;

      TokenStorage.setAccessToken(accessToken);
      TokenStorage.setRefreshToken(refreshToken);

      // Fetch full user data including tenant & subscription
      const meRes = await authApi.getMe();
      const user = meRes.data.data;
      TokenStorage.setStoredUser(user);

      setState((prev) => ({
        ...prev,
        user,
        isAuthenticated: true,
      }));

      // Load permissions
      await loadPermissions();

      // Check subscription status
      const sub = user?.tenant?.subscription;
      const isExpired =
        sub?.status === "EXPIRED" ||
        (sub?.status === "TRIALING" &&
          sub?.trialEndsAt &&
          new Date(sub.trialEndsAt).getTime() <= Date.now());
      const isSuspended =
        sub?.status === "SUSPENDED" || sub?.status === "CANCELLED";

      // Redirect based on forcePasswordChange or subscription status
      if (user.forcePasswordChange) {
        setLocation("/change-password");
      } else if (isExpired || isSuspended) {
        setLocation("/billing");
      } else {
        setLocation("/dashboard");
      }
    },
    [setLocation, loadPermissions],
  );

  // ─── Logout ─────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const refreshToken = TokenStorage.getRefreshToken();
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      TokenStorage.clearAll();
      queryClient.clear();
      setState({
        user: null,
        permissions: [],
        permissionsByModule: {},
        enabledModules: [],
        isAuthenticated: false,
        isLoading: false,
      });
      setLocation("/login");
    }
  }, [setLocation]);

  // ─── Refresh user data ──────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      const user = res.data.data;
      TokenStorage.setStoredUser(user);
      setState((prev) => ({ ...prev, user }));
      await loadPermissions();
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  }, [loadPermissions]);

  // ─── Permission checkers ────────────────────────────
  const can = useCallback(
    (module: string, action: string): boolean => {
      if (!state.isAuthenticated) return false;
      // Admin always has access
      if (state.user?.role === "SYSTEM_ADMIN") return true;
      return state.permissions.some(
        (p) => p.module === module && p.action === action && p.granted,
      );
    },
    [state.permissions, state.isAuthenticated, state.user?.role],
  );

  const canAny = useCallback(
    (module: string): boolean => {
      if (!state.isAuthenticated) return false;
      if (state.user?.role === "SYSTEM_ADMIN") return true;
      return !!state.permissionsByModule[module]?.length;
    },
    [state.permissionsByModule, state.isAuthenticated, state.user?.role],
  );

  const hasRole = useCallback(
    (...roles: string[]): boolean => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user],
  );

  const hasModule = useCallback(
    (module: string): boolean => {
      if (!state.isAuthenticated) return false;
      if (!state.enabledModules.length) return true;
      return state.enabledModules.includes(module);
    },
    [state.enabledModules, state.isAuthenticated],
  );

  const subscription = state.user?.tenant?.subscription;

  const isTrialActive = Boolean(
    subscription?.status === "TRIALING" &&
      subscription?.trialEndsAt &&
      new Date(subscription.trialEndsAt).getTime() > Date.now(),
  );

  const isTrialExpired = Boolean(
    subscription?.status === "TRIALING" &&
      subscription?.trialEndsAt &&
      new Date(subscription.trialEndsAt).getTime() <= Date.now(),
  );

  const isSubscriptionExpired = Boolean(
    subscription?.status === "EXPIRED" || isTrialExpired,
  );

  const isSubscriptionSuspended = Boolean(
    subscription?.status === "SUSPENDED" || subscription?.status === "CANCELLED",
  );

  const trialDaysRemaining = useMemo(() => {
    if (!subscription?.trialEndsAt) return 0;
    const diff = new Date(subscription.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription?.trialEndsAt]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
        can,
        canAny,
        hasModule,
        hasRole,
        isTrialActive,
        isTrialExpired,
        isSubscriptionExpired,
        isSubscriptionSuspended,
        trialDaysRemaining,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
