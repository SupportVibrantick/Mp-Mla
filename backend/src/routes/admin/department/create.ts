import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Create ─────────────────────────────────────────────

export const createDepartment = catchAsync(async (req, res) => {
  const data = { ...req.body };
  if (data.headEmail === "") delete data.headEmail;

  const existing = await prisma.department.findFirst({
    where: { OR: [{ name: data.name }, { code: data.code }] },
  });
  if (existing)
    throw ApiError.badRequest("Department with same name or code exists");

  const dept = await prisma.department.create({ data });

  await createAuditLog({
    userId: req.user!.id,
    action: "CREATE",
    module: "departments",
    recordId: dept.id,
    description: `Created department "${dept.name}" (${dept.code})`,
    newData: { name: dept.name, code: dept.code },
    ...getRequestMeta(req),
  });

  res
    .status(201)
    .json({ success: true, message: `"${dept.name}" created`, data: dept });
});
