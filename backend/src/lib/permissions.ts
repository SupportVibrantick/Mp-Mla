import prisma from "./prisma.js";
import logger from "../utils/logger.js";

/**
 * Check if a user has a specific permission.
 *
 * Priority:
 *   1. SYSTEM_ADMIN users are always allowed.
 *   2. user_permissions (per-user override) → if found, return its granted value
 *   3. role_default_permissions → if found, return its granted value
 *   4. Not found → DENY
 */
export async function checkPermission(
  userId: string,
  module: string,
  action: string,
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    if (user.role === "SYSTEM_ADMIN") {
      return true;
    }

    // Find the permission definition
    const permission = await prisma.permission.findUnique({
      where: { module_action: { module, action } },
    });

    if (!permission) {
      logger.warn(`Permission not found in DB: ${module}:${action}`);
      return false;
    }

    // 1. Check user-level override
    const userOverride = await prisma.userPermission.findUnique({
      where: {
        userId_permissionId: {
          userId,
          permissionId: permission.id,
        },
      },
    });

    if (userOverride !== null) {
      return userOverride.granted;
    }

    // 2. Fall back to role default
    const roleDefault = await prisma.roleDefaultPermission.findUnique({
      where: {
        role_permissionId: {
          role: user.role,
          permissionId: permission.id,
        },
      },
    });

    return roleDefault?.granted ?? false;
  } catch (error) {
    logger.error(
      `Permission check failed for ${userId} ${module}:${action}: ${error}`,
    );
    return false;
  }
}

/**
 * Get all effective permissions for a user (used by frontend for UI rendering)
 */
export async function getUserEffectivePermissions(
  userId: string,
): Promise<{ module: string; action: string; granted: boolean }[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return [];

  const allPermissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });

  const roleDefaults = await prisma.roleDefaultPermission.findMany({
    where: { role: user.role },
  });
  const roleMap = new Map(
    roleDefaults.map((rd) => [rd.permissionId, rd.granted]),
  );

  const userOverrides = await prisma.userPermission.findMany({
    where: { userId },
  });
  const overrideMap = new Map(
    userOverrides.map((uo) => [uo.permissionId, uo.granted]),
  );

  return allPermissions.map((p) => {
    let granted = false;

    if (overrideMap.has(p.id)) {
      granted = overrideMap.get(p.id)!;
    } else if (roleMap.has(p.id)) {
      granted = roleMap.get(p.id)!;
    }

    return { module: p.module, action: p.action, granted };
  });
}

/**
 * Get all permissions grouped by module (for admin UI permission editor)
 */
export async function getPermissionsGroupedByModule() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });

  const grouped: Record<string, typeof permissions> = {};
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }

  return grouped;
}
