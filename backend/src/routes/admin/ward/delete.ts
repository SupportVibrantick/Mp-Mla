import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  archiveToRecycleBin,
} from "../../../lib/recycleBin.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * DELETE /api/admin/ward/:id
 * Deletes a ward.
 */

export async function deleteWard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.params.id as string;

    const ward = await prisma.ward.findFirst({
      where: { id: wardId, tenantId },
      include: {
        areas: {
          include: {
            demographics: true,
          },
        },
        councillors: true,
        demographics: true,
        _count: {
          select: { grievances: true, institutions: true },
        },
      },
    });

    if (!ward) throw ApiError.notFound("Ward not found");

    if (ward.isDeleted) {
      throw ApiError.badRequest("Ward is already in recycle bin");
    }

    const activeProjectCount = await prisma.project.count({
      where: {
        wardId,
        tenantId,
        isDeleted: false,
      },
    });

    const activeCommunityGroups = await prisma.communityGroup.count({
      where: {
        wardId,
        tenantId,
        isDeleted: false,
      },
    });

    const activeVoters = await prisma.voter.count({
      where: {
        wardId,
        tenantId,
        isDeleted: false,
      },
    });

    const total =
      ward._count.grievances +
      activeProjectCount +
      ward._count.institutions +
      activeCommunityGroups +
      activeVoters;

    if (total > 0) {
      const parts = [];
      if (ward._count.grievances > 0) parts.push(`${ward._count.grievances} grievances`);
      if (activeProjectCount > 0) parts.push(`${activeProjectCount} projects`);
      if (ward._count.institutions > 0) parts.push(`${ward._count.institutions} institutions`);
      if (activeCommunityGroups > 0) parts.push(`${activeCommunityGroups} community groups`);
      if (activeVoters > 0) parts.push(`${activeVoters} voters`);

      throw ApiError.badRequest(
        `Cannot delete ward. It has active dependent records: ` +
        parts.join(", ") +
        `. Deactivate instead.`,
      );
    }

    await archiveToRecycleBin({
      tenantId,
      module: "wards",
      entityType: "ward",
      recordId: ward.id,
      recordLabel: `#${ward.wardNumber} ${ward.name}`,
      payload: {
        ...ward,
        areas: ward.areas,
        councillors: ward.councillors,
        demographics: ward.demographics,
      },
      deletedById: req.user?.id,
    });

    await prisma.ward.update({
      where: { id: wardId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "wards",
      recordId: ward.id,
      description: `Moved ward #${ward.wardNumber} "${ward.name}" to recycle bin`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Ward "${ward.name}" moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
