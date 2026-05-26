import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * POST /api/admin/community-groups
 * Create Community Groups for use.
 */

export const createCommunityGroup = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data: any = { ...req.body, tenantId };
  if (data.foundedDate) data.foundedDate = new Date(data.foundedDate);
  if (data.wardAreaId === "" || data.wardAreaId === undefined)
    data.wardAreaId = null;
  if (data.headEmail === "") delete data.headEmail;

  // Verify ward exists
  const ward = await prisma.ward.findFirst({
    where: { id: data.wardId, tenantId, isDeleted: false },
  });
  if (!ward) throw ApiError.notFound("Ward not found");

  // Verify area if provided
  if (data.wardAreaId) {
    const area = await prisma.wardArea.findFirst({
      where: {
        id: data.wardAreaId,
        isDeleted: false,
        ward: { tenantId, isDeleted: false },
      },
    });
    if (!area) throw ApiError.notFound("Area not found");
    if (area.wardId !== data.wardId)
      throw ApiError.badRequest("Area does not belong to selected ward");
  }

  const existing = await prisma.communityGroup.findFirst({
    where: {
      tenantId,
      wardId: data.wardId,
      name: data.name,
      isDeleted: false,
    },
    select: { id: true },
  });
  if (existing) {
    throw ApiError.conflict(
      "Community group with this name already exists in the selected ward.",
    );
  }

  const group = await prisma.communityGroup.create({
    data,
    include: {
      ward: { select: { name: true, wardNumber: true } },
      wardArea: { select: { name: true } },
    },
  });

  await createAuditLog({
    tenantId,
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
