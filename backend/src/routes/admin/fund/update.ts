import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * PUT /api/admin/fund/:id
 * Updates a fund's totals.
 */
export const updateFunds = catchAsync(async (req, res) => {
  const fundId = req.params.id as string;
  const old = await prisma.fund.findUnique({
    where: { id: fundId },
  });
  if (!old) throw ApiError.notFound("Fund not found");

  const fund = await prisma.fund.update({
    where: { id: fundId },
    data: req.body,
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    module: "funds",
    recordId: fund.id,
    description: `Updated ${fund.fundType} ${fund.financialYear}`,
    oldData: {
      totalAllocated: old.totalAllocated,
      totalReleased: old.totalReleased,
      totalUtilized: old.totalUtilized,
    },
    newData: req.body,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: "Fund updated",
    data: fund,
  });
});
