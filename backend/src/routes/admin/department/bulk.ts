import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { normalizeBoolean } from "../../../utils/enumParser.js";
import { Request, Response } from "express";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * POST /api/admin/department/bulk
 * Bulk upsert departments from a flat JSON array.
 */
export const bulkCreateDepartments = catchAsync(
  async (req: Request, res: Response) => {
    const departments = req.body;

    if (!Array.isArray(departments)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid data format. Expected an array.",
        });
    }

    let upsertedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Sequential upsert to ensure data integrity and catch specific errors
    for (const row of departments) {
      try {
        const {
          name,
          code,
          description,
          headName,
          headPhone,
          headEmail,
          isActive,
        } = row;

        if (!name || !code) {
          throw new Error("Missing required fields: name or code");
        }

        const sName = String(name);
        const sCode = String(code);
        const safeString = (val: any) =>
          val !== undefined && val !== null ? String(val) : undefined;

        // Find if department exists by code OR name
        const existing = await prisma.department.findFirst({
          where: {
            OR: [{ code: sCode }, { name: sName }],
          },
        });

        if (existing) {
          await prisma.department.update({
            where: { id: existing.id },
            data: {
              name: sName,
              code: sCode, // Allow updating code if name matched, or vice versa
              description: safeString(description),
              headName: safeString(headName),
              headPhone: safeString(headPhone),
              headEmail: safeString(headEmail),
              isActive: normalizeBoolean(isActive),
            },
          });
        } else {
          await prisma.department.create({
            data: {
              name: sName,
              code: sCode,
              description: safeString(description) || null,
              headName: safeString(headName) || null,
              headPhone: safeString(headPhone) || null,
              headEmail: safeString(headEmail) || null,
              isActive: normalizeBoolean(isActive) ?? true,
            },
          });
        }
        upsertedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          row: row,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. Upserted ${upsertedCount} departments. Failed ${failedCount}.`,
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
        module: "departments",
        recordCount: upsertedCount,
        details: `Bulk imported ${upsertedCount} departments (${failedCount} failed)`,
      },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
      `Data Import: departments by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "IMPORT",
        module: "departments",
        userName: req.user!.name || "Unknown",
        recordCount: upsertedCount,
        timestamp: new Date(),
      }),
    );
  },
);
