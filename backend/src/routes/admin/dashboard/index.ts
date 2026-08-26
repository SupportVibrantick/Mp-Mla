import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";

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
  catchAsync(async (req, res) => {
    const tenantId = requireTenantId(req);
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

      // Total Departments
      totalDepartments,

      // Scheduled Meetings
      scheduledMeetings,

      // Janata Darbar
      totalJanataSessions,
      totalJanataTokens,
      janataTokensByStatus,

      // Appointments
      totalAppointments,
      pendingAppointments,
      approvedAppointments,

      // Schemes
      totalSchemes,
      totalSchemeApplications,
      approvedSchemeApplications,

      // CRM Contacts
      totalContacts,

      // Documents
      totalDocuments,

      // Events
      totalEvents,
      upcomingEvents,

      // Recent Appointments
      recentAppointments,

      // Recent Janata Sessions
      recentJanataSessions,
    ] = await Promise.all([
      // ─── Counts
      prisma.ward.count({
        where: { tenantId, status: "ACTIVE", isDeleted: false },
      }),
      prisma.grievance.count({ where: { tenantId, isDeleted: false } }),
      prisma.project.count({ where: { tenantId, isDeleted: false } }),
      prisma.institution.count({
        where: { tenantId, status: "ACTIVE", isDeleted: false },
      }),
      prisma.communityGroup.count({
        where: { tenantId, isActive: true, isDeleted: false },
      }),

      // ─── Grievances
      prisma.grievance.groupBy({
        by: ["status"],
        _count: true,
        where: { tenantId, isDeleted: false },
      }),
      prisma.grievance.groupBy({
        by: ["priority"],
        _count: true,
        where: { tenantId, isDeleted: false },
      }),
      prisma.grievance.groupBy({
        by: ["category"],
        _count: true,
        where: { tenantId, isDeleted: false },
        orderBy: { _count: { category: "desc" } },
        take: 8,
      }),
      prisma.grievance.count({
        where: { tenantId, createdAt: { gte: monthStart }, isDeleted: false },
      }),
      prisma.grievance.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: monthStart },
          tenantId,
          isDeleted: false,
        },
      }),

      // ─── Projects
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
        _sum: { budgetSanctioned: true, budgetUsed: true },
        where: { tenantId, isDeleted: false },
      }),
      prisma.project.aggregate({
        _sum: {
          budgetSanctioned: true,
          budgetReleased: true,
          budgetUsed: true,
        },
        where: { tenantId, isDeleted: false },
      }),
      prisma.project.count({
        where: { tenantId, createdAt: { gte: monthStart }, isDeleted: false },
      }),

      // ─── Institutions
      prisma.institution.groupBy({
        by: ["category"],
        _count: true,
        where: { tenantId, status: "ACTIVE", isDeleted: false },
      }),

      // ─── Community Groups
      prisma.communityGroup.groupBy({
        by: ["type"],
        _count: true,
        where: { tenantId, isActive: true, isDeleted: false },
      }),

      // ─── Demographics (Aggregate Voters)
      prisma.voter.groupBy({
        by: ["gender"],
        where: { tenantId, isDeleted: false },
        _count: { id: true },
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
        where: { tenantId, isDeleted: false },
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
        where: { tenantId, isDeleted: false },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),

      // ─── Population
      prisma.ward.aggregate({
        where: { tenantId, status: "ACTIVE" },
        _sum: {
          totalPopulation: true,
          totalHouseholds: true,
        },
      }),

      // ─── Departments
      prisma.department.count({ where: { tenantId, isDeleted: false } }),

      // ─── Meetings
      prisma.meeting.count({
        where: { tenantId, status: "SCHEDULED", isDeleted: false },
      }),

      // ─── Janata Darbar Sessions
      prisma.janataDarbarSession.count({
        where: { tenantId, isDeleted: false },
      }),

      // ─── Janata Darbar Tokens
      prisma.janataDarbarToken.count({
        where: { tenantId },
      }),

      // ─── Janata Tokens by Status
      prisma.janataDarbarToken.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: true,
      }),

      // ─── Appointments
      prisma.appointment.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.appointment.count({
        where: { tenantId, status: "PENDING", isDeleted: false },
      }),
      prisma.appointment.count({
        where: { tenantId, status: "APPROVED", isDeleted: false },
      }),

      // ─── Schemes
      prisma.scheme.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.schemeApplication.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.schemeApplication.count({
        where: { tenantId, status: "APPROVED", isDeleted: false },
      }),

      // ─── CRM Contacts
      prisma.contact.count({
        where: { tenantId, isDeleted: false },
      }),

      // ─── Documents
      prisma.document.count({
        where: { tenantId, isDeleted: false },
      }),

      // ─── Events
      prisma.event.count({
        where: { tenantId, isDeleted: false },
      }),
      prisma.event.count({
        where: { tenantId, startDate: { gte: now }, isDeleted: false },
      }),

      // ─── Recent Appointments
      prisma.appointment.findMany({
        select: {
          id: true,
          appointmentNumber: true,
          title: true,
          type: true,
          status: true,
          requesterName: true,
          date: true,
          startTime: true,
        },
        where: { tenantId, isDeleted: false },
        orderBy: { date: "desc" },
        take: 5,
      }),

      // ─── Recent Janata Sessions
      prisma.janataDarbarSession.findMany({
        select: {
          id: true,
          sessionNumber: true,
          title: true,
          status: true,
          date: true,
          location: true,
          _count: { select: { tokens: true } },
        },
        where: { tenantId, isDeleted: false },
        orderBy: { date: "desc" },
        take: 3,
      }),
    ]);

    // ─── Grievance Monthly Trend (6 months) ──────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allGrievances = await prisma.grievance.findMany({
      where: { tenantId, createdAt: { gte: sixMonthsAgo }, isDeleted: false },
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
    const voterCounts = Object.fromEntries(
      demographicsSummary.map((s) => [s.gender, s._count.id]),
    );
    const totalVoters = Object.values(voterCounts).reduce(
      (sum, count) => sum + count,
      0,
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
          totalVoters,
          maleVoters: voterCounts.MALE || 0,
          femaleVoters: voterCounts.FEMALE || 0,
          totalDepartments,
          scheduledMeetings,
          financialYear: fy,

          // New modules counts
          totalJanataSessions,
          totalJanataTokens,
          totalAppointments,
          pendingAppointments,
          approvedAppointments,
          totalSchemes,
          totalSchemeApplications,
          approvedSchemeApplications,
          totalContacts,
          totalDocuments,
          totalEvents,
          upcomingEvents,
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

        // ─── Janata Darbar Data
        janataDarbar: {
          byStatus: janataTokensByStatus.map((t) => ({
            status: t.status,
            count: t._count,
          })),
          recentSessions: recentJanataSessions,
        },

        // ─── Appointment Data
        appointments: {
          recent: recentAppointments,
        },
      },
    });
  }),
);

export default router;
