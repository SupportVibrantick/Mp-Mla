import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/ApiError.js";



/**
 * POST /api/admin/project/:id/updates
 * Adds a new update to a project.
 */
export async function addUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id as string },
    });
    if (!project) throw ApiError.notFound("Project not found");
    const entry = await prisma.projectUpdate.create({
      data: {
        projectId: project.id,
        updateText: req.body.updateText,
        updatedBy: req.user!.name || req.user!.email,
        photoUrl: req.body.photoUrl,
      },
    });
    res
      .status(201)
      .json({ success: true, message: "Update added", data: entry });
  } catch (error) {
    next(error);
  }
}
