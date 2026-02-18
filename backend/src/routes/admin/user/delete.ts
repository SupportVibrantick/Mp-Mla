import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * DELETE /api/admin/users/:id
 * Soft delete — sets status to INACTIVE and revokes all tokens
 */

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.params.id as string;

    if (!userId) {
      throw ApiError.badRequest("User ID is required.");
    }

    if (!req.user) {
      throw ApiError.unauthorized("Authentication required.");
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      throw ApiError.badRequest("You cannot deactivate your own account.");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (user.status === "INACTIVE") {
      throw ApiError.badRequest("User already inactive.");
    }

    // Soft delete
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
      action: "STATUS_CHANGE",
      module: "users",
      recordId: user.id,
      description: `Deactivated user ${user.email}`,
      oldData: { status: user.status },
      newData: { status: "INACTIVE" },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `User ${user.email} deactivated successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
