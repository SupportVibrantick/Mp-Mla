import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
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

export async function createTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const data = req.body;

    // Validate assignment rules (active, tenant match, department match)
    await validateAssignment(tenantId, data.assignedToId, data.departmentId);

    // Validate department exists if provided
    if (data.departmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!dept) throw ApiError.notFound("Active department not found");
    }

    // Validate grievance exists if provided
    if (data.grievanceId) {
      const grievance = await prisma.grievance.findFirst({
        where: { id: data.grievanceId, tenantId, isDeleted: false },
      });
      if (!grievance) throw ApiError.notFound("Grievance not found");
    }

    // Validate project exists if provided
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, tenantId, isDeleted: false },
      });
      if (!project) throw ApiError.notFound("Project not found");
    }

    const taskCode = await generateTaskCode(tenantId);

    const task = await prisma.task.create({
      data: {
        tenantId,
        taskCode,
        title: data.title,
        description: data.description || null,
        priority: data.priority || "MEDIUM",
        status: data.status || "TODO",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assignedToId: data.assignedToId,
        createdById: req.user!.id,
        departmentId: data.departmentId || null,
        grievanceId: data.grievanceId || null,
        projectId: data.projectId || null,
        isDeleted: false,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        grievance: { select: { id: true, ticketNumber: true, subject: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // Log timeline
    await prisma.taskTimeline.create({
      data: {
        tenantId,
        taskId: task.id,
        action: "TASK_CREATED",
        comment: `Task "${task.title}" created and assigned to ${task.assignedTo.name}.`,
        changedById: req.user!.id,
        metadata: { taskCode, assignedToId: data.assignedToId },
      },
    });

    // Send assignment notification
    await prisma.notification.create({
      data: {
        tenantId,
        userId: task.assignedToId,
        channel: "IN_APP",
        title: "New Task Assigned",
        message: `You have been assigned task "${task.title}" (${taskCode}).`,
        status: "PENDING",
      },
    });

    // Audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "tasks",
      recordId: task.id,
      description: `Created task "${task.title}" (${taskCode})`,
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Task "${task.title}" (${taskCode}) created successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}
