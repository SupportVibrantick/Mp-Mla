import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import catchAsync from "@/utils/catchAsync.js";

const router = Router();

function getCurrentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 3
    ? `${y}-${String(y + 1).slice(2)}`
    : `${y - 1}-${String(y).slice(2)}`;
}

// ════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════

router.get(
  "/",
  requirePermission("dashboard", "read"),
  catchAsync(async (_req, res) => {
    const now = new Date();
    const fy = getCurrentFY();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // ─── Parallel Queries ────────────────────────────
    const [
      // Counts
      totalWards,
      totalGrievances,
      totalProjects,
      totalInstitutions,
      // totalSchemes,
      totalDepartments,

      // Grievance breakdown
      grievancesByStatus,
      grievancesByPriority,
      grievancesByCategory,
      grievancesThisMonth,
      grievancesLastMonth,
      overdueGrievances,

      // Project breakdown
      projectsByStatus,
      projectBudget,
      projectsThisMonth,

      // Fund aggregates (current FY)
      funds,

      // Scheme aggregates
      // schemeBeneficiaries,
      // activeSchemes,

      // Recent Grievances
      recentGrievances,

      // Recent Projects
      recentProjects,

      // Ward population
      wardPopulation,
    ] = await Promise.all([
      // ─── Counts
      prisma.ward.count({ where: { status: "ACTIVE" } }),
      prisma.grievance.count(),
      prisma.project.count(),
      prisma.institution.count({
        where: { status: "ACTIVE" },
      }),
      // prisma.scheme.count({ where: { status: "ACTIVE" } }),
      prisma.department.count({ where: { isActive: true } }),

      // ─── Grievances
      prisma.grievance.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["priority"],
        _count: true,
      }),
      prisma.grievance.groupBy({
        by: ["category"],
        _count: true,
        orderBy: { _count: { category: "desc" } },
        take: 8,
      }),
      prisma.grievance.count({
        where: { createdAt: { gte: monthStart } },
      }),
      prisma.grievance.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
      prisma.grievance.count({
        where: {
          expectedResolutionDate: { lt: now },
          status: {
            in: ["OPEN", "IN_PROGRESS", "ESCALATED"],
          },
        },
      }),

      // ─── Projects
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
        _sum: { budgetSanctioned: true, budgetUsed: true },
      }),
      prisma.project.aggregate({
        _sum: {
          budgetSanctioned: true,
          budgetReleased: true,
          budgetUsed: true,
        },
      }),
      prisma.project.count({
        where: { createdAt: { gte: monthStart } },
      }),

      // ─── Funds
      prisma.fund.findMany({
        where: { financialYear: fy },
      }),

      // ─── Schemes
      // prisma.schemeBeneficiary.aggregate({
      //   _sum: {
      //     beneficiaryCount: true,
      //     targetCount: true,
      //     amountDisbursed: true,
      //   },
      // }),
      // prisma.scheme.count({ where: { status: "ACTIVE" } }),

      // ─── Recent Grievances
      prisma.grievance.findMany({
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          category: true,
          priority: true,
          status: true,
          complainantName: true,
          createdAt: true,
          ward: {
            select: { name: true, wardNumber: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 7,
      }),

      // ─── Recent Projects
      prisma.project.findMany({
        select: {
          id: true,
          projectCode: true,
          name: true,
          status: true,
          completionPercent: true,
          budgetSanctioned: true,
          ward: {
            select: { name: true, wardNumber: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),

      // ─── Population
      prisma.ward.aggregate({
        where: { status: "ACTIVE" },
        _sum: {
          totalPopulation: true,
          totalHouseholds: true,
        },
      }),
    ]);

    // ─── Grievance Monthly Trend (6 months) ──────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allGrievances = await prisma.grievance.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: {
        createdAt: true,
        status: true,
        resolvedAt: true,
      },
    });

    const monthlyGrievance: Record<
      string,
      { created: number; resolved: number }
    > = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyGrievance[key] = { created: 0, resolved: 0 };
    }
    allGrievances.forEach((g) => {
      const ck = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyGrievance[ck]) monthlyGrievance[ck].created++;
      if (g.resolvedAt) {
        const rk = `${g.resolvedAt.getFullYear()}-${String(g.resolvedAt.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyGrievance[rk]) monthlyGrievance[rk].resolved++;
      }
    });
    const grievanceTrend = Object.entries(monthlyGrievance)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    // ─── Build Response ──────────────────────────────

    const gStatus = Object.fromEntries(
      grievancesByStatus.map((s) => [s.status, s._count]),
    );
    const pStatus = Object.fromEntries(
      projectsByStatus.map((s) => [s.status, s._count]),
    );

    const openGrievances =
      (gStatus["OPEN"] || 0) +
      (gStatus["IN_PROGRESS"] || 0) +
      (gStatus["ESCALATED"] || 0);
    const resolvedGrievances =
      (gStatus["RESOLVED"] || 0) + (gStatus["CLOSED"] || 0);
    const resolutionRate =
      totalGrievances > 0
        ? Math.round((resolvedGrievances / totalGrievances) * 100)
        : 0;
    const grievanceMonthlyChange = grievancesThisMonth - grievancesLastMonth;

    const fundTotalAllocated = funds.reduce((s, f) => s + f.totalAllocated, 0);
    const fundTotalReleased = funds.reduce((s, f) => s + f.totalReleased, 0);
    const fundTotalUtilized = funds.reduce((s, f) => s + f.totalUtilized, 0);

    // const schemeCoverage =
    //   (schemeBeneficiaries._sum.targetCount || 0) > 0
    //     ? Math.round(
    //         ((schemeBeneficiaries._sum.beneficiaryCount || 0) /
    //           (schemeBeneficiaries._sum.targetCount || 1)) *
    //           100,
    //       )
    //     : 0;

    // Resolve department names for recent projects
    const deptIds = [
      ...new Set(recentProjects.map((p: any) => p.department).filter(Boolean)),
    ];

    res.json({
      success: true,
      data: {
        // ─── Summary Cards
        summary: {
          totalWards,
          totalPopulation: wardPopulation._sum.totalPopulation || 0,
          totalHouseholds: wardPopulation._sum.totalHouseholds || 0,
          totalGrievances,
          openGrievances,
          resolvedGrievances,
          resolutionRate,
          overdueGrievances,
          grievancesThisMonth,
          grievanceMonthlyChange,
          totalProjects,
          runningProjects: pStatus["RUNNING"] || 0,
          completedProjects: pStatus["COMPLETED"] || 0,
          projectsThisMonth,
          totalBudget: projectBudget._sum.budgetSanctioned || 0,
          budgetUsed: projectBudget._sum.budgetUsed || 0,
          totalInstitutions,
          totalDepartments,
          // activeSchemes,
          // totalBeneficiaries: schemeBeneficiaries._sum.beneficiaryCount || 0,
          // schemeCoverage,
          fundTotalAllocated,
          fundTotalReleased,
          fundTotalUtilized,
          financialYear: fy,
        },

        // ─── Grievance Data
        grievances: {
          byStatus: grievancesByStatus.map((s) => ({
            status: s.status,
            count: s._count,
          })),
          byPriority: grievancesByPriority.map((p) => ({
            priority: p.priority,
            count: p._count,
          })),
          byCategory: grievancesByCategory.map((c) => ({
            category: c.category,
            count: c._count,
          })),
          trend: grievanceTrend,
          recent: recentGrievances,
        },

        // ─── Project Data
        projects: {
          byStatus: projectsByStatus.map((s) => ({
            status: s.status,
            count: s._count,
            budget: s._sum.budgetSanctioned || 0,
          })),
          recent: recentProjects,
        },

        // ─── Fund Data
        funds: {
          financialYear: fy,
          totalAllocated: fundTotalAllocated,
          totalReleased: fundTotalReleased,
          totalUtilized: fundTotalUtilized,
          byType: funds.map((f) => ({
            fundType: f.fundType,
            allocated: f.totalAllocated,
            released: f.totalReleased,
            utilized: f.totalUtilized,
          })),
        },
      },
    });
  }),
);

export default router;
