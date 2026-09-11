import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "../../../utils/catchAsync.js";
import {
    normalizeAppointmentStatus,
    normalizeAppointmentType,
} from "../../../utils/enumParser.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog } from "../../../middleware/auditLog.js";

/**
 * POST /api/admin/appointments/bulk
 * Bulk imports appointments with upsert logic by appointmentNumber or requesterName + date + startTime.
 */
export const bulkCreateAppointments = catchAsync(async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const appointments = req.body;

    if (!Array.isArray(appointments)) {
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

    for (const row of appointments) {
        try {
            const {
                appointmentNumber,
                title,
                type,
                status,
                requesterName,
                requesterPhone,
                requesterEmail,
                date,
                startTime,
                endTime,
                location,
                purpose,
                notes,
            } = row;

            if (!requesterName && !title) {
                throw new Error("Missing required field: requesterName or title");
            }

            const parsedDate = safeDate(date);
            if (!parsedDate) {
                throw new Error("Missing or invalid appointment date (expected YYYY-MM-DD or valid date string)");
            }

            const sRequesterName = safeString(requesterName) || "Citizen";
            const sTitle = safeString(title) || `Appointment with ${sRequesterName}`;
            const normType = normalizeAppointmentType(type) || "OFFICE_APPOINTMENT";
            const normStatus = normalizeAppointmentStatus(status) || "PENDING";
            const sStartTime = safeString(startTime) || "10:00 AM";
            const sEndTime = safeString(endTime) || "10:30 AM";

            let sApptNum = safeString(appointmentNumber);
            if (!sApptNum) {
                const existingByRequester = await prisma.appointment.findFirst({
                    where: {
                        tenantId,
                        isDeleted: false,
                        requesterName: { equals: sRequesterName, mode: "insensitive" },
                        date: parsedDate,
                        startTime: sStartTime,
                    }
                });
                sApptNum = existingByRequester?.appointmentNumber || `APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
            }

            const appointmentData: any = {
                appointmentNumber: sApptNum,
                title: sTitle,
                type: normType,
                status: normStatus,
                requesterName: sRequesterName,
                requesterPhone: safeString(requesterPhone) || null,
                requesterEmail: safeString(requesterEmail) || null,
                date: parsedDate,
                startTime: sStartTime,
                endTime: sEndTime,
                location: safeString(location) || "Constituency Office",
                purpose: safeString(purpose) || null,
                notes: safeString(notes) || null,
                tenantId,
            };

            const existing = await prisma.appointment.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { appointmentNumber: sApptNum },
                        {
                            requesterName: { equals: sRequesterName, mode: "insensitive" },
                            date: parsedDate,
                            startTime: sStartTime,
                        }
                    ]
                }
            });

            if (existing) {
                await prisma.appointment.update({
                    where: { id: existing.id },
                    data: appointmentData
                });
            } else {
                await prisma.appointment.create({
                    data: {
                        ...appointmentData,
                        createdById: (req as any).user?.id || null,
                    }
                });
            }

            upsertedCount++;
        } catch (error: any) {
            failedCount++;
            errors.push({
                row,
                error: error.message || "Failed to process appointment row",
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
            module: "appointments",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} appointments (${failedCount} failed)`,
        }
    }).catch(() => {});

    // Audit log
    await createAuditLog({
        tenantId,
        userId: (req as any).user?.id,
        action: "CREATE" as any,
        module: "appointment" as any,
        recordId: "bulk-import",
        description: `Bulk imported ${upsertedCount} appointments (${failedCount} failed)`,
    }).catch(() => {});

    res.json({
        success: true,
        data: {
            upsertedCount,
            failedCount,
            errors,
        },
        message: `Processed ${appointments.length} records. ${upsertedCount} imported/updated successfully, ${failedCount} failed.`
    });
});
