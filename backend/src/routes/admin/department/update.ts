import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requirePermission } from "../../../middleware/permission.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { validate } from "../../../middleware/validate.js";
import { z } from "zod";
import catchAsync from "@/utils/catchAsync.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * PUT /api/admin/department/:id
 * Updates a department.
 */
export const updateDepartment = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  const old = await prisma.department.findFirst({
    where: { id: departmentId, tenantId },
  });
  if (!old) throw ApiError.notFound("Department not found");
  if (old.isDeleted) {
    throw ApiError.badRequest(
      "Cannot update a deleted department. Please restore it first from the recycle bin.",
    );
  }

  const data = { ...req.body };
  if (data.headEmail === "") delete data.headEmail;

  if (data.code && data.code !== old.code) {
    const dup = await prisma.department.findFirst({
      where: { tenantId, code: data.code, id: { not: old.id } },
    });
    if (dup) throw ApiError.badRequest("Code already used");
  }

  if (data.name && data.name !== old.name) {
    const dup = await prisma.department.findFirst({
      where: { tenantId, name: data.name, id: { not: old.id } },
    });
    if (dup) throw ApiError.badRequest("Name already used");
  }

  const dept = await prisma.department.update({
    where: { id: departmentId },
    data,
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "UPDATE",
    module: "departments",
    recordId: dept.id,
    description: `Updated department "${dept.name}"`,
    oldData: { name: old.name, code: old.code, isActive: old.isActive },
    newData: req.body,
    ...getRequestMeta(req),
  });

  res.json({ success: true, message: `"${dept.name}" updated`, data: dept });
});

/**
 * PATCH /api/admin/department/:id/toggle
 * Toggles the active status of a department.
 */
export const toggleDepartment = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;
  const dept = await prisma.department.findFirst({
    where: { id: departmentId, tenantId },
  });
  if (!dept) throw ApiError.notFound("Department not found");
  if (dept.isDeleted) {
    throw ApiError.badRequest(
      "Cannot change status of a deleted department. Please restore it first from the recycle bin.",
    );
  }
  const updated = await prisma.department.update({
    where: { id: departmentId },
    data: { isActive: !dept.isActive },
  });

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "STATUS_CHANGE",
    module: "departments",
    recordId: dept.id,
    description: `${updated.isActive ? "Activated" : "Deactivated"} "${dept.name}"`,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `"${dept.name}" ${updated.isActive ? "activated" : "deactivated"}`,
    data: updated,
  });
});

export const upsertDepartmentSlas = catchAsync(async (req, res) => {
  const tenantId = requireTenantId(req);
  const departmentId = req.params.id as string;

  const dept = await prisma.department.findFirst({
    where: { id: departmentId, tenantId, isDeleted: false },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  const existing = await prisma.departmentSLA.findMany({
    where: { tenantId, departmentId },
  });

  const data = await prisma.$transaction(
    req.body.slas.map((sla: any) =>
      prisma.departmentSLA.upsert({
        where: {
          departmentId_priority: {
            departmentId,
            priority: sla.priority,
          },
        },
        create: {
          tenantId,
          departmentId,
          priority: sla.priority,
          slaHours: sla.slaHours,
          isActive: sla.isActive ?? true,
        },
        update: {
          slaHours: sla.slaHours,
          isActive: sla.isActive ?? true,
        },
      }),
    ),
  );

  await createAuditLog({
    tenantId,
    userId: req.user!.id,
    action: "UPDATE",
    module: "departments",
    recordId: dept.id,
    description: `Updated SLA configuration for "${dept.name}"`,
    oldData: existing,
    newData: data,
    ...getRequestMeta(req),
  });

  res.json({
    success: true,
    message: `SLA configuration updated for "${dept.name}"`,
    data,
  });
});
