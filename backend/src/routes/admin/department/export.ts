import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * GET /api/admin/department/export
 * Exports all departments to a flat JSON array for Excel/CSV.
 */
export const exportDepartments = catchAsync(async (req: Request, res: Response) => {
    const departments = await prisma.department.findMany({
        where: { isDeleted: false },
        orderBy: { name: "asc" },
    });

    const flatData = departments.map((d) => ({
        name: d.name,
        code: d.code,
        description: d.description || "",
        headName: d.headName || "",
        headPhone: d.headPhone || "",
        headEmail: d.headEmail || "",
        isActive: d.isActive ? "Yes" : "No",
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
    }));

    res.json({
        success: true,
        data: flatData,
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
        data: {
            userId: req.user!.id,
            userName: req.user!.name || "Unknown",
            action: "EXPORT",
            module: "departments",
            recordCount: flatData.length,
            details: `Exported ${flatData.length} departments`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        `Data Export: departments by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "EXPORT",
            module: "departments",
            userName: req.user!.name || "Unknown",
            recordCount: flatData.length,
            timestamp: new Date(),
        }),
    );
});
