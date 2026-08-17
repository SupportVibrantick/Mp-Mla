import { Router } from "express";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../../lib/jwt.js";
import { env } from "../../../lib/env.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import {
  authenticatePlatform,
  requireActivePlatformUser,
} from "../../../middleware/platformAuth.js";
import { getPlatformPermissions } from "../../../lib/platformPermissions.js";
import {
  platformChangePasswordSchema,
  platformLoginSchema,
  platformRefreshSchema,
  platformUpdateProfileSchema,
} from "../../../schemas/platform/auth/index.js";

const router = Router();

function platformUserResponse(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    createdAt: user.createdAt,
    accountType: "platform" as const,
  };
}

async function createPlatformTokenPair(
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  },
  req: Request,
) {
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    accountType: "platform",
  });

  const refreshRecord = await prisma.refreshToken.create({
    data: {
      platformUserId: user.id,
      token: "placeholder",
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    tokenId: refreshRecord.id,
    accountType: "platform",
  });

  await prisma.refreshToken.update({
    where: { id: refreshRecord.id },
    data: { token: refreshToken },
  });

  return { accessToken, refreshToken };
}

router.post(
  "/login",
  validate(platformLoginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = String(email || "").trim().toLowerCase();

      const user = await prisma.platformUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user) {
        throw ApiError.unauthorized("Invalid email or password.");
      }

      if (!user.isActive) {
        throw ApiError.forbidden("Platform account is inactive.");
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw ApiError.unauthorized("Invalid email or password.");
      }

      const updatedUser = await prisma.platformUser.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: req.ip || undefined,
        },
      });

      const tokens = await createPlatformTokenPair(updatedUser, req);

      res.json({
        success: true,
        message: "Platform login successful",
        data: {
          user: platformUserResponse(updatedUser),
          ...tokens,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/refresh",
  validate(platformRefreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      try {
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded.accountType !== "platform") {
          throw new Error("Wrong token type");
        }
      } catch {
        throw ApiError.unauthorized("Invalid or expired refresh token.");
      }

      const stored = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { platformUser: true },
      });

      if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
        if (stored?.platformUserId && stored.isRevoked) {
          await prisma.refreshToken.updateMany({
            where: {
              platformUserId: stored.platformUserId,
              isRevoked: false,
            },
            data: { isRevoked: true },
          });
        }

        throw ApiError.unauthorized(
          "Refresh token invalid, expired, or already used.",
        );
      }

      if (!stored.platformUser || !stored.platformUser.isActive) {
        throw ApiError.forbidden("Platform account is inactive.");
      }

      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { isRevoked: true },
      });

      const tokens = await createPlatformTokenPair(stored.platformUser, req);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/logout",
  authenticatePlatform,
  requireActivePlatformUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const platformUserId = req.platformUser!.id;

      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken, platformUserId },
          data: { isRevoked: true },
        });
      } else {
        await prisma.refreshToken.updateMany({
          where: { platformUserId, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/me/permissions",
  authenticatePlatform,
  requireActivePlatformUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = getPlatformPermissions(req.platformUser!.role);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/me",
  authenticatePlatform,
  requireActivePlatformUser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.platformUser.findUnique({
        where: { id: req.platformUser!.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw ApiError.notFound("Platform user not found");
      }

      res.json({ success: true, data: platformUserResponse(user) });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/me",
  authenticatePlatform,
  requireActivePlatformUser,
  validate(platformUpdateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.platformUser.update({
        where: { id: req.platformUser!.id },
        data: req.body,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: platformUserResponse(user),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/change-password",
  authenticatePlatform,
  requireActivePlatformUser,
  validate(platformChangePasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.platformUser.findUnique({
        where: { id: req.platformUser!.id },
      });

      if (!user) {
        throw ApiError.notFound("Platform user not found");
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw ApiError.badRequest("Current password is incorrect.");
      }

      const isSame = await bcrypt.compare(newPassword, user.password);
      if (isSame) {
        throw ApiError.badRequest("New password must be different from current.");
      }

      await prisma.platformUser.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS),
        },
      });

      await prisma.refreshToken.updateMany({
        where: { platformUserId: user.id, isRevoked: false },
        data: { isRevoked: true },
      });

      res.json({
        success: true,
        message: "Password changed. Please login again with new password.",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
