import prisma from "../../../lib/prisma.js";

import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * GET /api/admin/department
 * Lists all departments with optional filtering.
 */
export const getDepartments = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { page, limit, skip } = parsePagination(req.query);
  const { search, isActive, sortBy, sortOrder } = req.query as Record<
    string,
    string
  >;

  const where: any = { tenantId, isDeleted: false };
  if (isActive !== undefined && isActive !== "all")
    where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
      { headName: { contains: search, mode: "insensitive" } },
      { headEmail: { contains: search, mode: "insensitive" } },
      { headPhone: { contains: search } },
    ];
  }

  // Validate sort fields to prevent injection
  const allowedSortFields = [
    "name",
    "code",
    "createdAt",
    "updatedAt",
    "isActive",
  ];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "name";
  const sortDir = sortOrder === "desc" ? "desc" : "asc";

  const [data, total] = await Promise.all([
    prisma.department.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: limit,
    }),
    prisma.department.count({ where }),
  ]);

  // Count grievances and projects per department
  const deptIds = data.map((d) => d.id);

  const [grievanceCounts, projectCounts, userCounts, taskCounts] =
    await Promise.all([
      prisma.grievance.groupBy({
        by: ["departmentId"],
        where: {
          tenantId,
          departmentId: { in: deptIds },
          isDeleted: false,
          status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
        },
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["departmentId"],
        where: {
          tenantId,
          departmentId: { in: deptIds },
          isDeleted: false,
          status: { in: ["PENDING", "RUNNING"] },
        },
        _count: true,
      }),
      prisma.user.groupBy({
        by: ["departmentId"],
        where: {
          tenantId,
          departmentId: { in: deptIds },
          status: "ACTIVE",
        },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["departmentId"],
        where: {
          tenantId,
          departmentId: { in: deptIds },
          isDeleted: false,
          status: { in: ["TODO", "IN_PROGRESS"] },
        },
        _count: true,
      }),
    ]);

  const gMap = Object.fromEntries(
    grievanceCounts.map((g) => [g.departmentId, g._count]),
  );
  const pMap = Object.fromEntries(
    projectCounts.map((p) => [p.departmentId, p._count]),
  );
  const uMap = Object.fromEntries(
    userCounts.map((u) => [u.departmentId, u._count]),
  );
  const tMap = Object.fromEntries(
    taskCounts.map((t) => [t.departmentId, t._count]),
  );

  const enriched = data.map((d) => ({
    ...d,
    activeGrievances: gMap[d.id] || 0,
    activeProjects: pMap[d.id] || 0,
    activeUsers: uMap[d.id] || 0,
    activeTasks: tMap[d.id] || 0,
  }));

  res.json({
    success: true,
    data: enriched,
    pagination: buildPagination(total, page, limit),
  });
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
      where: { tenantId, departmentId: { not: null }, isDeleted: false },
    }),
    prisma.project.count({
      where: { tenantId, departmentId: { not: null }, isDeleted: false },
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
    where: {
      id: req.params.id as string,
      tenantId,
      isDeleted: false,
    },
  });

  if (!dept) {
    throw ApiError.notFound("Department not found");
  }

  const [grievances, projects, users, tasks, slas] = await Promise.all([
    prisma.grievance.findMany({
      where: {
        tenantId,
        departmentId: dept.id,
        isDeleted: false,
      },
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        ward: {
          select: {
            name: true,
            wardNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    prisma.project.findMany({
      where: {
        tenantId,
        departmentId: dept.id,
        isDeleted: false,
      },
      select: {
        id: true,
        projectCode: true,
        name: true,
        status: true,
        completionPercent: true,
        budgetSanctioned: true,
        ward: {
          select: {
            name: true,
            wardNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    prisma.user.findMany({
      where: {
        tenantId,
        departmentRef: {
          id: dept.id,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        designation: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 10,
    }),

    prisma.task.findMany({
      where: {
        tenantId,
        departmentId: dept.id,
        isDeleted: false,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),

    prisma.departmentSLA.findMany({
      where: {
        tenantId,
        departmentId: dept.id,
      },
      orderBy: {
        priority: "asc",
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      ...dept,
      grievances,
      projects,
      users,
      tasks,
      slas,
    },
  });
});

export const getDepartmentUsers = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  await assertDepartmentExists(tenantId, departmentId);

  const { page, limit, skip } = parsePagination(req.query);
  const { status, role, search } = req.query as Record<string, string>;
  const where: any = { tenantId, departmentId};
  if (status && status !== "all") where.status = status;
  if (role && role !== "all") where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        designation: true,
        departmentId: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    success: true,
    data,
    pagination: buildPagination(total, page, limit),
  });
});

export const getDepartmentGrievances = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  await assertDepartmentExists(tenantId, departmentId);

  const { page, limit, skip } = parsePagination(req.query);
  const { status, priority, assignedToId, dateFrom, dateTo, search, overdue } =
    req.query as Record<string, string>;
  const where: any = { tenantId, departmentId, isDeleted: false };
  if (status && status !== "all") where.status = status;
  if (overdue === "true") {
    if (!where.status) {
      where.status = { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] };
    }
    where.expectedResolutionDate = { lt: new Date() };
  }
  if (priority && priority !== "all") where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
  }
  if (search) {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { subject: { contains: search, mode: "insensitive" } },
      { complainantName: { contains: search, mode: "insensitive" } },
      { complainantPhone: { contains: search } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.grievance.findMany({
      where,
      include: {
        ward: { select: { id: true, name: true, wardNumber: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.grievance.count({ where }),
  ]);

  res.json({
    success: true,
    data,
    pagination: buildPagination(total, page, limit),
  });
});

export const getDepartmentTasks = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  await assertDepartmentExists(tenantId, departmentId);

  const { page, limit, skip } = parsePagination(req.query);
  const {
    status,
    priority,
    assignedToId,
    dueDateFrom,
    dueDateTo,
    search,
    overdue,
  } = req.query as Record<string, string>;
  const where: any = { tenantId, departmentId, isDeleted: false };
  if (status && status !== "all") where.status = status;
  if (overdue === "true") {
    if (!where.status) {
      where.status = { notIn: ["COMPLETED", "CANCELLED"] };
    }
    where.dueDate = { lt: new Date() };
  }
  if (priority && priority !== "all") where.priority = priority;
  if (assignedToId) where.assignedToId = assignedToId;
  if (dueDateFrom || dueDateTo) {
    where.dueDate = {};
    if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
    if (dueDateTo) where.dueDate.lte = new Date(dueDateTo + "T23:59:59Z");
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  res.json({
    success: true,
    data,
    pagination: buildPagination(total, page, limit),
  });
});

export const getDepartmentSlas = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  await assertDepartmentExists(tenantId, departmentId);

  const data = await prisma.departmentSLA.findMany({
    where: { tenantId, departmentId },
    orderBy: { priority: "asc" },
  });

  res.json({ success: true, data });
});

export const getSingleDepartmentStats = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  await assertDepartmentExists(tenantId, departmentId);

  const now = new Date();
  const slas = await prisma.departmentSLA.findMany({
    where: { tenantId, departmentId, isActive: true },
    select: { priority: true, slaHours: true },
  });
  const slaMap = Object.fromEntries(
    slas.map((sla) => [sla.priority, sla.slaHours]),
  );

  const [
    totalUsers,
    totalGrievances,
    grievances,
    totalTasks,
    completedTasks,
    overdueTasks,
    pendingTasks,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId, departmentId, status: "ACTIVE" } }),
    prisma.grievance.count({
      where: { tenantId, departmentId, isDeleted: false },
    }),
    prisma.grievance.findMany({
      where: {
        tenantId,
        departmentId,
        isDeleted: false,
      },
      select: {
        createdAt: true,
        resolvedAt: true,
        closedAt: true,
        expectedResolutionDate: true,
        status: true,
        priority: true,
      },
    }),
    prisma.task.count({
      where: { tenantId, departmentId, isDeleted: false },
    }),
    prisma.task.count({
      where: { tenantId, departmentId, status: "COMPLETED", isDeleted: false },
    }),
    prisma.task.count({
      where: {
        tenantId,
        departmentId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        dueDate: { lt: now },
        isDeleted: false,
      },
    }),
    prisma.task.count({
      where: {
        tenantId,
        departmentId,
        status: { in: ["TODO", "IN_PROGRESS"] },
        isDeleted: false,
      },
    }),
  ]);

  let openGrievances = 0;
  let inProgressGrievances = 0;
  let resolvedGrievances = 0;
  let closedGrievances = 0;
  let escalatedGrievances = 0;
  let overdueGrievances = 0;
  let slaBreaches = 0;
  let slaMet = 0;
  let totalWithSla = 0;

  const resolvedGrievancesList: any[] = [];

  for (const g of grievances) {
    if (g.status === "OPEN") openGrievances++;
    else if (g.status === "IN_PROGRESS") inProgressGrievances++;
    else if (g.status === "RESOLVED") resolvedGrievances++;
    else if (g.status === "CLOSED") closedGrievances++;
    else if (g.status === "ESCALATED") escalatedGrievances++;

    const resolvedOrClosedAt = g.resolvedAt || g.closedAt;
    if (resolvedOrClosedAt) {
      resolvedGrievancesList.push(g);
    }

    // Determine expected resolution date (stored or computed from SLA)
    let expectedDate = g.expectedResolutionDate
      ? new Date(g.expectedResolutionDate)
      : null;
    if (!expectedDate) {
      const slaHours = slaMap[g.priority];
      if (slaHours) {
        expectedDate = new Date(g.createdAt);
        expectedDate.setHours(expectedDate.getHours() + slaHours);
      }
    }

    if (expectedDate) {
      totalWithSla++;
      const isBreached = resolvedOrClosedAt
        ? new Date(resolvedOrClosedAt) > expectedDate
        : now > expectedDate;

      if (isBreached) {
        slaBreaches++;
        if (!resolvedOrClosedAt) {
          overdueGrievances++;
        }
      } else {
        slaMet++;
      }
    }
  }

  const resolutionRate =
    totalGrievances > 0
      ? Math.round(
          ((resolvedGrievances + closedGrievances) / totalGrievances) * 100,
        )
      : 0;

  const slaCompliancePercent =
    totalWithSla > 0 ? Math.round((slaMet / totalWithSla) * 100) : 100;

  const totalResolutionMs = resolvedGrievancesList.reduce((sum, g) => {
    const resolvedOrClosedAt = g.resolvedAt || g.closedAt;
    if (!resolvedOrClosedAt) return sum;
    return (
      sum +
      (new Date(resolvedOrClosedAt).getTime() - new Date(g.createdAt).getTime())
    );
  }, 0);

  const averageResolutionHours =
    resolvedGrievancesList.length > 0
      ? Math.round(
          totalResolutionMs / resolvedGrievancesList.length / (60 * 60 * 1000),
        )
      : 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      totalGrievances,
      openGrievances,
      inProgressGrievances,
      resolvedGrievances,
      closedGrievances,
      escalatedGrievances,
      overdueGrievances,
      resolutionRate,
      averageResolutionHours,
      totalTasks,
      pendingTasks,
      completedTasks,
      overdueTasks,
      slaBreaches,
      slaCompliancePercent,
      slaConfigured: slas.length,
    },
  });
});

async function assertDepartmentExists(tenantId: string, departmentId: string) {
  const department = await prisma.department.findFirst({
    where: { tenantId, id: departmentId, isDeleted: false },
    select: { id: true },
  });
  if (!department) throw ApiError.notFound("Department not found");
  return department;
}
