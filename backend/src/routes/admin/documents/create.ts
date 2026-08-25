import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateFileProperties } from "./helpers.js";

/**
 * POST /api/admin/documents
 * Register/upload a new central document
 */
export async function createDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Validate size and extensions
    validateFileProperties(data.fileName, data.fileSize);

    // Create Document and its first version in a transaction
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description || null,
          category: data.category || "GENERAL",
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
          version: 1,
          uploadedById: req.user!.id,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          version: 1,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileType: data.fileType || null,
          fileSize: data.fileSize || null,
          uploadedById: req.user!.id,
        },
      });

      return doc;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "documents",
      recordId: document.id,
      description: `DOCUMENT_CREATED: Uploaded document "${document.name}" under category "${document.category}"`,
      newData: document,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Document "${document.name}" uploaded successfully`,
      data: document,
    });
  } catch (error) {
    next(error);
  }
}
