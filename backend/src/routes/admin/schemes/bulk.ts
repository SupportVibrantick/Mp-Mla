import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { normalizeSchemeStatus, normalizeSchemeLevel } from "../../../utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * POST /api/admin/schemes/bulk
 * Bulk imports government schemes with upsert logic by code or name.
 */
export const bulkCreateSchemes = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const schemes = req.body;

    if (!Array.isArray(schemes)) {
        return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    const safeString = (val: any) => (val !== undefined && val !== null ? String(val).trim() : undefined);
    const safeDate = (val: any) => (val && !isNaN(new Date(val).getTime()) ? new Date(val) : undefined);

    for (const row of schemes) {
        try {
            const {
                name,
                code,
                department,
                level,
                description,
                eligibility,
                benefits,
                requiredDocuments,
                applicationUrl,
                status,
                startDate,
                endDate
            } = row;

            if (!name || !department) {
                throw new Error("Missing required fields: name or department");
            }

            const sName = String(name).trim();
            const sCode = code ? String(code).trim() : undefined;
            const sDepartment = String(department).trim();

            const parsedLevel = normalizeSchemeLevel(safeString(level)) || "STATE";
            const parsedStatus = normalizeSchemeStatus(safeString(status)) || "ACTIVE";

            let parsedDocs: any = undefined;
            if (requiredDocuments) {
                if (typeof requiredDocuments === "string") {
                    try {
                        parsedDocs = JSON.parse(requiredDocuments);
                    } catch {
                        parsedDocs = requiredDocuments.split(",").map((d: string) => d.trim()).filter(Boolean);
                    }
                } else {
                    parsedDocs = requiredDocuments;
                }
            }

            const schemeData: any = {
                name: sName,
                code: sCode || null,
                department: sDepartment,
                level: parsedLevel,
                description: safeString(description) || null,
                eligibility: safeString(eligibility) || null,
                benefits: safeString(benefits) || null,
                requiredDocuments: parsedDocs ?? null,
                applicationUrl: safeString(applicationUrl) || null,
                status: parsedStatus,
                startDate: safeDate(startDate) || null,
                endDate: safeDate(endDate) || null,
            };

            // Look up existing scheme by code (if provided) or name
            const whereConditions: any[] = [{ name: sName }];
            if (sCode) {
                whereConditions.push({ code: sCode });
            }

            const existing = await prisma.scheme.findFirst({
                where: {
                    tenantId,
                    isDeleted: false,
                    OR: whereConditions
                }
            });

            if (existing) {
                await prisma.scheme.update({
                    where: { id: existing.id },
                    data: schemeData
                });
            } else {
                await prisma.scheme.create({
                    data: {
                        ...schemeData,
                        tenantId,
                        createdById: req.user?.id || null
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
        message: `Bulk import completed. Upserted ${upsertedCount} schemes. Failed ${failedCount}.`,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
        data: {
            tenantId,
            userId: req.user!.id,
            userName: req.user!.name || "Unknown",
            action: "IMPORT",
            module: "schemes",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} schemes (${failedCount} failed)`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        tenantId,
        `Data Import: schemes by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "IMPORT",
            module: "schemes",
            userName: req.user!.name || "Unknown",
            recordCount: upsertedCount,
            timestamp: new Date(),
        }),
    );
});
