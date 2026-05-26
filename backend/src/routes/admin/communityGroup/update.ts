import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * PUT   /api/admin/community-group/:id
 * Updates a community group.
 */
export const updateCommunityGroup = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const groupId = req.params.id as string;

  const old = await prisma.communityGroup.findFirst({
    where: { id: groupId, tenantId, isDeleted: false },
  });
  if (!old) throw ApiError.notFound("Community group not found");

  const data: any = { ...req.body };
  if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
  if (data.wardAreaId === "") data.wardAreaId = null;
  if (data.headEmail === "") delete data.headEmail;

  const nextWardId = data.wardId || old.wardId;

  if (data.wardId) {
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, tenantId, isDeleted: false },
      select: { id: true },
    });
    if (!ward) throw ApiError.notFound("Ward not found");
  }

  // Verify area belongs to ward
  if (data.wardAreaId) {
    const area = await prisma.wardArea.findFirst({
      where: {
        id: data.wardAreaId,
        isDeleted: false,
        ward: { tenantId, isDeleted: false },
      },
    });
    if (!area) throw ApiError.notFound("Area not found");
    if (area.wardId !== nextWardId) {
      throw ApiError.badRequest("Area does not belong to selected ward");
    }
  }

  if (
    (data.name !== undefined && data.name !== old.name) ||
    (data.wardId !== undefined && data.wardId !== old.wardId)
  ) {
    const duplicate = await prisma.communityGroup.findFirst({
      where: {
        tenantId,
        wardId: nextWardId,
        name: data.name || old.name,
        isDeleted: false,
        id: { not: groupId },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw ApiError.conflict(
        "Community group with this name already exists in the selected ward.",
      );
    }
  }

  const group = await prisma.communityGroup.update({
    where: { id: groupId },
    data,
    include: {
      ward: { select: { name: true } },
    },
  });

  await createAuditLog({
    tenantId,
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

/**
 * PATCH /api/admin/community-group/:id/toggle
 * Toggles the active status of a community group.
 */
export const toggleCommmunity = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const groupId = req.params.id as string;

  const group = await prisma.communityGroup.findFirst({
    where: { id: groupId, tenantId, isDeleted: false },
  });
  if (!group) throw ApiError.notFound("Community group not found");

  const updated = await prisma.communityGroup.update({
    where: { id: groupId },
    data: { isActive: !group.isActive },
  });

  await createAuditLog({
    tenantId,
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
