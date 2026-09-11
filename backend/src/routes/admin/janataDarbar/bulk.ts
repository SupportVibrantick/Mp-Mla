import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
    normalizeJanataSessionStatus,
    normalizeJanataSessionType,
} from "../../../utils/enumParser.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/janata-darbar/sessions/bulk
 * Bulk imports Janata Darbar sessions with upsert logic by sessionNumber or title + date.
 */
export const bulkCreateJanataSessions = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const sessions = req.body;

    if (!Array.isArray(sessions)) {
        return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: any; error: string }> = [];

    const safeString = (val: any) => (val !== undefined && val !== null ? String(val).trim() : undefined);
    const safeDate = (val: any) => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
    };

    for (const row of sessions) {
        try {
            const {
                sessionNumber,
                title,
                type,
                status,
                date,
                startTime,
                endTime,
                location,
                description,
            } = row;

            if (!title) {
                throw new Error("Missing required field: title");
            }

            const parsedDate = safeDate(date);
            if (!parsedDate) {
                throw new Error("Missing or invalid session date (expected YYYY-MM-DD or valid date string)");
            }

            const sTitle = safeString(title)!;
            const normType = normalizeJanataSessionType(type) || "JANATA_DARBAR";
            const normStatus = normalizeJanataSessionStatus(status) || "SCHEDULED";
            const sLocation = safeString(location) || "Constituency Office";
            const sStartTime = safeString(startTime) || "10:00 AM";
            const sEndTime = safeString(endTime) || "02:00 PM";

            let sSessionNum = safeString(sessionNumber);
            if (!sSessionNum) {
                const existingByTitle = await prisma.janataDarbarSession.findFirst({
                    where: {
                        tenantId,
                        isDeleted: false,
                        title: { equals: sTitle, mode: "insensitive" },
                        date: parsedDate,
                    }
                });
                sSessionNum = existingByTitle?.sessionNumber || `JD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
            }

            const sessionData: any = {
                sessionNumber: sSessionNum,
                title: sTitle,
                type: normType,
                status: normStatus,
                date: parsedDate,
                startTime: sStartTime,
                endTime: sEndTime,
                location: sLocation,
                description: safeString(description) || null,
                tenantId,
            };

            const existing = await prisma.janataDarbarSession.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { sessionNumber: sSessionNum },
                        {
                            title: { equals: sTitle, mode: "insensitive" },
                            date: parsedDate,
                        }
                    ]
                }
            });

            if (existing) {
                await prisma.janataDarbarSession.update({
                    where: { id: existing.id },
                    data: sessionData
                });
            } else {
                await prisma.janataDarbarSession.create({
                    data: {
                        ...sessionData,
                        createdById: (req as any).user?.id || null,
                    }
                });
            }

            upsertedCount++;
        } catch (error: any) {
            failedCount++;
            errors.push({
                row,
                error: error.message || "Failed to process session row",
            });
        }
    }

    // Log data activity
    prisma.dataActivity.create({
        data: {
            tenantId,
            userId: (req as any).user?.id,
            userName: (req as any).user?.name || "Admin",
            action: "IMPORT",
            module: "janata-darbar",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} Janata Darbar sessions (${failedCount} failed)`,
        }
    }).catch(() => {});

    // Audit log
    await createAuditLog({
        tenantId,
        userId: (req as any).user?.id,
        action: "CREATE" as any,
        module: "janata-darbar",
        recordId: "bulk-import",
        description: `Bulk imported ${upsertedCount} Janata Darbar sessions (${failedCount} failed)`,
    }).catch(() => {});

    res.json({
        success: true,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
        message: `Processed ${sessions.length} records. ${upsertedCount} imported/updated successfully, ${failedCount} failed.`
    });
});
