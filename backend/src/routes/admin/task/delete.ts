import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

export async function deleteTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const taskId = req.params.id as string;

    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
    });
    if (!task) throw ApiError.notFound("Task not found");
    if (task.isDeleted) throw ApiError.badRequest("Task is already deleted.");

    // Archive in recycle bin
    await archiveToRecycleBin({
      tenantId,
      module: "tasks",
      entityType: "task",
      recordId: task.id,
      recordLabel: `${task.taskCode} - ${task.title}`,
      payload: task,
      deletedById: req.user!.id,
    });

    // Soft delete
    await prisma.task.update({
      where: { id: taskId },
      data: { isDeleted: true },
    });

    // Write to timeline
    await prisma.taskTimeline.create({
      data: {
        tenantId,
        taskId,
        action: "TASK_DELETED",
        comment: `Task soft deleted by ${req.user!.name || req.user!.email}`,
        changedById: req.user!.id,
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "tasks",
      recordId: taskId,
      description: `Soft-deleted task "${task.title}" (${task.taskCode})`,
      oldData: { title: task.title, isDeleted: false },
      newData: { isDeleted: true },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Task "${task.title}" (${task.taskCode}) successfully moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
