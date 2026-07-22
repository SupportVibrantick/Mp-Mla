import { useState, useEffect, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useUser,
  useUserPermissions,
  useUpdateUserPermissions,
  useAllPermissions,
} from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  RotateCcw,
  User,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";

// ─── Types ──────────────────────────────────────────────

interface PermEntry {
  permissionId: string; // This MUST be the actual DB id
  module: string;
  action: string;
  description?: string;
}

// overrides state: permissionId → true (grant override) | false (revoke override)
// If a permissionId is NOT in this map, it means "use role default"
type OverrideState = Record<string, boolean>;

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "System Admin",
  MLA_MP: "MLA / MP",
  OFFICE_STAFF: "Office Staff",
};

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  wards: "Wards",
  institutions: "Institutions",
  incharges: "Incharges",
  grievances: "Grievances",
  projects: "Projects",
  schemes: "Schemes",
  community_groups: "Community Groups",
  demographics: "Demographics",
  funds: "Funds",
  departments: "Departments",
  tasks: "Tasks",
  notifications: "Notifications",
  reports: "Reports",
  users: "Users",
  audit_logs: "Audit Logs",
  backups: "Backups",
  settings: "Settings",
  branding: "Branding",
  data_import: "Data Import",
};

const ACTION_ICONS: Record<string, string> = {
  create: "🟢",
  read: "👁️",
  update: "✏️",
  delete: "🗑️",
  export: "📥",
  send: "📤",
  restore: "🔄",
};

export default function UserPermissions() {
  const [, params] = useRoute("/users/:id/permissions");
  const [, setLocation] = useLocation();
  const userId = params?.id || null;
  const { toast } = useToast();

  // ─── API Data ───────────────────────────────────────
  const { data: userData, isLoading: userLoading } = useUser(userId);
  const { data: permData, isLoading: permLoading } = useUserPermissions(userId);
  const { data: allPermsData, isLoading: allPermsLoading } =
    useAllPermissions();
  const updateMutation = useUpdateUserPermissions();

  const user = userData?.data;
  const permInfo = permData?.data;

  // ─── Local override state ───────────────────────────
  const [overrides, setOverrides] = useState<OverrideState>({});
  const [hasChanges, setHasChanges] = useState(false);

  // ═══════════════════════════════════════════════════════
  // FIX 1: Build grouped permissions mapping `id` → `permissionId`
  //
  // The API returns: { id: "cuid...", module: "grievances", action: "read" }
  // But our code needs: { permissionId: "cuid...", module, action }
  // ═══════════════════════════════════════════════════════

  const groupedPermissions = useMemo(() => {
    if (!allPermsData?.data?.flat) return {} as Record<string, PermEntry[]>;

    const grouped: Record<string, PermEntry[]> = {};
    for (const p of allPermsData.data.flat) {
      const moduleName = p.module;
      if (!grouped[moduleName]) grouped[moduleName] = [];

      grouped[moduleName].push({
        permissionId: p.id, // ← KEY FIX: map `id` to `permissionId`
        module: p.module,
        action: p.action,
        description: p.description,
      });
    }
    return grouped;
  }, [allPermsData]);

  // ═══════════════════════════════════════════════════════
  // FIX 2: Build role default lookup as a Set of permissionIds
  // ═══════════════════════════════════════════════════════

  const roleDefaultSet = useMemo(() => {
    if (!permInfo?.roleDefaults) return new Set<string>();
    return new Set(
      permInfo.roleDefaults
        .filter((d: any) => d.granted)
        .map((d: any) => d.permissionId),
    );
  }, [permInfo?.roleDefaults]);

  // ═══════════════════════════════════════════════════════
  // FIX 3: Initialize overrides from API data ONCE
  // ═══════════════════════════════════════════════════════

  useEffect(() => {
    if (!permInfo?.overrides) return;

    const initial: OverrideState = {};
    for (const o of permInfo.overrides) {
      initial[o.permissionId] = o.granted;
    }
    setOverrides(initial);
    setHasChanges(false);
  }, [permInfo?.overrides]);

  // ═══════════════════════════════════════════════════════
  // FIX 4: Determine effective state per permission
  // ═══════════════════════════════════════════════════════

  const getState = useCallback(
    (
      permId: string,
    ): "granted" | "denied" | "default-granted" | "default-denied" => {
      // 1. Check user-level override first
      if (permId in overrides) {
        return overrides[permId] ? "granted" : "denied";
      }
      // 2. Fall back to role default
      if (roleDefaultSet.has(permId)) {
        return "default-granted";
      }
      // 3. Not granted
      return "default-denied";
    },
    [overrides, roleDefaultSet],
  );

  // ═══════════════════════════════════════════════════════
  // FIX 5: Toggle a single permission correctly
  //
  // Three-state cycle:
  //   role-default-granted → override-denied → remove override (back to role default) → ...
  //   role-default-denied  → override-granted → remove override (back to role default) → ...
  // ═══════════════════════════════════════════════════════

  const togglePermission = useCallback(
    (permId: string) => {
      setOverrides((prev) => {
        const newState = { ...prev };
        const currentState = getState(permId);

        switch (currentState) {
          case "default-granted":
            // Role gives it → user clicks off → create override: denied
            newState[permId] = false;
            break;

          case "default-denied":
            // Role doesn't give it → user clicks on → create override: granted
            newState[permId] = true;
            break;

          case "granted":
            // User override grants it → click off → remove override (fall back to role default)
            delete newState[permId];
            break;

          case "denied":
            // User override denies it → click on → remove override (fall back to role default)
            delete newState[permId];
            break;
        }

        return newState;
      });
      setHasChanges(true);
    },
    [getState],
  );

  // ─── Reset ────────────────────────────────────────────
  const resetAll = () => {
    setOverrides({});
    setHasChanges(true);
  };

  // ─── Save ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) return;

    const permissionsToSave = Object.entries(overrides).map(
      ([permissionId, granted]) => ({
        permissionId,
        granted,
      }),
    );

    await updateMutation.mutateAsync({
      id: userId,
      data: { permissions: permissionsToSave },
    });

    setHasChanges(false);
  };

  // ─── Loading / Error states ───────────────────────────

  const isLoading = userLoading || permLoading || allPermsLoading;

  if (isLoading) {
    return (
      <MainLayout title="User Permissions">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-20 w-full" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return (
      <MainLayout title="User Permissions">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p>User not found.</p>
          <Button variant="link" onClick={() => setLocation("/admin/users")}>
            Go back
          </Button>
        </div>
      </MainLayout>
    );
  }

  const overrideCount = Object.keys(overrides).length;

  return (
    <MainLayout title={`Permissions — ${user.name}`}>
      <div className="space-y-6">
        {/* ─── Header ──────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setLocation("/admin/users")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
                <Shield className="h-7 w-7 text-primary" /> User Override Rules
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap font-semibold text-xs sm:text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground/90">
                  {user.name}
                </span>
                <span className="text-muted-foreground">•</span>
                <Badge variant="secondary" className="text-[10px] font-bold border-none px-2 py-0.5 bg-blue-500/10 text-blue-500">
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-mono">
                  {user.email}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={resetAll}
              disabled={overrideCount === 0}
              className="rounded-xl text-xs font-bold h-9 border-border/60"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset All ({overrideCount})
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="rounded-xl text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 font-bold h-9 shadow-sm"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Override Rules
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Legend ───────────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4.5 w-4.5 text-primary opacity-80" />
              <span className="text-xs sm:text-sm font-bold text-foreground">Rule Override Policy Guide</span>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mb-4 leading-relaxed">
              Baseline permission rules are inherited from the <strong>{ROLE_LABELS[user.role] || user.role}</strong> role defaults.
              You may toggle individual module switches to explicitly grant or revoke permissions for this specific user.
              Override rules will be highlighted with amber background fills.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm" />
                Override: Explicitly Granted
              </span>
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm" />
                Override: Explicitly Revoked
              </span>
              <span className="flex items-center gap-1.5 text-foreground/80">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                Default (Granted)
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full bg-muted border border-border/60" />
                Default (Denied)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ─── Permission Modules ──────────────────── */}
        <div className="grid gap-6">
          {Object.entries(groupedPermissions).map(([module, perms]) => {
            // Count how many are effectively granted in this module
            const grantedCount = perms.filter((p) => {
              const s = getState(p.permissionId);
              return s === "granted" || s === "default-granted";
            }).length;

            return (
              <Card key={module} className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                {/* Module Header */}
                <div className="bg-muted/20 px-5 py-3.5 border-b border-border/50 flex items-center justify-between">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {MODULE_LABELS[module] || module}
                  </h3>
                  <Badge
                    className={cn(
                      "text-[9px] font-bold border-none px-2 py-0.5",
                      grantedCount === perms.length
                        ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400"
                        : grantedCount === 0
                          ? "text-muted-foreground bg-muted/50"
                          : "text-amber-700 bg-amber-500/10 dark:text-amber-400"
                    )}
                  >
                    {grantedCount} / {perms.length} granted
                  </Badge>
                </div>

                {/* Permission Rows */}
                <CardContent className="p-0">
                  <div className="divide-y divide-border/30">
                    {perms.map((perm) => (
                      <PermissionRow
                        key={perm.permissionId}
                        perm={perm}
                        state={getState(perm.permissionId)}
                        onToggle={() => togglePermission(perm.permissionId)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ─── Sticky Save Bar ─────────────────────── */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/50 p-4 z-50 shadow-lg animate-in fade-in slide-in-from-bottom-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <p className="text-xs sm:text-sm font-semibold text-foreground/80">
                You have changed <strong>{overrideCount}</strong> permission rules. Remember to save your overrides.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetAll} className="rounded-xl text-xs font-bold border-border/60">
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="rounded-xl text-xs bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 font-bold h-9 shadow-sm"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Save Overrides
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Extra bottom padding when sticky bar is visible */}
        {hasChanges && <div className="h-20" />}
      </div>
    </MainLayout>
  );
}

// ═══════════════════════════════════════════════════════════
// EXTRACTED: Single permission row — prevents full-page
// re-render on every toggle
// ═══════════════════════════════════════════════════════════

interface PermissionRowProps {
  perm: PermEntry;
  state: "granted" | "denied" | "default-granted" | "default-denied";
  onToggle: () => void;
}

function PermissionRow({ perm, state, onToggle }: PermissionRowProps) {
  const isEffectivelyGranted =
    state === "granted" || state === "default-granted";
  const isOverride = state === "granted" || state === "denied";

  return (
    <div
      className={cn(
        "flex items-center justify-between px-5 py-4 transition-colors",
        isOverride ? "bg-amber-500/5 dark:bg-amber-950/10" : "hover:bg-muted/10"
      )}
    >
      {/* Left: icon + label + badges */}
      <div className="flex items-center gap-3 min-w-0 mr-4">
        <span className="text-sm shrink-0">
          {ACTION_ICONS[perm.action] || "🔧"}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-foreground capitalize">
              {perm.action}
            </span>

            {state === "granted" && (
              <Badge
                className="text-[9px] font-bold px-1.5 py-0 border-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              >
                OVERRIDE: GRANTED
              </Badge>
            )}

            {state === "denied" && (
              <Badge
                className="text-[9px] font-bold px-1.5 py-0 border-none bg-rose-500/10 text-rose-600 dark:text-rose-400"
              >
                OVERRIDE: REVOKED
              </Badge>
            )}

            {state === "default-granted" && (
              <Badge
                className="text-[9px] font-bold px-1.5 py-0 border-none bg-muted text-muted-foreground"
              >
                ROLE DEFAULT
              </Badge>
            )}
          </div>

          {perm.description && (
            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 leading-normal">
              {perm.description}
            </p>
          )}
        </div>
      </div>

      {/* Right: indicator dot + switch */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className={`h-2 w-2 rounded-full transition-colors ${
            state === "granted"
              ? "bg-emerald-500"
              : state === "denied"
                ? "bg-rose-500"
                : state === "default-granted"
                  ? "bg-emerald-500/30 border border-emerald-500/50"
                  : "bg-muted border border-border/60"
          }`}
        />
        <Switch checked={isEffectivelyGranted} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}
