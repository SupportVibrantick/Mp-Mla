import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Update Scheme ──────────────────────────────────────

export const updateScheme = catchAsync(async (req, res) => {
  const schemeId = req.params.id as string;

  const old = await prisma.scheme.findUnique({
    where: { id: schemeId },
  });
  if (!old) throw ApiError.notFound("Scheme not found");

  const data: any = { ...req.body };
  if (data.applicationUrl === "") delete data.applicationUrl;
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const scheme = await prisma.scheme.update({
    where: { id: schemeId },
    data,
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    module: "schemes",
    recordId: scheme.id,
    description: `Updated scheme "${scheme.name}"`,
    oldData: {
      name: old.name,
      status: old.status,
      budget: old.budget,
    },
    newData: req.body,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${scheme.name}" updated`,
    data: scheme,
  });
});

// ─── Upsert Beneficiary (single ward) ──────────────────

export const updateBeneficiary = catchAsync(async (req, res) => {
  const schemeId = req.params.id as string;

  const scheme = await prisma.scheme.findUnique({
    where: { id: schemeId },
  });
  if (!scheme) throw ApiError.notFound("Scheme not found");

  const { wardId, beneficiaryCount, targetCount, amountDisbursed, reportDate } =
    req.body;

  const ward = await prisma.ward.findUnique({ where: { id: wardId } });
  if (!ward) throw ApiError.notFound("Ward not found");

  const beneficiary = await prisma.schemeBeneficiary.upsert({
    where: {
      schemeId_wardId: { schemeId: scheme.id, wardId },
    },
    update: {
      beneficiaryCount,
      targetCount,
      amountDisbursed,
      reportDate: reportDate ? new Date(reportDate) : new Date(),
    },
    create: {
      schemeId: scheme.id,
      wardId,
      beneficiaryCount,
      targetCount,
      amountDisbursed,
      reportDate: reportDate ? new Date(reportDate) : new Date(),
    },
    include: {
      ward: {
        select: { name: true, wardNumber: true },
      },
    },
  });

  res.json({
    success: true,
    message: `Beneficiary data updated for Ward #${ward.wardNumber}`,
    data: beneficiary,
  });
});

// ─── Bulk Update Beneficiaries ──────────────────────────
export const bulkUpdateBeneficiary = catchAsync(async (req, res) => {
  const schemeId = req.params.id as string;

  const scheme = await prisma.scheme.findUnique({
    where: { id: schemeId },
  });
  if (!scheme) throw ApiError.notFound("Scheme not found");

  const results = [];
  for (const entry of req.body.entries) {
    const b = await prisma.schemeBeneficiary.upsert({
      where: {
        schemeId_wardId: {
          schemeId: scheme.id,
          wardId: entry.wardId,
        },
      },
      update: {
        beneficiaryCount: entry.beneficiaryCount,
        targetCount: entry.targetCount,
        amountDisbursed: entry.amountDisbursed,
        reportDate: entry.reportDate ? new Date(entry.reportDate) : new Date(),
      },
      create: {
        schemeId: scheme.id,
        wardId: entry.wardId,
        beneficiaryCount: entry.beneficiaryCount,
        targetCount: entry.targetCount,
        amountDisbursed: entry.amountDisbursed,
        reportDate: entry.reportDate ? new Date(entry.reportDate) : new Date(),
      },
    });
    results.push(b);
  }

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    module: "schemes",
    recordId: scheme.id,
    description: `Bulk updated beneficiaries for "${scheme.name}" (${results.length} wards)`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `Updated ${results.length} ward entries`,
    data: results,
  });
});
