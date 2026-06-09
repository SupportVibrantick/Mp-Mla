import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/community-groups/export
 * Exports community groups as JSON for Excel conversion in frontend.
 */
export const exportCommunityGroups = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { wardId } = req.query;

    const where: any = { tenantId, isDeleted: false };
    if (wardId) where.wardId = String(wardId);

    const data = await prisma.communityGroup.findMany({
        where,
        include: {
            ward: { select: { wardNumber: true, name: true } }
        },
        orderBy: { name: "asc" }
    });

    const exportData = data.map(item => ({
        name: item.name,
        type: item.type,
        wardNumber: item.ward.wardNumber,
        wardName: item.ward.name,
        address: item.address || "",
        description: item.description || "",
        memberCount: item.memberCount || 0,
        headName: item.headName || "",
        headPhone: item.headPhone || "",
        headEmail: item.headEmail || "",
        isActive: item.isActive ? "TRUE" : "FALSE",
        registrationNo: item.registrationNo || "",
        createdAt: item.createdAt.toISOString()
    }));

    res.json({
        success: true,
        data: exportData
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
        data: {
            tenantId,
            userId: req.user!.id,
            userName: req.user!.name || "Unknown",
            action: "EXPORT",
            module: "community-groups",
            recordCount: exportData.length,
            details: `Exported ${exportData.length} community groups`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        tenantId,
        `Data Export: community groups by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "EXPORT",
            module: "community-groups",
            userName: req.user!.name || "Unknown",
            recordCount: exportData.length,
            timestamp: new Date(),
        }),
    );
});
