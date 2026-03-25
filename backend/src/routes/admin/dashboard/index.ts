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
      totalCommunityGroups,

      // Grievance breakdown
      grievancesByStatus,
      grievancesByPriority,
      grievancesByCategory,
      grievancesThisMonth,
      grievancesLastMonth,

      // Project breakdown
      projectsByStatus,
      projectBudget,
      projectsThisMonth,

      // Institutions by Category
      institutionsByCategory,

      // Community Groups by Type
      communityGroupsByType,

      // Demographics Summary (Voters, Population)
      demographicsSummary,

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
      prisma.communityGroup.count({ where: { isActive: true } }),

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

      // ─── Institutions
      prisma.institution.groupBy({
        by: ["category"],
        _count: true,
        where: { status: "ACTIVE" },
      }),

      // ─── Community Groups
      prisma.communityGroup.groupBy({
        by: ["type"],
        _count: true,
        where: { isActive: true },
      }),

      // ─── Demographics (Aggregate Voters)
      prisma.demographics.aggregate({
        _sum: {
          totalVoters: true,
          maleVoters: true,
          femaleVoters: true,
        },
      }),

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
          grievancesThisMonth,
          grievanceMonthlyChange,
          totalProjects,
          runningProjects: pStatus["RUNNING"] || 0,
          completedProjects: pStatus["COMPLETED"] || 0,
          projectsThisMonth,
          totalBudget: projectBudget._sum.budgetSanctioned || 0,
          budgetUsed: projectBudget._sum.budgetUsed || 0,
          totalInstitutions,
          totalCommunityGroups,
          totalVoters: demographicsSummary._sum.totalVoters || 0,
          maleVoters: demographicsSummary._sum.maleVoters || 0,
          femaleVoters: demographicsSummary._sum.femaleVoters || 0,
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

        // ─── Institution Data
        institutions: {
          byCategory: institutionsByCategory.map((c) => ({
            category: c.category,
            count: c._count,
          })),
        },

        // ─── Community Group Data
        communityGroups: {
          byType: communityGroupsByType.map((t) => ({
            type: t.type,
            count: t._count,
          })),
        },
      },
    });
  }),
);

export default router;
