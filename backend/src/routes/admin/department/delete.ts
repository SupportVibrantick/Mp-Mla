import prisma from "../../../lib/prisma.js";

import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

/**
 * DELETE /api/admin/department/:id
 * Deletes a department.
 */
export const deleteDepartment = catchAsync(async (req, res) => {
  const departmentId = req.params.id as string;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  // Check references
  const [gCount, pCount] = await Promise.all([
    prisma.grievance.count({ where: { assignedDept: dept.id } }),
    prisma.project.count({ where: { department: dept.id } }),
  ]);
  if (gCount > 0 || pCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete: ${gCount} grievances, ${pCount} projects reference this department. Deactivate instead.`,
    );
  }

  await prisma.department.delete({ where: { id: departmentId } });

  await createAuditLog({
    userId: req.user!.id,
    action: "DELETE",
    module: "departments",
    recordId: dept.id,
    description: `Deleted department "${dept.name}"`,
    ...getRequestMeta(req),
  });

  res.json({ success: true, message: `"${dept.name}" deleted` });
});
