import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { getCurrentFY } from "./helper.js";

/**
 * GET /api/admin/funds
 * Lists all funds with optional filtering.
 */
export const getFunds = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const { fundType, financialYear } = req.query as Record<string, string>;

  const where: any = { tenantId, isDeleted: false };
  if (fundType && fundType !== "all") where.fundType = fundType;
  if (financialYear && financialYear !== "all")
    where.financialYear = financialYear;

  const funds = await prisma.fund.findMany({
    where,
    include: {
      _count: { select: { transactions: { where: { isDeleted: false } } } },
    },
    orderBy: [{ financialYear: "desc" }, { fundType: "asc" }],
  });

  const enriched = funds.map((f) => ({
    ...f,
    availableBalance: Math.max(0, f.totalReleased - f.totalUtilized),
    releasePct:
      f.totalAllocated > 0
        ? Math.round((f.totalReleased / f.totalAllocated) * 100)
        : 0,
    utilizationPct:
      f.totalAllocated > 0
        ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
        : 0,
    unreleasedAmount: Math.max(0, f.totalAllocated - f.totalReleased),
    unusedAmount: Math.max(0, f.totalReleased - f.totalUtilized),
  }));

  res.json({ success: true, data: enriched });
});

/**
 * GET /api/admin/funds/stats
 * Gets dashboard overview for a financial year.
 */
export const overviewDashboard = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fy = (req.query.financialYear as string) || getCurrentFY();

  // All funds for this FY
  const funds = await prisma.fund.findMany({
    where: { tenantId, financialYear: fy, isDeleted: false },
    include: {
      _count: { select: { transactions: { where: { isDeleted: false } } } },
    },
    orderBy: { fundType: "asc" },
  });

  const totalAllocated = funds.reduce((s, f) => s + f.totalAllocated, 0);
  const totalReleased = funds.reduce((s, f) => s + f.totalReleased, 0);
  const totalUtilized = funds.reduce((s, f) => s + f.totalUtilized, 0);

  // Projects Funded: count of unique projects linked to these fund transactions
  const projectFundedGroup = await prisma.fundTransaction.groupBy({
    by: ["projectId"],
    where: {
      fund: { tenantId, financialYear: fy },
      projectId: { not: null },
      isDeleted: false,
    },
  });
  const projectsFunded = projectFundedGroup.length;

  const byType = funds.map((f) => ({
    id: f.id,
    fundType: f.fundType,
    allocated: f.totalAllocated,
    released: f.totalReleased,
    utilized: f.totalUtilized,
    availableBalance: Math.max(0, f.totalReleased - f.totalUtilized),
    transactionCount: f._count.transactions,
    releasePct:
      f.totalAllocated > 0
        ? Math.round((f.totalReleased / f.totalAllocated) * 100)
        : 0,
    utilizationPct:
      f.totalAllocated > 0
        ? Math.round((f.totalUtilized / f.totalAllocated) * 100)
        : 0,
  }));

  // All FYs for dropdown
  const allYears = await prisma.fund.findMany({
    where: { tenantId, isDeleted: false },
    select: { financialYear: true },
    distinct: ["financialYear"],
    orderBy: { financialYear: "desc" },
  });

  // Recent transactions with project info
  const recentTxns = await prisma.fundTransaction.findMany({
    where: { fund: { tenantId, financialYear: fy }, isDeleted: false },
    include: {
      fund: {
        select: {
          id: true,
          fundType: true,
          financialYear: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 15,
  });

  // Resolve project names
  const projIds = recentTxns
    .map((t) => t.projectId)
    .filter(Boolean) as string[];
  const projects =
    projIds.length > 0
      ? await prisma.project.findMany({
        where: { id: { in: projIds }, tenantId, isDeleted: false },
        select: {
          id: true,
          name: true,
          projectCode: true,
        },
      })
      : [];
  const projMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const txnsEnriched = recentTxns.map((t) => ({
    ...t,
    project: t.projectId ? projMap[t.projectId] || null : null,
  }));

  // Monthly utilization trend
  const utilTxns = await prisma.fundTransaction.findMany({
    where: {
      fund: { tenantId, financialYear: fy },
      type: "UTILIZATION",
      isDeleted: false,
    },
    select: { amount: true, date: true },
  });

  const monthly: Record<string, number> = {};
  utilTxns.forEach((t) => {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + t.amount;
  });

  const monthlyTrend = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  res.json({
    success: true,
    data: {
      financialYear: fy,
      totalAllocated,
      totalReleased,
      totalUtilized,
      availableBalance: Math.max(0, totalReleased - totalUtilized),
      unreleasedAmount: Math.max(0, totalAllocated - totalReleased),
      unusedAmount: Math.max(0, totalReleased - totalUtilized),
      projectsFunded,
      releasePct:
        totalAllocated > 0
          ? Math.round((totalReleased / totalAllocated) * 100)
          : 0,
      utilizationPct:
        totalAllocated > 0
          ? Math.round((totalUtilized / totalAllocated) * 100)
          : 0,
      byType,
      recentTransactions: txnsEnriched,
      monthlyTrend,
      financialYears: allYears.map((y) => y.financialYear),
      fundCount: funds.length,
    },
  });
});

/**
 * GET /api/admin/funds/:id
 * Gets a single fund with its transactions.
 */
export const getSingleFunds = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fundId = req.params.id as string;
  const fund = await prisma.fund.findFirst({
    where: { id: fundId, tenantId, isDeleted: false },
    include: {
      transactions: {
        where: { isDeleted: false },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!fund) throw ApiError.notFound("Fund not found");

  // Resolve project names
  const projIds = fund.transactions
    .map((t) => t.projectId)
    .filter(Boolean) as string[];

  const projects =
    projIds.length > 0
      ? await prisma.project.findMany({
        where: { id: { in: projIds }, tenantId, isDeleted: false },
        select: {
          id: true,
          name: true,
          projectCode: true,
          ward: {
            select: { name: true, wardNumber: true },
          },
        },
      })
      : [];
  const projMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const txnsEnriched = fund.transactions.map((t) => ({
    ...t,
    project: t.projectId ? projMap[t.projectId] || null : null,
  }));

  // By type breakdown
  const byType = {
    ALLOCATION: 0,
    RELEASE: 0,
    UTILIZATION: 0,
  };
  fund.transactions.forEach((t) => {
    if (byType[t.type as keyof typeof byType] !== undefined)
      byType[t.type as keyof typeof byType] += t.amount;
  });

  // Monthly breakdown
  const monthly: Record<
    string,
    { allocation: number; release: number; utilization: number }
  > = {};
  fund.transactions.forEach((t) => {
    const key = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly[key])
      monthly[key] = {
        allocation: 0,
        release: 0,
        utilization: 0,
      };
    if (t.type === "ALLOCATION") monthly[key].allocation += t.amount;
    if (t.type === "RELEASE") monthly[key].release += t.amount;
    if (t.type === "UTILIZATION") monthly[key].utilization += t.amount;
  });

  const monthlyBreakdown = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  // Projects that used this fund
  const projectUsage: Record<string, { project: any; total: number }> = {};
  fund.transactions
    .filter((t) => t.projectId && t.type === "UTILIZATION")
    .forEach((t) => {
      if (!projectUsage[t.projectId!]) {
        projectUsage[t.projectId!] = {
          project: projMap[t.projectId!] || null,
          total: 0,
        };
      }
      projectUsage[t.projectId!].total += t.amount;
    });

  res.json({
    success: true,
    data: {
      ...fund,
      transactions: txnsEnriched,
      byType,
      monthlyBreakdown,
      projectUsage: Object.values(projectUsage).sort(
        (a, b) => b.total - a.total
      ),
      availableBalance: Math.max(0, fund.totalReleased - fund.totalUtilized),
      releasePct:
        fund.totalAllocated > 0
          ? Math.round((fund.totalReleased / fund.totalAllocated) * 100)
          : 0,
      utilizationPct:
        fund.totalAllocated > 0
          ? Math.round((fund.totalUtilized / fund.totalAllocated) * 100)
          : 0,
      unusedAmount: Math.max(0, fund.totalReleased - fund.totalUtilized),
    },
  });
});

/**
 * GET /api/admin/funds/:id/transactions
 * Lists transactions for a specific fund.
 */
export const getFundTransactions = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fundId = req.params.id as string;
  const transactions = await prisma.fundTransaction.findMany({
    where: { fundId, tenantId, isDeleted: false },
    orderBy: { date: "desc" },
  });

  res.json({ success: true, data: transactions });
});
