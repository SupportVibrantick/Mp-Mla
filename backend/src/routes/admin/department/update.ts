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

// ─── Update ─────────────────────────────────────────────

export const updateDepartment = catchAsync(async (req, res) => {
  const departmentId = req.params.id as string;
  const old = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!old) throw ApiError.notFound("Department not found");

  const data = { ...req.body };
  if (data.headEmail === "") delete data.headEmail;

  if (data.code && data.code !== old.code) {
    const dup = await prisma.department.findFirst({
      where: { code: data.code, id: { not: old.id } },
    });
    if (dup) throw ApiError.badRequest("Code already used");
  }

  const dept = await prisma.department.update({
    where: { id: departmentId },
    data,
  });

  await createAuditLog({
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

// ─── Toggle Active ──────────────────────────────────────

export const toggleDepartment = catchAsync(async (req, res) => {
  const departmentId = req.params.id as string;
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!dept) throw ApiError.notFound("Department not found");

  const updated = await prisma.department.update({
    where: { id: departmentId },
    data: { isActive: !dept.isActive },
  });

  await createAuditLog({
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
