import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import {
  sendAdminNotification,
  buildActivityEmailHtml,
} from "../../../lib/email.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { ApiError } from "../../../utils/ApiError.js";
import { createReportPdfStream, generateReportReference } from "../../../services/pdfReportService.js";

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
    const tenantId = requireTenantId(req);
    const { where, wardId } = parseDateFilters(req.query);
    const w: any = { ...where, tenantId, isDeleted: false };
    if (wardId) w.wardId = wardId;

    const [
      total,
      byStatus,
      byPriority,
      byCategory,
      bySource,
      byWard,
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
          ward: { select: { name: true, wardNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    // Resolve ward names (scope to tenantId)
    const wardIds = byWard.map((x) => x.wardId);
    const wards = await prisma.ward.findMany({
      where: { id: { in: wardIds }, tenantId },
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
    const tenantId = requireTenantId(req);
    const { wardId } = req.query as Record<string, string>;
    const w: any = { tenantId, isDeleted: false };
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

    // Resolve department names (scope to tenantId)
    const deptIds = [...new Set(rows.map((r) => r.department).filter(Boolean))];
    const depts = await prisma.department.findMany({
      where: { id: { in: deptIds }, tenantId, isDeleted: false },
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
    const tenantId = requireTenantId(req);
    const wards = await prisma.ward.findMany({
      where: { tenantId, status: "ACTIVE", isDeleted: false },
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

    const [gCounts, pCounts, iCounts] = await Promise.all([
      prisma.grievance.groupBy({
        by: ["wardId"],
        where: { tenantId, wardId: { in: wardIds }, isDeleted: false },
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["wardId"],
        where: { tenantId, wardId: { in: wardIds }, isDeleted: false },
        _count: true,
        _sum: { budgetSanctioned: true },
      }),
      prisma.institution.groupBy({
        by: ["wardId"],
        where: { tenantId, wardId: { in: wardIds }, isDeleted: false },
        _count: true,
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

    const wardData = wards.map((w) => ({
      ...w,
      grievances: gMap[w.id] || 0,
      projects: pMap[w.id]?.count || 0,
      projectBudget: pMap[w.id]?.budget || 0,
      institutions: iMap[w.id] || 0,
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
// INSTITUTION REPORT
// ════════════════════════════════════════════════════════

router.get(
  "/institution",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { wardId } = req.query as Record<string, string>;
    const w: any = { tenantId, isDeleted: false };
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
    const tenantId = requireTenantId(req);
    const wards = await prisma.ward.findMany({
      where: { tenantId, status: "ACTIVE", isDeleted: false },
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
      where: { tenantId },
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
      population: wards.reduce((s: number, w: any) => s + w.totalPopulation, 0),
      male: wards.reduce((s: number, w: any) => s + w.totalMale, 0),
      female: wards.reduce((s: number, w: any) => s + w.totalFemale, 0),
      households: wards.reduce((s: number, w: any) => s + w.totalHouseholds, 0),
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
    const tenantId = requireTenantId(req);
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
      fundData,
      deptPerformance,
    ] = await Promise.all([
      prisma.grievance.count({ where: { tenantId, isDeleted: false, createdAt: { gte: monthStart } } }),
      prisma.grievance.count({
        where: { tenantId, isDeleted: false, createdAt: { gte: lastMonthStart, lt: monthStart } },
      }),
      prisma.grievance.count({ where: { tenantId, isDeleted: false, resolvedAt: { gte: monthStart } } }),
      prisma.grievance.count({ where: { tenantId, isDeleted: false } }),
      prisma.project.count({ where: { tenantId, isDeleted: false, status: "RUNNING" } }),
      prisma.project.count({ where: { tenantId, isDeleted: false, status: "COMPLETED" } }),
      prisma.project.count({ where: { tenantId, isDeleted: false } }),
      prisma.institution.count({ where: { tenantId, isDeleted: false, status: "ACTIVE" } }),
      prisma.fund.findMany({ where: { tenantId, financialYear: fy, isDeleted: false } }),
      // Department performance: grievances assigned per dept, resolved count
      prisma.grievance.groupBy({
        by: ["assignedDept"],
        where: { tenantId, isDeleted: false, assignedDept: { not: null } },
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
        tenantId,
        isDeleted: false,
        assignedDept: { in: deptIds },
        status: { in: ["RESOLVED", "CLOSED"] },
      },
      _count: true,
    });
    const deptResMap = Object.fromEntries(
      deptResolvedCounts.map((d) => [d.assignedDept!, d._count]),
    );
    const depts = await prisma.department.findMany({
      where: { tenantId, id: { in: deptIds }, isDeleted: false },
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
      where: { tenantId, isDeleted: false, createdAt: { gte: sixAgo } },
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
    const tenantId = requireTenantId(req);
    const { type } = req.params;
    const { wardId, dateFrom, dateTo } = req.query as Record<string, string>;
    let csv = "";
    let filename = `${type}-report-${new Date().toISOString().split("T")[0]}.csv`;

    switch (type) {
      case "grievance": {
        const where: any = { tenantId, isDeleted: false };
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
        const where: any = { tenantId, isDeleted: false };
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
        const where: any = { tenantId, isDeleted: false };
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
      default:
        res
          .status(400)
          .json({ success: false, message: "Invalid export type" });
        return;
    }

    // Count rows (subtract 1 for header line)
    const rowCount = csv.split("\n").filter(Boolean).length - 1;

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "EXPORT",
      module: "reports",
      description: `Exported ${type} report as CSV`,
      ...getRequestMeta(req),
    });

    // Log data activity
    prisma.dataActivity
      .create({
        data: {
          tenantId,
          userId: req.user!.id,
          userName: req.user!.name || "Unknown",
          action: "EXPORT",
          module: type,
          recordCount: rowCount,
          fileName: filename,
          details: `Exported ${type} report (${rowCount} records)`,
        },
      })
      .catch(() => {});

    // Send admin notification (fire-and-forget)
    const now = new Date();
    sendAdminNotification(
      tenantId,
      `Data Export: ${type} report by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "EXPORT",
        module: type,
        userName: req.user!.name || "Unknown",
        recordCount: rowCount,
        timestamp: now,
      }),
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }),
);

// ════════════════════════════════════════════════════════
// UNCAPPED PDF REPORT GENERATION (CONSOLIDATED & SINGLE MODULE)
// ════════════════════════════════════════════════════════

router.get(
  "/pdf",
  requirePermission("reports", "read"),
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
    const { type = "consolidated", wardId, status, dateFrom, dateTo } = req.query as Record<string, string>;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        constituencyName: true,
        representativeName: true,
        representativeTitle: true,
        state: true,
        district: true,
      },
    });

    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    const where: any = { tenantId, isDeleted: false };
    if (wardId && wardId !== "all") where.wardId = wardId;
    if (status && status !== "all") where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59Z`);
    }

    let reportData: any = {};
    let dateRangeText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : dateFrom ? `From ${dateFrom}` : undefined;

    if (type === "consolidated" || type === "ward" || type === "demographic") {
      const [
        wards,
        gByWard,
        pByWard,
        iByWard,
        allDemographics,
        grievances,
        projects,
        departments,
        institutions,
        funds,
        leaders,
        gByStatus,
        gByCategory,
        pByStatus,
        gDeptCounts,
      ] = await Promise.all([
        prisma.ward.findMany({ where: { tenantId, isDeleted: false }, orderBy: { wardNumber: "asc" } }),
        prisma.grievance.groupBy({ by: ["wardId"], where: { tenantId, isDeleted: false }, _count: true }),
        prisma.project.groupBy({
          by: ["wardId"],
          where: { tenantId, isDeleted: false },
          _count: true,
          _sum: { budgetSanctioned: true },
        }),
        prisma.institution.groupBy({ by: ["wardId"], where: { tenantId, isDeleted: false }, _count: true }),
        prisma.demographics.findMany({ where: { tenantId, wardAreaId: null } }),
        prisma.grievance.findMany({ where, include: { ward: true }, orderBy: { createdAt: "desc" } }),
        prisma.project.findMany({ where, include: { ward: true }, orderBy: { createdAt: "desc" } }),
        prisma.department.findMany({ where: { tenantId, isDeleted: false }, orderBy: { name: "asc" } }),
        prisma.institution.findMany({ where: { tenantId, isDeleted: false }, include: { ward: true }, orderBy: { name: "asc" } }),
        prisma.fund.findMany({ where: { tenantId, isDeleted: false } }),
        prisma.leader.findMany({ where: { tenantId, isDeleted: false }, include: { ward: true }, orderBy: { name: "asc" } }),
        // Chart aggregations
        prisma.grievance.groupBy({ by: ["status"], where: { tenantId, isDeleted: false }, _count: true }),
        prisma.grievance.groupBy({ by: ["category"], where: { tenantId, isDeleted: false }, _count: true }),
        prisma.project.groupBy({ by: ["status"], where: { tenantId, isDeleted: false }, _count: true }),
        prisma.grievance.groupBy({
          by: ["departmentId"],
          where: { tenantId, isDeleted: false, departmentId: { not: null } },
          _count: true,
        }),
      ]);

      // Build ward data maps
      const gMap = Object.fromEntries(gByWard.map((g) => [g.wardId, g._count]));
      const pMap = Object.fromEntries(
        pByWard.map((p) => [p.wardId, { count: p._count, budget: p._sum.budgetSanctioned || 0 }]),
      );
      const iMap = Object.fromEntries(iByWard.map((i) => [i.wardId, i._count]));
      const demoMap: Record<string, any> = {};
      allDemographics.forEach((d) => {
        if (!demoMap[d.wardId]) demoMap[d.wardId] = d;
      });

      // Dept grievance map
      const deptGMap = Object.fromEntries(gDeptCounts.map((g) => [g.departmentId!, g._count]));
      const deptData = departments.map((d) => ({ ...d, totalGrievances: deptGMap[d.id] || 0 }));

      // Enrich ward data
      const wardData = wards.map((w) => ({
        ...w,
        grievances: gMap[w.id] || 0,
        projects: pMap[w.id]?.count || 0,
        projectBudget: pMap[w.id]?.budget || 0,
        institutions: iMap[w.id] || 0,
        totalVoters: demoMap[w.id]?.totalVoters || Math.round((w.totalPopulation || 0) * 0.65),
      }));

      // Aggregate demographics
      const demoAgg = {
        totalPopulation: 0, maleCount: 0, femaleCount: 0, transgenderCount: 0,
        age0to6: 0, age7to18: 0, age19to35: 0, age36to60: 0, age60plus: 0,
        totalHouseholds: 0, bplHouseholds: 0, aplHouseholds: 0,
        generalCount: 0, obcCount: 0, scCount: 0, stCount: 0, minorityCount: 0, otherCount: 0,
        totalVoters: 0, maleVoters: 0, femaleVoters: 0, newVotersCount: 0,
        literacyRate: 0, maleLiteracyRate: 0, femaleLiteracyRate: 0,
        totalBirths: 0, totalDeaths: 0,
      };
      let litCount = 0;
      allDemographics.forEach((d) => {
        demoAgg.totalPopulation += d.totalPopulation || 0;
        demoAgg.maleCount += d.maleCount || 0;
        demoAgg.femaleCount += d.femaleCount || 0;
        demoAgg.transgenderCount += d.transgenderCount || 0;
        demoAgg.age0to6 += d.age0to6 || 0;
        demoAgg.age7to18 += d.age7to18 || 0;
        demoAgg.age19to35 += d.age19to35 || 0;
        demoAgg.age36to60 += d.age36to60 || 0;
        demoAgg.age60plus += d.age60plus || 0;
        demoAgg.totalHouseholds += d.totalHouseholds || 0;
        demoAgg.bplHouseholds += d.bplHouseholds || 0;
        demoAgg.aplHouseholds += d.aplHouseholds || 0;
        demoAgg.generalCount += d.generalCount || 0;
        demoAgg.obcCount += d.obcCount || 0;
        demoAgg.scCount += d.scCount || 0;
        demoAgg.stCount += d.stCount || 0;
        demoAgg.minorityCount += d.minorityCount || 0;
        demoAgg.otherCount += d.otherCount || 0;
        demoAgg.totalVoters += d.totalVoters || 0;
        demoAgg.maleVoters += d.maleVoters || 0;
        demoAgg.femaleVoters += d.femaleVoters || 0;
        demoAgg.newVotersCount += d.newVotersCount || 0;
        demoAgg.totalBirths += d.totalBirths || 0;
        demoAgg.totalDeaths += d.totalDeaths || 0;
        if (d.literacyRate) { demoAgg.literacyRate += d.literacyRate; litCount++; }
        if (d.maleLiteracyRate) demoAgg.maleLiteracyRate += d.maleLiteracyRate;
        if (d.femaleLiteracyRate) demoAgg.femaleLiteracyRate += d.femaleLiteracyRate;
      });
      if (litCount > 0) {
        demoAgg.literacyRate /= litCount;
        demoAgg.maleLiteracyRate /= litCount;
        demoAgg.femaleLiteracyRate /= litCount;
      }

      // Use ward-level totals as fallback if no demographics records exist
      if (demoAgg.totalPopulation === 0) {
        demoAgg.totalPopulation = wardData.reduce((s, w) => s + (w.totalPopulation || 0), 0);
        demoAgg.maleCount = wardData.reduce((s, w) => s + (w.totalMale || 0), 0);
        demoAgg.femaleCount = wardData.reduce((s, w) => s + (w.totalFemale || 0), 0);
        demoAgg.totalHouseholds = wardData.reduce((s, w) => s + (w.totalHouseholds || 0), 0);
        demoAgg.totalVoters = wardData.reduce((s, w) => s + (w.totalVoters || 0), 0);
      }

      // Build chart data
      const chartData: any = {};
      chartData.grievanceByStatus = gByStatus.map((g) => ({ label: g.status, value: g._count }));
      chartData.grievanceByCategory = gByCategory.map((g) => ({ label: g.category, value: g._count }));
      chartData.projectByStatus = pByStatus.map((p) => ({ label: p.status, value: p._count }));
      chartData.populationByWard = wardData
        .filter((w) => w.totalPopulation > 0)
        .map((w) => ({ label: `Ward ${w.wardNumber} - ${w.name}`, value: w.totalPopulation || 0 }));
      chartData.budgetByWard = wardData
        .filter((w) => w.projectBudget > 0)
        .map((w) => ({ label: `Ward ${w.wardNumber} - ${w.name}`, value: w.projectBudget }));

      const totalPop = demoAgg.totalPopulation;
      const totalHouseholds = demoAgg.totalHouseholds;
      const totalVoters = demoAgg.totalVoters;
      const totalBudget = wardData.reduce((s, w) => s + (w.projectBudget || 0), 0);
      const totalGrievances = grievances.length;
      const resolvedGrievances = grievances.filter((g) => g.status === "RESOLVED" || g.status === "CLOSED").length;

      reportData = {
        summary: {
          totalWards: wardData.length,
          totalPopulation: totalPop,
          totalHouseholds,
          totalVoters,
          totalGrievances,
          resolvedGrievances,
          totalProjects: projects.length,
          totalBudgetSanctioned: totalBudget,
          totalInstitutions: institutions.length,
          totalLeaders: leaders.length,
          totalDepartments: departments.length,
        },
        chartData,
        demographics: demoAgg,
        wards: wardData,
        grievances: type === "consolidated" ? grievances : [],
        projects: type === "consolidated" ? projects : [],
        departments: type === "consolidated" ? deptData : [],
        institutions: type === "consolidated" ? institutions : [],
        funds: type === "consolidated" ? funds : [],
      };
    } else if (type === "grievance") {
      const [grievances, gByStatus, gByCategory] = await Promise.all([
        prisma.grievance.findMany({ where, include: { ward: true }, orderBy: { createdAt: "desc" } }),
        prisma.grievance.groupBy({ by: ["status"], where: { ...where }, _count: true }),
        prisma.grievance.groupBy({ by: ["category"], where: { ...where }, _count: true }),
      ]);
      const resolved = grievances.filter((g) => g.status === "RESOLVED" || g.status === "CLOSED").length;
      const urgent = grievances.filter((g) => g.priority === "URGENT" || g.priority === "HIGH").length;
      reportData = {
        summary: { totalGrievances: grievances.length, resolvedGrievances: resolved, urgentGrievances: urgent },
        chartData: {
          grievanceByStatus: gByStatus.map((g) => ({ label: g.status, value: g._count })),
          grievanceByCategory: gByCategory.map((g) => ({ label: g.category, value: g._count })),
        },
        grievances,
      };
    } else if (type === "project") {
      const [projects, pByStatus] = await Promise.all([
        prisma.project.findMany({ where, include: { ward: true }, orderBy: { createdAt: "desc" } }),
        prisma.project.groupBy({ by: ["status"], where: { ...where }, _count: true }),
      ]);
      const budgetSanctioned = projects.reduce((s, p) => s + (p.budgetSanctioned || 0), 0);
      const budgetUsed = projects.reduce((s, p) => s + (p.budgetUsed || 0), 0);
      const completed = projects.filter((p) => p.status === "COMPLETED").length;
      reportData = {
        summary: {
          totalProjects: projects.length, completedProjects: completed,
          totalBudgetSanctioned: budgetSanctioned, totalBudgetUsed: budgetUsed,
        },
        chartData: {
          projectByStatus: pByStatus.map((p) => ({ label: p.status, value: p._count })),
        },
        projects,
      };
    } else if (type === "department") {
      const [departments, gDepts] = await Promise.all([
        prisma.department.findMany({ where: { tenantId, isDeleted: false }, orderBy: { name: "asc" } }),
        prisma.grievance.groupBy({
          by: ["departmentId"],
          where: { tenantId, isDeleted: false, departmentId: { not: null } },
          _count: true,
        }),
      ]);
      const gMap = Object.fromEntries(gDepts.map((g) => [g.departmentId!, g._count]));
      const deptData = departments.map((d) => ({ ...d, totalGrievances: gMap[d.id] || 0 }));
      reportData = { summary: { totalDepartments: departments.length }, departments: deptData };
    } else if (type === "institution") {
      const institutions = await prisma.institution.findMany({
        where: { tenantId, isDeleted: false }, include: { ward: true }, orderBy: { name: "asc" },
      });
      reportData = { summary: { totalInstitutions: institutions.length }, institutions };
    } else if (type === "fund") {
      const funds = await prisma.fund.findMany({ where: { tenantId, isDeleted: false } });
      const allocated = funds.reduce((s, f) => s + (f.totalAllocated || 0), 0);
      const utilized = funds.reduce((s, f) => s + (f.totalUtilized || 0), 0);
      reportData = {
        summary: { totalFunds: funds.length, totalAllocated: allocated, totalUtilized: utilized },
        funds,
      };
    } else if (type === "leader") {
      const leaders = await prisma.leader.findMany({
        where: { tenantId, isDeleted: false }, include: { ward: true }, orderBy: { name: "asc" },
      });
      reportData = { summary: { totalLeaders: leaders.length }, leaders };
    } else {
      throw new ApiError(400, `Invalid report type: ${type}`);
    }

    const referenceNumber = generateReportReference();

    const pdfStream = createReportPdfStream({
      title: `${type === "consolidated" ? "CONSOLIDATED EXECUTIVE" : type.toUpperCase()} GOVERNANCE REPORT`,
      type,
      tenant,
      generatedBy: req.user?.name || req.user?.email || "Platform Admin",
      referenceNumber,
      dateRangeText,
      data: reportData,
    });

    const filename = `${type}-governance-report-${new Date().toISOString().split("T")[0]}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    pdfStream.pipe(res);
  }),
);

export default router;
