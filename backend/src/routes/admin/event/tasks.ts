import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { validateAssignment } from "../../../services/task/taskAssignment.service.js";

async function generateTaskCode(tenantId: string): Promise<string> {
  const prefix = `TSK-${new Date().getFullYear()}-`;
  const last = await prisma.task.findFirst({
    where: { tenantId, taskCode: { startsWith: prefix } },
    orderBy: { taskCode: "desc" },
    select: { taskCode: true },
  });
  let count = 1;
  if (last) {
    const parts = last.taskCode.split("-");
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) count = num + 1;
  }
  return `${prefix}${String(count).padStart(5, "0")}`;
}

export async function getEventTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;

    const tasks = await prisma.task.findMany({
      where: { eventId, tenantId, isDeleted: false },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
}

export async function createEventTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const eventId = req.params.id as string;
    const data = req.body;

    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId, isDeleted: false },
    });
    if (!event) throw ApiError.notFound("Event not found");

    // Validate assignee department alignment
    await validateAssignment(tenantId, data.assignedToId, data.departmentId);

    // Validate department exists if provided
    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    const taskCode = await generateTaskCode(tenantId);

    const task = await prisma.task.create({
      data: {
        tenantId,
        taskCode,
        title: data.title,
        description: data.description || null,
        priority: data.priority || "MEDIUM",
        status: "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId,
        createdById: req.user!.id,
        departmentId: data.departmentId || null,
        eventId,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Write to event timeline
    await prisma.eventTimeline.create({
      data: {
        tenantId,
        eventId,
        action: "TASK_CREATED",
        description: `Follow-up task "${task.title}" (${taskCode}) created and assigned to ${task.assignedTo.name}.`,
        changedById: req.user!.id,
      },
    });

    // Notify assignee
    await prisma.notification.create({
      data: {
        tenantId,
        userId: task.assignedToId,
        channel: "IN_APP",
        title: "New Follow-up Task Assigned",
        message: `You have been assigned follow-up task "${task.title}" (${taskCode}) from event "${event.title}".`,
        status: "PENDING",
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}
