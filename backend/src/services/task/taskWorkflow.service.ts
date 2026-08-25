import prisma from "../../lib/prisma.js";
import { TaskStatus } from "@prisma/client";
import { ApiError } from "../../utils/ApiError.js";

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  OVERDUE: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function validateTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransition(from, to)) {
    throw ApiError.badRequest(`Cannot transition task status from "${from}" to "${to}".`);
  }
}

interface TransitionOptions {
  comment?: string | null;
  user: { id: string; name?: string; email: string };
}

export async function applyTransition(
  taskId: string,
  tenantId: string,
  targetStatus: TaskStatus,
  options: TransitionOptions
) {
  const { comment, user } = options;

  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId, isDeleted: false },
  });
  if (!task) throw ApiError.notFound("Task not found");

  validateTransition(task.status, targetStatus);

  const updateData: any = { status: targetStatus };
  const now = new Date();

  // Enforce workflow side-effects
  if (targetStatus === "IN_PROGRESS") {
    if (!task.startedAt) {
      updateData.startedAt = now;
    }
  } else if (targetStatus === "COMPLETED") {
    updateData.completedAt = now;
    updateData.completedById = user.id;
  } else if (targetStatus === "CANCELLED") {
    updateData.cancelledAt = now;
    if (!comment) {
      throw ApiError.badRequest("A comment / cancellation reason is required to cancel a task.");
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  const transitionLabel = `Status changed from ${task.status} to ${targetStatus}`;
  const displayComment = comment ? `${transitionLabel}. Comment: ${comment}` : transitionLabel;

  // Log in task timeline history
  await prisma.taskTimeline.create({
    data: {
      tenantId,
      taskId,
      action: `TASK_${targetStatus}`,
      comment: displayComment,
      changedById: user.id,
      metadata: {
        fromStatus: task.status,
        toStatus: targetStatus,
        comment,
      },
    },
  });

  // Create in-app Notification for assignee (if transitioned by someone else)
  if (updatedTask.assignedToId && updatedTask.assignedToId !== user.id) {
    await prisma.notification.create({
      data: {
        tenantId,
        userId: updatedTask.assignedToId,
        channel: "IN_APP",
        title: "Task Status Updated",
        message: `Task "${updatedTask.title}" has been moved to ${targetStatus}.`,
        status: "PENDING",
      },
    });
  }

  return updatedTask;
}
