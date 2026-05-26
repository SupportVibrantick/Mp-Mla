import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * POST /api/admin/department
 * Creates a new department.
 */
export const createDepartment = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const data = { ...req.body, tenantId };
  if (data.headEmail === "") delete data.headEmail;

  const existing = await prisma.department.findFirst({
    where: { tenantId, OR: [{ name: data.name }, { code: data.code }] },
  });
  if (existing)
    throw ApiError.badRequest("Department with same name or code exists");

  const dept = await prisma.department.create({ data });

  await createAuditLog({
    tenantId,
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
