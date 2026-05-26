import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  isValidTransition,
  getTransitionLabel,
} from "./helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";

export async function updateGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const grievanceId = req.params.id as string;
    const old = await prisma.grievance.findFirst({
      where: { id: grievanceId, tenantId },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const data: any = { ...req.body };
    if (data.complainantEmail === "") delete data.complainantEmail;

    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId },
      });
      if (!user) throw ApiError.notFound("Assigned user not found");
    }

    if (data.assignedDept) {
      const dept = await prisma.department.findFirst({
        where: { id: data.assignedDept, tenantId },
      });
      if (!dept) throw ApiError.notFound("Department not found");
    }

    const grievance = await prisma.grievance.update({
      where: { id: grievanceId },
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
        assignedTo: { select: { name: true } },
      },
    });

    // Log changes in timeline
    const changes: string[] = [];
    if (data.priority && data.priority !== old.priority)
      changes.push(`Priority: ${old.priority} → ${data.priority}`);
    if (data.category && data.category !== old.category)
      changes.push(`Category: ${old.category} → ${data.category}`);
    if (data.wardId && data.wardId !== old.wardId) changes.push(`Ward changed`);

    if (changes.length > 0) {
      await prisma.grievanceTimeline.create({
        data: {
          grievanceId: grievance.id,
          action: "UPDATED",
          comment: changes.join(". "),
          changedBy: req.user!.name || req.user!.email,
          changedById: req.user!.id,
        },
      });
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "grievances",
      recordId: grievance.id,
      description: `Updated ${grievance.ticketNumber}`,
      oldData: {
        priority: old.priority,
        category: old.category,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: "Grievance updated",
      data: grievance,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const old = await prisma.grievance.findFirst({
      where: { id: req.params.id as string, tenantId },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const {
      status,
      comment,
      resolutionNotes,
      rejectionReason,
      escalationReason,
      satisfactionRating,
    } = req.body;

    if (!isValidTransition(old.status, status)) {
      throw ApiError.badRequest(
        `Cannot change from ${old.status} to ${status}`,
      );
    }

    const updateData: any = { status };
    const now = new Date();

    switch (status) {
      case "RESOLVED":
        updateData.resolvedAt = now;
        updateData.closedAt = null;
        updateData.rejectionReason = null;
        if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
        break;
      case "CLOSED":
        updateData.closedAt = now;
        if (satisfactionRating)
          updateData.satisfactionRating = satisfactionRating;
        break;
      case "ESCALATED":
        updateData.escalatedAt = now;
        if (escalationReason) updateData.escalationReason = escalationReason;
        break;
      case "REJECTED":
        updateData.rejectionReason =
          rejectionReason || "Rejected by administrator";
        updateData.resolvedAt = null;
        updateData.closedAt = null;
        updateData.resolutionNotes = null;
        break;
      case "IN_PROGRESS":
        if (
          old.status === "RESOLVED" ||
          old.status === "CLOSED" ||
          old.status === "REJECTED"
        ) {
          updateData.resolvedAt = null;
          updateData.closedAt = null;
          updateData.resolutionNotes = null;
          updateData.rejectionReason = null;
          updateData.satisfactionRating = null;
        }
        break;
      case "OPEN":
        updateData.resolvedAt = null;
        updateData.closedAt = null;
        updateData.resolutionNotes = null;
        updateData.rejectionReason = null;
        updateData.satisfactionRating = null;
        updateData.escalatedAt = null;
        updateData.escalationReason = null;
        break;
    }

    const grievance = await prisma.grievance.update({
      where: { id: req.params.id as string },
      data: updateData,
      include: {
        ward: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    });

    const label = getTransitionLabel(old.status, status);
    const extraComment = [
      resolutionNotes ? `Resolution: ${resolutionNotes}` : "",
      rejectionReason ? `Reason: ${rejectionReason}` : "",
      escalationReason ? `Reason: ${escalationReason}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    await prisma.grievanceTimeline.create({
      data: {
        grievanceId: grievance.id,
        action: "STATUS_CHANGE",
        fromStatus: old.status as any,
        toStatus: status as any,
        comment:
          comment || `${label}${extraComment ? `. ${extraComment}` : ""}`,
        changedBy: req.user!.name || req.user!.email,
        changedById: req.user!.id,
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "grievances",
      recordId: grievance.id,
      description: `${grievance.ticketNumber}: ${old.status} → ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Status changed to ${status}`,
      data: grievance,
    });
  } catch (error) {
    next(error);
  }
}

export async function assignGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const grievanceId = req.params.id as string;
    const old = await prisma.grievance.findFirst({
      where: { id: grievanceId, tenantId },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const { assignedToId, assignedDept, comment } = req.body;

    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, tenantId },
      });
      if (!user) throw ApiError.notFound("Assigned user not found");
    }

    if (assignedDept) {
      const dept = await prisma.department.findFirst({
        where: { id: assignedDept, tenantId },
      });
      if (!dept) throw ApiError.notFound("Department not found");
    }

    const updateData: any = {};
    if (assignedToId !== undefined)
      updateData.assignedToId = assignedToId || null;
    if (assignedDept !== undefined)
      updateData.assignedDept = assignedDept || null;

    const grievance = await prisma.grievance.update({
      where: { id: grievanceId },
      data: updateData,
      include: {
        assignedTo: { select: { name: true } },
      },
    });

    // Build assignment label
    const parts: string[] = [];
    if (grievance.assignedTo) parts.push(`to ${grievance.assignedTo.name}`);
    if (assignedDept) {
      const dept = await prisma.department.findFirst({
        where: { id: assignedDept, tenantId },
        select: { name: true },
      });
      if (dept) parts.push(`(Dept: ${dept.name})`);
    }

    await prisma.grievanceTimeline.create({
      data: {
        grievanceId: grievance.id,
        action: "ASSIGNMENT",
        comment: comment || `Assigned ${parts.join(" ") || "updated"}`,
        changedBy: req.user!.name || req.user!.email,
        changedById: req.user!.id,
        metadata: { assignedToId, assignedDept },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "grievances",
      recordId: grievance.id,
      description: `Assigned ${grievance.ticketNumber} ${parts.join(" ")}`,
      newData: { assignedToId, assignedDept },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Assigned ${parts.join(" ")}`,
      data: grievance,
    });
  } catch (error) {
    next(error);
  }
}
