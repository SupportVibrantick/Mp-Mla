import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals } from "./helper.js";

/**
 * DELETE /api/admin/fund/:id
 * Deletes a fund and all its transactions.
 */
export const deleteFunds = catchAsync(async (req, res) => {
  const fundId = req.params.id as string;
  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });
  if (!fund) throw ApiError.notFound("Fund not found");

  // Cascade deletes transactions via Prisma relation
  await prisma.fund.delete({ where: { id: fundId } });

  await createAuditLog({
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
  const txn = await prisma.fundTransaction.findUnique({
    where: { id: req.params.txnId as string },
  });
  if (!txn) throw ApiError.notFound("Transaction not found");
  if (txn.fundId !== req.params.id)
    throw ApiError.badRequest("Transaction mismatch");

  const projectId = txn.projectId;

  await prisma.fundTransaction.delete({
    where: { id: txn.id },
  });

  // Recalculate fund totals
  const totals = await recalculateFundTotals(txn.fundId);

  // If was utilization linked to project, recalculate project
  if (txn.type === "UTILIZATION" && projectId) {
    const remaining = await prisma.fundTransaction.findMany({
      where: { projectId, type: "UTILIZATION" },
      select: { amount: true },
    });
    const totalProjectUsed = remaining.reduce((s, t) => s + t.amount, 0);
    await prisma.project.update({
      where: { id: projectId },
      data: { budgetUsed: totalProjectUsed },
    });
  }

  await createAuditLog({
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
