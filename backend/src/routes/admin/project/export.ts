import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/projects/export
 * Exports all projects in a flat structure.
 */
export const exportProjects = catchAsync(async (req: Request, res: Response) => {
    const projects = await prisma.project.findMany({
        include: {
            ward: {
                select: {
                    wardNumber: true,
                    name: true
                }
            }
        },
        orderBy: { projectCode: 'asc' }
    });

    const flatData = projects.map(p => ({
        projectCode: p.projectCode,
        name: p.name,
        category: p.category,
        department: p.department,
        contractor: p.contractor,
        contractorPhone: p.contractorPhone,
        wardNumber: p.ward.wardNumber,
        wardName: p.ward.name,
        startDate: p.startDate?.toISOString(),
        expectedEndDate: p.expectedEndDate?.toISOString(),
        actualEndDate: p.actualEndDate?.toISOString(),
        budgetSanctioned: p.budgetSanctioned,
        budgetReleased: p.budgetReleased,
        budgetUsed: p.budgetUsed,
        fundType: p.fundType,
        status: p.status,
        completionPercent: p.completionPercent,
        description: p.description,
        address: p.address,
        createdAt: p.createdAt.toISOString()
    }));

    res.json({
        success: true,
        data: flatData
    });
});
