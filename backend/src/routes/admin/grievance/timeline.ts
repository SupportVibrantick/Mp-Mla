import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";
import { requireTenantId } from "../../../utils/tenant.js";

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
