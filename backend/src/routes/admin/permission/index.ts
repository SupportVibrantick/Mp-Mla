import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { getPermissionsGroupedByModule } from "../../../lib/permissions.js";
import catchAsync from "@/utils/catchAsync.js";

import ApiResponse from "../../../utils/ApiResponse.js";
import { ApiError } from "@/utils/ApiError.js";

const router = Router();

/**
 * GET /api/admin/permissions
 * Returns all permissions in the system, grouped by module.
 * Used by admin UI to render the permission editor grid.
 */
router.get(
  "/",
  requirePermission("users", "read"),
  catchAsync(async (_req, res) => {
    const grouped = await getPermissionsGroupedByModule();

    const flat = await prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
      select: { id: true, module: true, action: true, description: true },
    });

    // Get all unique modules
    const modules = [...new Set(flat.map((p) => p.module))];

    // Get all unique actions
    const actions = [...new Set(flat.map((p) => p.action))];

    res.json(
      ApiResponse.success(
        {
          modules,
          actions,
          flat,
          grouped,
          totalCount: flat.length,
        },
        "Permissions fetched successfully",
      ),
    );
  }),
);
/**
 * GET /api/admin/permissions/role-defaults
 * Returns what each role gets by default.
 * Admin uses this to understand the baseline before making overrides.
 */
router.get(
  "/role-defaults",
  requirePermission("users", "read"),
  catchAsync(async (_req, res) => {
    const defaults = await prisma.roleDefaultPermission.findMany({
      include: {
        permission: {
          select: { id: true, module: true, action: true, description: true },
        },
      },
      orderBy: [{ role: "asc" }],
    });

    // Group by role
    const byRole: Record<string, any[]> = {
      SYSTEM_ADMIN: [],
      MLA_MP: [],
      OFFICE_STAFF: [],
    };

    for (const d of defaults) {
      if (!byRole[d.role]) byRole[d.role] = [];
      byRole[d.role].push({
        permissionId: d.permissionId,
        module: d.permission.module,
        action: d.permission.action,
        description: d.permission.description,
        granted: d.granted,
      });
    }

    // Summary counts
    const summary = Object.entries(byRole).map(([role, perms]) => ({
      role,
      totalPermissions: perms.length,
      modules: [...new Set(perms.map((p) => p.module))].length,
    }));

    res.json(
      ApiResponse.success(
        {
          byRole,
          summary,
        },
        "Role default permissions fetched successfully",
      ),
    );
  }),
);

/**
 * PUT /api/admin/permissions/role-defaults
 * Bulk update role default permissions.
 *
 * Body: { role: "MLA_MP", permissions: [{ permissionId: "xxx", granted: true }, ...] }
 */
router.put(
  "/role-defaults",
  requirePermission("users", "update"),
  catchAsync(async (req, res) => {
    const { role, permissions } = req.body;

    if (!role || !Array.isArray(permissions)) {
      throw ApiError.badRequest("Role and permissions array are required");
    }

    // Verify all permissionIds exist
    const permIds = permissions.map((p: any) => p.permissionId);
    const existingPerms = await prisma.permission.findMany({
      where: { id: { in: permIds } },
      select: { id: true },
    });

    const existingIds = new Set(existingPerms.map((p) => p.id));
    const invalid = permIds.filter((id: string) => !existingIds.has(id));

    if (invalid.length > 0) {
      throw ApiError.badRequest(`Invalid permission IDs: ${invalid.join(", ")}`);
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing for this role
      await tx.roleDefaultPermission.deleteMany({
        where: { role: role as any },
      });

      // Create new defaults
      if (permissions.length > 0) {
        await tx.roleDefaultPermission.createMany({
          data: permissions.map((p: any) => ({
            role: role as any,
            permissionId: p.permissionId,
            granted: p.granted,
          })),
        });
      }
    });

    res.json(ApiResponse.success(null, `Role defaults for ${role} updated`));
  }),
);

export default router;
