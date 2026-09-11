import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
    normalizeEventStatus,
    normalizeEventType,
    normalizeEventMode
} from "../../../utils/enumParser.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/events/bulk
 * Bulk imports events with upsert logic by eventCode or title + startDate.
 */
export const bulkCreateEvents = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const events = req.body;

    if (!Array.isArray(events)) {
        return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors: Array<{ row: any; error: string }> = [];

    // Pre-fetch all wards to map wardNumber to wardId
    const allWards = await prisma.ward.findMany({
        where: { tenantId },
        select: { id: true, wardNumber: true }
    });
    const wardMap = new Map(allWards.map(w => [w.wardNumber, w.id]));

    // Pre-fetch all users to map organizer by email or name
    const allUsers = await prisma.user.findMany({
        where: { tenantId },
        select: { id: true, name: true, email: true }
    });
    const userMap = new Map<string, string>();
    allUsers.forEach(u => {
        if (u.email) userMap.set(u.email.toLowerCase(), u.id);
        if (u.name) userMap.set(u.name.toLowerCase(), u.id);
    });

    const safeString = (val: any) => (val !== undefined && val !== null ? String(val).trim() : undefined);
    const safeDate = (val: any) => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
    };

    for (const row of events) {
        try {
            const {
                eventCode,
                title,
                description,
                type,
                status,
                mode,
                startDate,
                endDate,
                location,
                address,
                meetingLink,
                wardNumber,
                organizer
            } = row;

            if (!title) {
                throw new Error("Missing required field: title");
            }

            const parsedStartDate = safeDate(startDate);
            if (!parsedStartDate) {
                throw new Error("Missing or invalid startDate (expected YYYY-MM-DD or valid date/time)");
            }

            const parsedEndDate = safeDate(endDate);

            const sTitle = safeString(title)!;
            const normType = normalizeEventType(type) || "PUBLIC_MEETING";
            const normStatus = normalizeEventStatus(status) || "SCHEDULED";
            const normMode = normalizeEventMode(mode) || "OFFLINE";

            // Resolve wardId
            let resolvedWardId: string | null = null;
            if (wardNumber !== undefined && wardNumber !== null && wardNumber !== "") {
                const wNum = parseInt(String(wardNumber), 10);
                resolvedWardId = wardMap.get(wNum) || null;
            }

            // Resolve organizerId
            let resolvedOrganizerId: string | null = null;
            if (organizer) {
                resolvedOrganizerId = userMap.get(String(organizer).toLowerCase()) || null;
            }

            // Resolve or generate eventCode
            let sCode = safeString(eventCode);
            if (!sCode) {
                // Find existing event with same title and date
                const existingByTitle = await prisma.event.findFirst({
                    where: {
                        tenantId,
                        isDeleted: false,
                        title: { equals: sTitle, mode: "insensitive" },
                        startDate: parsedStartDate,
                    }
                });
                sCode = existingByTitle?.eventCode || `EVT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
            }

            const eventData: any = {
                title: sTitle,
                eventCode: sCode,
                description: safeString(description) || null,
                type: normType,
                status: normStatus,
                mode: normMode,
                startDate: parsedStartDate,
                endDate: parsedEndDate || null,
                location: safeString(location) || null,
                address: safeString(address) || null,
                meetingLink: safeString(meetingLink) || null,
                wardId: resolvedWardId,
                organizerId: resolvedOrganizerId,
                tenantId,
            };

            const existing = await prisma.event.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { eventCode: sCode },
                        {
                            title: { equals: sTitle, mode: "insensitive" },
                            startDate: parsedStartDate,
                        }
                    ]
                }
            });

            if (existing) {
                await prisma.event.update({
                    where: { id: existing.id },
                    data: eventData
                });
            } else {
                await prisma.event.create({
                    data: {
                        ...eventData,
                        createdById: (req as any).user?.id || null,
                    }
                });
            }

            upsertedCount++;
        } catch (error: any) {
            failedCount++;
            errors.push({
                row,
                error: error.message || "Failed to process event row",
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
            module: "events",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} events (${failedCount} failed)`,
        }
    }).catch(() => {});

    // Audit log
    await createAuditLog({
        tenantId,
        userId: (req as any).user?.id,
        action: "CREATE" as any,
        module: "events",
        recordId: "bulk-import",
        description: `Bulk imported ${upsertedCount} events (${failedCount} failed)`,
    }).catch(() => {});

    res.json({
        success: true,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
        message: `Processed ${events.length} records. ${upsertedCount} imported/updated successfully, ${failedCount} failed.`
    });
});
