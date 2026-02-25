import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
/**
 * PUT /api/admin/users/:id
 */

export const updateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;

  if (!userId) {
    throw ApiError.badRequest("User ID is required");
  }

  if (!req.user) {
    throw ApiError.unauthorized("Authentication required");
  }

  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
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
  if (req.body.role !== undefined) updateData.role = req.body.role;
  if (req.body.status !== undefined) updateData.status = req.body.status;

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
    action: auditAction,
    module: "users",
    recordId: user.id,
    description: `Updated user ${user.email}: ${JSON.stringify(req.body)}`,
    oldData: {
      name: oldUser.name,
      role: oldUser.role,
      status: oldUser.status,
    },
    newData: updateData,
    ...getRequestMeta(req),
  });

  //  Standard response
  res.json(ApiResponse.success(user, "User updated successfully"));
});
