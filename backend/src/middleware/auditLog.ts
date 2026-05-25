import prisma from "../lib/prisma.js";
import logger from "../utils/logger.js";
import { getSetting } from "../lib/settings.js";
import { AuditAction } from "@prisma/client";
import { Request } from "express";

interface AuditLogInput {
  tenantId?: string;
  userId?: string | null;

  action: AuditAction;

  module: string;

  recordId?: string;

  description: string;

  oldData?: any;

  newData?: any;

  ipAddress?: string | null;

  userAgent?: string | null;
}

/**
 * Create audit log (NON-BLOCKING)
 * Never affects main request performance
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const isEnabled = await getSetting("enable_audit_log");
    if (isEnabled === "false") return;

    prisma.auditLog
      .create({
        data: {
          tenantId: input.tenantId ?? undefined,
          userId: input.userId ?? undefined,
          action: input.action,
          module: input.module,
          recordId: input.recordId ?? undefined,
          description: input.description,
          oldData: input.oldData ?? undefined,
          newData: input.newData ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
        },
      })
      .then(() => {
        logger.debug(
          `Audit: ${input.action} ${input.module} ${input.recordId ?? ""}`,
        );
      })
      .catch((error) => {
        logger.error(`Audit log failed: ${error.message}`);
      });
  } catch (error: any) {
    logger.error(`Audit log check failed: ${error.message}`);
  }
}

/**
 * Extract request metadata safely
 */
export function getRequestMeta(req: Request) {
  return {
    ipAddress: req.ip || req.socket.remoteAddress || null,

    userAgent: req.headers["user-agent"] || null,
  };
}
