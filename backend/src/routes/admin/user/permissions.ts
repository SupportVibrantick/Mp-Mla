import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { getUserEffectivePermissions } from "../../../lib/permissions.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      permissionId: z.string().min(1),
      granted: z.boolean(),
    }),
  ),
});

/**
 * GET /api/admin/users/:id/permissions
 * Returns effective permissions + any overrides for this user
 */
export const getUserPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id as string;

    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) throw ApiError.notFound("User not found");

    // Get effective (merged) permissions
    const effective = await getUserEffectivePermissions(user.id);

    // Get raw overrides (what admin has explicitly set)
    const overrides = await prisma.userPermission.findMany({
      where: { userId: user.id },
      include: {
        permission: {
          select: { id: true, module: true, action: true, description: true },
        },
      },
    });

    // Get role defaults for reference
    const roleDefaults = await prisma.roleDefaultPermission.findMany({
      where: { role: user.role },
      include: {
        permission: { select: { id: true, module: true, action: true } },
      },
    });

    const responseData = {
      user,
      effective,
      overrides: overrides.map((o) => ({
        permissionId: o.permissionId,
        module: o.permission.module,
        action: o.permission.action,
        description: o.permission.description,
        granted: o.granted,
      })),
      roleDefaults: roleDefaults.map((rd) => ({
        permissionId: rd.permissionId,
        module: rd.permission.module,
        action: rd.permission.action,
        granted: rd.granted,
      })),
    };

    res.json(
      ApiResponse.success(
        responseData,
        "User permissions fetched successfully",
      ),
    );
  },
);
/**
 * PUT /api/admin/users/:id/permissions
 * Set per-user permission overrides. Send only the overrides, not all permissions.
 *
 * Body: { permissions: [{ permissionId: "xxx", granted: true/false }, ...] }
 *
 * - granted: true  → user gets this permission even if role default says no
 * - granted: false → user loses this permission even if role default says yes
 * - NOT in array   → falls back to role default
 */
export const updateUserPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.params.id as string;
    const { permissions } = req.body;

    if (!userId) {
      throw ApiError.badRequest("User ID is required");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) throw ApiError.notFound("User not found");

    // Verify all permissionIds exist
    if (permissions.length > 0) {
      const permIds = permissions.map((p: any) => p.permissionId);
      const existingPerms = await prisma.permission.findMany({
        where: { id: { in: permIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingPerms.map((p) => p.id));
      const invalid = permIds.filter((id: string) => !existingIds.has(id));
      if (invalid.length > 0) {
        throw ApiError.badRequest(
          `Invalid permission IDs: ${invalid.join(", ")}`,
        );
      }
    }

    // Get old overrides for audit
    const oldOverrides = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: { select: { module: true, action: true } } },
    });

    // Transaction: delete all old overrides, create new ones
    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });

      if (permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map((p: any) => ({
            userId,
            permissionId: p.permissionId,
            granted: p.granted,
          })),
        });
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "PERMISSION_CHANGE",
      module: "users",
      recordId: userId,
      description: `Updated ${permissions.length} permission overrides for ${user.email}`,
      oldData: oldOverrides.map((o) => ({
        module: o.permission.module,
        action: o.permission.action,
        granted: o.granted,
      })),
      newData: permissions,
      ...getRequestMeta(req),
    });

    res.json(
      ApiResponse.success(
        null,
        `${permissions.length} permission overrides saved`,
      ),
    );
  },
);
