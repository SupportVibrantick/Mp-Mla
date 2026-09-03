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

/**
 * POST /api/admin/departments/bulk-delete
 * Bulk deletes departments (moving to recycle bin if no active references).
 */
export const bulkDeleteDepartments = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain a non-empty 'ids' array.",
    });
  }

  const depts = await prisma.department.findMany({
    where: { id: { in: ids }, tenantId, isDeleted: false },
  });

  if (depts.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No valid active departments found to delete.",
    });
  }

  let deletedCount = 0;
  const errors: { departmentId: string; name: string; reason: string }[] = [];

  for (const dept of depts) {
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
      const parts = [];
      if (gCount > 0) parts.push(`${gCount} active grievances`);
      if (pCount > 0) parts.push(`${pCount} active projects`);
      if (userCount > 0) parts.push(`${userCount} active users`);
      if (taskCount > 0) parts.push(`${taskCount} active tasks`);

      errors.push({
        departmentId: dept.id,
        name: dept.name,
        reason: `Referenced by: ${parts.join(", ")}`,
      });
      continue;
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
      where: { id: dept.id },
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

    deletedCount++;
  }

  res.json({
    success: true,
    message: `Bulk delete completed. ${deletedCount} department(s) deleted.${
      errors.length > 0 ? ` ${errors.length} department(s) skipped due to active references.` : ""
    }`,
    data: { deletedCount, skippedCount: errors.length, errors },
  });
});
