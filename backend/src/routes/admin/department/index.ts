// import { Router } from "express";
// import prisma from "../../../lib/prisma.js";
// import { z } from "zod";
// import { requirePermission } from "../../../middleware/permission.js";
// import { validate } from "../../../middleware/validate.js";
// import { ApiError } from "../../../utils/ApiError.js";
// import {
//   createAuditLog,
//   getRequestMeta,
// } from "../../../middleware/auditLog.js";
// import catchAsync from "@/utils/catchAsync.js";

// const router = Router();

// const createSchema = z.object({
//   name: z.string().min(1),
//   code: z.string().max(20).optional(),
//   description: z.string().optional(),
//   headName: z.string().optional(),
//   headPhone: z.string().optional(),
//   headEmail: z.string().email().optional().or(z.literal("")),
//   isActive: z.boolean().default(true),
// });

// router.get(
//   "/",
//   requirePermission("departments", "read"),
//   catchAsync(async (req, res) => {
//     const departments = await prisma.department.findMany({
//       include: { _count: { select: { grievances: true } } },
//       orderBy: { name: "asc" },
//     });
//     res.json({ success: true, data: departments });
//   }),
// );

// router.post(
//   "/",
//   requirePermission("departments", "create"),
//   validate(createSchema),
//   catchAsync(async (req, res) => {
//     const data: any = { ...req.body };
//     if (data.headEmail === "") delete data.headEmail;

//     const dept = await prisma.department.create({ data });
//     await createAuditLog({
//       userId: req.user!.id,
//       action: "CREATE",
//       module: "departments",
//       recordId: dept.id,
//       description: `Created department "${dept.name}"`,
//       newData: req.body,
//       ...getRequestMeta(req),
//     });
//     res.status(201).json({ success: true, data: dept });
//   }),
// );

// router.put(
//   "/:id",
//   requirePermission("departments", "update"),
//   validate(createSchema.partial()),
//   catchAsync(async (req, res) => {
//     const old = await prisma.department.findUnique({
//       where: { id: req.params.id },
//     });
//     if (!old) throw ApiError.notFound("Department not found");

//     const data: any = { ...req.body };
//     if (data.headEmail === "") delete data.headEmail;

//     const dept = await prisma.department.update({
//       where: { id: req.params.id },
//       data,
//     });
//     res.json({ success: true, data: dept });
//   }),
// );

// router.delete(
//   "/:id",
//   requirePermission("departments", "delete"),
//   catchAsync(async (req, res) => {
//     const dept = await prisma.department.findUnique({
//       where: { id: req.params.id },
//     });
//     if (!dept) throw ApiError.notFound("Department not found");
//     await prisma.department.delete({ where: { id: req.params.id } });
//     res.json({ success: true, message: `"${dept.name}" deleted` });
//   }),
// );

// export default router;

import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(200),
  code: z.string().min(1, "Code required").max(20),
  description: z.string().optional(),
  headName: z.string().optional(),
  headPhone: z.string().optional(),
  headEmail: z.string().email().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

const updateSchema = createSchema.partial();

// ─── List ───────────────────────────────────────────────

router.get(
  "/",
  requirePermission("departments", "read"),
  catchAsync(async (req, res) => {
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
  }),
);

// ─── Stats ──────────────────────────────────────────────

router.get(
  "/stats",
  requirePermission("departments", "read"),
  catchAsync(async (_req, res) => {
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
  }),
);

// ─── Get One ────────────────────────────────────────────

router.get(
  "/:id",
  requirePermission("departments", "read"),
  catchAsync(async (req, res) => {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
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
  }),
);

// ─── Create ─────────────────────────────────────────────

router.post(
  "/",
  requirePermission("departments", "create"),
  validate(createSchema),
  catchAsync(async (req, res) => {
    const data = { ...req.body };
    if (data.headEmail === "") delete data.headEmail;

    const existing = await prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    });
    if (existing)
      throw ApiError.badRequest("Department with same name or code exists");

    const dept = await prisma.department.create({ data });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "departments",
      recordId: dept.id,
      description: `Created department "${dept.name}" (${dept.code})`,
      newData: { name: dept.name, code: dept.code },
      ...getRequestMeta(req),
    });

    res
      .status(201)
      .json({ success: true, message: `"${dept.name}" created`, data: dept });
  }),
);

// ─── Update ─────────────────────────────────────────────

router.put(
  "/:id",
  requirePermission("departments", "update"),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    const old = await prisma.department.findUnique({
      where: { id: req.params.id },
    });
    if (!old) throw ApiError.notFound("Department not found");

    const data = { ...req.body };
    if (data.headEmail === "") delete data.headEmail;

    if (data.code && data.code !== old.code) {
      const dup = await prisma.department.findFirst({
        where: { code: data.code, id: { not: old.id } },
      });
      if (dup) throw ApiError.badRequest("Code already used");
    }

    const dept = await prisma.department.update({
      where: { id: req.params.id },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "departments",
      recordId: dept.id,
      description: `Updated department "${dept.name}"`,
      oldData: { name: old.name, code: old.code, isActive: old.isActive },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `"${dept.name}" updated`, data: dept });
  }),
);

// ─── Delete ─────────────────────────────────────────────

router.delete(
  "/:id",
  requirePermission("departments", "delete"),
  catchAsync(async (req, res) => {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
    });
    if (!dept) throw ApiError.notFound("Department not found");

    // Check references
    const [gCount, pCount] = await Promise.all([
      prisma.grievance.count({ where: { assignedDept: dept.id } }),
      prisma.project.count({ where: { department: dept.id } }),
    ]);
    if (gCount > 0 || pCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete: ${gCount} grievances, ${pCount} projects reference this department. Deactivate instead.`,
      );
    }

    await prisma.department.delete({ where: { id: req.params.id } });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "departments",
      recordId: dept.id,
      description: `Deleted department "${dept.name}"`,
      ...getRequestMeta(req),
    });

    res.json({ success: true, message: `"${dept.name}" deleted` });
  }),
);

// ─── Toggle Active ──────────────────────────────────────

router.patch(
  "/:id/toggle-active",
  requirePermission("departments", "update"),
  catchAsync(async (req, res) => {
    const dept = await prisma.department.findUnique({
      where: { id: req.params.id },
    });
    if (!dept) throw ApiError.notFound("Department not found");

    const updated = await prisma.department.update({
      where: { id: req.params.id },
      data: { isActive: !dept.isActive },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "departments",
      recordId: dept.id,
      description: `${updated.isActive ? "Activated" : "Deactivated"} "${dept.name}"`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${dept.name}" ${updated.isActive ? "activated" : "deactivated"}`,
      data: updated,
    });
  }),
);

export default router;
