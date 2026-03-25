import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { normalizeCommunityType, normalizeBoolean } from "../../../utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * POST /api/admin/community-groups/bulk
 * Bulk imports community groups with upsert logic by name.
 */
export const bulkCreateCommunityGroups = catchAsync(async (req: Request, res: Response) => {
    const groups = req.body;

    if (!Array.isArray(groups)) {
        return res.status(400).json({ success: false, message: "Invalid data format. Expected an array." });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors = [];

    // Pre-fetch all wards to map wardNumber to wardId
    const allWards = await prisma.ward.findMany({ select: { id: true, wardNumber: true } });
    const wardMap = new Map(allWards.map(w => [w.wardNumber, w.id]));

    for (const row of groups) {
        try {
            const {
                name,
                type,
                wardNumber,
                address,
                description,
                memberCount,
                maleMembers,
                femaleMembers,
                headName,
                headPhone,
                headEmail,
                headDesignation,
                registrationNo,
                isActive
            } = row;

            if (!name || !wardNumber) {
                throw new Error("Missing required fields: name or wardNumber");
            }

            const wNum = parseInt(String(wardNumber), 10);
            const wardId = wardMap.get(wNum);

            if (!wardId) {
                throw new Error(`Ward number ${wardNumber} not found.`);
            }

            const safeString = (val: any) => (val !== undefined && val !== null ? String(val) : undefined);
            const safeInt = (val: any) => (val !== undefined && val !== null && !isNaN(parseInt(val, 10)) ? parseInt(val, 10) : undefined);

            const groupData: any = {
                name: String(name),
                type: normalizeCommunityType(type) || "OTHER",
                wardId,
                address: safeString(address),
                description: safeString(description),
                memberCount: safeInt(memberCount),
                maleMembers: safeInt(maleMembers),
                femaleMembers: safeInt(femaleMembers),
                headName: safeString(headName),
                headPhone: safeString(headPhone),
                headEmail: safeString(headEmail),
                headDesignation: safeString(headDesignation),
                registrationNo: safeString(registrationNo),
                isActive: normalizeBoolean(isActive) ?? true,
            };

            const existing = await prisma.communityGroup.findFirst({
                where: { name: String(name), wardId }
            });

            if (existing) {
                await prisma.communityGroup.update({
                    where: { id: existing.id },
                    data: groupData
                });
            } else {
                await prisma.communityGroup.create({
                    data: groupData
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
        message: `Bulk import completed. Upserted ${upsertedCount} groups. Failed ${failedCount}.`,
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
            module: "community-groups",
            recordCount: upsertedCount,
            details: `Bulk imported ${upsertedCount} community groups (${failedCount} failed)`,
        },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
        `Data Import: community groups by ${req.user!.name || "Unknown"}`,
        buildActivityEmailHtml({
            action: "IMPORT",
            module: "community-groups",
            userName: req.user!.name || "Unknown",
            recordCount: upsertedCount,
            timestamp: new Date(),
        }),
    );
});
