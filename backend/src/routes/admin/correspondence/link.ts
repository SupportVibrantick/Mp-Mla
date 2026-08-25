import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/correspondence/:id/documents
 * Attach a document to a correspondence
 */
export async function attachDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const { documentId } = req.body;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");

    const doc = await prisma.document.findFirst({
      where: { id: documentId, tenantId, isDeleted: false },
    });
    if (!doc) throw ApiError.notFound("Document not found");

    // Check if duplicate link
    const duplicate = await prisma.correspondenceDocument.findFirst({
      where: { correspondenceId: corrId, documentId },
    });
    if (duplicate) {
      throw ApiError.badRequest("Document is already attached to this correspondence");
    }

    const attachment = await prisma.$transaction(async (tx) => {
      const link = await tx.correspondenceDocument.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          documentId,
        },
      });

      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          action: "ATTACH_DOCUMENT",
          comment: `Document "${doc.name}" attached to correspondence`,
          changedById: req.user!.id,
        },
      });

      return link;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_DOCUMENT_ATTACHED: Attached document "${doc.name}" to correspondence ref "${correspondence.referenceNumber}"`,
      newData: attachment,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: "Document attached successfully",
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/correspondence/:id/documents
 * List all documents attached to a correspondence
 */
export async function listAttachedDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");

    const documents = await prisma.correspondenceDocument.findMany({
      where: { correspondenceId: corrId, tenantId },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}
