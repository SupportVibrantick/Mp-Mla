import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { archiveToRecycleBin, isRecordInRecycleBin } from "../../../lib/recycleBin.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * DELETE /api/admin/users/:id
 * Soft delete user — archives to Recycle Bin and sets status to INACTIVE
 */

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const userId = req.params.id as string;

    if (!userId) {
      throw ApiError.badRequest("User ID is required.");
    }

    if (!req.user) {
      throw ApiError.unauthorized("Authentication required.");
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      throw ApiError.badRequest("You cannot delete your own account.");
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        permissions: true,
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Check if already in recycle bin
    const recycled = await isRecordInRecycleBin("user", userId);
    if (recycled) {
      throw ApiError.badRequest("User already in Recycle Bin.");
    }

    // Archive payload to Recycle Bin
    await archiveToRecycleBin({
      tenantId,
      module: "users",
      entityType: "user",
      recordId: user.id,
      recordLabel: user.name || user.email,
      payload: user,
      deletedById: req.user.id,
    });

    // Soft delete -> set INACTIVE
    await prisma.user.update({
      where: { id: userId },
      data: { status: "INACTIVE" },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
      },
    });

    // Audit log
    createAuditLog({
      userId: req.user.id,
      tenantId,
      action: "DELETE",
      module: "users",
      recordId: user.id,
      description: `Deleted user ${user.email} (moved to Recycle Bin)`,
      oldData: { status: user.status },
      newData: { status: "INACTIVE", inRecycleBin: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `User ${user.name || user.email} deleted and moved to Recycle Bin successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

