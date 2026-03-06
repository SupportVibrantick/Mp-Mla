import {
  useAllPermissions,
  useRoleDefaults,
  useUpdateRoleDefaults,
} from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Info,
  Users,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";

const ROLE_META: Record<
  string,
  { label: string; description: string; color: string }
> = {
  SYSTEM_ADMIN: {
    label: "System Admin",
    description:
      "Full system access. Can manage users, settings, backups, and all modules.",
    color: "text-slate-700 dark:text-slate-300",
  },
  MLA_MP: {
    label: "MLA / MP",
    description:
      "Read-only monitoring role. Can view dashboards, export reports, and manage tasks.",
    color: "text-blue-700 dark:text-blue-300",
  },
  OFFICE_STAFF: {
    label: "Office Staff",
    description:
      "Data entry and management role. Can create/edit records but cannot delete or manage users.",
    color: "text-emerald-700 dark:text-emerald-300",
  },
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
  leaders: "Leaders",
};

const ACTION_ICONS: Record<string, string> = {
  read: "👁️",
  create: "➕",
  update: "✏️",
  delete: "🗑️",
  export: "📤",
  send: "📧",
  reset: "🔄",
  restore: "⟲",
};

export default function PermissionsOverview() {
  const { data: allPermsData, isLoading: permsLoading } = useAllPermissions();
  const { data: roleDefaultsData, isLoading: defaultsLoading } =
    useRoleDefaults();
  const updateMutation = useUpdateRoleDefaults();

  const [activeTab, setActiveTab] = useState<string>("OFFICE_STAFF");
  const [rolePermissions, setRolePermissions] = useState<
    Record<string, Set<string>>
  >({});
  const [isDirty, setIsDirty] = useState<Record<string, boolean>>({});

  const isLoading = permsLoading || defaultsLoading;
  const allPermissions = allPermsData?.data?.flat || [];
  const roleDefaults = roleDefaultsData?.data?.byRole || {};
  const summary = roleDefaultsData?.data?.summary || [];

  // Sync state when data loads
  useEffect(() => {
    if (roleDefaultsData?.data?.byRole) {
      const initial: Record<string, Set<string>> = {};
      for (const [role, perms] of Object.entries(
        roleDefaultsData.data.byRole,
      ) as [string, any[]][]) {
        initial[role] = new Set(
          perms.filter((p) => p.granted).map((p) => p.permissionId),
        );
      }
      setRolePermissions(initial);
      setIsDirty({});
    }
  }, [roleDefaultsData]);

  // Group permissions by module
  const groupedPerms = useMemo(() => {
    const grouped: Record<string, typeof allPermissions> = {};
    for (const p of allPermissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [allPermissions]);

  const togglePermission = (role: string, permId: string) => {
    setRolePermissions((prev) => {
      const next = { ...prev };
      const roleSet = new Set(next[role] || []);
      if (roleSet.has(permId)) {
        roleSet.delete(permId);
      } else {
        roleSet.add(permId);
      }
      next[role] = roleSet;
      return next;
    });
    setIsDirty((prev) => ({ ...prev, [role]: true }));
  };

  const handleSave = async (role: string) => {
    const perms = allPermissions.map((p: any) => ({
      permissionId: p.id,
      granted: rolePermissions[role]?.has(p.id) || false,
    }));

    await updateMutation.mutateAsync({ role, permissions: perms });
    setIsDirty((prev) => ({ ...prev, [role]: false }));
  };

  if (isLoading) {
    return (
      <MainLayout title="Roles & Permissions">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Roles & Permissions">
      <div className="space-y-6">
        {/* ─── Header ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Roles & Permissions
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure the default permission matrix for each role.
            </p>
          </div>
          {isDirty[activeTab] && activeTab !== "comparison" && (
            <Button
              onClick={() => handleSave(activeTab)}
              disabled={updateMutation.isPending}
              className="shadow-lg animate-in fade-in slide-in-from-right-4"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save {ROLE_META[activeTab]?.label} Defaults
            </Button>
          )}
        </div>

        {/* ─── Summary Cards ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summary.map((s: any) => {
            const meta = ROLE_META[s.role];
            if (!meta) return null;
            return (
              <Card
                key={s.role}
                className={`p-5 cursor-pointer transition-all ${activeTab === s.role ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setActiveTab(s.role)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold ${meta.color}`}>{meta.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {s.totalPermissions} perms
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {meta.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* ─── Permission Matrix ─────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <TabsList>
              {Object.entries(ROLE_META).map(([role, meta]) => (
                <TabsTrigger key={role} value={role} className="px-4">
                  {meta.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="comparison" className="px-4">
                <Users className="h-3.5 w-3.5 mr-1.5" /> Comparison
              </TabsTrigger>
            </TabsList>

            {isDirty[activeTab] && (
              <div className="flex items-center gap-2 text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <AlertCircle className="h-3.5 w-3.5" />
                Unsaved changes for {ROLE_META[activeTab]?.label}
              </div>
            )}
          </div>

          {/* ─── Individual Role Tabs ─────────────────── */}
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <TabsContent key={role} value={role}>
              {role === "SYSTEM_ADMIN" && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm flex items-start gap-3">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <p>
                    <strong>Note:</strong> System Admins typically have all
                    permissions granted by default to ensure no administrative
                    lockouts occur.
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                {Object.entries(groupedPerms).map(([module, perms]) => {
                  const roleSet = rolePermissions[role] || new Set();
                  const grantedInModule = perms.filter((p) =>
                    roleSet.has(p.id),
                  ).length;
                  const allGranted = grantedInModule === perms.length;

                  return (
                    <Card key={module} className="overflow-hidden">
                      <div className="bg-muted/40 px-5 py-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          {MODULE_LABELS[module] || module}
                        </h3>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            {grantedInModule} / {perms.length} Granted
                          </span>
                          <Switch
                            checked={allGranted}
                            onCheckedChange={() => {
                              const nextSet = new Set(roleSet);
                              perms.forEach((p) => {
                                if (allGranted) nextSet.delete(p.id);
                                else nextSet.add(p.id);
                              });
                              setRolePermissions((prev) => ({
                                ...prev,
                                [role]: nextSet,
                              }));
                              setIsDirty((prev) => ({ ...prev, [role]: true }));
                            }}
                          />
                        </div>
                      </div>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0">
                          {perms.map((perm) => {
                            const isGranted = roleSet.has(perm.id);
                            return (
                              <div
                                key={perm.id}
                                className={`flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-muted/20 ${isGranted ? "" : "bg-muted/5 opacity-80"}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-sm shrink-0">
                                    {ACTION_ICONS[perm.action] || "🔧"}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium capitalize truncate">
                                      {perm.action}
                                    </p>
                                    {perm.description && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {perm.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Switch
                                  checked={isGranted}
                                  onCheckedChange={() =>
                                    togglePermission(role, perm.id)
                                  }
                                  scale={0.8}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          ))}

          {/* ─── Comparison Tab ──────────────────────── */}
          <TabsContent value="comparison">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40 z-10 w-48">
                        Module / Action
                      </th>
                      {Object.entries(ROLE_META).map(([role, meta]) => (
                        <th
                          key={role}
                          className={`px-4 py-3 text-center font-medium ${meta.color}`}
                        >
                          {meta.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPerms).map(([module, perms]) =>
                      perms.map((perm, idx) => (
                        <tr
                          key={perm.id}
                          className={`border-b hover:bg-muted/20 ${idx === 0 ? "border-t-2 border-primary/10" : ""}`}
                        >
                          <td className="px-4 py-2.5 sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 shrink-0 bg-primary/10 text-primary border-none"
                                >
                                  {MODULE_LABELS[module] || module}
                                </Badge>
                              )}
                              {idx > 0 && <div className="w-[70px]" />}
                              <span className="text-xs font-medium capitalize text-muted-foreground">
                                {perm.action}
                              </span>
                            </div>
                          </td>
                          {Object.keys(ROLE_META).map((role) => {
                            const has = rolePermissions[role]?.has(perm.id);
                            return (
                              <td
                                key={role}
                                className="px-4 py-2.5 text-center"
                              >
                                {has ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Info ──────────────────────────────────── */}
        <Card className="p-4 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-primary mb-1">
                About Role Default Permissions
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Changes made here affect <strong>all users</strong> with the
                selected role, unless they have specific permission overrides.
                Use this matrix to define the baseline access for MLA/MPs and
                Office Staff. System Admins should always maintain full access.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
