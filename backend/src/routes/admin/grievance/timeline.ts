import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * POST /api/admin/grievance/:id/timeline
 * Adds a comment/note to the grievance timeline.
 */
export async function addTimelineEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const grievance = await prisma.grievance.findFirst({
      where: { id: req.params.id as string, tenantId },
    });
    if (!grievance) throw ApiError.notFound("Grievance not found");

    const entry = await prisma.grievanceTimeline.create({
      data: {
        tenantId,
        grievanceId: grievance.id,
        action: req.body.action,
        comment: req.body.comment,
        changedBy: req.user!.name || req.user!.email,
        changedById: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Timeline entry added",
      data: entry,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/grievance/:id/timeline
 * Lists all timeline entries for a grievance.
 */
export async function listTimelineEntries(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const grievanceId = req.params.id as string;

    const grievance = await prisma.grievance.findFirst({
      where: { id: grievanceId, tenantId },
    });
    if (!grievance) throw ApiError.notFound("Grievance not found");

    const data = await prisma.grievanceTimeline.findMany({
      where: { tenantId, grievanceId },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
