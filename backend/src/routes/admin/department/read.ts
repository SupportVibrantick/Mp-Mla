import prisma from "../../../lib/prisma.js";

import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/department
 * Lists all departments with optional filtering.
 */
export const getDepartments = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { search, isActive } = req.query as Record<string, string>;

  const where: any = { tenantId, isDeleted: false };
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
        tenantId,
        assignedDept: { in: deptIds },
        status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
      },
      _count: true,
    }),
    prisma.project.groupBy({
      by: ["department"],
      where: {
        tenantId,
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

/**
 * GET /api/admin/department/stats
 * Gets dashboard statistics for departments.
 */
export const getDepartmentStats = catchAsync(async (_req, res) => {
  const tenantId = requireTenantId(_req);
  const [total, active, inactive] = await Promise.all([
    prisma.department.count({ where: { tenantId, isDeleted: false } }),
    prisma.department.count({
      where: { tenantId, isActive: true, isDeleted: false },
    }),
    prisma.department.count({
      where: { tenantId, isActive: false, isDeleted: false },
    }),
  ]);

  const [totalGrievances, totalProjects] = await Promise.all([
    prisma.grievance.count({
      where: { tenantId, assignedDept: { not: null } },
    }),
    prisma.project.count({
      where: { tenantId, department: { not: "" } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      inactive,
      totalGrievances,
      totalProjects,
      totalActiveGrievances: totalGrievances, // fallback if needed
      totalActiveProjects: totalProjects, // fallback
    },
  });
});

/**
 * GET /api/admin/department/:id
 * Gets a single department with its recent activities.
 */
export const getSingleDepartment = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const dept = await prisma.department.findFirst({
    where: { id: req.params.id as string, tenantId, isDeleted: false },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  const [grievances, projects] = await Promise.all([
    prisma.grievance.findMany({
      where: { tenantId, assignedDept: dept.id },
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
      where: { tenantId, department: dept.id },
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
