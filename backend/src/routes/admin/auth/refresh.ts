import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../lib/jwt.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // 1. Verify JWT signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized("Invalid or expired refresh token.");
    }

    // 2. Check DB record
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      // If token was already used/revoked, revoke ALL tokens for security (token theft detection)
      if (stored && stored.isRevoked) {
        await prisma.refreshToken.updateMany({
          where: { userId: stored.userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }
      throw ApiError.unauthorized(
        "Refresh token invalid, expired, or already used.",
      );
    }

    if (stored.user.status !== "ACTIVE") {
      throw ApiError.forbidden("Account is deactivated.");
    }

    // 3. Rotate: revoke old token
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    // 4. Issue new pair
    const newAccessToken = generateAccessToken({
      id: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
      name: stored.user.name,
    });

    const newRefreshRecord = await prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        token: "placeholder",
        ipAddress: req.ip || null,
        userAgent: req.headers["user-agent"] || null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const newRefreshToken = generateRefreshToken({
      userId: stored.user.id,
      tokenId: newRefreshRecord.id,
    });

    await prisma.refreshToken.update({
      where: { id: newRefreshRecord.id },
      data: { token: newRefreshToken },
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}
