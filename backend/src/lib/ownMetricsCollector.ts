import prisma from "./prisma.js";
import logger from "../utils/logger.js";

/**
 * Auto-collect "Our Metrics" from existing database tables.
 * Returns structured metric data points grouped by the 7 categories.
 */

export interface AutoMetric {
  category: string;
  metricKey: string;
  metricLabel: string;
  value: number;
  unit: string;
}

/**
 * Collect all auto-computable metrics from the existing DB.
 * These are derived from: Grievance, Project, Fund, Ward, Institution,
 * CommunityGroup, Leader, Meeting, Demographics.
 */
export async function collectOwnMetrics(tenantId: string): Promise<AutoMetric[]> {
  const metrics: AutoMetric[] = [];

  try {
    // ═══════════════════════════════════════════════════
    // CATEGORY 1: ISSUE RESOLUTION / PUBLIC SERVICE
    // ═══════════════════════════════════════════════════
    const [
      totalGrievances,
      resolvedGrievances,
      pendingGrievances,
      inProgressGrievances,
    ] = await Promise.all([
      prisma.grievance.count({ where: { tenantId, isDeleted: false } }),
      prisma.grievance.count({
        where: { tenantId, isDeleted: false, status: "RESOLVED" },
      }),
      prisma.grievance.count({
        where: { tenantId, isDeleted: false, status: "OPEN" },
      }),
      prisma.grievance.count({
        where: { tenantId, isDeleted: false, status: "IN_PROGRESS" },
      }),
    ]);

    const resolutionRate =
      totalGrievances > 0
        ? Math.round((resolvedGrievances / totalGrievances) * 100)
        : 0;

    // Average resolution time (for resolved grievances)
    const resolvedWithTime = await prisma.grievance.findMany({
      where: { tenantId, isDeleted: false, status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });
    const avgResolutionDays =
      resolvedWithTime.length > 0
        ? Math.round(
            resolvedWithTime.reduce((sum, g) => {
              const days =
                (g.resolvedAt!.getTime() - g.createdAt.getTime()) /
                (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / resolvedWithTime.length,
          )
        : 0;

    metrics.push(
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "total_grievances_received",
        metricLabel: "Total Grievances Received",
        value: totalGrievances,
        unit: "count",
      },
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "grievances_resolved",
        metricLabel: "Grievances Resolved",
        value: resolvedGrievances,
        unit: "count",
      },
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "grievances_pending",
        metricLabel: "Grievances Pending",
        value: pendingGrievances,
        unit: "count",
      },
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "grievances_in_progress",
        metricLabel: "Grievances In Progress",
        value: inProgressGrievances,
        unit: "count",
      },
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "grievance_resolution_rate",
        metricLabel: "Grievance Resolution Rate",
        value: resolutionRate,
        unit: "percentage",
      },
      {
        category: "ISSUE_RESOLUTION",
        metricKey: "avg_resolution_days",
        metricLabel: "Avg Resolution Time",
        value: avgResolutionDays,
        unit: "days",
      },
    );

    // ═══════════════════════════════════════════════════
    // CATEGORY 7: FINANCIAL / DEVELOPMENT
    // ═══════════════════════════════════════════════════
    const [
      totalProjects,
      completedProjects,
      ongoingProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { tenantId, isDeleted: false } }),
      prisma.project.count({
        where: { tenantId, isDeleted: false, status: "COMPLETED" },
      }),
      prisma.project.count({
        where: { tenantId, isDeleted: false, status: "RUNNING" },
      }),
    ]);

    // Budget data from projects
    const projectBudgets = await prisma.project.aggregate({
      where: { tenantId, isDeleted: false },
      _sum: { budgetSanctioned: true, budgetUsed: true },
    });
    const totalBudget = projectBudgets._sum.budgetSanctioned || 0;
    const totalSpent = projectBudgets._sum.budgetUsed || 0;
    const budgetUtilization =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Fund data
    const funds = await prisma.fund.findMany({
      where: { tenantId, isDeleted: false },
      select: { totalAllocated: true, totalReleased: true, totalUtilized: true },
    });
    const totalFundAllocated = funds.reduce((s, f) => s + f.totalAllocated, 0);
    const totalFundUtilized = funds.reduce((s, f) => s + f.totalUtilized, 0);

    metrics.push(
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "total_projects",
        metricLabel: "Total Development Projects",
        value: totalProjects,
        unit: "count",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "projects_completed",
        metricLabel: "Projects Completed",
        value: completedProjects,
        unit: "count",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "projects_ongoing",
        metricLabel: "Projects Ongoing",
        value: ongoingProjects,
        unit: "count",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "total_budget_allocated",
        metricLabel: "Total Budget Allocated",
        value: Math.round(totalBudget),
        unit: "currency",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "budget_utilization_rate",
        metricLabel: "Budget Utilization Rate",
        value: budgetUtilization,
        unit: "percentage",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "total_fund_allocated",
        metricLabel: "Total Fund Allocated (MLA/MP Fund)",
        value: Math.round(totalFundAllocated),
        unit: "currency",
      },
      {
        category: "FINANCIAL_DEVELOPMENT",
        metricKey: "total_fund_utilized",
        metricLabel: "Total Fund Utilized",
        value: Math.round(totalFundUtilized),
        unit: "currency",
      },
    );

    // ═══════════════════════════════════════════════════
    // CATEGORY 2: GROUND NETWORK STRENGTH
    // ═══════════════════════════════════════════════════
    const [
      totalWards,
      totalInstitutions,
      activeInstitutions,
      totalCommunityGroups,
      totalLeaders,
      partyLeaders,
      supporterLeaders,
    ] = await Promise.all([
      prisma.ward.count({ where: { tenantId, isDeleted: false } }),
      prisma.institution.count({ where: { tenantId, isDeleted: false } }),
      prisma.institution.count({
        where: { tenantId, isDeleted: false, status: "ACTIVE" },
      }),
      prisma.communityGroup.count({ where: { tenantId, isDeleted: false } }),
      prisma.leader.count({ where: { tenantId, isDeleted: false, isActive: true } }),
      prisma.leader.count({
        where: { tenantId, isDeleted: false, isActive: true, category: "PARTY_LEADER" },
      }),
      prisma.leader.count({
        where: {
          tenantId,
          isDeleted: false,
          isActive: true,
          relation: "Supporter",
        },
      }),
    ]);

    metrics.push(
      {
        category: "GROUND_NETWORK",
        metricKey: "total_wards_covered",
        metricLabel: "Total Wards Covered",
        value: totalWards,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "institutions_connected",
        metricLabel: "Institutions Connected",
        value: totalInstitutions,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "active_institutions",
        metricLabel: "Active Institutions",
        value: activeInstitutions,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "community_groups",
        metricLabel: "Community Groups Engaged",
        value: totalCommunityGroups,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "total_local_leaders",
        metricLabel: "Total Local Leaders Network",
        value: totalLeaders,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "party_leaders",
        metricLabel: "Party Leaders",
        value: partyLeaders,
        unit: "count",
      },
      {
        category: "GROUND_NETWORK",
        metricKey: "supporter_leaders",
        metricLabel: "Supporter Leaders",
        value: supporterLeaders,
        unit: "count",
      },
    );

    // ═══════════════════════════════════════════════════
    // CATEGORY 6: EVENTS & ACTIVITIES
    // ═══════════════════════════════════════════════════
    const [
      totalMeetings,
      completedMeetings,
      scheduledMeetings,
    ] = await Promise.all([
      prisma.meeting.count({ where: { tenantId, isDeleted: false } }),
      prisma.meeting.count({
        where: { tenantId, isDeleted: false, status: "COMPLETED" },
      }),
      prisma.meeting.count({
        where: { tenantId, isDeleted: false, status: "SCHEDULED" },
      }),
    ]);

    metrics.push(
      {
        category: "EVENTS_ACTIVITIES",
        metricKey: "total_meetings_organized",
        metricLabel: "Total Meetings/Events Organized",
        value: totalMeetings,
        unit: "count",
      },
      {
        category: "EVENTS_ACTIVITIES",
        metricKey: "meetings_completed",
        metricLabel: "Meetings Completed",
        value: completedMeetings,
        unit: "count",
      },
      {
        category: "EVENTS_ACTIVITIES",
        metricKey: "meetings_scheduled",
        metricLabel: "Meetings Scheduled (Upcoming)",
        value: scheduledMeetings,
        unit: "count",
      },
    );

    // ═══════════════════════════════════════════════════
    // CATEGORY 3: VOTER OUTREACH (from demographics)
    // ═══════════════════════════════════════════════════
    const demographics = await prisma.demographics.findMany({
      where: { tenantId },
      select: { totalPopulation: true, totalVoters: true },
    });
    const totalPopulation = demographics.reduce(
      (s, d) => s + (d.totalPopulation || 0),
      0,
    );
    const totalVoters = demographics.reduce(
      (s, d) => s + (d.totalVoters || 0),
      0,
    );

    // Grievances from unique wards (coverage)
    const wardsWithGrievances = await prisma.grievance.findMany({
      where: { tenantId, isDeleted: false },
      select: { wardId: true },
      distinct: ["wardId"],
    });

    const wardCoverage =
      totalWards > 0
        ? Math.round((wardsWithGrievances.length / totalWards) * 100)
        : 0;

    metrics.push(
      {
        category: "VOTER_OUTREACH",
        metricKey: "total_population_covered",
        metricLabel: "Total Population in Constituency",
        value: totalPopulation,
        unit: "count",
      },
      {
        category: "VOTER_OUTREACH",
        metricKey: "total_registered_voters",
        metricLabel: "Total Registered Voters",
        value: totalVoters,
        unit: "count",
      },
      {
        category: "VOTER_OUTREACH",
        metricKey: "ward_coverage_rate",
        metricLabel: "Ward Coverage Rate (Grievances)",
        value: wardCoverage,
        unit: "percentage",
      },
    );

    logger.info(`Auto-collected ${metrics.length} own metrics from database`);
  } catch (error: any) {
    logger.error(`Failed to collect own metrics: ${error.message}`);
  }

  return metrics;
}

/**
 * Get the current period in "YYYY-MM" format
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Format period for display: "2026-04" -> "April 2026"
 */
export function formatPeriodDisplay(period: string): string {
  const [year, month] = period.split("-");
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}
