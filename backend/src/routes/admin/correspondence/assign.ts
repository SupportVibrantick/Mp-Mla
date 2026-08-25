import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

/**
 * PATCH /api/admin/correspondence/:id/assign
 * Assign correspondence to department and/or officer
 */
export async function assignCorrespondence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const { assignedToId, departmentId } = req.body;

    const old = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!old) throw ApiError.notFound("Correspondence not found");

    let user: any = null;
    let dept: any = null;

    // 1. Validate User
    if (assignedToId) {
      user = await prisma.user.findFirst({
        where: { id: assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) {
        throw ApiError.badRequest("Selected assignee officer is invalid or inactive");
      }
    }

    // 2. Validate Department
    if (departmentId) {
      dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId, isActive: true, isDeleted: false },
      });
      if (!dept) {
        throw ApiError.badRequest("Selected department is invalid or inactive");
      }
    }

    // 3. Validate user belongs to department if both specified
    if (user && dept) {
      if (user.departmentId !== departmentId) {
        throw ApiError.badRequest(
          `Officer "${user.name}" does not belong to PWD/selected department "${dept.name}"`
        );
      }
    }

    // Automatically transition status to ASSIGNED if current status is RECEIVED or UNDER_REVIEW
    const newStatus =
      ["RECEIVED", "UNDER_REVIEW"].includes(old.status) && (assignedToId || departmentId)
        ? "ASSIGNED"
        : old.status;

    const updated = await prisma.$transaction(async (tx) => {
      const corr = await tx.correspondence.update({
        where: { id: corrId },
        data: {
          assignedToId: assignedToId || old.assignedToId,
          departmentId: departmentId || old.departmentId,
          status: newStatus,
        },
      });

      let timelineComment = "Correspondence assignment updated.";
      if (dept && user) {
        timelineComment = `Assigned to department "${dept.name}" and officer "${user.name}"`;
      } else if (dept) {
        timelineComment = `Assigned to department "${dept.name}"`;
      } else if (user) {
        timelineComment = `Assigned to officer "${user.name}"`;
      }

      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          action: "ASSIGNED",
          comment: timelineComment,
          changedById: req.user!.id,
        },
      });

      return corr;
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_ASSIGNED: Assigned ref "${updated.referenceNumber}" to dept "${dept?.name || "N/A"}" and officer "${user?.name || "N/A"}"`,
      oldData: { assignedToId: old.assignedToId, departmentId: old.departmentId, status: old.status },
      newData: { assignedToId, departmentId, status: newStatus },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Correspondence assigned successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
