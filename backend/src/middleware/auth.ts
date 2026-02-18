import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../lib/jwt.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/ApiError.js";
import prisma from "../lib/prisma.js";

// Extend Express Request to include user

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
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
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw ApiError.forbidden("Account is inactive");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw ApiError.forbidden("Account locked");
    }

    next();
  } catch (error) {
    next(error);
  }
}
