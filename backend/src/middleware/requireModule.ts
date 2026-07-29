import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { requireTenantId } from "../utils/tenant.js";

/** Modules always available regardless of TenantModuleAccess */
export const ALWAYS_ENABLED_MODULES = new Set([
  "dashboard",
  "users",
  "settings",
  "branding",
  "audit_logs",
  "notifications",
  "recycle_bin",
  "data_import",
]);

const accessCache = new Map<
  string,
  { codes: Set<string>; expiresAt: number }
>();
const CACHE_TTL = 60 * 1000;

async function getEnabledModuleCodes(tenantId: string): Promise<Set<string>> {
  const now = Date.now();
  const cached = accessCache.get(tenantId);
  if (cached && now < cached.expiresAt) {
    return cached.codes;
  }

  const rows = await prisma.tenantModuleAccess.findMany({
    where: {
      tenantId,
      isEnabled: true,
    },
    include: { module: { select: { code: true, isActive: true } } },
  });

  const codes = new Set<string>(ALWAYS_ENABLED_MODULES);
  for (const row of rows) {
    if (row.module.isActive) {
      codes.add(row.module.code);
    }
  }

  accessCache.set(tenantId, { codes, expiresAt: now + CACHE_TTL });
  return codes;
}

export function clearModuleAccessCache(tenantId?: string) {
  if (tenantId) accessCache.delete(tenantId);
  else accessCache.clear();
}

export function requireModule(...moduleCodes: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tenantId = requireTenantId(req);
      const enabled = await getEnabledModuleCodes(tenantId);
      const allowed = moduleCodes.some(
        (code) => ALWAYS_ENABLED_MODULES.has(code) || enabled.has(code),
      );
      if (!allowed) {
        throw ApiError.forbidden(
          "This module is not enabled for your organization. Contact support to upgrade.",
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function listEnabledModules(tenantId: string): Promise<string[]> {
  const codes = await getEnabledModuleCodes(tenantId);
  return Array.from(codes);
}
