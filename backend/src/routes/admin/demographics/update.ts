import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

import catchAsync from "@/utils/catchAsync.js";

export const updateDemographics = catchAsync(async (req, res) => {
  const wardId = req.params.wardId as string;
  const { wardAreaId, ...demoData } = req.body;

  const ward = await prisma.ward.findUnique({ where: { id: wardId } });
  if (!ward) throw ApiError.notFound("Ward not found");

  if (demoData.surveyDate) demoData.surveyDate = new Date(demoData.surveyDate);

  const existing = await prisma.demographics.findFirst({
    where: { wardId, wardAreaId: wardAreaId || null },
  });

  let demo;
  if (existing) {
    demo = await prisma.demographics.update({
      where: { id: existing.id },
      data: demoData,
    });
  } else {
    demo = await prisma.demographics.create({
      data: { wardId, wardAreaId: wardAreaId || null, ...demoData },
    });
  }

  await createAuditLog({
    userId: req.user!.id,
    action: "UPDATE",
    module: "demographics",
    recordId: demo.id,
    description: `Updated demographics for ward "${ward.name}"`,
    newData: demoData,
    ...getRequestMeta(req),
  });

  res.json({ success: true, data: demo });
});
