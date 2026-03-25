import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import catchAsync from "@/utils/catchAsync.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * GET /api/admin/leaders/export
 * Exports leaders as flat JSON array — round-trip compatible with bulk import.
 */
export const exportLeaders = catchAsync(async (req: Request, res: Response) => {
  const { wardId, category } = req.query;

  const where: any = { isDeleted: false };
  if (wardId) where.wardId = String(wardId);
  if (category && category !== "all") where.category = category;

  const data = await prisma.leader.findMany({
    where,
    include: {
      ward: { select: { wardNumber: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  const exportData = data.map((item) => ({
    name: item.name,
    category: item.category,
    designation: item.designation ?? "",
    organization: item.organization ?? "",
    partyName: item.partyName ?? "",
    dateOfBirth: item.dateOfBirth.toISOString().split("T")[0],
    gender: item.gender ?? "",
    address: item.address ?? "",
    wardNumber: item.ward?.wardNumber ?? "",
    phone: item.phone ?? "",
    altPhone: item.altPhone ?? "",
    email: item.email ?? "",
    whatsapp: item.whatsapp ?? "",
    facebookUrl: item.facebookUrl ?? "",
    twitterUrl: item.twitterUrl ?? "",
    instagramUrl: item.instagramUrl ?? "",
    relation: item.relation ?? "",
    // influence: item.influence ?? "",
    notes: item.notes ?? "",

    tags: (item.tags || []).join(", "),
    isActive: item.isActive ? "TRUE" : "FALSE",
  }));

  res.json({ success: true, data: exportData });

  // Log data activity (fire-and-forget)
  prisma.dataActivity.create({
    data: {
      userId: req.user!.id,
      userName: req.user!.name || "Unknown",
      action: "EXPORT",
      module: "leaders",
      recordCount: exportData.length,
      details: `Exported ${exportData.length} leaders`,
    },
  }).catch(() => {});

  // Send admin notification (fire-and-forget)
  sendAdminNotification(
    `Data Export: leaders by ${req.user!.name || "Unknown"}`,
    buildActivityEmailHtml({
      action: "EXPORT",
      module: "leaders",
      userName: req.user!.name || "Unknown",
      recordCount: exportData.length,
      timestamp: new Date(),
    }),
  );
});
