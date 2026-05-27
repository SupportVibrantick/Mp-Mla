import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";



/**
 * PUT /api/admin/project/:id
 * Updates an existing project.
 */
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const old = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!old) throw ApiError.notFound("Project not found");

    const data: any = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.expectedEndDate)
      data.expectedEndDate = new Date(data.expectedEndDate);

    if (data.wardId && data.wardId !== old.wardId) {
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) throw ApiError.notFound("Ward not found");
    }

    if (data.department && data.department !== old.department) {
      const department = await prisma.department.findFirst({
        where: { id: data.department, tenantId, isDeleted: false },
      });
      if (!department) throw ApiError.notFound("Department not found");
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
      include: { ward: { select: { name: true } } },
    });

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
 * PUT /api/admin/project/:id/status
 * Updates the status of a project.
 */
export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const old = await prisma.project.findFirst({
      where: { id: req.params.id as string, tenantId },
    });
    if (!old) throw ApiError.notFound("Project not found");

    const { status, completionPercent, actualEndDate } = req.body;
    const data: any = { status };
    if (completionPercent !== undefined)
      data.completionPercent = completionPercent;
    if (status === "COMPLETED") {
      data.completionPercent = 100;
      data.actualEndDate = actualEndDate ? new Date(actualEndDate) : new Date();
    }

    const project = await prisma.project.update({
      where: { id: req.params.id as string },
      data,
    });

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
