import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * GET /api/admin/fund/export
 * Exports all fund transactions in a flat structure.
 */
export const exportFunds = catchAsync(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    if (!tenantId) throw ApiError.badRequest("Tenant context is required");

    // We want all transactions
    const txns = await prisma.fundTransaction.findMany({
        where: { isDeleted: false, fund: { tenantId } },
        include: {
            fund: true
        },
        orderBy: { date: 'desc' }
    });

    // Resolve project names for all transactions efficiently
    const projIds = txns.map(t => t.projectId).filter(Boolean) as string[];
    
    const projects = projIds.length > 0 
        ? await prisma.project.findMany({
            where: { id: { in: projIds }, tenantId, isDeleted: false },
            select: { id: true, name: true, projectCode: true }
        })
        : [];
    
    const projMap = Object.fromEntries(projects.map(p => [p.id, p]));

    const flatData = txns.map(t => ({
        fundType: t.fund.fundType,
        financialYear: t.fund.financialYear,
        date: t.date.toISOString(),
        type: t.type,
        amount: t.amount,
        projectName: t.projectId ? projMap[t.projectId]?.name || "N/A" : "N/A",
        projectCode: t.projectId ? projMap[t.projectId]?.projectCode || "N/A" : "N/A",
        description: t.description || "",
        createdAt: t.createdAt.toISOString()
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
            module: "funds",
            recordCount: flatData.length,
            details: `Exported ${flatData.length} fund transactions`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        `Data Export: funds by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "EXPORT",
            module: "funds",
            userName: req.user!.name || "Unknown",
            recordCount: flatData.length,
            timestamp: new Date(),
        }),
    );
});
