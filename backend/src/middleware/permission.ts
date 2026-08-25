import { Request, Response, NextFunction } from "express";
import { checkPermission } from "../lib/permissions.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

/**
 * Middleware that checks database-driven permissions.
 *
 * Usage: requirePermission("grievances", "create")
 *
 * This checks:
 *   1. User-level override (UserPermission table)
 *   2. Role default (RoleDefaultPermission table)
 */
export function requirePermission(module: string, action: string) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }

      const tenantId = req.tenantId || req.user.tenantId;
      if (!tenantId) {
        throw ApiError.forbidden("No tenant context found for this request.");
      }

      if (req.user.tenantId && req.user.tenantId !== tenantId) {
        throw ApiError.forbidden("Access denied: tenant mismatch.");
      }

      const hasAccess = await checkPermission(req.user.id, tenantId, module, action);

      if (!hasAccess) {
        logger.warn(
          `Permission denied: ${req.user.email} lacks ${module}:${action} for ${req.method} ${req.url}`,
        );
        throw ApiError.forbidden(
          `You do not have '${action}' permission on '${module}'.`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
