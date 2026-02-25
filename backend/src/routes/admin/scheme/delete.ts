import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Delete Scheme ──────────────────────────────────────

export const deleteScheme = catchAsync(async (req, res) => {
  const schemeId = req.params.id as string;
  const scheme = await prisma.scheme.findUnique({
    where: { id: schemeId },
  });
  if (!scheme) throw ApiError.notFound("Scheme not found");

  await prisma.scheme.delete({
    where: { id: schemeId },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "DELETE",
    module: "schemes",
    recordId: scheme.id,
    description: `Deleted scheme "${scheme.name}"`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${scheme.name}" deleted`,
  });
});

// ─── Delete Beneficiary ─────────────────────────────────

export const deleteBeneficiary = catchAsync(async (req, res) => {
  await prisma.schemeBeneficiary.delete({
    where: { id: req.params.beneficiaryId as string },
  });
  res.json({
    success: true,
    message: "Beneficiary entry removed",
  });
});
