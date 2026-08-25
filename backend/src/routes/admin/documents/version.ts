import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateFileProperties } from "./helpers.js";

/**
 * POST /api/admin/documents/:id/versions
 * Upload a new version for an existing document
 */
export async function uploadNewVersion(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;
    const data = req.body;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
    });
    if (!document) throw ApiError.notFound("Document not found");

    // Validate size and extensions
    validateFileProperties(data.fileName, data.fileSize);

    const nextVersion = document.version + 1;

    const updatedDoc = await prisma.$transaction(async (tx) => {
      // 1. Create the new version record
      await tx.documentVersion.create({
        data: {
          documentId: docId,
          version: nextVersion,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
          uploadedById: req.user!.id,
        },
      });

      // 2. Update the parent Document attributes
      const updated = await tx.document.update({
        where: { id: docId },
        data: {
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
          version: nextVersion,
        },
      });

      return updated;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "documents",
      recordId: docId,
      description: `DOCUMENT_VERSION_CREATED: Registered version v${nextVersion} for document "${updatedDoc.name}"`,
      newData: updatedDoc,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Version v${nextVersion} uploaded successfully`,
      data: updatedDoc,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/documents/:id/versions
 * List version history for a document
 */
export async function listDocumentVersions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
    });
    if (!document) throw ApiError.notFound("Document not found");

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: docId },
      orderBy: { version: "desc" },
    });

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    next(error);
  }
}
