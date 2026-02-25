import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Create ─────────────────────────────────────────────

export const createCommunityGroup = catchAsync(async (req, res) => {
  const data: any = { ...req.body };
  if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
  if (data.wardAreaId === "" || data.wardAreaId === undefined)
    data.wardAreaId = null;
  if (data.headEmail === "") delete data.headEmail;

  // Verify ward exists
  const ward = await prisma.ward.findUnique({
    where: { id: data.wardId },
  });
  if (!ward) throw ApiError.notFound("Ward not found");

  // Verify area if provided
  if (data.wardAreaId) {
    const area = await prisma.wardArea.findUnique({
      where: { id: data.wardAreaId },
    });
    if (!area) throw ApiError.notFound("Area not found");
    if (area.wardId !== data.wardId)
      throw ApiError.badRequest("Area does not belong to selected ward");
  }

  const group = await prisma.communityGroup.create({
    data,
    include: {
      ward: { select: { name: true, wardNumber: true } },
      wardArea: { select: { name: true } },
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "community_groups",
    recordId: group.id,
    description: `Created community group "${group.name}" (${group.type}) in ward "${group.ward.name}"`,
    newData: {
      name: group.name,
      type: group.type,
      wardId: group.wardId,
      memberCount: group.memberCount,
    },
    ...getRequestMeta(req),
  });

  res.status(201).json({
    success: true,
    message: `"${group.name}" created successfully`,
    data: group,
  });
});
