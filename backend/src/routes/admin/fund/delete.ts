import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals } from "./helper.js";

/**
 * DELETE /api/admin/fund/:id
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
    entityType: "fund",
    recordId: fund.id,
    recordLabel: `${fund.fundType} ${fund.financialYear}`,
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

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "funds",
    recordId: fund.id,
    description: `Deleted ${fund.fundType} ${fund.financialYear}`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `${fund.fundType} ${fund.financialYear} deleted`,
  });
});


/**
 * DELETE /api/admin/fund/:id/transaction/:txnId
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

  await archiveToRecycleBin({
    tenantId,
    module: "funds",
    entityType: "fund_transaction",
    recordId: txn.id,
    recordLabel: `Reversed ${txn.type} of ₹${txn.amount.toLocaleString()}`,
    payload: txn,
    deletedById: req.user!.id,
  });

  await prisma.fundTransaction.update({
    where: { id: txn.id },
    data: { isDeleted: true },
  });

  // Recalculate fund totals
  const totals = await recalculateFundTotals(txn.fundId);

  // If was utilization linked to project, recalculate project
  if (txn.type === "UTILIZATION" && projectId) {
    const remaining = await prisma.fundTransaction.findMany({
      where: {
        projectId,
        type: "UTILIZATION",
        isDeleted: false,
        fund: { tenantId },
      },
      select: { amount: true },
    });
    const totalProjectUsed = remaining.reduce((s, t) => s + t.amount, 0);
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: totalProjectUsed },
    });
  }

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "funds",
    recordId: txn.id,
    description: `Reversed ${txn.type} of ₹${txn.amount.toLocaleString()}`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `₹${txn.amount.toLocaleString()} ${txn.type.toLowerCase()} reversed`,
    data: { fundTotals: totals },
  });
});
