import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { normalizeBoolean } from "@/utils/enumParser.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { generateTicketNumber } from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "ESCALATED", "RESOLVED", "CLOSED", "REJECTED"];
const VALID_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const VALID_CATEGORIES = [
  "ROAD", "WATER", "ELECTRICITY", "SANITATION", "ENCROACHMENT", 
  "NOISE", "HOUSING", "PENSION", "EDUCATION", "HEALTH", "SAFETY", 
  "CERTIFICATE", "OTHER"
];
const VALID_SOURCES = ["OFFICE", "PHONE", "EMAIL", "ONLINE", "FIELD_VISIT", "SOCIAL_MEDIA"];

function normalizeFromList(val: any, list: string[]): string | undefined {
  if (!val) return undefined;
  const s = String(val).trim().toUpperCase().replace(/\s+/g, "_");
  const found = list.find((v) => v === s);
  return found || undefined;
}

/**
 * POST /api/admin/grievances/bulk
 * Bulk imports grievances. Upserts by ticketNumber if provided, otherwise creates new.
 */
export const bulkCreateGrievances = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const grievances = req.body;

  if (!Array.isArray(grievances) || grievances.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid data format. Expected a non-empty array.",
    });
  }

  let upsertedCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  // Pre-fetch all wards for wardNumber -> wardId mapping
  const allWards = await prisma.ward.findMany({
    where: { tenantId },
    select: { id: true, wardNumber: true },
  });
  const wardMap = new Map(allWards.map((w) => [w.wardNumber, w.id]));

  // Pre-fetch departments for name -> id mapping
  const allDepts = await prisma.department.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const deptMap = new Map(allDepts.map((d) => [d.name.toLowerCase(), d.id]));

  for (let rowIndex = 0; rowIndex < grievances.length; rowIndex++) {
    const row = grievances[rowIndex];
    try {
      const {
        ticketNumber,
        subject,
        category,
        subcategory,
        description,
        status,
        priority,
        source,
        wardNumber,
        assignedDept,
        complainantName,
        complainantPhone,
        complainantEmail,
        complainantAddress,
        locationAddress,
        resolutionNotes,
      } = row;

      // ── Validate required fields ──
      if (!subject || !String(subject).trim()) throw new Error("Missing required field: subject");
      if (!description || !String(description).trim()) throw new Error("Missing required field: description");
      if (!category) throw new Error("Missing required field: category");
      if (!wardNumber) throw new Error("Missing required field: wardNumber");

      // ── Safe converters ──
      const safeString = (val: any): string | undefined =>
        val !== undefined && val !== null && String(val).trim() !== ""
          ? String(val).trim()
          : undefined;

      // ── Ward lookup ──
      const wNum = parseInt(String(wardNumber), 10);
      if (isNaN(wNum)) throw new Error(`Invalid wardNumber: "${wardNumber}"`);
      const wardId = wardMap.get(wNum);
      if (!wardId) throw new Error(`Ward #${wNum} not found in system`);

      // ── Dept lookup ──
      let departmentId: string | undefined;
      const deptName = safeString(assignedDept);
      if (deptName) {
        departmentId = deptMap.get(deptName.toLowerCase());
      }

      // ── Normalize enums ──
      const normalizedStatus = (normalizeFromList(status, VALID_STATUSES) as any) || "OPEN";
      const normalizedPriority = (normalizeFromList(priority, VALID_PRIORITIES) as any) || "MEDIUM";
      const normalizedCategory = safeString(category)?.toUpperCase().replace(/\s+/g, "_") || "OTHER";
      const normalizedSource = normalizeFromList(source, VALID_SOURCES) || "OFFICE";

      const grievanceData: any = {
        tenantId,
        subject: String(subject).trim(),
        category: normalizedCategory,
        subcategory: safeString(subcategory),
        description: String(description).trim(),
        wardId,
        status: normalizedStatus,
        priority: normalizedPriority,
        source: normalizedSource,
        complainantName: safeString(complainantName),
        complainantPhone: safeString(complainantPhone),
        complainantEmail: safeString(complainantEmail),
        complainantAddress: safeString(complainantAddress),
        locationAddress: safeString(locationAddress),
        resolutionNotes: safeString(resolutionNotes),
        departmentId: departmentId,
        assignedDept: departmentId ? undefined : safeString(assignedDept), // Fallback to string if no ID
      };

      if (ticketNumber && String(ticketNumber).trim()) {
        const tNum = String(ticketNumber).trim();
        await prisma.grievance.upsert({
          where: { tenantId_ticketNumber: { tenantId, ticketNumber: tNum } },
          create: { ...grievanceData, ticketNumber: tNum },
          update: grievanceData,
        });
      } else {
        const tNum = await generateTicketNumber(tenantId);
        await prisma.grievance.create({
          data: { ...grievanceData, ticketNumber: tNum },
        });
      }

      upsertedCount++;
    } catch (error: any) {
      failedCount++;
      errors.push({
        rowIndex: rowIndex + 1,
        subject: row?.subject || "Unknown",
        error: error.message,
      });
    }
  }

  res.json({
    success: true,
    message: `Bulk import completed. Upserted ${upsertedCount} grievances. Failed ${failedCount}.`,
    data: { upsertedCount, failedCount, errors },
  });

  // Log data activity
  prisma.dataActivity.create({
    data: {
      userId: req.user!.id,
      tenantId,
      userName: req.user!.name || "Unknown",
      action: "IMPORT",
      module: "grievances",
      recordCount: upsertedCount,
      details: `Bulk imported ${upsertedCount} grievances (${failedCount} failed)`,
    },
  }).catch(() => {});

  // Send admin notification
  sendAdminNotification(
    tenantId,
    `Data Import: grievances by ${req.user!.name || "Unknown"}`,
    buildActivityEmailHtml({
      action: "IMPORT",
      module: "grievances",
      userName: req.user!.name || "Unknown",
      recordCount: upsertedCount,
      timestamp: new Date(),
    }),
  );
});
