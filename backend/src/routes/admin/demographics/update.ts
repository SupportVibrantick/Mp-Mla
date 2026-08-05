import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { syncVoterDemographics } from "../voterList/demographicsSync.js";

import catchAsync from "../../../utils/catchAsync.js";

/**
 * PUT /api/admin/demographics/ward/:wardId
 * Updates manual census/survey demographics for a ward or ward area.
 * Derived voter fields (totalVoters, maleVoters, femaleVoters, newVotersCount)
 * are excluded from manual editing and are automatically synced from the Voter table.
 */
export const updateDemographics = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const wardId = req.params.wardId as string;

  // Exclude derived voter counts (total, male, female) from manual user payload
  const {
    wardAreaId,
    totalVoters,
    maleVoters,
    femaleVoters,
    ...demoData
  } = req.body;

  const ward = await prisma.ward.findFirst({ where: { id: wardId, tenantId } });
  if (!ward) throw ApiError.notFound("Ward not found");

  if (wardAreaId) {
    const wardArea = await prisma.wardArea.findFirst({
      where: { id: wardAreaId, wardId, ward: { tenantId } },
      select: { id: true },
    });
    if (!wardArea) {
      throw ApiError.badRequest("Ward area not found in this ward");
    }
  }

  if (demoData.surveyDate) demoData.surveyDate = new Date(demoData.surveyDate);

  const existing = await prisma.demographics.findFirst({
    where: { tenantId, wardId, wardAreaId: wardAreaId || null },
  });

  let demo;
  if (existing) {
    demo = await prisma.demographics.update({
      where: { id: existing.id },
      data: demoData,
    });
  } else {
    demo = await prisma.demographics.create({
      data: { tenantId, wardId, wardAreaId: wardAreaId || null, ...demoData },
    });
  }

  // Sync voter count fields from actual voter records to ensure consistency
  await syncVoterDemographics(tenantId, wardId);

  // Fetch updated record after voter sync
  const updatedDemo = await prisma.demographics.findUnique({
    where: { id: demo.id },
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "UPDATE",
    module: "demographics",
    recordId: demo.id,
    description: `Updated demographics for ward "${ward.name}"`,
    newData: demoData,
    ...getRequestMeta(req),
  });

  res.json({ success: true, data: updatedDemo || demo });
});
