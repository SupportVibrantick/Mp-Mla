import { Request } from "express";
import { ApiError } from "./ApiError.js";

export function requireTenantId(req: Request): string {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    throw ApiError.forbidden("No tenant associated with this account");
  }
  return tenantId;
}
