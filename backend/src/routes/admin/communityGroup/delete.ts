import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { requireTenantId } from "../../../utils/tenant.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * DELETE /api/admin/community-group/:id
 * Deletes a community group.
 */
export const deleteCommunity = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const groupId = req.params.id as string;

  const group = await prisma.communityGroup.findFirst({
    where: { id: groupId, tenantId },
  });
  if (!group) throw ApiError.notFound("Community group not found");

  if (group.isDeleted) {
    throw ApiError.badRequest("Community group is already in recycle bin");
  }

  await archiveToRecycleBin({
    tenantId,
    module: "community_groups",
    entityType: "community_group",
    recordId: group.id,
    recordLabel: group.name,
    payload: group,
    deletedById: req.user?.id,
  });

  await prisma.communityGroup.update({
    where: { id: groupId },
    data: { isDeleted: true },
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "community_groups",
    recordId: group.id,
    description: `Moved community group "${group.name}" to recycle bin`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${group.name}" moved to recycle bin`,
  });
});

/**
 * POST /api/admin/community-groups/bulk-delete
 * Bulk deletes community groups.
 */
export const bulkDeleteCommunityGroups = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain a non-empty 'ids' array.",
    });
  }

  const groups = await prisma.communityGroup.findMany({
    where: { id: { in: ids }, tenantId, isDeleted: false },
  });

  if (groups.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No valid active community groups found to delete.",
    });
  }

  for (const group of groups) {
    await archiveToRecycleBin({
      tenantId,
      module: "community_groups",
      entityType: "community_group",
      recordId: group.id,
      recordLabel: group.name,
      payload: group,
      deletedById: req.user?.id,
    });

    await prisma.communityGroup.update({
      where: { id: group.id },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "community_groups",
      recordId: group.id,
      description: `Moved community group "${group.name}" to recycle bin`,
      ...getRequestMeta(req),
    });
  }

  res.json({
    success: true,
    message: `Successfully moved ${groups.length} community group(s) to recycle bin`,
    data: { deletedCount: groups.length },
  });
});

