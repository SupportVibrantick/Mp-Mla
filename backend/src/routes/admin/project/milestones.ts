import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";
import { archiveToRecycleBin } from "../../../lib/recycleBin.js";
import { requireTenantId } from "../../../utils/tenant.js";

/**
 * Recalculates and updates project completion percentage.
 */
async function recalculateProjectProgress(projectId: string): Promise<number> {
  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId },
  });
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.isCompleted).length;
  const percent = Math.round((completed / milestones.length) * 100);
  await prisma.project.update({
    where: { id: projectId },
    data: { completionPercent: percent },
  });
  return percent;
}

/**
 * POST /api/admin/projects/:id/milestones
 * Adds a new milestone to a project.
 */
export async function addMilestone(
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

    const count = await prisma.projectMilestone.count({
      where: { projectId },
    });

    const ms = await prisma.projectMilestone.create({
      data: {
        tenantId,
        projectId,
        title: req.body.title,
        description: req.body.description,
        targetDate: req.body.targetDate ? new Date(req.body.targetDate) : null,
        orderIndex: count,
        isCompleted: false,
      },
    });

    // Update project progress
    const currentPercent = await recalculateProjectProgress(projectId);

    // Create system timeline log
    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: "MILESTONE_CREATE",
        comment: `Milestone "${ms.title}" added to project. Completion progress: ${currentPercent}%`,
        changedById: req.user!.id,
        metadata: { milestoneId: ms.id, title: ms.title },
      },
    });

    res.status(201).json({
      success: true,
      message: "Milestone added",
      data: ms,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/projects/:id/milestones/:msId
 * Updates an existing milestone.
 */
export async function updateMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const milestoneId = req.params.msId as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const ms = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!ms) throw ApiError.notFound("Milestone not found for this project");

    const data: any = { ...req.body };
    if (data.targetDate) data.targetDate = new Date(data.targetDate);
    
    // Explicit completion logic
    if (data.isCompleted !== undefined && data.isCompleted !== ms.isCompleted) {
      data.completedDate = data.isCompleted ? new Date() : null;
    } else if (data.completedDate) {
      data.completedDate = new Date(data.completedDate);
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data,
    });

    const currentPercent = await recalculateProjectProgress(projectId);

    // Log update action
    const isStateChanged = data.isCompleted !== undefined && data.isCompleted !== ms.isCompleted;
    const action = isStateChanged
      ? (updated.isCompleted ? "MILESTONE_COMPLETE" : "MILESTONE_REOPEN")
      : "MILESTONE_UPDATE";

    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action,
        comment: `Milestone "${updated.title}" ${updated.isCompleted ? "completed" : "updated"}. Project progress: ${currentPercent}%`,
        changedById: req.user!.id,
        metadata: { milestoneId, isCompleted: updated.isCompleted },
      },
    });

    res.json({
      success: true,
      message: "Milestone updated",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/projects/:id/milestones/:msId
 * Deletes a milestone from a project.
 */
export async function deleteMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const milestoneId = req.params.msId as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const milestone = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!milestone) throw ApiError.notFound("Milestone not found for this project");

    await archiveToRecycleBin({
      tenantId,
      module: "projects",
      entityType: "project_milestone",
      recordId: milestone.id,
      recordLabel: milestone.title,
      payload: milestone,
      deletedById: req.user?.id,
    });

    await prisma.projectMilestone.delete({
      where: { id: milestoneId },
    });

    const currentPercent = await recalculateProjectProgress(projectId);

    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: "MILESTONE_DELETE",
        comment: `Milestone "${milestone.title}" deleted. Project progress: ${currentPercent}%`,
        changedById: req.user!.id,
        metadata: { milestoneId, title: milestone.title },
      },
    });

    res.json({
      success: true,
      message: "Milestone deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/projects/:id/milestones/:msId/toggle
 * Toggles the completion status of a milestone.
 */
export async function toggleMilestone(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = requireTenantId(req);
    const projectId = req.params.id as string;
    const milestoneId = req.params.msId as string;

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId, isDeleted: false },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const ms = await prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId },
    });
    if (!ms) throw ApiError.notFound("Milestone not found for this project");

    const isNowCompleted = !ms.isCompleted;

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        isCompleted: isNowCompleted,
        completedDate: isNowCompleted ? new Date() : null,
      },
    });

    const currentPercent = await recalculateProjectProgress(projectId);

    await prisma.projectTimeline.create({
      data: {
        tenantId,
        projectId,
        action: isNowCompleted ? "MILESTONE_COMPLETE" : "MILESTONE_REOPEN",
        comment: `Milestone "${updated.title}" ${isNowCompleted ? "completed" : "reopened"}. Project progress: ${currentPercent}%`,
        changedById: req.user!.id,
        metadata: { milestoneId, isCompleted: isNowCompleted },
      },
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
