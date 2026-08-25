import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * GET /api/admin/documents
 * List central documents with filter and search options
 */
export async function listDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { search, category, fileType, uploadedBy, dateFrom, dateTo } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (category && category !== "all") where.category = category;
    if (uploadedBy && uploadedBy !== "all") where.uploadedById = uploadedBy;

    if (fileType && fileType !== "all") {
      where.fileType = { contains: fileType, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          _count: { select: { versions: true, links: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    res.json({
      success: true,
      data,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/documents/:id
 * Get single document details with versions and mappings
 */
export async function getDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const docId = req.params.id as string;

    const document = await prisma.document.findFirst({
      where: { id: docId, tenantId, isDeleted: false },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
        versions: { orderBy: { version: "desc" } },
        links: true,
      },
    });

    if (!document) throw ApiError.notFound("Document not found");

    res.json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/documents/:id/download
 * Secure download endpoint
 */
export async function downloadDocument(
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

    // Write audit log for the download action
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "EXPORT",
      module: "documents",
      recordId: document.id,
      description: `DOCUMENT_DOWNLOADED: Downloaded/accessed file "${document.name}" (version v${document.version})`,
      ...getRequestMeta(req),
    });

    // In a production setup, we would generate a signed storage URL or stream from S3.
    // For now, we redirect to fileUrl or send the url in response.
    // To support clean direct file streaming or redirecting:
    res.json({
      success: true,
      message: "Download URL authorized",
      downloadUrl: document.fileUrl,
      fileName: document.fileName,
    });
  } catch (error) {
    next(error);
  }
}
