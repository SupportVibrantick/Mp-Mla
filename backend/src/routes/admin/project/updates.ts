import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * POST /api/admin/projects/:id/updates
 * Adds a new update to a project.
 */
export async function addUpdate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const entry = await prisma.projectUpdate.create({
      data: {
        tenantId,
        projectId,
        updateText: req.body.updateText,
        updatedBy: req.user!.name || req.user!.email,
        photoUrl: req.body.photoUrl || null,
      },
    });

    // Write to system timeline log
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: "PROJECT_UPDATE",
        comment: `Project status update posted by ${req.user!.name || req.user!.email}: "${entry.updateText}"`,
        changedById: req.user!.id,
        metadata: { updateId: entry.id },
      },
    });

    res.status(201).json({
      success: true,
      message: "Update added",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/projects/:id/updates
 * Lists all updates for a project.
 */
export async function listUpdates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const updates = await prisma.projectUpdate.findMany({
      where: { tenantId, projectId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
}
