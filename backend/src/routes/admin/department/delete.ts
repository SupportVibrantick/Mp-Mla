import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * DELETE /api/admin/department/:id
 * Deletes a department.
 */
export const deleteDepartment = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, tenantId },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  if (dept.isDeleted) {
    throw ApiError.badRequest("Department is already in recycle bin");
  }

  // Check references
  const [gCount, pCount, userCount, taskCount] = await Promise.all([
    prisma.grievance.count({
      where: {
        tenantId,
        departmentId: dept.id,
        status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] },
      },
    }),
    prisma.project.count({ where: { tenantId, departmentId: dept.id, isDeleted: false } }),
    prisma.user.count({
      where: { tenantId, departmentId: dept.id, status: "ACTIVE" },
    }),
    prisma.task.count({
      where: {
        tenantId,
        departmentId: dept.id,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
  ]);
  if (gCount > 0 || pCount > 0 || userCount > 0 || taskCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: ${gCount} active grievances, ${pCount} projects, ${userCount} active users, ${taskCount} active tasks reference this department. Deactivate instead.`,
    );
  }

  await archiveToRecycleBin({
    tenantId,
    module: "departments",
    entityType: "department",
    recordId: dept.id,
    recordLabel: dept.name,
    payload: dept,
    deletedById: req.user!.id,
  });

  await prisma.department.update({
    where: { id: departmentId },
    data: { isDeleted: true },
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "DELETE",
    module: "departments",
    recordId: dept.id,
    description: `Deleted department "${dept.name}"`,
    ...getRequestMeta(req),
  });

  res.json({ success: true, message: `"${dept.name}" deleted` });
});
