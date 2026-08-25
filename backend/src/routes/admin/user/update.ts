import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
/**
 * PUT /api/admin/users/:id
 */

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const userId = req.params.id as string;

  if (!userId) {
    throw ApiError.badRequest("User ID is required");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const oldUser = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      designation: true,
      departmentId: true,
    },
  });

  if (!oldUser) throw ApiError.notFound("User not found");

  // ✅ Prevent self role change
  if (
    userId === req.user.id &&
    req.body.role &&
    req.body.role !== oldUser.role
  ) {
    throw ApiError.badRequest("You cannot change your own role");
  }

  //  Build update object safely
  const updateData: any = {};
  if (req.body.name !== undefined) updateData.name = req.body.name;
  if (req.body.phone !== undefined) updateData.phone = req.body.phone;
  if (req.body.designation !== undefined) updateData.designation = req.body.designation;
  if (req.body.departmentId !== undefined) updateData.departmentId = req.body.departmentId || null;
  if (req.body.role !== undefined) updateData.role = req.body.role;
  if (req.body.status !== undefined) updateData.status = req.body.status;

  if (req.body.departmentId) {
    const department = await prisma.department.findFirst({
      where: {
        id: req.body.departmentId,
        tenantId,
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
    });
    if (!department) throw ApiError.notFound("Active department not found");
  }

  if (
    req.body.phone !== undefined &&
    req.body.phone !== oldUser.phone &&
    req.body.phone
  ) {
    const duplicatePhone = await prisma.user.findFirst({
      where: {
        tenantId,
        phone: req.body.phone,
        id: { not: userId },
      },
      select: { id: true },
    });

    if (duplicatePhone) {
      throw ApiError.conflict(
        "User with this phone number already exists in this organization.",
      );
    }
  }

  // If suspending/deactivating, revoke tokens
  if (
    req.body.status &&
    req.body.status !== "ACTIVE" &&
    oldUser.status === "ACTIVE"
  ) {
    await prisma.refreshToken.updateMany({
      where: { userId: oldUser.id, isRevoked: false },
      data: { isRevoked: true },
    });
  }
  // If unlocking (status back to ACTIVE from SUSPENDED)
  if (req.body.status === "ACTIVE" && oldUser.status === "SUSPENDED") {
    updateData.failedLoginCount = 0;
    updateData.lockedUntil = null;
  }

  //  Update user
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      designation: true,
      departmentId: true,
      updatedAt: true,
    },
  });

  //  Determine audit action
  const auditAction =
    req.body.status && req.body.status !== oldUser.status
      ? ("STATUS_CHANGE" as const)
      : req.body.role && req.body.role !== oldUser.role
        ? ("PERMISSION_CHANGE" as const)
        : ("UPDATE" as const);

  //  Audit log (non-blocking)
  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: auditAction,
    module: "users",
    recordId: user.id,
    description: `Updated user ${user.email}: ${JSON.stringify(req.body)}`,
    oldData: {
      name: oldUser.name,
      role: oldUser.role,
      status: oldUser.status,
      designation: oldUser.designation,
      departmentId: oldUser.departmentId,
    },
    newData: updateData,
    ...getRequestMeta(req),
  });

  //  Standard response
  res.json(ApiResponse.success(user, "User updated successfully"));
});
