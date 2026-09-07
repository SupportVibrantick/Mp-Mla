import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/schemes/export
 * Exports all government schemes in a flat structure for Excel/CSV.
 */
export const exportSchemes = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const schemes = await prisma.scheme.findMany({
        where: { tenantId, isDeleted: false },
        include: {
            _count: {
                select: { applications: true }
            }
        },
        orderBy: { name: "asc" }
    });

    const flatData = schemes.map((s) => ({
        name: s.name,
        code: s.code || "",
        department: s.department || "",
        level: s.level,
        status: s.status,
        description: s.description || "",
        eligibility: s.eligibility || "",
        benefits: s.benefits || "",
        requiredDocuments: typeof s.requiredDocuments === "string" 
            ? s.requiredDocuments 
            : JSON.stringify(s.requiredDocuments || ""),
        applicationUrl: s.applicationUrl || "",
        startDate: s.startDate ? s.startDate.toISOString().split("T")[0] : "",
        endDate: s.endDate ? s.endDate.toISOString().split("T")[0] : "",
        applicationsCount: s._count?.applications || 0,
        createdAt: s.createdAt.toISOString()
    }));

    res.json({
        success: true,
        data: flatData
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
        data: {
            tenantId,
            userId: req.user!.id,
            userName: req.user!.name || "Unknown",
            action: "EXPORT",
            module: "schemes",
            recordCount: flatData.length,
            details: `Exported ${flatData.length} government schemes`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        tenantId,
        `Data Export: schemes by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "EXPORT",
            module: "schemes",
            userName: req.user!.name || "Unknown",
            recordCount: flatData.length,
            timestamp: new Date(),
        }),
    );
});
