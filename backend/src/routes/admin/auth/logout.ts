import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // Revoke specific token or all tokens for this user
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId: req.user!.id },
        data: { isRevoked: true },
      });
    } else {
      // Logout from all devices
      await prisma.refreshToken.updateMany({
        where: { userId: req.user!.id, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "LOGOUT",
      module: "auth",
      description: `${req.user!.name} logged out${!refreshToken ? " from all devices" : ""}`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
}
