import { useAllPermissions, useRoleDefaults } from "@/hooks/useUsers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Lock, CheckCircle2, XCircle, Info, Users } from "lucide-react";
import { useMemo } from "react";
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
};

export default function PermissionsOverview() {
  const { data: allPermsData, isLoading: permsLoading } = useAllPermissions();
  const { data: roleDefaultsData, isLoading: defaultsLoading } =
    useRoleDefaults();

  const isLoading = permsLoading || defaultsLoading;
  const allPermissions = allPermsData?.data?.flat || [];
  const roleDefaults = roleDefaultsData?.data?.byRole || {};
  const summary = roleDefaultsData?.data?.summary || [];

  // Group permissions by module
  const groupedPerms = useMemo(() => {
    const grouped: Record<string, typeof allPermissions> = {};
    for (const p of allPermissions) {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    }
    return grouped;
  }, [allPermissions]);

  // Build a set of permissionIds for each role
  const rolePermSets = useMemo(() => {
    const sets: Record<string, Set<string>> = {};
    for (const [role, perms] of Object.entries(roleDefaults) as [
      string,
      any[],
    ][]) {
      sets[role] = new Set(
        perms.filter((p: any) => p.granted).map((p: any) => p.permissionId),
      );
    }
    return sets;
  }, [roleDefaults]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <MainLayout title="Grievances">
      <div className="space-y-6">
        {/* ─── Header ────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View the default permission matrix for each role. To customize
            permissions for a specific user, go to User Management → Manage
            Permissions.
          </p>
        </div>

        {/* ─── Summary Cards ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summary.map((s: any) => {
            const meta = ROLE_META[s.role];
            return (
              <Card key={s.role} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-bold ${meta.color}`}>{meta.label}</h3>
                  <Badge variant="outline" className="text-xs">
                    {s.totalPermissions} perms
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  Covers <strong>{s.modules}</strong> modules
                </div>
              </Card>
            );
          })}
        </div>

        {/* ─── Permission Matrix ─────────────────────── */}
        <Tabs defaultValue="OFFICE_STAFF">
          <TabsList className="mb-4">
            {Object.entries(ROLE_META).map(([role, meta]) => (
              <TabsTrigger key={role} value={role} className="px-4">
                {meta.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="comparison" className="px-4">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Comparison
            </TabsTrigger>
          </TabsList>

          {/* ─── Individual Role Tabs ─────────────────── */}
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <TabsContent key={role} value={role}>
              <div className="space-y-4">
                {Object.entries(groupedPerms).map(([module, perms]) => {
                  const permSet = rolePermSets[role] || new Set();
                  const grantedCount = perms.filter((p) =>
                    permSet.has(p.id),
                  ).length;
                  const allGranted = grantedCount === perms.length;
                  const noneGranted = grantedCount === 0;

                  return (
                    <Card key={module} className="overflow-hidden">
                      <div className="bg-muted/40 px-5 py-3 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          {MODULE_LABELS[module] || module}
                        </h3>
                        <Badge
                          variant={
                            allGranted
                              ? "default"
                              : noneGranted
                                ? "secondary"
                                : "outline"
                          }
                          className={`text-[10px] ${
                            allGranted
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : noneGranted
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                          }`}
                        >
                          {grantedCount}/{perms.length}
                        </Badge>
                      </div>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0">
                          {perms.map((perm) => {
                            const isGranted = permSet.has(perm.id);
                            return (
                              <div
                                key={perm.id}
                                className={`flex items-center gap-3 px-5 py-3 ${
                                  isGranted ? "" : "opacity-50"
                                }`}
                              >
                                {isGranted ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <div>
                                  <span className="text-sm font-medium capitalize">
                                    {perm.action}
                                  </span>
                                  {perm.description && (
                                    <p className="text-[11px] text-muted-foreground">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
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
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground sticky left-0 bg-muted/40 z-10">
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
                          className={`border-b hover:bg-muted/20 ${idx === 0 ? "border-t-2" : ""}`}
                        >
                          <td className="px-4 py-2.5 sticky left-0 bg-background z-10">
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                >
                                  {MODULE_LABELS[module] || module}
                                </Badge>
                              )}
                              {idx > 0 && <span className="w-[80px]" />}
                              <span className="text-xs font-medium capitalize">
                                {perm.action}
                              </span>
                            </div>
                          </td>
                          {Object.keys(ROLE_META).map((role) => {
                            const has = rolePermSets[role]?.has(perm.id);
                            return (
                              <td
                                key={role}
                                className="px-4 py-2.5 text-center"
                              >
                                {has ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
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
        <Card className="p-4 border-dashed">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                About Permission Overrides
              </p>
              <p>
                These are the <strong>default</strong> permissions for each
                role. Admin can override individual permissions per user from
                the User Management page. Overrides take priority over role
                defaults — you can grant a permission the role doesn't have, or
                revoke one it does.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
