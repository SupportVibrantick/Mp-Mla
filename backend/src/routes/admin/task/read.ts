import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { getTaskStats } from "../../../services/task/taskStats.service.js";

export async function listTasks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const {
      status,
      priority,
      assignedToId,
      departmentId,
      grievanceId,
      projectId,
      overdue,
      search,
      isDeleted,
    } = req.query as Record<string, string>;

    const where: any = {
      tenantId,
      isDeleted: isDeleted === "true",
    };

    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (departmentId && departmentId !== "all") where.departmentId = departmentId;
    if (grievanceId) where.grievanceId = grievanceId;
    if (projectId) where.projectId = projectId;

    const now = new Date();
    if (overdue === "true") {
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
      where.dueDate = { lt: now };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { taskCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true, code: true } },
          grievance: { select: { id: true, ticketNumber: true, subject: true } },
          project: { select: { id: true, name: true, projectCode: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.task.count({ where }),
    ]);

    const enriched = data.map((t) => {
      const isOverdue =
        !["COMPLETED", "CANCELLED"].includes(t.status) &&
        t.dueDate &&
        new Date(t.dueDate).getTime() < now.getTime();
      return {
        ...t,
        isOverdue: !!isOverdue,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getTask(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const task = await prisma.task.findFirst({
      where: { id: req.params.id as string, tenantId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, phone: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        department: { select: { id: true, name: true, code: true } },
        grievance: { select: { id: true, ticketNumber: true, subject: true, description: true } },
        project: { select: { id: true, name: true, projectCode: true } },
        timeline: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) throw ApiError.notFound("Task not found");

    const now = new Date();
    const isOverdue =
      !["COMPLETED", "CANCELLED"].includes(task.status) &&
      task.dueDate &&
      new Date(task.dueDate).getTime() < now.getTime();

    res.json({
      success: true,
      data: {
        ...task,
        isOverdue: !!isOverdue,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { departmentId, assignedToId, projectId, grievanceId } = req.query as Record<string, string>;

    const stats = await getTaskStats(tenantId, {
      departmentId,
      assignedToId,
      projectId,
      grievanceId,
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
