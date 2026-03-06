import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals } from "./helper.js";

/**
 * POST /api/admin/fund
 * Creates a new fund.
 */
export const createFund = catchAsync(async (req, res) => {
  const { fundType, financialYear, totalAllocated } = req.body;

  const existing = await prisma.fund.findFirst({
    where: { fundType, financialYear },
  });
  if (existing)
    throw ApiError.badRequest(
      `${fundType} for ${financialYear} already exists`,
    );

  const fund = await prisma.fund.create({
    data: {
      fundType,
      financialYear,
      totalAllocated: totalAllocated || 0,
      totalReleased: req.body.totalReleased || 0,
      totalUtilized: req.body.totalUtilized || 0,
    },
  });

  // Auto-create allocation transaction
  if (fund.totalAllocated > 0) {
    await prisma.fundTransaction.create({
      data: {
        fundId: fund.id,
        amount: fund.totalAllocated,
        type: "ALLOCATION",
        description: `Initial allocation for ${fund.fundType} FY ${fund.financialYear}`,
      },
    });
  }

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "funds",
    recordId: fund.id,
    description: `Created ${fund.fundType} ${fund.financialYear} (₹${fund.totalAllocated.toLocaleString()})`,
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
 * POST /api/admin/fund/:id/transaction
 * Adds a transaction (release or utilization) to a fund.
 */
export const createTransactionFund = catchAsync(async (req, res) => {
  const fund = await prisma.fund.findUnique({
    where: { id: req.params.id as string },
  });
  if (!fund) throw ApiError.notFound("Fund not found");

  const { amount, type, description, projectId, date } = req.body;

  // Validate project exists if provided
  let projectInfo = null;
  if (projectId) {
    projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, projectCode: true },
    });
    if (!projectInfo) throw ApiError.notFound("Project not found");
  }

  // Validation rules
  if (type === "RELEASE") {
    const newReleased = fund.totalReleased + amount;
    if (newReleased > fund.totalAllocated) {
      throw ApiError.badRequest(
        `Release (₹${newReleased.toLocaleString()}) cannot exceed allocation (₹${fund.totalAllocated.toLocaleString()})`,
      );
    }
  }

  if (type === "UTILIZATION") {
    const newUtilized = fund.totalUtilized + amount;
    if (newUtilized > fund.totalReleased) {
      throw ApiError.badRequest(
        `Utilization (₹${newUtilized.toLocaleString()}) cannot exceed released amount (₹${fund.totalReleased.toLocaleString()})`,
      );
    }
  }

  // Create transaction
  const txn = await prisma.fundTransaction.create({
    data: {
      fundId: fund.id,
      amount,
      type,
      description,
      projectId: projectId || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  // Recalculate totals from all transactions
  const totals = await recalculateFundTotals(fund.id);

  // If utilization linked to project, update project budgetUsed
  if (type === "UTILIZATION" && projectId) {
    const projectTxns = await prisma.fundTransaction.findMany({
      where: { projectId, type: "UTILIZATION" },
      select: { amount: true },
    });
    const totalProjectUsed = projectTxns.reduce((s, t) => s + t.amount, 0);
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: totalProjectUsed },
    });
  }

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "funds",
    recordId: txn.id,
    description: `${type} ₹${amount.toLocaleString()} on ${fund.fundType} ${fund.financialYear}${projectInfo ? ` → ${projectInfo.projectCode}` : ""}`,
    newData: {
      type,
      amount,
      projectId,
      description,
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
    },
  });
});
