import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * DELETE /api/admin/project/:id
 * Deletes a project.
 */
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const p = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        milestones: true,
        updates: true,
        attachments: true,
      },
    });
    if (!p) throw ApiError.notFound("Project not found");

    if (p.isDeleted) {
      throw ApiError.badRequest("Project is already in recycle bin");
    }

    await archiveToRecycleBin({
      tenantId,
      module: "projects",
      entityType: "project",
      recordId: p.id,
      recordLabel: p.projectCode,
      payload: p,
      deletedById: req.user?.id,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { isDeleted: true },
    });

    await createAuditLog({
      tenantId,
      userId: req.user!.id,
      action: "DELETE",
      module: "projects",
      recordId: p.id,
      description: `Moved project ${p.projectCode} to recycle bin`,
      ...getRequestMeta(req),
    });
    res.json({
      success: true,
      message: `${p.projectCode} moved to recycle bin`,
    });
  } catch (error) {
    next(error);
  }
}
