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
import { calculateGrievanceSla } from "../../../services/grievance/sla.service.js";
import { applyTransition } from "../../../services/grievance/grievanceWorkflow.service.js";

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
    if (old.isDeleted) throw ApiError.badRequest("Cannot update a deleted grievance.");

    const data: any = { ...req.body };
    if (data.complainantEmail === "") delete data.complainantEmail;

    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    if (data.assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: data.assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) throw ApiError.notFound("Active assigned user not found");

      const targetDeptId = data.departmentId !== undefined ? data.departmentId : old.departmentId;
      if (targetDeptId && user.departmentId !== targetDeptId) {
        throw ApiError.badRequest("Assigned user does not belong to the selected department");
      }
    }

    if (data.departmentId !== undefined || data.priority !== undefined) {
      const targetDeptId = data.departmentId !== undefined ? data.departmentId : old.departmentId;
      const targetPriority = data.priority !== undefined ? data.priority : old.priority;

      if (targetDeptId) {
        const isDeptChanged = data.departmentId !== undefined && data.departmentId !== old.departmentId;
        const startTime = isDeptChanged ? new Date() : (old.slaStartedAt || old.createdAt);

        const slaDetails = await calculateGrievanceSla(
          tenantId,
          targetDeptId,
          targetPriority,
          startTime
        );

        data.slaStartedAt = slaDetails.slaStartedAt;
        data.slaHoursApplied = slaDetails.slaHoursApplied;
        data.expectedResolutionDate = slaDetails.expectedResolutionDate;
      } else {
        data.slaStartedAt = null;
        data.slaHoursApplied = null;
        data.expectedResolutionDate = null;
      }
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
    if (data.departmentId !== undefined && data.departmentId !== old.departmentId)
      changes.push("Department changed");

    if (changes.length > 0) {
      await prisma.grievanceTimeline.create({
        data: {
          tenantId,
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
    const grievanceId = req.params.id as string;

    const {
      status,
      comment,
      resolutionNotes,
      rejectionReason,
      escalationReason,
      satisfactionRating,
    } = req.body;

    const old = await prisma.grievance.findFirst({
      where: { id: grievanceId, tenantId },
    });
    if (!old) throw ApiError.notFound("Grievance not found");

    const grievance = await applyTransition(
      grievanceId,
      tenantId,
      status,
      req.user!,
      {
        comment,
        resolutionNotes,
        rejectionReason,
        escalationReason,
        satisfactionRating,
      }
    );

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
    if (old.isDeleted) throw ApiError.badRequest("Cannot assign a deleted grievance.");

    const { assignedToId, departmentId, comment } = req.body;

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    if (assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: assignedToId, tenantId, status: "ACTIVE" },
      });
      if (!user) throw ApiError.notFound("Active assigned user not found");

      const targetDeptId = departmentId !== undefined ? departmentId : old.departmentId;
      if (targetDeptId && user.departmentId !== targetDeptId) {
        throw ApiError.badRequest("Assigned user does not belong to the selected department");
      }
    }

    const updateData: any = {};
    if (assignedToId !== undefined)
      updateData.assignedToId = assignedToId || null;
    if (departmentId !== undefined)
      updateData.departmentId = departmentId || null;

    if (departmentId !== undefined) {
      if (departmentId) {
        const isDeptChanged = departmentId !== old.departmentId;
        const startTime = isDeptChanged ? new Date() : (old.slaStartedAt || old.createdAt);

        const slaDetails = await calculateGrievanceSla(
          tenantId,
          departmentId,
          old.priority,
          startTime
        );

        updateData.slaStartedAt = slaDetails.slaStartedAt;
        updateData.slaHoursApplied = slaDetails.slaHoursApplied;
        updateData.expectedResolutionDate = slaDetails.expectedResolutionDate;
      } else {
        updateData.slaStartedAt = null;
        updateData.slaHoursApplied = null;
        updateData.expectedResolutionDate = null;
      }
    }

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
    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: departmentId, tenantId },
        select: { name: true },
      });
      if (dept) parts.push(`(Dept: ${dept.name})`);
    }

    await prisma.grievanceTimeline.create({
      data: {
        tenantId,
        grievanceId: grievance.id,
        action: "ASSIGNMENT",
        comment: comment || `Assigned ${parts.join(" ") || "updated"}`,
        changedBy: req.user!.name || req.user!.email,
        changedById: req.user!.id,
        metadata: {
          assignedToId,
          departmentId,
          previousDepartmentId: old.departmentId,
          newDepartmentId: departmentId !== undefined ? departmentId : old.departmentId,
          previousAssignedToId: old.assignedToId,
          newAssignedToId: assignedToId !== undefined ? assignedToId : old.assignedToId,
        },
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "grievances",
      recordId: grievance.id,
      description: `Assigned ${grievance.ticketNumber} ${parts.join(" ")}`,
      oldData: { assignedToId: old.assignedToId, departmentId: old.departmentId },
      newData: { assignedToId, departmentId },
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
