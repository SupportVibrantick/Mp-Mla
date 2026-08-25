import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * PUT /api/admin/correspondence/:id
 * Update correspondence metadata details
 */
export async function updateCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const data = req.body;

    const old = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Correspondence not found");

    const updated = await prisma.correspondence.update({
      where: { id: corrId },
      data: {
        subject: data.subject,
        description: data.description,
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        senderEmail: data.senderEmail,
        senderAddress: data.senderAddress,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
      },
    });

    await prisma.correspondenceTimeline.create({
      data: {
        tenantId,
        correspondenceId: corrId,
        action: "UPDATE",
        comment: "Correspondence details updated by staff",
        changedById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_UPDATED: Updated details for correspondence ref "${updated.referenceNumber}"`,
      oldData: old as any,
      newData: updated as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Correspondence ref "${updated.referenceNumber}" updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
