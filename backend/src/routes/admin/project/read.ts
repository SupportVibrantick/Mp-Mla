import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listProjects(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { wardId, status, department, category, fundType, search } =
      req.query as Record<string, string>;

    const where: any = {};
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
      where: { id: { in: deptIds } },
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

export async function getProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
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
      departmentInfo = await prisma.department.findUnique({
        where: { id: project.department },
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

export async function getProjectStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.query.wardId as string;
    const w: any = wardId ? { wardId } : {};

    const [total, byStatus, byCategory, byFund, budgetAgg, byWard] =
      await Promise.all([
        prisma.project.count({ where: w }),
        prisma.project.groupBy({ by: ["status"], where: w, _count: true }),
        prisma.project.groupBy({
          by: ["category"],
          where: w,
          _count: true,
          _sum: { budgetSanctioned: true },
          orderBy: { _count: { category: "desc" } },
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
      ]);

    const wardIds = byWard.map((x) => x.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

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
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
          budget: c._sum.budgetSanctioned || 0,
        })),
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
