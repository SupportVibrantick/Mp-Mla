import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/documents/stats
 * Compile document usage and storage dashboard statistics
 */
export async function getDocumentStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const documents = await prisma.document.findMany({
      where: { tenantId, isDeleted: false },
      select: {
        category: true,
        fileType: true,
        fileSize: true,
        fileName: true,
        createdAt: true,
      },
    });

    const totalDocuments = documents.length;
    let uploadedThisMonth = 0;
    let storageUsed = 0;
    const byCategory: Record<string, number> = {};
    const byType = {
      pdf: 0,
      image: 0,
      spreadsheet: 0,
      document: 0,
      other: 0,
    };

    documents.forEach((d) => {
      // 1. Storage
      if (d.fileSize) storageUsed += d.fileSize;

      // 2. Month count
      if (d.createdAt >= startOfMonth) uploadedThisMonth++;

      // 3. Category count
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;

      // 4. File extension count splits
      const ext = d.fileName.split(".").pop()?.toLowerCase() || "";
      if (ext === "pdf") {
        byType.pdf++;
      } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
        byType.image++;
      } else if (["xls", "xlsx", "csv"].includes(ext)) {
        byType.spreadsheet++;
      } else if (["doc", "docx", "txt", "rtf"].includes(ext)) {
        byType.document++;
      } else {
        byType.other++;
      }
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        uploadedThisMonth,
        storageUsed,
        byCategory,
        byType,
      },
    });
  } catch (error) {
    next(error);
  }
}
