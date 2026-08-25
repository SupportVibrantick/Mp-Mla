import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { validateBudgets } from "../../../services/project/projectBudget.service.js";
import { applyTransition } from "../../../services/project/projectWorkflow.service.js";

/**
 * PUT /api/admin/projects/:id
 * Updates an existing project.
 */
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;

    const old = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!old) throw ApiError.notFound("Project not found");
    if (old.isDeleted) throw ApiError.badRequest("Cannot update a deleted project.");

    const data: any = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.expectedEndDate) data.expectedEndDate = new Date(data.expectedEndDate);

    // Validate Ward
    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId, isDeleted: false, status: "ACTIVE" },
      });
      if (!ward) throw ApiError.notFound("Active ward not found");
    }

    // Validate Department
    if (data.departmentId && data.departmentId !== old.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, tenantId, isDeleted: false, isActive: true },
      });
      if (!department) throw ApiError.notFound("Active department not found");
    }

    // Validate Budgets
    const targetSanctioned = data.budgetSanctioned !== undefined ? data.budgetSanctioned : old.budgetSanctioned;
    const targetReleased = data.budgetReleased !== undefined ? data.budgetReleased : old.budgetReleased;
    const targetUsed = data.budgetUsed !== undefined ? data.budgetUsed : old.budgetUsed;

    validateBudgets(targetSanctioned, targetReleased, targetUsed);

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      include: {
        ward: { select: { name: true, wardNumber: true } },
        department: { select: { name: true, code: true } },
      },
    });

    // Create system timeline entry
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId: project.id,
        action: "UPDATE",
        comment: `Project ${project.projectCode} details updated`,
        changedById: req.user!.id,
        metadata: {
          previous: {
            name: old.name,
            budgetSanctioned: old.budgetSanctioned,
            budgetReleased: old.budgetReleased,
            budgetUsed: old.budgetUsed,
          },
          updated: {
            name: project.name,
            budgetSanctioned: project.budgetSanctioned,
            budgetReleased: project.budgetReleased,
            budgetUsed: project.budgetUsed,
          },
        },
      },
    });

    // Create system audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "UPDATE",
      module: "projects",
      recordId: project.id,
      description: `Updated project ${project.projectCode}`,
      oldData: {
        name: old.name,
        status: old.status,
        budgetSanctioned: old.budgetSanctioned,
      },
      newData: req.body,
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `${project.projectCode} updated`,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/projects/:id/status
 * Updates the status of a project.
 */
export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const { status, comment } = req.body;

    const old = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!old) throw ApiError.notFound("Project not found");
    if (old.isDeleted) throw ApiError.badRequest("Cannot update status of a deleted project.");

    // Apply workflow transition
    const project = await applyTransition(projectId, tenantId, status, {
      comment,
      user: req.user!,
    });

    // Create system audit log
    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "STATUS_CHANGE",
      module: "projects",
      recordId: project.id,
      description: `${project.projectCode}: ${old.status} → ${status}`,
      oldData: { status: old.status },
      newData: { status },
      ...getRequestMeta(req),
    });

    res.json({
      success: true,
      message: `Status changed to ${status}`,
      data: project,
    });
  } catch (error) {
    next(error);
  }
}
