import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/grievances/export
 * Exports grievances as flat JSON array for Excel download.
 */
export const exportGrievances = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const { wardId, status, priority, category } = req.query;

  const where: any = { tenantId, isDeleted: false };
  if (wardId && wardId !== "all") where.wardId = String(wardId);
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (category && category !== "all") where.category = category;

  const data = await prisma.grievance.findMany({
    where,
    include: {
      ward: { select: { wardNumber: true, name: true } },
      department: { select: { name: true } },
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const exportData = data.map((item) => ({
    ticketNumber: item.ticketNumber,
    subject: item.subject,
    category: item.category,
    subcategory: item.subcategory ?? "",
    description: item.description,
    status: item.status,
    priority: item.priority,
    source: item.source,
    wardNumber: item.ward?.wardNumber ?? "",
    wardName: item.ward?.name ?? "",
    department: item.department?.name ?? "",
    assignedTo: item.assignedTo?.name ?? "",
    complainantName: item.complainantName ?? "",
    complainantPhone: item.complainantPhone ?? "",
    complainantEmail: item.complainantEmail ?? "",
    complainantAddress: item.complainantAddress ?? "",
    locationAddress: item.locationAddress ?? "",
    resolutionNotes: item.resolutionNotes ?? "",
    rejectionReason: item.rejectionReason ?? "",
    createdAt: item.createdAt.toISOString(),
    resolvedAt: item.resolvedAt?.toISOString() ?? "",
    closedAt: item.closedAt?.toISOString() ?? "",
    expectedResolutionDate: item.expectedResolutionDate?.toISOString() ?? "",
    createdBy: item.createdBy?.name ?? "System/Public",
  }));

  res.json({ success: true, data: exportData });

  // Log data activity
  prisma.dataActivity.create({
    data: {
      tenantId,
      userId: req.user!.id,
      userName: req.user!.name || "Unknown",
      action: "EXPORT",
      module: "grievances",
      recordCount: exportData.length,
      details: `Exported ${exportData.length} grievances`,
    },
  }).catch(() => {});

  // Send admin notification
  sendAdminNotification(
    `Data Export: grievances by ${req.user!.name || "Unknown"}`,
    buildActivityEmailHtml({
      action: "EXPORT",
      module: "grievances",
      userName: req.user!.name || "Unknown",
      recordCount: exportData.length,
      timestamp: new Date(),
    }),
  );
});
