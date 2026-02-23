import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { z } from "zod";

export const timelineSchema = z.object({
  action: z.enum(["COMMENT", "INTERNAL_NOTE", "FOLLOW_UP", "FIELD_VISIT"]),
  comment: z.string().min(1, "Comment required"),
});

export async function addTimelineEntry(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const grievance = await prisma.grievance.findUnique({
      where: { id: req.params.id as string },
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
