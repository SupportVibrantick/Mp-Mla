import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../../../lib/jwt.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    const meta = getRequestMeta(req);

    // 1. Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password.");
    }

    // 2. Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Login attempt on locked account: ${email}`,
        ...meta,
      });
      throw ApiError.forbidden(
        `Account locked until ${user.lockedUntil.toLocaleTimeString()}.`,
      );
    }

    // 3. Check status
    if (user.status !== "ACTIVE") {
      throw ApiError.forbidden(
        "Account is deactivated. Contact administrator.",
      );
    }

    // 4. Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      const newCount = user.failedLoginCount + 1;
      const shouldLock = newCount >= 5;
      const lockUntil = shouldLock
        ? new Date(Date.now() + 30 * 60 * 1000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: newCount, lockedUntil: lockUntil },
      });

      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        module: "auth",
        description: `Failed login #${newCount} for ${email}`,
        ...meta,
      });

      if (shouldLock) {
        await createAuditLog({
          userId: user.id,
          action: "ACCOUNT_LOCKED",
          module: "auth",
          description: `Account locked after ${newCount} failed attempts`,
          ...meta,
        });
      }

      throw ApiError.unauthorized("Invalid email or password.");
    }

    // 5. Success — reset failed count
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: meta.ipAddress || undefined,
      },
    });

    // 6. Generate access token
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    // 7. Create refresh token record in DB, then generate JWT
    const refreshRecord = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: "placeholder",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      tokenId: refreshRecord.id,
    });

    await prisma.refreshToken.update({
      where: { id: refreshRecord.id },
      data: { token: refreshToken },
    });

    // 8. Audit log
    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      module: "auth",
      description: `${user.name} (${user.role}) logged in`,
      ...meta,
    });

    // 9. Respond
    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          forcePasswordChange: user.forcePasswordChange,
          lastLoginAt: user.lastLoginAt,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}
