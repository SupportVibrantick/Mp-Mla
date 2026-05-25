import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../lib/jwt.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import prisma from "../lib/prisma.js";

// Extend Express Request to include user

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      tenantId?: string;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (decoded.accountType && decoded.accountType !== "admin") {
      throw ApiError.unauthorized("Invalid admin token");
    }

    req.user = decoded;

    next();
  } catch (error: any) {
    logger.warn(`Authentication failed: ${error.message}`);

    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

/**
 * Middleware to authorize specific roles
 * Usage: authorize("SYSTEM_ADMIN", "MP_MLA")
 */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email}`);

      return next(ApiError.forbidden("Insufficient permissions"));
    }

    next();
  };
}

export async function requireActiveUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        status: true,
        lockedUntil: true,
        tenantId: true,
        tenant: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw ApiError.forbidden("Account is inactive");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw ApiError.forbidden("Account locked");
    }

    if (!req.user.tenantId) {
      req.user.tenantId = user.tenantId;
    }

    if (user.tenant.status !== "ACTIVE") {
      throw ApiError.forbidden(
        `Your organization account is ${user.tenant.status.toLowerCase()}. Contact support.`,
      );
    }

    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    next(error);
  }
}
