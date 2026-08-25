import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/tasks/export
 * Exports tasks in flat structure for CSV reports.
 */
export async function exportTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);

    const tasks = await prisma.task.findMany({
      where: { tenantId, isDeleted: false },
      include: {
        assignedTo: { select: { name: true, email: true } },
        createdBy: { select: { name: true } },
        department: { select: { name: true, code: true } },
        grievance: { select: { ticketNumber: true, subject: true } },
        project: { select: { projectCode: true, name: true } },
      },
      orderBy: { taskCode: "asc" },
    });

    const flatData = tasks.map((t) => ({
      taskCode: t.taskCode,
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
      assignedOfficer: t.assignedTo?.name || "",
      assignedOfficerEmail: t.assignedTo?.email || "",
      createdBy: t.createdBy?.name || "",
      departmentName: t.department?.name || "",
      departmentCode: t.department?.code || "",
      grievanceTicket: t.grievance?.ticketNumber || "",
      grievanceSubject: t.grievance?.subject || "",
      projectCode: t.project?.projectCode || "",
      projectName: t.project?.name || "",
      dueDate: t.dueDate ? t.dueDate.toISOString() : "",
      startedAt: t.startedAt ? t.startedAt.toISOString() : "",
      completedAt: t.completedAt ? t.completedAt.toISOString() : "",
      cancelledAt: t.cancelledAt ? t.cancelledAt.toISOString() : "",
      createdAt: t.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      data: flatData,
    });
  } catch (error) {
    next(error);
  }
}
