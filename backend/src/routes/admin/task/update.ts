import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateAssignment } from "../../../services/task/taskAssignment.service.js";
import { applyTransition } from "../../../services/task/taskWorkflow.service.js";

export async function updateTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const taskId = req.params.id as string;

    const oldTask = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });
    if (!oldTask) throw ApiError.notFound("Task not found");
    if (oldTask.isDeleted) throw ApiError.badRequest("Cannot update a deleted task.");

    const data = { ...req.body };

    // Validate assigned user if updated
    if (data.assignedToId && data.assignedToId !== oldTask.assignedToId) {
      const targetDeptId = data.departmentId !== undefined ? data.departmentId : oldTask.departmentId;
      await validateAssignment(tenantId, data.assignedToId, targetDeptId);
    }

    // Validate department if updated
    if (data.departmentId && data.departmentId !== oldTask.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    // Validate grievance if updated
    if (data.grievanceId && data.grievanceId !== oldTask.grievanceId) {
      const grievance = await prisma.grievance.findFirst({
        where: { id: data.grievanceId, tenantId, isDeleted: false },
      });
      if (!grievance) throw ApiError.notFound("Grievance not found");
    }

    // Validate project if updated
    if (data.projectId && data.projectId !== oldTask.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, tenantId, isDeleted: false },
      });
      if (!project) throw ApiError.notFound("Project not found");
    }

    // Capture changed details for timeline comment
    const changes: string[] = [];
    if (data.title && data.title !== oldTask.title) changes.push("title");
    if (data.description !== undefined && data.description !== oldTask.description) changes.push("description");
    if (data.priority && data.priority !== oldTask.priority) changes.push("priority");
    if (data.dueDate !== undefined && data.dueDate !== oldTask.dueDate) changes.push("dueDate");

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId,
        departmentId: data.departmentId,
        grievanceId: data.grievanceId,
        projectId: data.projectId,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (changes.length > 0) {
      await prisma.taskTimeline.create({
        data: {
          tenantId,
          taskId,
          action: "TASK_UPDATE",
          comment: `Task fields updated: ${changes.join(", ")}`,
          changedById: req.user!.id,
          metadata: { changes },
        },
      });
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "tasks",
      recordId: task.id,
      description: `Updated task "${task.title}" (${task.taskCode})`,
      oldData: { status: oldTask.status, priority: oldTask.priority },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Task "${task.title}" updated successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/tasks/:id/status
 * Centralized status updates via workflow transitions.
 */
export async function changeStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const taskId = req.params.id as string;
    const { status, comment } = req.body;

    const old = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });
    if (!old) throw ApiError.notFound("Task not found");
    if (old.isDeleted) throw ApiError.badRequest("Cannot update status of a deleted task.");

    const task = await applyTransition(taskId, tenantId, status, {
      comment,
      user: req.user!,
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "tasks",
      recordId: task.id,
      description: `${task.taskCode}: ${old.status} → ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Task status changed to ${status}`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/tasks/:id/assign
 * reassign task to user.
 */
export async function assignTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const taskId = req.params.id as string;
    const { assignedToId, comment } = req.body;

    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });
    if (!task) throw ApiError.notFound("Task not found");
    if (task.isDeleted) throw ApiError.badRequest("Cannot reassign a deleted task.");

    // Validate new assignee
    await validateAssignment(tenantId, assignedToId, task.departmentId);

    const oldAssigneeId = task.assignedToId;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { assignedToId },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Write to timeline
    await prisma.taskTimeline.create({
      data: {
        tenantId,
        taskId,
        action: "TASK_ASSIGNED",
        comment: comment || `Task reassigned to ${updatedTask.assignedTo.name}.`,
        changedById: req.user!.id,
        metadata: {
          previousAssigneeId: oldAssigneeId,
          newAssigneeId: assignedToId,
          comment,
        },
      },
    });

    // Notify new assignee
    await prisma.notification.create({
      data: {
        tenantId,
        userId: assignedToId,
        channel: "IN_APP",
        title: "Task Reassigned",
        message: `You have been reassigned task "${task.title}" (${task.taskCode}).`,
        status: "PENDING",
      },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "tasks",
      recordId: taskId,
      description: `Reassigned task ${task.taskCode} to ${updatedTask.assignedTo.name}`,
      oldData: { assignedToId: oldAssigneeId },
      newData: { assignedToId },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Task successfully assigned to ${updatedTask.assignedTo.name}`,
      data: updatedTask,
    });
  } catch (error) {
    next(error);
  }
}
