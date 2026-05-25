import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../lib/jwt.js";
import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

export type PlatformAccessTokenPayload = AccessTokenPayload & {
  accountType: "platform";
};

declare global {
  namespace Express { 
    interface Request {
      platformUser?: PlatformAccessTokenPayload;
    }
  }
}

export function authenticatePlatform(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    if (decoded.accountType !== "platform") {
      throw ApiError.unauthorized("Invalid platform token");
    }

    req.platformUser = decoded as PlatformAccessTokenPayload;
    next();
  } catch (error: any) {
    logger.warn(`Platform authentication failed: ${error.message}`);
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}

export async function requireActivePlatformUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.platformUser) {
      throw ApiError.unauthorized();
    }

    const user = await prisma.platformUser.findUnique({
      where: { id: req.platformUser.id },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.forbidden("Platform account is inactive");
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function authorizePlatform(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.platformUser) {
      return next(ApiError.unauthorized());
    }

    if (!roles.includes(req.platformUser.role)) {
      return next(ApiError.forbidden("Insufficient platform permissions"));
    }

    next();
  };
}
