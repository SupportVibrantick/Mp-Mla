import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals, recalcProjectBudget } from "./helper.js";

/**
 * DELETE /api/admin/funds/:id
 * Deletes a fund and all its transactions.
 */
export const deleteFunds = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fundId = req.params.id as string;
  const fund = await prisma.fund.findFirst({
    where: { id: fundId, tenantId },
  });
  if (!fund) throw ApiError.notFound("Fund not found");

  if (fund.isDeleted) {
    throw ApiError.badRequest("Fund is already in recycle bin");
  }

  await archiveToRecycleBin({
    tenantId,
    module: "funds",
    entityType: "fund" as any,
    recordId: fund.id,
    recordLabel: `${fund.fundType} FY ${fund.financialYear}`,
    payload: fund,
    deletedById: req.user!.id,
  });

  // Soft delete fund
  await prisma.fund.update({
    where: { id: fundId },
    data: { isDeleted: true },
  });
  
  // Also soft delete transactions
  await prisma.fundTransaction.updateMany({
    where: { fundId },
    data: { isDeleted: true },
  });

  // Recalculate any linked project budgets after soft-deleting transactions
  const linkedProjects = await prisma.fundTransaction.findMany({
    where: { fundId, projectId: { not: null }, isDeleted: true },
    select: { projectId: true },
    distinct: ["projectId"],
  });
  for (const tp of linkedProjects) {
    if (tp.projectId) {
      await recalcProjectBudget(tp.projectId, tenantId);
    }
  }

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "funds",
    recordId: fund.id,
    description: `Soft-deleted fund ${fund.fundType} FY ${fund.financialYear}`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `${fund.fundType} ${fund.financialYear} deleted`,
  });
});

/**
 * DELETE /api/admin/funds/:id/transactions/:txnId
 * Deletes a transaction and reverses its effect.
 */
export const deleteFundTransaction = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const txn = await prisma.fundTransaction.findFirst({
    where: {
      id: req.params.txnId as string,
      fundId: req.params.id as string,
      fund: { tenantId, isDeleted: false },
    },
  });
  if (!txn) throw ApiError.notFound("Transaction not found");

  const projectId = txn.projectId;
  const fundId = txn.fundId;

  await archiveToRecycleBin({
    tenantId,
    module: "funds",
    entityType: "fund_transaction" as any,
    recordId: txn.id,
    recordLabel: `Reversed ${txn.type} of ₹${txn.amount.toLocaleString()}`,
    payload: txn,
    deletedById: req.user!.id,
  });

  // Soft-delete transaction + recalc fund + recalc project atomically
  const totals = await prisma.$transaction(async (tx) => {
    const newTxn = await tx.fundTransaction.update({
      where: { id: txn.id },
      data: { isDeleted: true },
    });

    // Recalculate fund totals
    const fundTotals = await recalculateFundTotals(fundId, tx);

    // Recalculate project budgets if linked
    if (projectId) {
      await recalcProjectBudget(projectId, tenantId, tx);
    }

    return { fundTotals, newTxn };
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "funds",
    recordId: txn.id,
    description: `Reversed ${txn.type} of ₹${txn.amount.toLocaleString()} on fund ID ${fundId}${projectId ? ` and synced project budgets` : ""}`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `₹${txn.amount.toLocaleString()} ${txn.type.toLowerCase()} reversed`,
    data: { fundTotals: totals.fundTotals },
  });
});