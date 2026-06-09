type PlatformRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "SUPPORT_STAFF"
  | "BILLING_MANAGER";

const ROLE_PERMISSIONS: Record<
  PlatformRole,
  { module: string; actions: string[] }[]
> = {
  SUPER_ADMIN: [
    { module: "dashboard", actions: ["read"] },
    { module: "tenants", actions: ["read", "create", "update", "delete"] },
    { module: "subscriptions", actions: ["read", "create", "update", "delete"] },
    { module: "modules", actions: ["read", "create", "update", "delete"] },
    { module: "payments", actions: ["read", "create", "update", "delete"] },
    { module: "users", actions: ["read", "create", "update", "delete"] },
    { module: "settings", actions: ["read", "update"] },
  ],
  PLATFORM_ADMIN: [
    { module: "dashboard", actions: ["read"] },
    { module: "tenants", actions: ["read", "create", "update", "delete"] },
    { module: "subscriptions", actions: ["read", "create", "update", "delete"] },
    { module: "modules", actions: ["read", "create", "update", "delete"] },
    { module: "payments", actions: ["read", "create", "update", "delete"] },
    { module: "users", actions: ["read", "create", "update"] },
    { module: "settings", actions: ["read", "update"] },
  ],
  BILLING_MANAGER: [
    { module: "dashboard", actions: ["read"] },
    { module: "subscriptions", actions: ["read", "create", "update"] },
    { module: "payments", actions: ["read", "create", "update"] },
    { module: "tenants", actions: ["read"] },
  ],
  SUPPORT_STAFF: [
    { module: "dashboard", actions: ["read"] },
    { module: "tenants", actions: ["read"] },
    { module: "modules", actions: ["read"] },
    { module: "subscriptions", actions: ["read"] },
  ],
};

export function getPlatformPermissions(role: string) {
  const defs = ROLE_PERMISSIONS[role as PlatformRole] ?? [];
  const permissions: { module: string; action: string; granted: boolean }[] =
    [];
  const permissionsByModule: Record<string, string[]> = {};

  for (const def of defs) {
    permissionsByModule[def.module] = def.actions;
    for (const action of def.actions) {
      permissions.push({ module: def.module, action, granted: true });
    }
  }

  return { permissions, permissionsByModule, role };
}

export function platformRoleCan(
  role: string,
  module: string,
  action: string,
): boolean {
  const { permissionsByModule } = getPlatformPermissions(role);
  return permissionsByModule[module]?.includes(action) ?? false;
}
