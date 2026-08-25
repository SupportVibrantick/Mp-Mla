import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

/**
 * DELETE /api/admin/documents/:id
 * Soft delete a central document
 */
export async function deleteDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId },
    });
    if (!document) throw ApiError.notFound("Document not found");
    if (document.isDeleted) throw ApiError.badRequest("Document is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "documents",
      entityType: "document" as any,
      recordId: docId,
      recordLabel: `${document.name} (v${document.version})`,
      payload: document,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.document.update({
      where: { id: docId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_DELETED: Soft-deleted document "${document.name}"`,
      oldData: { name: document.name, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Document "${document.name}" successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/documents/:id/restore
 * Restore soft-deleted central document
 */
export async function restoreDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId },
    });
    if (!document) throw ApiError.notFound("Document not found");
    if (!document.isDeleted) throw ApiError.badRequest("Document is not deleted.");

    // Restore
    await prisma.document.update({
      where: { id: docId },
      data: { isDeleted: false },
    });

    // Also remove from Recycle Bin table if applicable
    await prisma.recycleBinEntry.deleteMany({
      where: { tenantId, recordId: docId, entityType: "document" },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_RESTORED: Restored document "${document.name}" from recycle bin`,
      oldData: { name: document.name, isDeleted: true },
      newData: { isDeleted: false },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Document "${document.name}" successfully restored`,
    });
  } catch (error) {
    next(error);
  }
}
