import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import {
  isValidTransition,
  getTransitionLabel,
  calculateExpectedDate,
} from "./helpers.js";

export const updateGrievanceSchema = z
  .object({
    subject: z.string().min(1).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    wardId: z.string().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    source: z.string().optional(),
    complainantName: z.string().optional(),
    complainantPhone: z.string().optional(),
    complainantEmail: z.string().optional(),
    complainantAddress: z.string().optional(),
    locationAddress: z.string().optional(),
    expectedResolutionDate: z.string().datetime().optional(),
  })
  .partial();

export const changeStatusSchema = z.object({
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "ESCALATED",
    "RESOLVED",
    "CLOSED",
    "REJECTED",
  ]),
  comment: z.string().optional(),
  resolutionNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  escalationReason: z.string().optional(),
  satisfactionRating: z.number().int().min(1).max(5).optional(),
});

export const assignSchema = z.object({
  assignedToId: z.string().optional().nullable(),
  assignedDept: z.string().optional().nullable(),
  comment: z.string().optional(),
});

export async function updateGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const old = await prisma.grievance.findUnique({
      where: { id: req.params.id },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const data: any = { ...req.body };
    if (data.complainantEmail === "") delete data.complainantEmail;
    if (data.expectedResolutionDate)
      data.expectedResolutionDate = new Date(data.expectedResolutionDate);

    // Recalculate SLA if priority changed
    if (
      data.priority &&
      data.priority !== old.priority &&
      !data.expectedResolutionDate
    ) {
      data.expectedResolutionDate = calculateExpectedDate(data.priority);
    }

    const grievance = await prisma.grievance.update({
      where: { id: req.params.id },
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
    const old = await prisma.grievance.findUnique({
      where: { id: req.params.id },
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
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        break;
      case "OPEN":
        if (["RESOLVED", "CLOSED", "REJECTED"].includes(old.status)) {
          updateData.resolvedAt = null;
          updateData.closedAt = null;
          updateData.resolutionNotes = null;
          updateData.rejectionReason = null;
          updateData.satisfactionRating = null;
        }
        break;
    }

    const grievance = await prisma.grievance.update({
      where: { id: req.params.id },
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
    const old = await prisma.grievance.findUnique({
      where: { id: req.params.id },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const { assignedToId, assignedDept, comment } = req.body;

    const updateData: any = {};
    if (assignedToId !== undefined)
      updateData.assignedToId = assignedToId || null;
    if (assignedDept !== undefined)
      updateData.assignedDept = assignedDept || null;

    const grievance = await prisma.grievance.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignedTo: { select: { name: true } },
      },
    });

    // Build assignment label
    const parts: string[] = [];
    if (grievance.assignedTo) parts.push(`to ${grievance.assignedTo.name}`);
    if (assignedDept) {
      const dept = await prisma.department.findUnique({
        where: { id: assignedDept },
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
