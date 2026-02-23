import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import { buildPagination, parsePagination } from "../../../utils/helpers.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

const createSchemeSchema = z.object({
  name: z.string().min(1, "Name required"),
  department: z.string().min(1, "Department required"),
  level: z.enum(["Central", "State", "Local"]).default("Central"),
  description: z.string().optional(),
  eligibility: z.string().optional(),
  benefits: z.string().optional(),
  applicationUrl: z.string().url().optional().or(z.literal("")),
  budget: z.number().min(0).default(0),
  status: z
    .enum(["ACTIVE", "EXPIRED", "UPCOMING", "SUSPENDED"])
    .default("ACTIVE"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const updateSchemeSchema = createSchemeSchema.partial();

const beneficiarySchema = z.object({
  wardId: z.string().min(1, "Ward required"),
  beneficiaryCount: z.number().int().min(0).default(0),
  targetCount: z.number().int().min(0).default(0),
  amountDisbursed: z.number().min(0).default(0),
  reportDate: z.string().datetime().optional(),
});

const bulkBeneficiarySchema = z.object({
  entries: z.array(beneficiarySchema),
});

// ─── List Schemes ───────────────────────────────────────

router.get(
  "/",
  requirePermission("schemes", "read"),
  catchAsync(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, level, department, search } = req.query as Record<
      string,
      string
    >;

    const where: any = {};
    if (status && status !== "all") where.status = status;
    if (level && level !== "all") where.level = level;
    if (department && department !== "all") where.department = department;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.scheme.findMany({
        where,
        include: {
          beneficiaries: {
            select: {
              beneficiaryCount: true,
              targetCount: true,
              amountDisbursed: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.scheme.count({ where }),
    ]);

    // Resolve department names
    const deptIds = [...new Set(data.map((s) => s.department))];
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));

    const enriched = data.map((s) => {
      const totalBeneficiaries = s.beneficiaries.reduce(
        (sum, b) => sum + b.beneficiaryCount,
        0,
      );
      const totalTarget = s.beneficiaries.reduce(
        (sum, b) => sum + b.targetCount,
        0,
      );
      const totalDisbursed = s.beneficiaries.reduce(
        (sum, b) => sum + b.amountDisbursed,
        0,
      );
      const coverage =
        totalTarget > 0
          ? Math.round((totalBeneficiaries / totalTarget) * 100)
          : 0;

      return {
        ...s,
        beneficiaries: undefined,
        departmentName: deptMap[s.department] || s.department,
        totalBeneficiaries,
        totalTarget,
        totalDisbursed,
        coverage,
        wardCount: s.beneficiaries.length,
      };
    });

    res.json({
      success: true,
      data: enriched,
      pagination: buildPagination(total, page, limit),
    });
  }),
);

// ─── Scheme Stats ───────────────────────────────────────

router.get(
  "/stats",
  requirePermission("schemes", "read"),
  catchAsync(async (req, res) => {
    const [total, byStatus, byLevel, beneficiaryAgg, topSchemes] =
      await Promise.all([
        prisma.scheme.count(),
        prisma.scheme.groupBy({
          by: ["status"],
          _count: true,
        }),
        prisma.scheme.groupBy({
          by: ["level"],
          _count: true,
          _sum: { budget: true },
        }),
        prisma.schemeBeneficiary.aggregate({
          _sum: {
            beneficiaryCount: true,
            targetCount: true,
            amountDisbursed: true,
          },
        }),
        prisma.scheme.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            budget: true,
            beneficiaries: {
              select: {
                beneficiaryCount: true,
                amountDisbursed: true,
              },
            },
          },
          orderBy: { budget: "desc" },
          take: 5,
        }),
      ]);

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const totalBudget = byLevel.reduce((s, l) => s + (l._sum.budget || 0), 0);

    const topEnriched = topSchemes.map((s) => ({
      id: s.id,
      name: s.name,
      budget: s.budget,
      beneficiaries: s.beneficiaries.reduce(
        (sum, b) => sum + b.beneficiaryCount,
        0,
      ),
      disbursed: s.beneficiaries.reduce((sum, b) => sum + b.amountDisbursed, 0),
    }));

    res.json({
      success: true,
      data: {
        total,
        active: sm["ACTIVE"] || 0,
        expired: sm["EXPIRED"] || 0,
        upcoming: sm["UPCOMING"] || 0,
        suspended: sm["SUSPENDED"] || 0,
        totalBudget,
        totalBeneficiaries: beneficiaryAgg._sum.beneficiaryCount || 0,
        totalTarget: beneficiaryAgg._sum.targetCount || 0,
        totalDisbursed: beneficiaryAgg._sum.amountDisbursed || 0,
        overallCoverage:
          (beneficiaryAgg._sum.targetCount || 0) > 0
            ? Math.round(
                ((beneficiaryAgg._sum.beneficiaryCount || 0) /
                  (beneficiaryAgg._sum.targetCount || 1)) *
                  100,
              )
            : 0,
        byLevel: byLevel.map((l) => ({
          level: l.level,
          count: l._count,
          budget: l._sum.budget || 0,
        })),
        topSchemes: topEnriched,
      },
    });
  }),
);

// ─── Get Single Scheme ──────────────────────────────────

router.get(
  "/:id",
  requirePermission("schemes", "read"),
  catchAsync(async (req, res) => {
    const schemeId = req.params.id as string;
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
      include: {
        beneficiaries: {
          include: {
            ward: {
              select: {
                id: true,
                name: true,
                wardNumber: true,
              },
            },
          },
          orderBy: { ward: { wardNumber: "asc" } },
        },
      },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    let departmentName = scheme.department;
    const dept = await prisma.department.findUnique({
      where: { id: scheme.department },
      select: { name: true, code: true },
    });
    if (dept) departmentName = `${dept.name} (${dept.code})`;

    const totalBeneficiaries = scheme.beneficiaries.reduce(
      (s, b) => s + b.beneficiaryCount,
      0,
    );
    const totalTarget = scheme.beneficiaries.reduce(
      (s, b) => s + b.targetCount,
      0,
    );
    const totalDisbursed = scheme.beneficiaries.reduce(
      (s, b) => s + b.amountDisbursed,
      0,
    );
    const coverage =
      totalTarget > 0
        ? Math.round((totalBeneficiaries / totalTarget) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        ...scheme,
        departmentName,
        totalBeneficiaries,
        totalTarget,
        totalDisbursed,
        coverage,
      },
    });
  }),
);

// ─── Create Scheme ──────────────────────────────────────

router.post(
  "/",
  requirePermission("schemes", "create"),
  validate(createSchemeSchema),
  catchAsync(async (req, res) => {
    const data: any = { ...req.body };
    if (data.applicationUrl === "") delete data.applicationUrl;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const scheme = await prisma.scheme.create({ data });

    await createAuditLog({
      userId: req.user!.id,
      action: "CREATE",
      module: "schemes",
      recordId: scheme.id,
      description: `Created scheme "${scheme.name}" (${scheme.level})`,
      newData: {
        name: scheme.name,
        level: scheme.level,
        budget: scheme.budget,
      },
      ...getRequestMeta(req),
    });

    res.status(201).json({
      success: true,
      message: `"${scheme.name}" created`,
      data: scheme,
    });
  }),
);

// ─── Update Scheme ──────────────────────────────────────

router.put(
  "/:id",
  requirePermission("schemes", "update"),
  validate(updateSchemeSchema),
  catchAsync(async (req, res) => {
    const schemeId = req.params.id as string;

    const old = await prisma.scheme.findUnique({
      where: { id: schemeId },
    });
    if (!old) throw ApiError.notFound("Scheme not found");

    const data: any = { ...req.body };
    if (data.applicationUrl === "") delete data.applicationUrl;
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const scheme = await prisma.scheme.update({
      where: { id: schemeId },
      data,
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: scheme.id,
      description: `Updated scheme "${scheme.name}"`,
      oldData: {
        name: old.name,
        status: old.status,
        budget: old.budget,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${scheme.name}" updated`,
      data: scheme,
    });
  }),
);

// ─── Delete Scheme ──────────────────────────────────────

router.delete(
  "/:id",
  requirePermission("schemes", "delete"),
  catchAsync(async (req, res) => {
    const schemeId = req.params.id as string;
    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    await prisma.scheme.delete({
      where: { id: schemeId },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "schemes",
      recordId: scheme.id,
      description: `Deleted scheme "${scheme.name}"`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `"${scheme.name}" deleted`,
    });
  }),
);

// ─── Upsert Beneficiary (single ward) ──────────────────

router.post(
  "/:id/beneficiaries",
  requirePermission("schemes", "update"),
  validate(beneficiarySchema),
  catchAsync(async (req, res) => {
    const schemeId = req.params.id as string;

    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    const {
      wardId,
      beneficiaryCount,
      targetCount,
      amountDisbursed,
      reportDate,
    } = req.body;

    const ward = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!ward) throw ApiError.notFound("Ward not found");

    const beneficiary = await prisma.schemeBeneficiary.upsert({
      where: {
        schemeId_wardId: { schemeId: scheme.id, wardId },
      },
      update: {
        beneficiaryCount,
        targetCount,
        amountDisbursed,
        reportDate: reportDate ? new Date(reportDate) : new Date(),
      },
      create: {
        schemeId: scheme.id,
        wardId,
        beneficiaryCount,
        targetCount,
        amountDisbursed,
        reportDate: reportDate ? new Date(reportDate) : new Date(),
      },
      include: {
        ward: {
          select: { name: true, wardNumber: true },
        },
      },
    });

    res.json({
      success: true,
      message: `Beneficiary data updated for Ward #${ward.wardNumber}`,
      data: beneficiary,
    });
  }),
);

// ─── Bulk Update Beneficiaries ──────────────────────────

router.post(
  "/:id/beneficiaries/bulk",
  requirePermission("schemes", "update"),
  validate(bulkBeneficiarySchema),
  catchAsync(async (req, res) => {
    const schemeId = req.params.id as string;

    const scheme = await prisma.scheme.findUnique({
      where: { id: schemeId },
    });
    if (!scheme) throw ApiError.notFound("Scheme not found");

    const results = [];
    for (const entry of req.body.entries) {
      const b = await prisma.schemeBeneficiary.upsert({
        where: {
          schemeId_wardId: {
            schemeId: scheme.id,
            wardId: entry.wardId,
          },
        },
        update: {
          beneficiaryCount: entry.beneficiaryCount,
          targetCount: entry.targetCount,
          amountDisbursed: entry.amountDisbursed,
          reportDate: entry.reportDate
            ? new Date(entry.reportDate)
            : new Date(),
        },
        create: {
          schemeId: scheme.id,
          wardId: entry.wardId,
          beneficiaryCount: entry.beneficiaryCount,
          targetCount: entry.targetCount,
          amountDisbursed: entry.amountDisbursed,
          reportDate: entry.reportDate
            ? new Date(entry.reportDate)
            : new Date(),
        },
      });
      results.push(b);
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "UPDATE",
      module: "schemes",
      recordId: scheme.id,
      description: `Bulk updated beneficiaries for "${scheme.name}" (${results.length} wards)`,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Updated ${results.length} ward entries`,
      data: results,
    });
  }),
);

// ─── Delete Beneficiary ─────────────────────────────────

router.delete(
  "/:id/beneficiaries/:beneficiaryId",
  requirePermission("schemes", "delete"),
  catchAsync(async (req, res) => {
    await prisma.schemeBeneficiary.delete({
      where: { id: req.params.beneficiaryId as string },
    });
    res.json({
      success: true,
      message: "Beneficiary entry removed",
    });
  }),
);

export default router;
