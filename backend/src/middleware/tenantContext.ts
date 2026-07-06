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
      /**
       * True when this request was initiated via a platform impersonation token.
       * Set by injectTenantContext when the JWT contains isImpersonated: true.
       */
      isImpersonated?: boolean;
    }
  }
}

/**
 * Middleware: Injects tenant context into the request.
 * Must be used AFTER the `authenticate` + `requireActiveUser` middleware chain.
 *
 * What it does:
 * 1. Extracts tenantId from the authenticated user's JWT payload (or req.user.tenantId
 *    already populated by requireActiveUser)
 * 2. Validates the tenant exists and is ACTIVE (SUSPENDED / DEACTIVATED → HTTP 403)
 * 3. Checks that the subscription is in a usable state
 * 4. Creates a tenant-scoped Prisma client (auto-injects tenantId in every query)
 * 5. Attaches both `req.tenantId` and `req.tenantPrisma` to the request
 *
 * Exclusions — do NOT apply this middleware to:
 *   - /api/admin/auth/*          (unauthenticated login flow)
 *   - /api/admin/settings/public/branding  (public branding endpoint)
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

    // requireActiveUser already sets req.tenantId; fall back to JWT claim
    const tenantId = req.tenantId || (req.user as any).tenantId;

    if (!tenantId) {
      logger.error(`User ${req.user.id} has no tenantId in JWT or request`);
      throw ApiError.forbidden("No tenant associated with this account");
    }

    // Validate tenant exists and is NOT suspended / deactivated
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

    // AC-7: SUSPENDED or DEACTIVATED → block with a clear message
    if (tenant.status === "SUSPENDED" || tenant.status === "DEACTIVATED") {
      logger.warn(
        `Blocked request: tenant ${tenant.name} (${tenantId}) is ${tenant.status}`,
      );
      throw ApiError.forbidden("Organization account is inactive.");
    }

    if (tenant.status !== "ACTIVE") {
      throw ApiError.forbidden(
        `Your organization account is ${String(tenant.status).toLowerCase()}. Contact support.`,
      );
    }

    // Block if subscription is not usable
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

    // Attach tenant-scoped Prisma to request (AC-2)
    req.tenantId = tenantId;
    req.tenantPrisma = createTenantPrisma(prisma as any, tenantId);

    // Carry isImpersonated flag through if present on JWT
    if ((req.user as any).isImpersonated) {
      req.isImpersonated = true;
    }

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
