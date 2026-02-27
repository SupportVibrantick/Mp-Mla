import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

// ─── Shared filter parsing ──────────────────────────────

function parseDateFilters(query: Record<string, any>) {
  const { dateFrom, dateTo, wardId } = query;
  const where: any = {};
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
    if (dateTo)
      where.createdAt.lte = new Date((dateTo as string) + "T23:59:59Z");
  }
  return { where, wardId: wardId as string | undefined };
}

function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 3
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

// ════════════════════════════════════════════════════════
// GRIEVANCE REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/grievance",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const { where, wardId } = parseDateFilters(req.query);
    const w: any = { ...where };
    if (wardId) w.wardId = wardId;

    const [
      total,
      byStatus,
      byPriority,
      byCategory,
      bySource,
      byWard,
      overdue,
      rows,
    ] = await Promise.all([
      prisma.grievance.count({ where: w }),
      prisma.grievance.groupBy({ by: ["status"], where: w, _count: true }),
      prisma.grievance.groupBy({ by: ["priority"], where: w, _count: true }),
      prisma.grievance.groupBy({
        by: ["category"],
        where: w,
        _count: true,
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.grievance.groupBy({ by: ["source"], where: w, _count: true }),
      prisma.grievance.groupBy({
        by: ["wardId"],
        where: w,
        _count: true,
        orderBy: { _count: { wardId: "desc" } },
      }),
      prisma.grievance.count({
        where: {
          ...w,
          expectedResolutionDate: { lt: new Date() },
          status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
        },
      }),
      prisma.grievance.findMany({
        where: w,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          source: true,
          complainantName: true,
          complainantPhone: true,
          createdAt: true,
          resolvedAt: true,
          expectedResolutionDate: true,
          ward: { select: { name: true, wardNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    // Resolve ward names
    const wardIds = byWard.map((x) => x.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds } },
      select: { id: true, name: true, wardNumber: true },
    });
    const wardMap = Object.fromEntries(wards.map((w) => [w.id, w]));

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
    const openCount =
      (sm["OPEN"] || 0) + (sm["IN_PROGRESS"] || 0) + (sm["ESCALATED"] || 0);
    const resolvedCount = (sm["RESOLVED"] || 0) + (sm["CLOSED"] || 0);

    // Monthly trend (last 6 months)
    const sixAgo = new Date();
    sixAgo.setMonth(sixAgo.getMonth() - 5);
    sixAgo.setDate(1);
    const trendRows = await prisma.grievance.findMany({
      where: { ...w, createdAt: { gte: sixAgo } },
      select: { createdAt: true, resolvedAt: true },
    });
    const monthly: Record<string, { filed: number; resolved: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      monthly[
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      ] = { filed: 0, resolved: 0 };
    }
    trendRows.forEach((g) => {
      const ck = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthly[ck]) monthly[ck].filed++;
      if (g.resolvedAt) {
        const rk = `${g.resolvedAt.getFullYear()}-${String(g.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
        if (monthly[rk]) monthly[rk].resolved++;
      }
    });
    const trend = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, ...d }));

    res.json({
      success: true,
      data: {
        summary: {
          total,
          open: openCount,
          resolved: resolvedCount,
          overdue,
          resolutionRate:
            total > 0 ? Math.round((resolvedCount / total) * 100) : 0,
        },
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        byPriority: byPriority.map((p) => ({
          priority: p.priority,
          count: p._count,
        })),
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        bySource: bySource.map((s) => ({ source: s.source, count: s._count })),
        byWard: byWard.map((w) => ({
          wardId: w.wardId,
          wardName: wardMap[w.wardId]?.name || "Unknown",
          wardNumber: wardMap[w.wardId]?.wardNumber || 0,
          count: w._count,
        })),
        trend,
        rows,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// PROJECT REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/project",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const { wardId } = req.query as Record<string, string>;
    const w: any = {};
    if (wardId) w.wardId = wardId;

    const [total, byStatus, budgetAgg, byCategory, byFund, rows] =
      await Promise.all([
        prisma.project.count({ where: w }),
        prisma.project.groupBy({
          by: ["status"],
          where: w,
          _count: true,
          _sum: { budgetSanctioned: true, budgetUsed: true },
        }),
        prisma.project.aggregate({
          where: w,
          _sum: {
            budgetSanctioned: true,
            budgetReleased: true,
            budgetUsed: true,
          },
          _avg: { completionPercent: true },
        }),
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
        prisma.project.findMany({
          where: w,
          select: {
            id: true,
            projectCode: true,
            name: true,
            category: true,
            status: true,
            completionPercent: true,
            budgetSanctioned: true,
            budgetReleased: true,
            budgetUsed: true,
            fundType: true,
            contractor: true,
            startDate: true,
            expectedEndDate: true,
            actualEndDate: true,
            department: true,
            ward: { select: { name: true, wardNumber: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 500,
        }),
      ]);

    // Resolve department names
    const deptIds = [...new Set(rows.map((r) => r.department).filter(Boolean))];
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));
    const rowsEnriched = rows.map((r) => ({
      ...r,
      departmentName: deptMap[r.department] || r.department,
    }));

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    res.json({
      success: true,
      data: {
        summary: {
          total,
          running: sm["RUNNING"] || 0,
          completed: sm["COMPLETED"] || 0,
          pending: sm["PENDING"] || 0,
          onHold: sm["ON_HOLD"] || 0,
          totalBudget: budgetAgg._sum.budgetSanctioned || 0,
          totalReleased: budgetAgg._sum.budgetReleased || 0,
          totalUsed: budgetAgg._sum.budgetUsed || 0,
          avgCompletion: Math.round(budgetAgg._avg.completionPercent || 0),
        },
        byStatus: byStatus.map((s) => ({
          status: s.status,
          count: s._count,
          budget: s._sum.budgetSanctioned || 0,
        })),
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
        rows: rowsEnriched,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// WARD PERFORMANCE REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/ward",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const wards = await prisma.ward.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        wardNumber: true,
        zone: true,
        totalPopulation: true,
        totalHouseholds: true,
        areaType: true,
      },
      orderBy: { wardNumber: "asc" },
    });

    const wardIds = wards.map((w) => w.id);

    const [gCounts, pCounts, iCounts, sCounts] = await Promise.all([
      prisma.grievance.groupBy({
        by: ["wardId"],
        where: { wardId: { in: wardIds } },
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["wardId"],
        where: { wardId: { in: wardIds } },
        _count: true,
        _sum: { budgetSanctioned: true },
      }),
      prisma.institution.groupBy({
        by: ["wardId"],
        where: { wardId: { in: wardIds } },
        _count: true,
      }),
      prisma.schemeBeneficiary.groupBy({
        by: ["wardId"],
        where: { wardId: { in: wardIds } },
        _sum: { beneficiaryCount: true, targetCount: true },
      }),
    ]);

    const gMap = Object.fromEntries(gCounts.map((g) => [g.wardId, g._count]));
    const pMap = Object.fromEntries(
      pCounts.map((p) => [
        p.wardId,
        { count: p._count, budget: p._sum.budgetSanctioned || 0 },
      ]),
    );
    const iMap = Object.fromEntries(iCounts.map((i) => [i.wardId, i._count]));
    const sMap = Object.fromEntries(
      sCounts.map((s) => [
        s.wardId,
        {
          beneficiaries: s._sum.beneficiaryCount || 0,
          target: s._sum.targetCount || 0,
        },
      ]),
    );

    const wardData = wards.map((w) => ({
      ...w,
      grievances: gMap[w.id] || 0,
      projects: pMap[w.id]?.count || 0,
      projectBudget: pMap[w.id]?.budget || 0,
      institutions: iMap[w.id] || 0,
      beneficiaries: sMap[w.id]?.beneficiaries || 0,
      schemeTarget: sMap[w.id]?.target || 0,
    }));

    const totals = {
      population: wardData.reduce((s, w) => s + w.totalPopulation, 0),
      households: wardData.reduce((s, w) => s + w.totalHouseholds, 0),
      grievances: wardData.reduce((s, w) => s + w.grievances, 0),
      projects: wardData.reduce((s, w) => s + w.projects, 0),
      institutions: wardData.reduce((s, w) => s + w.institutions, 0),
      budget: wardData.reduce((s, w) => s + w.projectBudget, 0),
    };

    res.json({ success: true, data: { wards: wardData, totals } });
  }),
);

// ════════════════════════════════════════════════════════
// SCHEME COVERAGE REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/scheme",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const { wardId } = req.query as Record<string, string>;

    const schemeWhere: any = {};

    // Filter schemes that HAVE beneficiaries in that ward
    if (wardId && wardId !== "all") {
      schemeWhere.beneficiaries = {
        some: { wardId },
      };
    }

    const schemes = await prisma.scheme.findMany({
      where: schemeWhere,
      include: {
        beneficiaries: {
          ...(wardId && wardId !== "all"
            ? { where: { wardId } }
            : {}),
          include: {
            ward: { select: { name: true, wardNumber: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const deptIds = [...new Set(schemes.map((s) => s.department))];

    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });

    const deptMap = Object.fromEntries(
      depts.map((d) => [d.id, d.name]),
    );

    const rows = schemes.map((s) => {
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
        id: s.id,
        name: s.name,
        department: deptMap[s.department] || s.department,
        level: s.level,
        status: s.status,
        budget: s.budget,
        totalBeneficiaries,
        totalTarget,
        totalDisbursed,
        coverage,
        wardCount: s.beneficiaries.length,
        beneficiaries: s.beneficiaries,
      };
    });

    const totals = {
      schemes: rows.length,
      active: rows.filter((r) => r.status === "ACTIVE").length,
      budget: rows.reduce((s, r) => s + r.budget, 0),
      beneficiaries: rows.reduce((s, r) => s + r.totalBeneficiaries, 0),
      target: rows.reduce((s, r) => s + r.totalTarget, 0),
      disbursed: rows.reduce((s, r) => s + r.totalDisbursed, 0),
      overallCoverage: (() => {
        const t = rows.reduce((s, r) => s + r.totalTarget, 0);
        const b = rows.reduce((s, r) => s + r.totalBeneficiaries, 0);
        return t > 0 ? Math.round((b / t) * 100) : 0;
      })(),
    };

    res.json({ success: true, data: { rows, totals } });
  }),
);

// ════════════════════════════════════════════════════════
// INSTITUTION REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/institution",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const { wardId } = req.query as Record<string, string>;
    const w: any = {};
    if (wardId) w.wardId = wardId;

    const [total, byCategory, byStatus, rows] = await Promise.all([
      prisma.institution.count({ where: w }),
      prisma.institution.groupBy({
        by: ["category"],
        where: w,
        _count: true,
        orderBy: { _count: { category: "desc" } },
      }),
      prisma.institution.groupBy({ by: ["status"], where: w, _count: true }),
      prisma.institution.findMany({
        where: w,
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          address: true,
          contactNo: true,
          capacity: true,
          establishedDate: true,
          ward: { select: { name: true, wardNumber: true } },
          _count: { select: { incharges: true } },
        },
        orderBy: { name: "asc" },
        take: 500,
      }),
    ]);

    const sm = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    res.json({
      success: true,
      data: {
        summary: {
          total,
          active: sm["ACTIVE"] || 0,
          underMaintenance: sm["UNDER_MAINTENANCE"] || 0,
          categories: byCategory.length,
        },
        byCategory: byCategory.map((c) => ({
          category: c.category,
          count: c._count,
        })),
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
        rows,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// DEMOGRAPHIC REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/demographic",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const wards = await prisma.ward.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        wardNumber: true,
        zone: true,
        totalPopulation: true,
        totalHouseholds: true,
        totalMale: true,
        totalFemale: true,
        areaType: true,
      },
      orderBy: { wardNumber: "asc" },
    });

    const demographics = await prisma.demographics.findMany({
      select: {
        wardId: true,
        totalPopulation: true,
        maleCount: true,
        femaleCount: true,
        totalVoters: true,
        totalHouseholds: true,
        bplHouseholds: true,
        generalCount: true,
        obcCount: true,
        scCount: true,
        stCount: true,
        minorityCount: true,
        hinduCount: true,
        muslimCount: true,
        sikhCount: true,
        christianCount: true,
        literacyRate: true,
        source: true,
      },
      orderBy: { surveyDate: "desc" },
    });

    // Latest demographic per ward
    const demoMap: Record<string, any> = {};
    demographics.forEach((d) => {
      if (!demoMap[d.wardId]) demoMap[d.wardId] = d;
    });

    const totals = {
      population: wards.reduce((s, w) => s + w.totalPopulation, 0),
      male: wards.reduce((s, w) => s + w.totalMale, 0),
      female: wards.reduce((s, w) => s + w.totalFemale, 0),
      households: wards.reduce((s, w) => s + w.totalHouseholds, 0),
      wards: wards.length,
    };

    res.json({ success: true, data: { wards, demographics: demoMap, totals } });
  }),
);

// ════════════════════════════════════════════════════════
// MONTHLY GOVERNANCE REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/monthly",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const fy = getCurrentFY();

    const [
      gThisMonth,
      gLastMonth,
      gResolved,
      gTotal,
      pRunning,
      pCompleted,
      pTotal,
      iTotal,
      schemeActive,
      fundData,
      deptPerformance,
    ] = await Promise.all([
      prisma.grievance.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.grievance.count({
        where: { createdAt: { gte: lastMonthStart, lt: monthStart } },
      }),
      prisma.grievance.count({ where: { resolvedAt: { gte: monthStart } } }),
      prisma.grievance.count(),
      prisma.project.count({ where: { status: "RUNNING" } }),
      prisma.project.count({ where: { status: "COMPLETED" } }),
      prisma.project.count(),
      prisma.institution.count({ where: { status: "ACTIVE" } }),
      prisma.scheme.count({ where: { status: "ACTIVE" } }),
      prisma.fund.findMany({ where: { financialYear: fy } }),
      // Department performance: grievances assigned per dept, resolved count
      prisma.grievance.groupBy({
        by: ["assignedDept"],
        where: { assignedDept: { not: null } },
        _count: true,
      }),
    ]);

    // Department resolution rates
    const deptIds = deptPerformance
      .map((d) => d.assignedDept)
      .filter(Boolean) as string[];
    const deptResolvedCounts = await prisma.grievance.groupBy({
      by: ["assignedDept"],
      where: {
        assignedDept: { in: deptIds },
        status: { in: ["RESOLVED", "CLOSED"] },
      },
      _count: true,
    });
    const deptResMap = Object.fromEntries(
      deptResolvedCounts.map((d) => [d.assignedDept!, d._count]),
    );
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds } },
      select: { id: true, name: true },
    });
    const deptNameMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));

    const deptScores = deptPerformance
      .filter((d) => d.assignedDept)
      .map((d) => ({
        dept: deptNameMap[d.assignedDept!] || "Unknown",
        total: d._count,
        resolved: deptResMap[d.assignedDept!] || 0,
        score:
          d._count > 0
            ? Math.round(((deptResMap[d.assignedDept!] || 0) / d._count) * 100)
            : 0,
      }))
      .sort((a, b) => b.score - a.score);

    // 6-month trend
    const sixAgo = new Date();
    sixAgo.setMonth(sixAgo.getMonth() - 5);
    sixAgo.setDate(1);
    const allG = await prisma.grievance.findMany({
      where: { createdAt: { gte: sixAgo } },
      select: { createdAt: true, resolvedAt: true },
    });
    const monthly: Record<string, { filed: number; resolved: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      d.setDate(1);
      monthly[
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      ] = { filed: 0, resolved: 0 };
    }
    allG.forEach((g) => {
      const ck = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthly[ck]) monthly[ck].filed++;
      if (g.resolvedAt) {
        const rk = `${g.resolvedAt.getFullYear()}-${String(g.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
        if (monthly[rk]) monthly[rk].resolved++;
      }
    });
    const trend = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month, ...d }));

    const fundTotal = {
      allocated: fundData.reduce((s, f) => s + f.totalAllocated, 0),
      released: fundData.reduce((s, f) => s + f.totalReleased, 0),
      utilized: fundData.reduce((s, f) => s + f.totalUtilized, 0),
    };

    res.json({
      success: true,
      data: {
        summary: {
          grievancesThisMonth: gThisMonth,
          grievancesLastMonth: gLastMonth,
          resolvedThisMonth: gResolved,
          totalGrievances: gTotal,
          runningProjects: pRunning,
          completedProjects: pCompleted,
          totalProjects: pTotal,
          activeInstitutions: iTotal,
          activeSchemes: schemeActive,
          ...fundTotal,
          financialYear: fy,
        },
        trend,
        deptPerformance: deptScores,
      },
    });
  }),
);

// ════════════════════════════════════════════════════════
// CSV EXPORT
// ════════════════════════════════════════════════════════

router.get(
  "/export/:type",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const { type } = req.params;
    const { wardId, dateFrom, dateTo } = req.query as Record<string, string>;
    let csv = "";
    let filename = `${type}-report-${new Date().toISOString().split("T")[0]}.csv`;

    switch (type) {
      case "grievance": {
        const where: any = {};
        if (wardId) where.wardId = wardId;
        if (dateFrom || dateTo) {
          where.createdAt = {};
          if (dateFrom) where.createdAt.gte = new Date(dateFrom);
          if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59Z");
        }
        const rows = await prisma.grievance.findMany({
          where,
          include: { ward: { select: { name: true, wardNumber: true } } },
          orderBy: { createdAt: "desc" },
        });
        csv =
          "Ticket,Subject,Category,Priority,Status,Complainant,Phone,Ward,Created\n";
        rows.forEach((r) => {
          csv += `"${r.ticketNumber}","${(r.subject || "").replace(/"/g, '""')}","${r.category}","${r.priority}","${r.status}","${r.complainantName || ""}","${r.complainantPhone || ""}","#${r.ward.wardNumber} ${r.ward.name}","${r.createdAt.toISOString().split("T")[0]}"\n`;
        });
        break;
      }
      case "project": {
        const where: any = {};
        if (wardId) where.wardId = wardId;
        const rows = await prisma.project.findMany({
          where,
          include: { ward: { select: { name: true, wardNumber: true } } },
          orderBy: { createdAt: "desc" },
        });
        csv =
          "Code,Name,Category,Status,Completion%,Budget Sanctioned,Budget Released,Budget Used,Fund Type,Contractor,Ward\n";
        rows.forEach((r) => {
          csv += `"${r.projectCode}","${r.name.replace(/"/g, '""')}","${r.category}","${r.status}",${r.completionPercent},${r.budgetSanctioned},${r.budgetReleased},${r.budgetUsed},"${r.fundType}","${r.contractor || ""}","#${r.ward.wardNumber} ${r.ward.name}"\n`;
        });
        break;
      }
      case "institution": {
        const where: any = {};
        if (wardId) where.wardId = wardId;
        const rows = await prisma.institution.findMany({
          where,
          include: { ward: { select: { name: true, wardNumber: true } } },
          orderBy: { name: "asc" },
        });
        csv = "Name,Category,Status,Address,Contact,Ward\n";
        rows.forEach((r) => {
          csv += `"${r.name.replace(/"/g, '""')}","${r.category}","${r.status}","${(r.address || "").replace(/"/g, '""')}","${r.contactNo || ""}","#${r.ward.wardNumber} ${r.ward.name}"\n`;
        });
        break;
      }
      case "scheme": {
        const schemes = await prisma.scheme.findMany({
          include: {
            beneficiaries: {
              include: { ward: { select: { name: true, wardNumber: true } } },
            },
          },
        });
        csv =
          "Scheme,Department,Level,Status,Budget,Total Beneficiaries,Total Target,Coverage%\n";
        schemes.forEach((s) => {
          const tb = s.beneficiaries.reduce(
            (sum, b) => sum + b.beneficiaryCount,
            0,
          );
          const tt = s.beneficiaries.reduce((sum, b) => sum + b.targetCount, 0);
          csv += `"${s.name.replace(/"/g, '""')}","${s.department}","${s.level}","${s.status}",${s.budget},${tb},${tt},${tt > 0 ? Math.round((tb / tt) * 100) : 0}\n`;
        });
        break;
      }
      default:
        res
          .status(400)
          .json({ success: false, message: "Invalid export type" });
        return;
    }

    await createAuditLog({
      userId: req.user!.id,
      action: "EXPORT",
      module: "reports",
      description: `Exported ${type} report as CSV`,
      ...getRequestMeta(req),
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

export default router;
