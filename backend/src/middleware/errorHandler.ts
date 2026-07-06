import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Prisma known errors
  if ((err as any).code === "P2002") {
    res.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
    return;
  }

  if ((err as any).code === "P2025") {
    res.status(404).json({
      success: false,
      message: "Record not found.",
    });
    return;
  }

  // Multer errors
  if (err.name === "MulterError") {
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
    return;
  }

  // Unknown errors — log full stack internally, return sanitized response (AC-4 coverage)
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    tenantId: req.tenantId,
  });

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
}

/**
 * Guard middleware (AC-4): ensures req.tenantPrisma was injected before any
 * route handler runs. If it is missing (e.g. injectTenantContext was skipped),
 * this returns HTTP 500 rather than crashing deep inside a handler.
 *
 * Usage: apply per-route or per-router AFTER injectTenantContext.
 * In practice, since injectTenantContext is applied at router level this
 * guard is a safety net for unexpected missing wiring.
 */
export function requireTenantPrisma(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.tenantPrisma) {
    logger.error("Tenant context not initialized", {
      path: req.path,
      userId: req.user?.id,
    });
    next(new ApiError(500, "Tenant context not initialized"));
    return;
  }
  next();
}