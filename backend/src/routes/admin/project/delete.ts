import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.params.id as string;
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) throw ApiError.notFound("Project not found");
    await prisma.project.delete({ where: { id: projectId } });
    await createAuditLog({
      userId: req.user!.id,
      action: "DELETE",
      module: "projects",
      recordId: p.id,
      description: `Deleted project ${p.projectCode}`,
      ...getRequestMeta(req),
    });
    res.json({ success: true, message: `${p.projectCode} deleted` });
  } catch (error) {
    next(error);
  }
}
