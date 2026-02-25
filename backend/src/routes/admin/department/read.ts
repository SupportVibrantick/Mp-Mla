import prisma from "../../../lib/prisma.js";

import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── List ───────────────────────────────────────────────

export const getDepartments = catchAsync(async (req, res) => {
  const { search, isActive } = req.query as Record<string, string>;

  const where: any = {};
  if (isActive !== undefined && isActive !== "all")
    where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { headName: { contains: search, mode: "insensitive" } },
    ];
  }

  const data = await prisma.department.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Count grievances and projects per department
  const deptIds = data.map((d) => d.id);

  const [grievanceCounts, projectCounts] = await Promise.all([
    prisma.grievance.groupBy({
      by: ["assignedDept"],
      where: {
        assignedDept: { in: deptIds },
        status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
      },
      _count: true,
    }),
    prisma.project.groupBy({
      by: ["department"],
      where: {
        department: { in: deptIds },
        status: { in: ["PENDING", "RUNNING"] },
      },
      _count: true,
    }),
  ]);

  const gMap = Object.fromEntries(
    grievanceCounts.map((g) => [g.assignedDept, g._count]),
  );
  const pMap = Object.fromEntries(
    projectCounts.map((p) => [p.department, p._count]),
  );

  const enriched = data.map((d) => ({
    ...d,
    activeGrievances: gMap[d.id] || 0,
    activeProjects: pMap[d.id] || 0,
  }));

  res.json({ success: true, data: enriched });
});

// ─── Stats ──────────────────────────────────────────────

export const getDepartmentStats = catchAsync(async (_req, res) => {
  const [total, active, inactive] = await Promise.all([
    prisma.department.count(),
    prisma.department.count({ where: { isActive: true } }),
    prisma.department.count({ where: { isActive: false } }),
  ]);

  const totalActiveGrievances = await prisma.grievance.count({
    where: {
      assignedDept: { not: null },
      status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
    },
  });

  const totalActiveProjects = await prisma.project.count({
    where: {
      department: { not: "" },
      status: { in: ["PENDING", "RUNNING"] },
    },
  });

  res.json({
    success: true,
    data: {
      total,
      active,
      inactive,
      totalActiveGrievances,
      totalActiveProjects,
    },
  });
});

// ─── Get One ────────────────────────────────────────────

export const getSingleDepartment = catchAsync(async (req, res) => {
  const dept = await prisma.department.findUnique({
    where: { id: req.params.id as string },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  const [grievances, projects] = await Promise.all([
    prisma.grievance.findMany({
      where: { assignedDept: dept.id },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        ward: { select: { name: true, wardNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.project.findMany({
      where: { department: dept.id },
      select: {
        id: true,
        projectCode: true,
        name: true,
        status: true,
        completionPercent: true,
        budgetSanctioned: true,
        ward: { select: { name: true, wardNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  res.json({ success: true, data: { ...dept, grievances, projects } });
});
