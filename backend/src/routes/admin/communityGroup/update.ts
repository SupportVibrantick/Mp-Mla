import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Update ─────────────────────────────────────────────

export const updateCommunityGroup = catchAsync(async (req, res) => {
  const old = await prisma.communityGroup.findUnique({
    where: { id: req.params.id as string },
  });
  if (!old) throw ApiError.notFound("Community group not found");

  const data: any = { ...req.body };
  if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
  if (data.wardAreaId === "") data.wardAreaId = null;
  if (data.headEmail === "") delete data.headEmail;

  // Verify area belongs to ward
  if (data.wardAreaId && data.wardId) {
    const area = await prisma.wardArea.findUnique({
      where: { id: data.wardAreaId },
    });
    if (area && area.wardId !== (data.wardId || old.wardId)) {
      throw ApiError.badRequest("Area does not belong to selected ward");
    }
  }

  const group = await prisma.communityGroup.update({
    where: { id: req.params.id as string },
    data,
    include: {
      ward: { select: { name: true } },
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    module: "community_groups",
    recordId: group.id,
    description: `Updated community group "${group.name}"`,
    oldData: {
      name: old.name,
      type: old.type,
      memberCount: old.memberCount,
      isActive: old.isActive,
    },
    newData: req.body,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${group.name}" updated`,
    data: group,
  });
});

// ─── Toggle Active ──────────────────────────────────────

export const toggleCommmunity = catchAsync(async (req, res) => {
  const group = await prisma.communityGroup.findUnique({
    where: { id: req.params.id as string },
  });
  if (!group) throw ApiError.notFound("Community group not found");

  const updated = await prisma.communityGroup.update({
    where: { id: req.params.id as string },
    data: { isActive: !group.isActive },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    module: "community_groups",
    recordId: group.id,
    description: `${updated.isActive ? "Activated" : "Deactivated"} "${group.name}"`,
    oldData: { isActive: group.isActive },
    newData: { isActive: updated.isActive },
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${group.name}" ${updated.isActive ? "activated" : "deactivated"}`,
    data: updated,
  });
});
