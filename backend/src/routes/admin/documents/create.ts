import { Request, Response, NextFunction } from "express";
import path from "path";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateFileProperties } from "./helpers.js";
import { ApiError } from "../../../utils/ApiError.js";

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

    let fileName = data.fileName;
    let fileUrl = data.fileUrl;
    let fileType = data.fileType;
    let fileSize = data.fileSize;

    if (req.file) {
      fileUrl = `/uploads/documents/${req.file.filename}`;
      if (!fileName) fileName = req.file.originalname;
      if (!fileType) fileType = path.extname(req.file.originalname).replace(".", "");
      if (!fileSize) fileSize = req.file.size;
    }

    if (!fileName || !fileUrl) {
      throw ApiError.badRequest("File upload or fileUrl and fileName are required");
    }

    // Validate size and extensions
    validateFileProperties(fileName, fileSize);

    // Create Document and its first version in a transaction
    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description || null,
          category: data.category || "GENERAL",
          fileName: fileName,
          fileUrl: fileUrl,
          fileType: fileType || null,
          fileSize: fileSize ? parseInt(String(fileSize), 10) : null,
          version: 1,
          uploadedById: req.user!.id,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          version: 1,
          fileName: fileName,
          fileUrl: fileUrl,
          fileType: fileType || null,
          fileSize: fileSize ? parseInt(String(fileSize), 10) : null,
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
