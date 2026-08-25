import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { validateAssignment } from "../../../services/task/taskAssignment.service.js";
import { applyTransition } from "../../../services/task/taskWorkflow.service.js";

/**
 * POST /api/admin/tasks/bulk-assign
 * Bulk reassigns a list of tasks.
 */
export async function bulkAssignTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { taskIds, assignedToId, comment } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw ApiError.badRequest("taskIds must be a non-empty array.");
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds }, tenantId, isDeleted: false },
    });
    if (tasks.length !== taskIds.length) {
      throw ApiError.notFound("One or more active tasks not found.");
    }

    // Validate new assignee compliance against each task's department
    for (const task of tasks) {
      await validateAssignment(tenantId, assignedToId, task.departmentId);
    }

    const updatedUser = await prisma.user.findFirst({
      where: { id: assignedToId },
      select: { name: true },
    });

    // Update tasks
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { assignedToId },
    });

    // Timeline logs & notifications
    for (const task of tasks) {
      await prisma.taskTimeline.create({
        data: {
          tenantId,
          taskId: task.id,
          action: "TASK_ASSIGNED",
          comment: comment || `Bulk reassigned to ${updatedUser?.name || "Officer"}.`,
          changedById: req.user!.id,
          metadata: { previousAssigneeId: task.assignedToId, newAssigneeId: assignedToId, comment },
        },
      });

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
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "tasks",
      recordId: taskIds[0],
      description: `Bulk reassigned ${taskIds.length} tasks to ${updatedUser?.name || "Officer"}`,
      newData: { taskIds, assignedToId },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Successfully reassigned ${taskIds.length} tasks to ${updatedUser?.name || "Officer"}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/tasks/bulk-status
 * Bulk updates the status of a list of tasks.
 */
export async function bulkStatusUpdateTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { taskIds, status, comment } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw ApiError.badRequest("taskIds must be a non-empty array.");
    }

    // Process transitions individually to enforce state-machine logic
    for (const tId of taskIds) {
      await applyTransition(tId, tenantId, status, {
        comment,
        user: req.user!,
      });
    }

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "tasks",
      recordId: taskIds[0],
      description: `Bulk updated status of ${taskIds.length} tasks to ${status}`,
      newData: { taskIds, status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Successfully updated status of ${taskIds.length} tasks to ${status}`,
    });
  } catch (error) {
    next(error);
  }
}
