import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import catchAsync from "@/utils/catchAsync.js";
import { recalculateFundTotals } from "./helper.js";

/**
 * PUT /api/admin/funds/:id
 * Recalculates a fund's totals from its transactions.
 *
 * Financial totals are derived from FundTransaction records and must NOT
 * be manually overwritten. This endpoint recalculates and returns the
 * transaction-derived totals instead of accepting arbitrary totals.
 */
export const updateFunds = catchAsync(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) throw ApiError.badRequest("Tenant context is required");

  const fundId = req.params.id as string;
  const old = await prisma.fund.findFirst({
    where: { id: fundId, tenantId, isDeleted: false },
  });
  if (!old) throw ApiError.notFound("Fund not found");

  // Totals are always derived from transactions — recalculate them.
  const totals = await recalculateFundTotals(fundId);

  const fund = await prisma.fund.update({
    where: { id: fundId },
    data: {
      totalAllocated: totals.totalAllocated,
      totalReleased: totals.totalReleased,
      totalUtilized: totals.totalUtilized,
    },
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "UPDATE",
    module: "funds",
    recordId: fund.id,
    description: `FUND_TOTALS_RECALCULATED: Fund ${fund.fundType} FY ${fund.financialYear} totals synchronized from transactions`,
    oldData: {
      totalAllocated: old.totalAllocated,
      totalReleased: old.totalReleased,
      totalUtilized: old.totalUtilized,
    },
    newData: {
      totalAllocated: fund.totalAllocated,
      totalReleased: fund.totalReleased,
      totalUtilized: fund.totalUtilized,
    },
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: "Fund totals recalculated from transactions",
    data: fund,
  });
});