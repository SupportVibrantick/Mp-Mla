import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import { normalizeMeetingStatus, normalizeMeetingType } from "../../../utils/enumParser.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/meetings/bulk
 * Bulk imports meetings with upsert logic by title and date.
 */
export const bulkCreateMeetings = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const meetings = req.body;

    if (!Array.isArray(meetings)) {
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

    for (const row of meetings) {
        try {
            const {
                title,
                description,
                date,
                time,
                type,
                location,
                meetingLink,
                status,
                attendees,
                organizedBy
            } = row;

            if (!title) {
                throw new Error("Missing required field: title");
            }

            const parsedDate = safeDate(date);
            if (!parsedDate) {
                throw new Error("Missing or invalid meeting date (expected YYYY-MM-DD or valid date string)");
            }

            const sTitle = safeString(title)!;
            const normType = normalizeMeetingType(type) || "OFFLINE";
            const normStatus = normalizeMeetingStatus(status) || "SCHEDULED";

            const meetingData: any = {
                title: sTitle,
                description: safeString(description) || null,
                date: parsedDate,
                time: safeString(time) || null,
                type: normType,
                location: safeString(location) || null,
                meetingLink: safeString(meetingLink) || null,
                status: normStatus,
                attendees: safeString(attendees) || null,
                organizedBy: safeString(organizedBy) || null,
                tenantId,
            };

            // Check if meeting with same title and date exists for this tenant
            const startOfDay = new Date(parsedDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(parsedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const existing = await prisma.meeting.findFirst({
                where: {
                    tenantId,
                    isDeleted: false,
                    title: { equals: sTitle, mode: "insensitive" },
                    date: {
                        gte: startOfDay,
                        lte: endOfDay,
                    }
                }
            });

            if (existing) {
                await prisma.meeting.update({
                    where: { id: existing.id },
                    data: meetingData
                });
            } else {
                await prisma.meeting.create({
                    data: meetingData
                });
            }

            upsertedCount++;
        } catch (error: any) {
            failedCount++;
            errors.push({
                row,
                error: error.message || "Failed to process row",
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
            module: "meetings",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} meetings (${failedCount} failed)`,
        }
    }).catch(() => {});

    // Audit log
    await createAuditLog({
        tenantId,
        userId: (req as any).user?.id,
        action: "CREATE" as any,
        module: "meeting",
        recordId: "bulk-import",
        description: `Bulk imported ${upsertedCount} meetings (${failedCount} failed)`,
    }).catch(() => {});

    res.json({
        success: true,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
        message: `Processed ${meetings.length} records. ${upsertedCount} imported/updated successfully, ${failedCount} failed.`
    });
});
