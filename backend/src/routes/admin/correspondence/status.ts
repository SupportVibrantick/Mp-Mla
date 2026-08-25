import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateTransition } from "../../../services/correspondence/correspondenceWorkflow.service.js";

/**
 * PATCH /api/admin/correspondence/:id/status
 * Transition correspondence status
 */
export async function transitionStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const { status, comment } = req.body;

    const old = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Correspondence not found");

    // Enforce workflow validation
    validateTransition(old.status, status);

    const completedAt = status === "COMPLETED" ? new Date() : old.completedAt;

    const updated = await prisma.$transaction(async (tx) => {
      const corr = await tx.correspondence.update({
        where: { id: corrId },
        data: {
          status,
          completedAt,
        },
      });

      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          action: status,
          comment: comment || `Status updated from "${old.status}" to "${status}"`,
          changedById: req.user!.id,
        },
      });

      return corr;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_STATUS_CHANGED: Transitioned status for ref "${updated.referenceNumber}" to "${status}"`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Correspondence status transitioned to "${status}"`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/correspondence/:id/reply
 * Record reply text and set status to REPLIED
 */
export async function logReply(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const { replyText } = req.body;

    const old = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Correspondence not found");

    // Enforce workflow validation (Target status: REPLIED)
    validateTransition(old.status, "REPLIED");

    const updated = await prisma.$transaction(async (tx) => {
      const corr = await tx.correspondence.update({
        where: { id: corrId },
        data: {
          status: "REPLIED",
          replyText,
          repliedAt: new Date(),
        },
      });

      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          action: "REPLIED",
          comment: "Official response prepared and logged",
          changedById: req.user!.id,
        },
      });

      return corr;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_REPLIED: Logged official response for ref "${updated.referenceNumber}"`,
      oldData: { status: old.status, replyText: old.replyText },
      newData: { status: "REPLIED", replyText },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Correspondence response logged successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
