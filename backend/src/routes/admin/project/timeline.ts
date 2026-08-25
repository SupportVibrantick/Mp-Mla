import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * GET /api/admin/projects/:id/timeline
 * Lists all history timeline records for a project.
 */
export async function listProjectTimeline(
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

    const timeline = await prisma.projectTimeline.findMany({
      where: { tenantId, projectId },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    next(error);
  }
}
