import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.notFound("User not found");

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw ApiError.badRequest("Current password is incorrect.");

    // Prevent reusing same password
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) throw ApiError.badRequest("New password must be different from current.");

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        passwordChangedAt: new Date(),
        forcePasswordChange: false,
      },
    });

    // Revoke all refresh tokens (force re-login everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    });

    await createAuditLog({
      userId: user.id,
      action: "PASSWORD_CHANGE",
      module: "auth",
      description: `Password changed for ${user.email}`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Password changed. Please login again with new password.",
    });
  } catch (error) {
    next(error);
  }
}