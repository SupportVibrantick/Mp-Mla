import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { normalizeProjectStatus, normalizeFundType } from "../../../utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * POST /api/admin/projects/bulk
 * Bulk imports projects with upsert logic by projectCode or name.
 */
export const bulkCreateProjects = catchAsync(async (req: Request, res: Response) => {
    const projects = req.body;

    if (!Array.isArray(projects)) {
        return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Pre-fetch all wards to map wardNumber to wardId
    const allWards = await prisma.ward.findMany({ select: { id: true, wardNumber: true } });
    const wardMap = new Map(allWards.map(w => [w.wardNumber, w.id]));

    // Pre-fetch all departments to map code/name to ID
    const allDepts = await prisma.department.findMany({ select: { id: true, name: true, code: true } });
    const deptMap = new Map();
    allDepts.forEach(d => {
        deptMap.set(d.code.toUpperCase(), d.id);
        deptMap.set(d.name.toUpperCase(), d.id);
    });
    for (const row of projects) {
        try {
            const {
                projectCode,
                name,
                category,
                department,
                contractor,
                contractorPhone,
                wardNumber,
                startDate,
                expectedEndDate,
                actualEndDate,
                budgetSanctioned,
                budgetReleased,
                budgetUsed,
                fundType,
                status,
                completionPercent,
                description,
                address
            } = row;

            if (!name || !projectCode || !wardNumber) {
                throw new Error("Missing required fields: name, projectCode, or wardNumber");
            }

            const wNum = parseInt(String(wardNumber), 10);
            const wardId = wardMap.get(wNum);

            if (!wardId) {
                throw new Error(`Ward number ${wardNumber} not found.`);
            }

            const sName = String(name);
            const sCode = String(projectCode);
            const safeString = (val: any) => (val !== undefined && val !== null ? String(val) : undefined);
            const safeFloat = (val: any) => (val !== undefined && val !== null && !isNaN(parseFloat(val)) ? parseFloat(val) : undefined);
            const safeInt = (val: any) => (val !== undefined && val !== null && !isNaN(parseInt(val, 10)) ? parseInt(val, 10) : undefined);
            const safeDate = (val: any) => (val && !isNaN(new Date(val).getTime()) ? new Date(val) : undefined);
    // Map departmentCode or departmentName to ID
            let resolvedDeptId = safeString(department);
            if (department) {
                const dKey = String(department).toUpperCase();
                resolvedDeptId = deptMap.get(dKey) || resolvedDeptId;
            }
            // // Use department name directly (stores string in projects)
            // const resolvedDeptName = safeString(department) || "Unassigned";

            const projectData: any = {
                name: sName,
                projectCode: sCode,
                category: String(category || "General"),
 department: resolvedDeptId || "Unassigned",
                contractor: safeString(contractor),
                contractorPhone: safeString(contractorPhone),
                wardId,
                startDate: safeDate(startDate),
                expectedEndDate: safeDate(expectedEndDate),
                actualEndDate: safeDate(actualEndDate),
                budgetSanctioned: safeFloat(budgetSanctioned),
                budgetReleased: safeFloat(budgetReleased),
                budgetUsed: safeFloat(budgetUsed),
                fundType: normalizeFundType(fundType),
                status: normalizeProjectStatus(status),
                completionPercent: safeInt(completionPercent),
                description: safeString(description),
                address: safeString(address),
            };

            // Find if exists by projectCode OR Name
            const existing = await prisma.project.findFirst({
                where: {
                    OR: [
                        { projectCode: sCode },
                        { name: sName }
                    ]
                }
            });

            if (existing) {
                await prisma.project.update({
                    where: { id: existing.id },
                    data: projectData
                });
            } else {
                await prisma.project.create({
                    data: {
                        ...projectData,
                        category: projectData.category || "General",
                        department: projectData.department || "Unassigned",
                        fundType: projectData.fundType || "OTHER",
                        status: projectData.status || "PENDING",
                        completionPercent: projectData.completionPercent || 0,
                    }
                });
            }
            upsertedCount++;
        } catch (error: any) {
            failedCount++;
            errors.push({
                row,
                error: error.message,
            });
        }
    }

    res.json({
        success: true,
        message: `Bulk import completed. Upserted ${upsertedCount} projects. Failed ${failedCount}.`,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
        data: {
            userId: req.user!.id,
            userName: req.user!.name || "Unknown",
            action: "IMPORT",
            module: "projects",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} projects (${failedCount} failed)`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        `Data Import: projects by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "IMPORT",
            module: "projects",
            userName: req.user!.name || "Unknown",
            recordCount: upsertedCount,
            timestamp: new Date(),
        }),
    );
});
