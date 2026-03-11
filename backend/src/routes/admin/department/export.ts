import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/department/export
 * Exports all departments to a flat JSON array for Excel/CSV.
 */
export const exportDepartments = catchAsync(async (_req: Request, res: Response) => {
    const departments = await prisma.department.findMany({
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
});
