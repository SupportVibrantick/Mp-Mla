import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals, recalcProjectBudget } from "./helper.js";

/**
 * POST /api/admin/funds
 * Creates a new fund.
 */
export const createFund = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const { fundType, financialYear, totalAllocated, totalReleased, totalUtilized } = req.body;

  // Validate financial year format
  if (!/^\d{4}-\d{2}$/.test(financialYear)) {
    throw ApiError.badRequest("Financial year must follow the format YYYY-YY (e.g. 2024-25)");
  }

  const existing = await prisma.fund.findFirst({
    where: { tenantId, fundType, financialYear, isDeleted: false },
  });
  if (existing) {
    throw ApiError.badRequest(
      `${fundType} for ${financialYear} already exists`
    );
  }

  const fund = await prisma.fund.create({
    data: {
      tenantId,
      fundType,
      financialYear,
      totalAllocated: 0,
      totalReleased: 0,
      totalUtilized: 0,
    },
  });

  // Auto-create initial transactions if values are provided (migration/setup only)
  const initialTxns: {
    amount: number;
    type: "ALLOCATION" | "RELEASE" | "UTILIZATION";
    description: string;
  }[] = [];
  if ((totalAllocated || 0) > 0) {
    initialTxns.push({
      amount: totalAllocated,
      type: "ALLOCATION",
      description: `Initial allocation for ${fund.fundType} FY ${fund.financialYear}`,
    });
  }
  if ((totalReleased || 0) > 0) {
    initialTxns.push({
      amount: totalReleased,
      type: "RELEASE",
      description: `Initial release for ${fund.fundType} FY ${fund.financialYear}`,
    });
  }
  if ((totalUtilized || 0) > 0) {
    initialTxns.push({
      amount: totalUtilized,
      type: "UTILIZATION",
      description: `Initial utilization for ${fund.fundType} FY ${fund.financialYear}`,
    });
  }

  for (const t of initialTxns) {
    await prisma.fundTransaction.create({
      data: {
        tenantId,
        fundId: fund.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
      },
    });
  }

  // Recalculate just in case
  await recalculateFundTotals(fund.id);

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "CREATE",
    module: "funds",
    recordId: fund.id,
    description: `FUND_CREATED: Scheduled fund ${fund.fundType} FY ${fund.financialYear} with allocation ₹${(totalAllocated || 0).toLocaleString()}`,
    newData: req.body,
    ...getRequestMeta(req),
  });

  res.status(201).json({
    success: true,
    message: `${fund.fundType} fund for ${fund.financialYear} created`,
    data: fund,
  });
});

/**
 * POST /api/admin/funds/:id/transactions
 * Adds a transaction (allocation, release, or utilization) to a fund.
 * Atomically recalculates fund totals and linked project budgets.
 */
export const createTransactionFund = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fund = await prisma.fund.findFirst({
    where: { id: req.params.id as string, tenantId, isDeleted: false },
  });
  if (!fund) throw ApiError.notFound("Active fund not found");

  const { amount, type, description, projectId, date } = req.body;

  if (amount <= 0) {
    throw ApiError.badRequest("Transaction amount must be positive");
  }

  // Validate project exists if provided
  let projectInfo = null;
  if (projectId) {
    projectInfo = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
      select: { id: true, name: true, projectCode: true },
    });
    if (!projectInfo) throw ApiError.notFound("Project not found");
  }

  // Financial validations
  if (type === "RELEASE") {
    const unreleased = fund.totalAllocated - fund.totalReleased;
    if (amount > unreleased) {
      throw ApiError.badRequest(
        `Release (₹${amount.toLocaleString()}) cannot exceed unreleased allocated balance (₹${unreleased.toLocaleString()})`
      );
    }
  }

  if (type === "UTILIZATION") {
    const available = fund.totalReleased - fund.totalUtilized;
    if (amount > available) {
      throw ApiError.badRequest(
        `Utilization (₹${amount.toLocaleString()}) cannot exceed available released balance (₹${available.toLocaleString()})`
      );
    }
  }

  // Create transaction + recalc fund + recalc project atomically
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction
    const txn = await tx.fundTransaction.create({
      data: {
        tenantId,
        fundId: fund.id,
        amount,
        type,
        description: description || `${type} transaction for ${fund.fundType}`,
        projectId: projectId || null,
        date: date ? new Date(date) : new Date(),
      },
    });

    // Recalculate totals on fund
    const totals = await recalculateFundTotals(fund.id, tx);

    // Recalculate and sync project budget fields if linked to project
    if (projectId) {
      const projTotals = await recalcProjectBudget(projectId, tenantId, tx);
      return { txn, totals, projTotals };
    }

    return { txn, totals, projTotals: null };
  });

  const { txn, totals, projTotals } = result;

  // Determine audit log description tag
  let auditTag = "ALLOCATION_CREATED";
  if (type === "RELEASE") auditTag = "FUND_RELEASED";
  else if (type === "UTILIZATION") auditTag = "FUND_UTILIZED";

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "CREATE",
    module: "funds",
    recordId: txn.id,
    description: `${auditTag}: Recorded ${type} of ₹${amount.toLocaleString()} on ${fund.fundType} FY ${fund.financialYear}${projectInfo ? ` linked to project ${projectInfo.projectCode}` : ""}${projTotals ? ` (project sanctioned ₹${projTotals.budgetSanctioned.toLocaleString()}, released ₹${projTotals.budgetReleased.toLocaleString()}, used ₹${projTotals.budgetUsed.toLocaleString()})` : ""}`,
    newData: {
      type,
      amount,
      projectId,
      description,
      fundTotals: totals,
      projectTotals: projTotals,
    },
    ...getRequestMeta(req),
  });

  res.status(201).json({
    success: true,
    message: `₹${amount.toLocaleString()} ${type.toLowerCase()} recorded`,
    data: {
      transaction: txn,
      fundTotals: totals,
      project: projectInfo,
      projectTotals: projTotals,
    },
  });
});