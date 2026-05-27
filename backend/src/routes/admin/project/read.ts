import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/project
 * Lists all projects with optional filtering and pagination.
 */
export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const { page, limit, skip } = parsePagination(req.query);
    const { wardId, status, department, category, fundType, search } =
      req.query as Record<string, string>;

    const where: any = { tenantId, isDeleted: false };
    if (wardId) where.wardId = wardId;
    if (status && status !== "all") where.status = status;
    if (department && department !== "all") where.department = department;
    if (category && category !== "all") where.category = category;
    if (fundType && fundType !== "all") where.fundType = fundType;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { projectCode: { contains: search, mode: "insensitive" } },
        { contractor: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          ward: { select: { id: true, name: true, wardNumber: true } },
          _count: {
            select: { milestones: true, updates: true, attachments: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where }),
    ]);

    // Resolve department names
    const deptIds = [...new Set(data.map((p) => p.department).filter(Boolean))];
    const depts = await prisma.department.findMany({
      where: { tenantId, id: { in: deptIds } },
      select: { id: true, name: true, code: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));

    const enriched = data.map((p) => ({
      ...p,
          departmentInfo: deptMap[p.department] || null,
      budgetUtilization:
        p.budgetSanctioned > 0
          ? Math.round((p.budgetUsed / p.budgetSanctioned) * 100)
          : 0,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: buildPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/project/:id
 * Gets a single project by ID with detailed information.
 */
export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
      include: {
        ward: {
          select: { id: true, name: true, wardNumber: true, zone: true },
        },
        createdBy: { select: { id: true, name: true } },
        milestones: { orderBy: { orderIndex: "asc" } },
        updates: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!project) throw ApiError.notFound("Project not found");
 let departmentInfo = null;
    if (project.department) {
      departmentInfo = await prisma.department.findFirst({
        where: { id: project.department, tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          headName: true,
          headPhone: true,
        },
      });
    }
    const completedMs = project.milestones.filter((m) => m.isCompleted).length;
    const totalMs = project.milestones.length;
    const budgetUtilization =
      project.budgetSanctioned > 0
        ? Math.round((project.budgetUsed / project.budgetSanctioned) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        ...project,
        departmentInfo,
        completedMilestones: completedMs,
        totalMilestones: totalMs,
        budgetUtilization,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/project/stats
 * Gets aggregated statistics for all projects.
 */
export async function getProjectStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const wardId = req.query.wardId as string;
    const w: any = { tenantId, isDeleted: false, ...(wardId ? { wardId } : {}) };

    const [
      total,
      byStatus,
      byCategory,
      byFund,
      budgetAgg,
      byWard,
      completedProjects,
      pendingAlerts,
      delayedProjects,
    ] = await Promise.all([
      prisma.project.count({ where: w }),
      prisma.project.groupBy({ by: ["status"], where: w, _count: true }),
      prisma.project.groupBy({
        by: ["category", "status"],
        where: w,
        _count: true,
        _sum: { budgetSanctioned: true },
      }),
      prisma.project.groupBy({
        by: ["fundType"],
        where: w,
        _count: true,
        _sum: {
          budgetSanctioned: true,
          budgetReleased: true,
          budgetUsed: true,
        },
      }),
      prisma.project.aggregate({
        where: w,
        _sum: {
          budgetSanctioned: true,
          budgetReleased: true,
          budgetUsed: true,
        },
      }),
      prisma.project.groupBy({
        by: ["wardId"],
        where: { ...w, status: { in: ["PENDING", "RUNNING"] } },
        _count: true,
        orderBy: { _count: { wardId: "desc" } },
        take: 10,
      }),
      prisma.project.findMany({
        where: {
          ...w,
          status: "COMPLETED",
          NOT: { actualEndDate: null, startDate: null },
        },
        select: { startDate: true, actualEndDate: true },
      }),
      prisma.project.findMany({
        where: {
          ...w,
          status: { in: ["PENDING", "RUNNING", "ON_HOLD"] },
          createdAt: { lt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, name: true, createdAt: true, status: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          ...w,
          status: { in: ["PENDING", "RUNNING", "ON_HOLD"] },
          expectedEndDate: { lt: new Date() },
        },
        select: { id: true, name: true, status: true, expectedEndDate: true },
        take: 10,
      }),
    ]);

    // Calculate Average Completion Time
    let totalDays = 0;
    completedProjects.forEach((p) => {
      if (p.startDate && p.actualEndDate) {
        const diff = p.actualEndDate.getTime() - p.startDate.getTime();
        totalDays += Math.max(0, diff / (1000 * 60 * 60 * 24));
      }
    });
    const avgCompletionTime =
      completedProjects.length > 0
        ? Math.round(totalDays / completedProjects.length)
        : 0;

    const wardIds = byWard.map((x) => x.wardId);
    const wards = await prisma.ward.findMany({
      where: { tenantId, id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    // Group Category Data (Total vs Completed)
    const categoryStats = byCategory.reduce((acc: any, curr) => {
      const existing = acc.find((a: any) => a.category === curr.category);
      if (existing) {
        existing.total += curr._count;
        if (curr.status === "COMPLETED") existing.completed += curr._count;
        existing.budget += curr._sum.budgetSanctioned || 0;
      } else {
        acc.push({
          category: curr.category,
          total: curr._count,
          completed: curr.status === "COMPLETED" ? curr._count : 0,
          budget: curr._sum.budgetSanctioned || 0,
        });
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: {
        total,
        pending: sm["PENDING"] || 0,
        running: sm["RUNNING"] || 0,
        completed: sm["COMPLETED"] || 0,
        onHold: sm["ON_HOLD"] || 0,
        cancelled: sm["CANCELLED"] || 0,
        totalSanctioned: budgetAgg._sum.budgetSanctioned || 0,
        totalReleased: budgetAgg._sum.budgetReleased || 0,
        totalUsed: budgetAgg._sum.budgetUsed || 0,
        avgCompletionTime,
        pendingAlerts,
        delayedProjects: delayedProjects.map((p) => ({
          ...p,
          daysOverdue: Math.floor(
            (Date.now() - new Date(p.expectedEndDate!).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        })),
        delayedCount: delayedProjects.length,
        byCategory: categoryStats,
        byFund: byFund.map((f) => ({
          fundType: f.fundType,
          count: f._count,
          sanctioned: f._sum.budgetSanctioned || 0,
          released: f._sum.budgetReleased || 0,
          used: f._sum.budgetUsed || 0,
        })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap[w.wardId]?.name || "Unknown",
          wardNumber: wardMap[w.wardId]?.wardNumber || 0,
          count: w._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
