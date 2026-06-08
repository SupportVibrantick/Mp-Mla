import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import {
  createTenantPrisma,
  runWithTenantContext,
  TenantPrismaClient,
} from "../lib/tenantPrisma.js";
import { ApiError } from "../utils/ApiError.js";
import logger from "../utils/logger.js";

// Extend Express Request to include tenant-scoped Prisma
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantPrisma?: TenantPrismaClient;
    }
  }
}

/**
 * Middleware: Injects tenant context into the request.
 * Must be used AFTER the `authenticate` middleware.
 *
 * What it does:
 * 1. Extracts tenantId from the authenticated user's JWT payload
 * 2. Validates the tenant exists and is ACTIVE
 * 3. Checks that the subscription is in a usable state (not expired/cancelled/suspended)
 * 4. Creates a tenant-scoped Prisma client (auto-injects tenantId in queries)
 * 5. Attaches both `req.tenantId` and `req.tenantPrisma` to the request
 *
 * Usage in routes:
 *   router.use(authenticate, requireActiveUser, injectTenantContext);
 *   // Then in handlers:
 *   const wards = await req.tenantPrisma!.ward.findMany(); // auto-scoped
 */
export async function injectTenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required before tenant context");
    }

    // Get tenantId from the JWT payload
    const tenantId = (req.user as any).tenantId;

    if (!tenantId) {
      logger.error(`User ${req.user.id} has no tenantId in JWT`);
      throw ApiError.forbidden("No tenant associated with this account");
    }

    // Validate tenant exists and is active
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        status: true,
        name: true,
        subscription: {
          select: { status: true, trialEndsAt: true },
        },
      },
    });

    if (!tenant) {
      logger.error(`Tenant ${tenantId} not found for user ${req.user.id}`);
      throw ApiError.forbidden("Tenant not found");
    }

    if (tenant.status !== "ACTIVE") {
      logger.warn(`Tenant ${tenant.name} (${tenantId}) is ${tenant.status}`);
      throw ApiError.forbidden(
        `Your organization account is ${tenant.status.toLowerCase()}. Contact support.`,
      );
    }

    // ── Block if subscription is not usable ──
    if (tenant.subscription) {
      const sub = tenant.subscription;
      if (
        sub.status === "TRIALING" &&
        sub.trialEndsAt &&
        new Date() > new Date(sub.trialEndsAt)
      ) {
        throw ApiError.forbidden(
          "Your free trial has expired. Please upgrade.",
        );
      }
      if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(sub.status)) {
        throw ApiError.forbidden(
          `Subscription is ${sub.status.toLowerCase()}. Contact support.`,
        );
      }
    }

    // Attach tenant context to request
    req.tenantId = tenantId;
    req.tenantPrisma = createTenantPrisma(prisma as any, tenantId);

    runWithTenantContext(tenantId, next);
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Validates tenant from a request parameter (for platform routes).
 * Used by Master Dashboard when operating on a specific tenant.
 *
 * Usage:
 *   router.get("/tenants/:tenantId/users", authenticatePlatform, validateTenantParam, handler);
 */
export async function validateTenantParam(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantIdParam = req.params.tenantId;
    const tenantId = Array.isArray(tenantIdParam) ? tenantIdParam[0] : tenantIdParam;

    if (!tenantId) {
      throw ApiError.badRequest("Tenant ID is required");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, status: true, name: true },
    });

    if (!tenant) {
      throw ApiError.notFound("Tenant not found");
    }

    // Attach for downstream use
    req.tenantId = tenantId;
    req.tenantPrisma = createTenantPrisma(prisma as any, tenantId);

    runWithTenantContext(tenantId, next);
  } catch (error) {
    next(error);
  }
}
