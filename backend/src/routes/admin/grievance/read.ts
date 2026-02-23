import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

export async function listGrievances(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const {
      wardId,
      status,
      priority,
      category,
      assignedDept,
      assignedToId,
      source,
      search,
      dateFrom,
      dateTo,
      overdue,
    } = req.query as Record<string, string>;

    const where: any = {};
    if (wardId) where.wardId = wardId;
    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (category && category !== "all") where.category = category;
    if (assignedDept && assignedDept !== "all")
      where.assignedDept = assignedDept;
    if (assignedToId) where.assignedToId = assignedToId;
    if (source && source !== "all") where.source = source;
    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { complainantName: { contains: search, mode: "insensitive" } },
        { complainantPhone: { contains: search } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
    }
    if (overdue === "true") {
      where.expectedResolutionDate = { lt: new Date() };
      where.status = {
        in: ["OPEN", "IN_PROGRESS", "ESCALATED"],
      };
    }

    const [data, total] = await Promise.all([
      prisma.grievance.findMany({
        where,
        include: {
          ward: {
            select: {
              id: true,
              name: true,
              wardNumber: true,
            },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { timeline: true, attachments: true },
          },
        },
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.grievance.count({ where }),
    ]);

    const now = new Date();
    const enriched = data.map((g) => ({
      ...g,
      isOverdue:
        !!g.expectedResolutionDate &&
        g.expectedResolutionDate < now &&
        ["OPEN", "IN_PROGRESS", "ESCALATED"].includes(g.status),
      daysSinceCreated: Math.floor(
        (now.getTime() - g.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      ),
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

export async function getGrievance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: { id: req.params.id as string },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            wardNumber: true,
            zone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        timeline: { orderBy: { createdAt: "desc" } },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!grievance) throw ApiError.notFound("Grievance not found");

    const now = new Date();
    const isOverdue =
      !!grievance.expectedResolutionDate &&
      grievance.expectedResolutionDate < now &&
      ["OPEN", "IN_PROGRESS", "ESCALATED"].includes(grievance.status);

    const daysSinceCreated = Math.floor(
      (now.getTime() - grievance.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    let resolutionDays: number | null = null;
    if (grievance.resolvedAt) {
      resolutionDays = Math.floor(
        (grievance.resolvedAt.getTime() - grievance.createdAt.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    // Fetch department name if assigned
    let departmentName: string | null = null;
    if (grievance.assignedDept) {
      const dept = await prisma.department.findUnique({
        where: { id: grievance.assignedDept },
        select: { name: true },
      });
      departmentName = dept?.name || null;
    }

    res.json({
      success: true,
      data: {
        ...grievance,
        departmentName,
        isOverdue,
        daysSinceCreated,
        resolutionDays,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGrievanceStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const wardId = req.query.wardId as string;
    const w: any = wardId ? { wardId } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      total,
      byStatus,
      byPriority,
      byCategory,
      bySource,
      byWard,
      byDept,
      overdue,
      thisMonth,
      lastMonth,
    ] = await Promise.all([
      prisma.grievance.count({ where: w }),
      prisma.grievance.groupBy({
        by: ["status"],
        where: w,
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["priority"],
        where: w,
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["category"],
        where: w,
        _count: true,
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.grievance.groupBy({
        by: ["source"],
        where: w,
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["wardId"],
        where: {
          ...w,
          status: {
            in: ["OPEN", "IN_PROGRESS", "ESCALATED"],
          },
        },
        _count: true,
        orderBy: { _count: { wardId: "desc" } },
        take: 10,
      }),
      prisma.grievance.groupBy({
        by: ["assignedDept"],
        where: {
          ...w,
          assignedDept: { not: null },
        },
        _count: true,
        orderBy: { _count: { assignedDept: "desc" } },
      }),
      prisma.grievance.count({
        where: {
          ...w,
          expectedResolutionDate: { lt: now },
          status: {
            in: ["OPEN", "IN_PROGRESS", "ESCALATED"],
          },
        },
      }),
      prisma.grievance.count({
        where: { ...w, createdAt: { gte: monthStart } },
      }),
      prisma.grievance.count({
        where: {
          ...w,
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
    ]);

    // Resolve ward names
    const wardIds = byWard.map((x) => x.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    // Resolve department names
    const deptIds = byDept
      .map((d) => d.assignedDept)
      .filter(Boolean) as string[];
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const open = sm["OPEN"] || 0;
    const inProgress = sm["IN_PROGRESS"] || 0;
    const escalated = sm["ESCALATED"] || 0;
    const resolved = sm["RESOLVED"] || 0;
    const closed = sm["CLOSED"] || 0;
    const rejected = sm["REJECTED"] || 0;
    const pending = open + inProgress + escalated;
    const resolutionRate =
      total > 0
        ? Math.round((((resolved + closed) / total) * 100 * 10) / 10)
        : 0;

    res.json({
      success: true,
      data: {
        total,
        pending,
        overdue,
        open,
        inProgress,
        escalated,
        resolved,
        closed,
        rejected,
        resolutionRate,
        thisMonth,
        lastMonth,
        monthlyChange: thisMonth - lastMonth,
        byPriority: byPriority.map((p) => ({
          priority: p.priority,
          count: p._count,
        })),
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        bySource: bySource.map((s) => ({
          source: s.source,
          count: s._count,
        })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap[w.wardId]?.name || "Unknown",
          wardNumber: wardMap[w.wardId]?.wardNumber || 0,
          count: w._count,
        })),
        byDepartment: byDept.map((d) => ({
          departmentId: d.assignedDept,
          departmentName: deptMap[d.assignedDept!]?.name || "Unassigned",
          count: d._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGrievanceAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const all = await prisma.grievance.findMany({
      where: { createdAt: { gte: start } },
      select: {
        createdAt: true,
        status: true,
        resolvedAt: true,
      },
    });

    const monthlyData: Record<string, { created: number; resolved: number }> =
      {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[key] = { created: 0, resolved: 0 };
    }

    all.forEach((g) => {
      const ck = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[ck]) monthlyData[ck].created++;
      if (g.resolvedAt) {
        const rk = `${g.resolvedAt.getFullYear()}-${String(g.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyData[rk]) monthlyData[rk].resolved++;
      }
    });

    const trend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
      }));

    res.json({ success: true, data: { trend } });
  } catch (error) {
    next(error);
  }
}
