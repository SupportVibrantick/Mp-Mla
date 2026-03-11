import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/community-groups/export
 * Exports community groups as JSON for Excel conversion in frontend.
 */
export const exportCommunityGroups = catchAsync(async (req: Request, res: Response) => {
    const { wardId } = req.query;

    const where: any = {};
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
});
