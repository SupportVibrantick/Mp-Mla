import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

/**
 * DELETE /api/admin/correspondence/:id
 * Soft delete correspondence record
 */
export async function deleteCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");
    if (correspondence.isDeleted) throw ApiError.badRequest("Correspondence is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "correspondence",
      entityType: "correspondence" as any,
      recordId: corrId,
      recordLabel: `${correspondence.type} Ref: ${correspondence.referenceNumber}`,
      payload: correspondence,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.correspondence.update({
      where: { id: corrId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_DELETED: Soft-deleted correspondence ref "${correspondence.referenceNumber}"`,
      oldData: { referenceNumber: correspondence.referenceNumber, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Correspondence "${correspondence.referenceNumber}" successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/correspondence/:id/restore
 * Restore soft-deleted correspondence
 */
export async function restoreCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");
    if (!correspondence.isDeleted) throw ApiError.badRequest("Correspondence is not deleted.");

    // Restore
    await prisma.correspondence.update({
      where: { id: corrId },
      data: { isDeleted: false },
    });

    // Also remove from Recycle Bin table if applicable
    await prisma.recycleBinEntry.deleteMany({
      where: { tenantId, recordId: corrId, entityType: "correspondence" },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_RESTORED: Restored correspondence ref "${correspondence.referenceNumber}" from recycle bin`,
      oldData: { referenceNumber: correspondence.referenceNumber, isDeleted: true },
      newData: { isDeleted: false },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Correspondence ref "${correspondence.referenceNumber}" successfully restored`,
    });
  } catch (error) {
    next(error);
  }
}
