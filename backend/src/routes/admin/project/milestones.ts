import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";

/**
 * POST /api/admin/project/:id/milestones
 * Adds a new milestone to a project.
 */
export async function addMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
    });
    if (!project) throw ApiError.notFound("Project not found");
    const count = await prisma.projectMilestone.count({
      where: { projectId: project.id },
    });
    const ms = await prisma.projectMilestone.create({
      data: {
        projectId: project.id,
        title: req.body.title,
        description: req.body.description,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
        orderIndex: count,
      },
    });
    res
      .status(201)
      .json({ success: true, message: "Milestone added", data: ms });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/project/:id/milestones/:msId
 * Updates an existing milestone.
 */
export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const milestoneId = req.params.msId as string;
    const ms = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });
    if (!ms) throw ApiError.notFound("Milestone not found");
    const data: any = { ...req.body };
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    if (data.completedDate) data.completedDate = new Date(data.completedDate);
    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data,
    });
    res.json({ success: true, message: "Milestone updated", data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/project/:id/milestones/:msId
 * Deletes a milestone from a project.
 */
export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: req.params.msId as string },
    });

    if (!milestone) {
      throw ApiError.notFound("Milestone not found");
    }

    await archiveToRecycleBin({
      module: "projects",
      entityType: "project_milestone",
      recordId: milestone.id,
      recordLabel: milestone.title,
      payload: milestone,
      deletedById: req.user?.id,
    });

    await prisma.projectMilestone.delete({
      where: { id: req.params.msId as string },
    });
    res.json({ success: true, message: "Milestone moved to recycle bin" });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/project/:id/milestones/:msId/toggle
 * Toggles the completion status of a milestone.
 */
export async function toggleMilestone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const milstoneId = req.params.msId as string;
    const ms = await prisma.projectMilestone.findUnique({
      where: { id: milstoneId },
    });
    if (!ms) throw ApiError.notFound("Milestone not found");
    const updated = await prisma.projectMilestone.update({
      where: { id: milstoneId },
      data: {
        isCompleted: !ms.isCompleted,
        completedDate: !ms.isCompleted ? new Date() : null,
      },
    });

    // Recalculate project completion
    const all = await prisma.projectMilestone.findMany({
      where: { projectId: ms.projectId },
    });
    const done = all.filter((m) => m.isCompleted).length;
    const pct = all.length > 0 ? Math.round((done / all.length) * 100) : 0;
    await prisma.project.update({
      where: { id: ms.projectId },
      data: { completionPercent: pct },
    });

    res.json({
      success: true,
      message: `Milestone ${updated.isCompleted ? "completed" : "reopened"}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
