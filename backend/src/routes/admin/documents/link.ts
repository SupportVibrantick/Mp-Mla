import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/documents/:id/link
 * Link a document to an entity record
 */
export async function linkDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;
    const { module, recordId } = req.body;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
    });
    if (!document) throw ApiError.notFound("Document not found");

    // Validate the target record exists in the specified module
    const targetModule = module.toUpperCase();
    let targetExists = false;

    if (targetModule === "GRIEVANCE") {
      const g = await prisma.grievance.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!g;
    } else if (targetModule === "PROJECT") {
      const p = await prisma.project.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!p;
    } else if (targetModule === "SCHEME_APPLICATION") {
      const sa = await prisma.schemeApplication.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!sa;
    } else if (targetModule === "EVENT") {
      const e = await prisma.event.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!e;
    } else if (targetModule === "APPOINTMENT") {
      const a = await prisma.appointment.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!a;
    } else if (targetModule === "TASK") {
      const t = await prisma.task.findFirst({ where: { id: recordId, tenantId, isDeleted: false } });
      targetExists = !!t;
    } else {
      // Allow other modules without explicit DB checks to remain flexible
      targetExists = true;
    }

    if (!targetExists) {
      throw ApiError.notFound(`Target record with ID "${recordId}" in module "${targetModule}" not found`);
    }

    // Check if link already exists
    const existingLink = await prisma.documentLink.findFirst({
      where: { tenantId, documentId: docId, module: targetModule, recordId },
    });
    if (existingLink) {
      throw ApiError.badRequest("Document is already linked to this record");
    }

    const link = await prisma.documentLink.create({
      data: {
        tenantId,
        documentId: docId,
        module: targetModule,
        recordId,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_LINKED: Linked document "${document.name}" to record ID "${recordId}" in module "${targetModule}"`,
      newData: link,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Document successfully linked to module ${targetModule}`,
      data: link,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/documents/:id/link/:linkId
 * Unlink a document from an entity record
 */
export async function unlinkDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;
    const linkId = req.params.linkId as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
    });
    if (!document) throw ApiError.notFound("Document not found");

    const link = await prisma.documentLink.findFirst({
      where: { id: linkId, documentId: docId, tenantId },
    });
    if (!link) throw ApiError.notFound("Link mapping not found");

    await prisma.documentLink.delete({
      where: { id: linkId },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_UNLINKED: Unlinked document "${document.name}" from record ID "${link.recordId}" in module "${link.module}"`,
      oldData: link,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Document unlinked successfully",
    });
  } catch (error) {
    next(error);
  }
}
