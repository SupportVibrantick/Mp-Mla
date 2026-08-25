import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";

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

/**
 * POST /api/admin/correspondence/:id/create-task
 * Create a follow-up Task linked to this correspondence
 */
export async function createCorrespondenceTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const corrId = req.params.id as string;
    const data = req.body;

    const correspondence = await prisma.correspondence.findFirst({
      where: { id: corrId, tenantId, isDeleted: false },
    });
    if (!correspondence) throw ApiError.notFound("Correspondence not found");

    // Validate assignee
    const user = await prisma.user.findFirst({
      where: { id: data.assignedToId, tenantId, status: "ACTIVE" },
    });
    if (!user) {
      throw ApiError.badRequest("Selected assigned officer is invalid or inactive");
    }

    const taskCode = await generateTaskCode(tenantId);
    const dueDate = data.dueDate ? new Date(data.dueDate) : correspondence.dueDate;

    const task = await prisma.$transaction(async (tx) => {
      const t = await tx.task.create({
        data: {
          tenantId,
          taskCode,
          title: data.title,
          description: data.description || `Follow-up task for correspondence ${correspondence.referenceNumber}`,
          assignedToId: data.assignedToId,
          createdById: req.user!.id,
          priority: data.priority || "MEDIUM",
          status: "TODO",
          dueDate,
          correspondenceId: corrId,
          departmentId: correspondence.departmentId,
        },
      });

      await tx.correspondenceTimeline.create({
        data: {
          tenantId,
          correspondenceId: corrId,
          action: "CREATE_TASK",
          comment: `Follow-up task "${t.title}" (${taskCode}) assigned to officer "${user.name}"`,
          changedById: req.user!.id,
        },
      });

      return t;
    });

    // Audit logs for both Task creation and Correspondence update
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "CREATE",
      module: "tasks",
      recordId: task.id,
      description: `Created follow-up task "${task.title}" (${taskCode}) for correspondence "${correspondence.referenceNumber}"`,
      newData: task,
      ...getRequestMeta(req),
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "correspondence",
      recordId: corrId,
      description: `CORRESPONDENCE_TASK_LINKED: Linked follow-up task "${taskCode}" to correspondence "${correspondence.referenceNumber}"`,
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `Task ${taskCode} created and linked to correspondence successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
}
