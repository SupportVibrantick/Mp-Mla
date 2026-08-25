import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * PUT /api/admin/documents/:id
 * Update central document metadata
 */
export async function updateDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;
    const data = req.body;

    const old = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Document not found");

    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_UPDATED: Updated details for document "${updated.name}"`,
      oldData: old as any,
      newData: updated as any,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Document "${updated.name}" updated successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
