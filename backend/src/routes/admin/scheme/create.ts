import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Create Scheme ──────────────────────────────────────

export const createScheme = catchAsync(async (req, res) => {
  const data: any = { ...req.body };
  if (data.applicationUrl === "") delete data.applicationUrl;
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);

  const scheme = await prisma.scheme.create({ data });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "schemes",
    recordId: scheme.id,
    description: `Created scheme "${scheme.name}" (${scheme.level})`,
    newData: {
      name: scheme.name,
      level: scheme.level,
      budget: scheme.budget,
    },
    ...getRequestMeta(req),
  });

  res.status(201).json({
    success: true,
    message: `"${scheme.name}" created`,
    data: scheme,
  });
});
